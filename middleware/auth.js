const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');

const User = require('../models/User');
const Session = require('../models/Session');
const { ApiError, ApiResponse, asyncHandler } = require('../utils/helpers');

/**
 * Enhanced device fingerprinting middleware with geolocation
 */
const deviceFingerprint = (req, res, next) => {
  try {
    const userAgent = req.get('User-Agent') || '';
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Enhanced IP address extraction with proper fallbacks
    let ip = 'Unknown';

    // Check x-forwarded-for first (most common in production with load balancers/proxies)
    if (req.headers['x-forwarded-for']) {
      const forwardedIps = req.headers['x-forwarded-for'].split(',');
      // Get the first (original) IP, removing any whitespace
      ip = forwardedIps[0].trim();
    }
    // Check x-real-ip (used by some proxies)
    else if (req.headers['x-real-ip']) {
      ip = req.headers['x-real-ip'].trim();
    }
    // Check cloudflare connecting ip
    else if (req.headers['cf-connecting-ip']) {
      ip = req.headers['cf-connecting-ip'].trim();
    }
    // Fall back to express req.ip
    else if (req.ip && req.ip !== '::1' && req.ip !== '127.0.0.1') {
      ip = req.ip;
    }
    // Fall back to connection remote address
    else if (req.connection?.remoteAddress &&
      req.connection.remoteAddress !== '::1' &&
      req.connection.remoteAddress !== '127.0.0.1') {
      ip = req.connection.remoteAddress;
    }
    // Fall back to socket remote address
    else if (req.socket?.remoteAddress &&
      req.socket.remoteAddress !== '::1' &&
      req.socket.remoteAddress !== '127.0.0.1') {
      ip = req.socket.remoteAddress;
    }

    // Handle localhost IPs properly
    const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1');

    // Clean up IPv6 mapped IPv4 addresses
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    // Convert IPv6 localhost to IPv4 for consistency
    if (ip === '::1') {
      ip = '127.0.0.1';
    }

    // Validate IP format
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$/;

    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
      console.warn(`Invalid IP format detected: ${ip}`);
      ip = 'Unknown';
    }

    // Debug logging (remove in production)
    console.log('IP Detection Debug:', {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'cf-connecting-ip': req.headers['cf-connecting-ip'],
      'req.ip': req.ip,
      'connection.remoteAddress': req.connection?.remoteAddress,
      'socket.remoteAddress': req.socket?.remoteAddress,
      'final_ip': ip
    });

    // Get additional headers for fingerprinting
    const acceptLanguage = req.get('Accept-Language') || 'Unknown';
    const acceptEncoding = req.get('Accept-Encoding') || 'Unknown';

    // Get location from IP using geoip-lite with better error handling
    let location = null;
    let locationString = 'Unknown Location';
    let timezone = 'Unknown';
    let coordinates = null;

    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isPrivateIP = ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.16.') ||
      ip.startsWith('172.17.') ||
      ip.startsWith('172.18.') ||
      ip.startsWith('172.19.') ||
      ip.startsWith('172.2') ||
      ip.startsWith('172.30.') ||
      ip.startsWith('172.31.');

    if (ip !== 'Unknown' && !isLocalhost && !isPrivateIP) {
      try {
        location = geoip.lookup(ip);
        console.log('GeoIP lookup result:', { ip, location }); // Debug logging

        if (location) {
          locationString = `${location.city || 'Unknown City'}, ${location.region || location.country || 'Unknown Region'}, ${location.country || 'Unknown Country'}`;
          timezone = location.timezone || 'Unknown';
          coordinates = location.ll ? { lat: location.ll[0], lon: location.ll[1] } : null;
        }
      } catch (geoError) {
        console.error('GeoIP lookup failed:', geoError);
      }
    } else {
      // Handle localhost/development environment
      if (isLocalhost && isDevelopment) {
        locationString = 'Local Development';
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
        console.log('Local development detected, using system timezone:', timezone);
      } else {
        console.log('Skipping GeoIP lookup for local/private IP:', ip);
      }
    }

    // Create comprehensive device fingerprint
    const deviceComponents = [
      result.browser.name || 'unknown',
      result.browser.version || 'unknown',
      result.os.name || 'unknown',
      result.os.version || 'unknown',
      result.device.vendor || 'unknown',
      result.device.model || 'unknown',
      acceptLanguage,
      acceptEncoding,
      ip
    ].join('|');

    const deviceId = crypto
      .createHash('sha256')
      .update(deviceComponents)
      .digest('hex')
      .substring(0, 32);

    // Determine platform more accurately
    let platform = 'Desktop';
    if (result.device.type) {
      platform = result.device.type.charAt(0).toUpperCase() + result.device.type.slice(1);
    } else if (result.os.name && (result.os.name.toLowerCase().includes('android') || result.os.name.toLowerCase().includes('ios'))) {
      platform = 'Mobile';
    } else if (result.os.name && result.os.name.toLowerCase().includes('mac')) {
      platform = 'Desktop';
    }

    // Enhanced device info
    req.deviceInfo = {
      deviceId,
      deviceName: `${result.browser.name || 'Unknown Browser'} on ${result.os.name || 'Unknown OS'}`,
      userAgent,
      platform,
      browser: result.browser.name || 'Unknown',
      browserVersion: result.browser.version || 'Unknown',
      os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
      ipAddress: ip,
      location: locationString,
      timezone,
      coordinates,
      // Additional debug info (remove in production)
      debug: {
        originalHeaders: {
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'x-real-ip': req.headers['x-real-ip'],
          'cf-connecting-ip': req.headers['cf-connecting-ip']
        },
        geoipResult: location
      }
    };

    next();
  } catch (error) {
    console.error('Device fingerprinting error:', error);

    // Enhanced fallback with better IP detection
    let fallbackIp = 'Unknown';

    if (req.connection?.remoteAddress === '::1') {
      fallbackIp = '127.0.0.1';  // Convert localhost
    } else {
      fallbackIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.ip ||
        req.connection?.remoteAddress ||
        '127.0.0.1';  // Default to localhost if all else fails
    }

    // Clean up fallback IP
    if (fallbackIp.startsWith('::ffff:')) {
      fallbackIp = fallbackIp.substring(7);
    }

    req.deviceInfo = {
      deviceId: crypto.createHash('sha256').update(req.get('User-Agent') || 'unknown').digest('hex').substring(0, 32),
      deviceName: 'Unknown Device',
      userAgent: req.get('User-Agent') || '',
      platform: 'Unknown',
      browser: 'Unknown',
      browserVersion: 'Unknown',
      os: 'Unknown',
      ipAddress: fallbackIp,
      location: 'Unknown Location',
      timezone: 'Unknown',
      coordinates: null,
      error: error.message
    };

    next();
  }
};

/**
 * Enhanced JWT authentication with comprehensive validation
 */
const authenticateToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    throw new ApiError('Access token is required', 401);
  }

  try {
    // Try to get redis service for caching
    let redisService = null;
    try {
      redisService = require('../services/redis');
    } catch (err) {
      // Redis not available, continue without cache
    }

    // Try cache first (JWT verification is CPU-intensive with bcrypt-level cost)
    if (redisService && redisService.isConnected) {
      const cachedAuth = await redisService.get(`jwt:${token.substring(0, 32)}`);
      if (cachedAuth) {
        // Redis service already returns parsed object
        req.user = cachedAuth;
        return next();
      }
    }

    const algorithm = process.env.JWT_ALGORITHM || 'HS256';
    const secretOrPublicKey = algorithm.startsWith('RS') 
      ? process.env.JWT_PUBLIC_KEY 
      : process.env.JWT_SECRET;

    const decoded = jwt.verify(token, secretOrPublicKey, {
      algorithms: [algorithm],
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });

    const user = await User.findById(decoded.userId).select(
      'isActive isDeleted role permissions accountLockedUntil failedLoginAttempts'
    );

    if (!user) {
      throw new ApiError('User not found', 401);
    }

    if (!user.isActive || user.isDeleted) {
      throw new ApiError('Account is inactive or deleted', 401);
    }

    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const timeLeft = Math.ceil((user.accountLockedUntil - Date.now()) / (1000 * 60));
      throw new ApiError(`Account is locked. Try again in ${timeLeft} minutes.`, 423);
    }

    if (decoded.sessionId) {
      // Validate session from Session collection (normalized)
      const session = await Session.findBySessionId(decoded.sessionId);

      if (!session || session.userId.toString() !== user._id.toString()) {
        throw new ApiError('Invalid or expired session', 401);
      }

      // Update session last activity
      await Session.updateActivity(decoded.sessionId);
      // No need to save user document anymore!
    }

    const authData = {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
      role: user.role,
      permissions: user.permissions || [],
      authMethod: 'jwt'
    };

    req.user = authData;

    // Cache the auth result for 5 minutes (balance between freshness and performance)
    if (redisService && redisService.isConnected) {
      await redisService.set(
        `jwt:${token.substring(0, 32)}`, 
        authData,
        300 // 5 minutes TTL
      );
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError('Invalid token', 401);
    } else if (error.name === 'TokenExpiredError') {
      throw new ApiError('Token expired', 401);
    } else {
      throw error;
    }
  }
});


/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => { });
  } catch (error) {
    // Continue without user info if authentication fails
    req.user = null;
  }
  next();
});

/**
 * Enhanced role-based authorization with hierarchy support
 */
const authorize = (allowedRoles = []) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError('Authentication required', 401);
    }

    // Fetch latest user data for authorization
    const user = await User.findById(req.user.userId).select('role permissions isActive');

    if (!user || !user.isActive) {
      throw new ApiError('User not found or inactive', 401);
    }

    const userRole = user.role;

    // Superadmin has access to everything
    if (userRole === 'superadmin') {
      req.user.role = userRole;
      req.user.permissions = user.permissions || [];
      return next();
    }

    // Check role hierarchy and permissions
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      throw new ApiError('Insufficient permissions', 403);
    }

    // Update user info in request
    req.user.role = userRole;
    req.user.permissions = user.permissions || [];

    next();
  });
};

/**
 * Permission-based authorization with detailed validation
 */
const requirePermission = (permission) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError('Authentication required', 401);
    }

    const user = await User.findById(req.user.userId).select('role permissions isActive');

    if (!user || !user.isActive) {
      throw new ApiError('User not found or inactive', 401);
    }

    // Superadmin bypasses permission checks
    if (user.role === 'superadmin') {
      return next();
    }

    // Check specific permission
    if (!user.permissions || !user.permissions.includes(permission)) {
      throw new ApiError(`Permission '${permission}' required`, 403);
    }

    next();
  });
};

/**
 * Email verification requirement
 */
const requireEmailVerification = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError('Authentication required', 401);
  }

  const user = await User.findById(req.user.userId).select('isEmailVerified');

  if (!user) {
    throw new ApiError('User not found', 401);
  }

  if (!user.isEmailVerified) {
    throw new ApiError('Email verification required', 403, 'EMAIL_NOT_VERIFIED');
  }

  next();
});

/**
 * Two-factor authentication requirement with session tracking and exceptions
 */
const require2FA = (options = {}) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError('Authentication required', 401);
    }

    const user = await User.findById(req.user.userId).select('twoFactorAuth');

    if (!user) {
      throw new ApiError('User not found', 401);
    }

    if (user.twoFactorAuth.isEnabled) {
      // Allow certain endpoints during 2FA setup/management without recent verification
      const allowedWithout2FA = [
        '/2fa/setup/backup-codes',
        '/2fa/backup-codes', // Allow viewing backup codes
        '/2fa/verify', // Allow 2FA verification itself
        '/2fa/disable' // Allow disabling 2FA with verification
      ];

      const isAllowedEndpoint = allowedWithout2FA.some(endpoint =>
        req.path.includes(endpoint)
      );

      if (!isAllowedEndpoint || options.requireRecent) {
        // Check if 2FA was recently verified (within last 5 minutes)
        const recentVerification = req.session?.twoFactorVerified;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        if (!recentVerification || new Date(recentVerification) < fiveMinutesAgo) {
          throw new ApiError('Two-factor authentication required', 403, 'TWO_FACTOR_REQUIRED');
        }
      }
    }

    next();
  });
};

/**
 * Enhanced API key authentication with rate limiting
 */
const authenticateApiKey = asyncHandler(async (req, res, next) => {
  const apiKey = req.get('X-API-Key');

  if (!apiKey) {
    throw new ApiError('API key required', 401);
  }

  if (!apiKey.startsWith('ak_')) {
    throw new ApiError('Invalid API key format', 401);
  }

  // Hash the API key for comparison
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

  const user = await User.findOne({
    'apiKeys.key': hashedKey,
    'apiKeys.isActive': true,
    isActive: true,
    isDeleted: false
  }).select('_id role permissions apiKeys');

  if (!user) {
    throw new ApiError('Invalid API key', 401);
  }

  const apiKeyObj = user.apiKeys.find(key => key.key === hashedKey && key.isActive);

  if (!apiKeyObj) {
    throw new ApiError('Invalid API key', 401);
  }

  // Check expiration
  if (apiKeyObj.expiresAt && apiKeyObj.expiresAt < new Date()) {
    throw new ApiError('API key expired', 401);
  }

  // Update usage tracking
  apiKeyObj.lastUsed = new Date();
  apiKeyObj.usageCount = (apiKeyObj.usageCount || 0) + 1;
  await user.save();

  req.user = {
    userId: user._id,
    role: user.role,
    permissions: apiKeyObj.permissions || user.permissions || [],
    authMethod: 'api_key',
    apiKeyId: apiKeyObj._id
  };

  next();
});

/**
 * Enhanced user-based rate limiting with sliding window
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return asyncHandler(async (req, res, next) => {
    // Skip rate limiting if disabled in development
    if (process.env.DEV_DISABLE_RATE_LIMITING === 'true') {
      return next();
    }

    if (!req.user) {
      return next();
    }

    const userId = req.user.userId.toString();
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const key = `${userId}:${windowStart}`;

    const userRequests = requests.get(key) || 0;

    if (userRequests >= maxRequests) {
      const resetTime = new Date(windowStart + windowMs);

      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': resetTime.toISOString()
      });
      return res.status(429).json(new ApiResponse({
        success: false,
        error: 'Too many requests',
        message: 'You have exceeded the number of allowed requests',
        code: 'TOO_MANY_REQUESTS',
        data: {
          retryAfter: Math.ceil(parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000') / 1000),
          maxAttempts: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'),
          windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'),
          attemptsRemaining: maxRequests - ipRequests - 1
        }
      }));
    }

    requests.set(key, userRequests + 1);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - userRequests - 1).toString(),
      'X-RateLimit-Reset': new Date(windowStart + windowMs).toISOString()
    });

    // Cleanup old entries periodically
    if (Math.random() < 0.1) { // 10% chance to cleanup
      const cutoff = now - windowMs;
      for (const [k, v] of requests.entries()) {
        const keyTime = parseInt(k.split(':')[1]);
        if (keyTime < cutoff) {
          requests.delete(k);
        }
      }
    }

    next();
  });
};

/**
 * IP-based rate limiting for unauthenticated requests
 */
const ipRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    // Skip rate limiting if disabled in development
    if (process.env.DEV_DISABLE_RATE_LIMITING === 'true') {
      return next();
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const key = `${ip}:${windowStart}`;

    const ipRequests = requests.get(key) || 0;

    if (ipRequests >= maxRequests) {
      const resetTime = new Date(windowStart + windowMs);
      return res.status(429).json(new ApiResponse({
        success: false,
        error: 'Too many requests',
        message: 'You have exceeded the number of allowed requests',
        code: 'TOO_MANY_REQUESTS',
        data: {
          retryAfter: Math.ceil(parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000') / 1000),
          maxAttempts: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'),
          windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'),
          resetTime: resetTime.toISOString(),
          attemptsRemaining: maxRequests - ipRequests - 1
        }
      }));
    }

    requests.set(key, ipRequests + 1);

    // Cleanup old entries periodically
    setTimeout(() => {
      const cutoff = now - windowMs;
      for (const [k, v] of requests.entries()) {
        const keyTime = parseInt(k.split(':')[1]);
        if (keyTime < cutoff) {
          requests.delete(k);
        }
      }
    }, windowMs);

    next();
  };
};

/**
 * Account lock check with detailed reporting
 */
const checkAccountLock = asyncHandler(async (req, res, next) => {
  if (req.body.identifier) {
    const user = await User.findOne({
      $or: [
        { email: req.body.identifier.toLowerCase() },
        { username: req.body.identifier.toLowerCase() }
      ]
    }).select('accountLockedUntil failedLoginAttempts');

    if (user && user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
      const timeLeft = Math.ceil((user.accountLockedUntil - Date.now()) / (1000 * 60));
      return res.status(423).json({
        success: false,
        error: 'Account is locked',
        message: `Account is locked. Try again in ${timeLeft} minutes.`,
        code: 'ACCOUNT_LOCKED',
        data: {
          accountLocked: true,
          lockExpiresAt: user.accountLockedUntil,
          timeLeftMinutes: timeLeft
        }
      });
    }
  }
  next();
});

/**
 * Session validation and activity tracking
 */
const validateSession = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.sessionId) {
    return next();
  }

  const user = await User.findById(req.user.userId).select('sessions');

  if (!user) {
    return res.status(401).json(new ApiResponse({
      success: false,
      error: 'User not found',
      message: 'User not found',
      code: 'ERROR_USER_NOT_FOUND',
      data: {
        userId: req.user.userId
      }
    }));
  }

  // Validate session from Session collection (normalized)
  const session = await Session.findBySessionId(req.user.sessionId);

  if (!session || session.userId.toString() !== user._id.toString()) {
    return res.status(400).json(new ApiResponse({
      success: false,
      error: 'Invalid session',
      message: 'Session is invalid or has expired',
      code: 'ERROR_INVALID_SESSION',
      data: {
        userId: req.user.userId,
        sessionId: req.user.sessionId
      }
    }));
  }

  // Update session activity with device info if available
  const sessionActivityTimeout = parseInt(process.env.SESSION_ACTIVITY_TIMEOUT || '0', 10);
  if (sessionActivityTimeout > 0) {
    const lastActivityTime = new Date(session.lastActivity).getTime();
    const currentTime = new Date().getTime();
    if (currentTime - lastActivityTime > sessionActivityTimeout) {
      // Mark session as inactive
      await Session.invalidateSession(req.user.sessionId);
      throw new ApiError('Session expired due to inactivity', 401, 'SESSION_INACTIVE');
    }
  }

  // Update session activity
  await Session.updateActivity(req.user.sessionId, req.deviceInfo);
  // No need to save user document anymore!
  next();
});

/**
 * Trusted device requirement
 */
const requireTrustedDevice = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.deviceInfo) {
    throw new ApiError('Device information required', 400);
  }

  const user = await User.findById(req.user.userId).select('trustedDevices');

  if (!user) {
    throw new ApiError('User not found', 401);
  }

  const trustedDevice = user.trustedDevices.find(device =>
    device.deviceId === req.deviceInfo.deviceId && device.isTrusted
  );

  if (!trustedDevice) {
    throw new ApiError('Device not trusted', 403, 'DEVICE_NOT_TRUSTED');
  }

  next();
});

/**
 * Ownership or admin access control
 */
const requireOwnershipOrAdmin = (resourceOwnerField = 'userId') => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError('Authentication required', 401);
    }

    const user = await User.findById(req.user.userId).select('role');

    if (!user) {
      throw new ApiError('User not found', 401);
    }

    // Allow superadmin and admin
    if (['admin', 'superadmin'].includes(user.role)) {
      return next();
    }

    // Check resource ownership
    const resourceOwnerId = req.params[resourceOwnerField] || req.body[resourceOwnerField];

    if (resourceOwnerId !== req.user.userId) {
      throw new ApiError('Access denied - insufficient permissions', 403);
    }

    next();
  });
};

/**
 * Maintenance mode check
 */
const checkMaintenanceMode = (req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    // Allow admin access during maintenance
    if (req.user && ['admin', 'superadmin'].includes(req.user.role)) {
      return next();
    }

    return res.status(503).json(new ApiResponse({
      success: false,
      error: 'Service temporarily unavailable for maintenance',
      message: 'The system is currently undergoing maintenance. Please try again later.',
      data: {
        retryAfter: process.env.MAINTENANCE_RETRY_AFTER || 3600,
        maintenanceMessage: process.env.MAINTENANCE_MESSAGE || 'System under maintenance'
      }
    }));
  }

  next();
};

/**
 * Enhanced CORS handling
 */
const handleCors = (req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS ?
    process.env.ALLOWED_ORIGINS.split(',') :
    ['http://localhost:3000', 'http://localhost:3001'];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

/**
 * Activity logging middleware
 */
const logActivity = (action, options = {}) => {
  return asyncHandler(async (req, res, next) => {
    const originalSend = res.json;

    res.json = function (data) {
      // Log successful requests
      if (req.user && data.success !== false) {
        const activityData = {
          userId: req.user.userId,
          action,
          timestamp: new Date(),
          ipAddress: req.deviceInfo?.ipAddress || req.ip,
          userAgent: req.deviceInfo?.userAgent || req.get('User-Agent'),
          location: req.deviceInfo?.location,
          sessionId: req.user.sessionId,
          authMethod: req.user.authMethod,
          ...options.additionalData
        };

        // You can implement activity logging to database here
        console.log(`Activity Log:`, JSON.stringify(activityData, null, 2));
      }

      return originalSend.call(this, data);
    };

    next();
  });
};

/**
 * Origin validation for CSRF protection
 */
const validateOrigin = (req, res, next) => {
  const origin = req.get('Origin') || req.get('Referer');
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());

  if (process.env.NODE_ENV === 'production' && origin && req.method !== 'GET') {
    const isAllowed = allowedOrigins.some(allowedOrigin =>
      origin.startsWith(allowedOrigin)
    );

    if (!isAllowed) {
      return res.status(403).json(new ApiResponse({
        success: false,
        error: 'Invalid origin - potential CSRF attack',
        code: 'INVALID_ORIGIN'
      }));
    }
  }

  next();
};

module.exports = {
  deviceFingerprint,
  authenticateToken,
  optionalAuth,
  authorize,
  requirePermission,
  requireEmailVerification,
  require2FA,
  authenticateApiKey,
  userRateLimit,
  ipRateLimit,
  checkAccountLock,
  validateSession,
  requireTrustedDevice,
  requireOwnershipOrAdmin,
  checkMaintenanceMode,
  handleCors,
  logActivity,
  validateOrigin
};