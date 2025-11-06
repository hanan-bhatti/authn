const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, param, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const User = require('../models/User');
const {
  authenticateToken,
  userRateLimit,
  ipRateLimit,
  checkAccountLock,
  validateSession,
  requireTrustedDevice,
  checkMaintenanceMode,
  handleCors,
  logActivity,
  validateOrigin,
  deviceFingerprint
} = require('../middleware/auth');
const {
  ApiResponse,
  ApiError,
  asyncHandler,
  validateRequest,
  sanitizeUser,
  generateUsernameSuggestions,
} = require('../utils/helpers');
const { sendEmail } = require('../services/email');
const {
  verifyIdToken,
  extractUserDataFromToken,
  getClientFirebaseConfig
} = require('../services/firebaseService');


const router = express.Router();

// =============================================================================
// GLOBAL MIDDLEWARE APPLICATION
// =============================================================================

// Apply security and middleware to all routes
router.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  }
}));
router.use(handleCors);
router.use(validateOrigin);
router.use(checkMaintenanceMode);
router.use(deviceFingerprint);

// =============================================================================
// RATE LIMITERS
// =============================================================================

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'),
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in a minute.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000') / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = new Date(req.rateLimit.resetTime);
    const now = new Date();
    const timeRemaining = Math.ceil((resetTime - now) / 1000); // seconds
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeString = minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : `${seconds} second${seconds > 1 ? 's' : ''}`;
    
    res.status(429).json(new ApiResponse({
      success: false,
      message: `Too many authentication attempts. Please try again in ${timeString}.`,
      code: 'RATE_LIMIT_EXCEEDED',
      data: {
        retryAfter: timeRemaining,
        maxAttempts: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'),
        windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'),
        resetTime: resetTime.toISOString()
      }
    }));
  }
});

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.GENERAL_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.GENERAL_RATE_LIMIT_MAX_REQUESTS || '50'),
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = new Date(req.rateLimit.resetTime);
    const now = new Date();
    const timeRemaining = Math.ceil((resetTime - now) / 1000); // seconds
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeString = minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : `${seconds} second${seconds > 1 ? 's' : ''}`;
    
    res.status(429).json({
      success: false,
      message: `Too many requests. Please try again after ${timeString}.`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: timeRemaining,
      resetTime: resetTime.toISOString()
    });
  }
});

const passwordResetLimiter = rateLimit({
  windowMs: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS || '3600000'), // 1 hour
  max: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS || '3'),
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = new Date(req.rateLimit.resetTime);
    const now = new Date();
    const timeRemaining = Math.ceil((resetTime - now) / 1000); // seconds
    const minutes = Math.floor(timeRemaining / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    let timeString;
    if (hours > 0) {
      timeString = `${hours} hour${hours > 1 ? 's' : ''}`;
      if (remainingMinutes > 0) {
        timeString += ` and ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
      }
    } else if (minutes > 0) {
      timeString = `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      timeString = `${timeRemaining} second${timeRemaining > 1 ? 's' : ''}`;
    }
    
    res.status(429).json({
      success: false,
      message: `Too many password reset attempts. Please try again after ${timeString}.`,
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      retryAfter: timeRemaining,
      resetTime: resetTime.toISOString()
    });
  }
});

const emailVerificationLimiter = rateLimit({
  windowMs: parseInt(process.env.EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS || '600000'), // 10 minutes
  max: parseInt(process.env.EMAIL_VERIFICATION_RATE_LIMIT_MAX_REQUESTS || '3'),
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again later.',
    code: 'EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = new Date(req.rateLimit.resetTime);
    const now = new Date();
    const timeRemaining = Math.ceil((resetTime - now) / 1000); // seconds
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeString = minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : `${seconds} second${seconds > 1 ? 's' : ''}`;
    
    res.status(429).json({
      success: false,
      message: `Too many verification attempts. Please try again after ${timeString}.`,
      code: 'EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED',
      retryAfter: timeRemaining,
      resetTime: resetTime.toISOString()
    });
  }
});

const twoFAVerifyLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many 2FA verification attempts. Please try again later.',
    code: 'TWO_FA_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = new Date(req.rateLimit.resetTime);
    const now = new Date();
    const timeRemaining = Math.ceil((resetTime - now) / 1000); // seconds
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeString = minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : `${seconds} second${seconds > 1 ? 's' : ''}`;
    
    res.status(429).json({
      success: false,
      message: `Too many 2FA verification attempts. Please try again in ${timeString}.`,
      code: 'TWO_FA_RATE_LIMIT_EXCEEDED',
      retryAfter: timeRemaining,
      resetTime: resetTime.toISOString()
    });
  }
});

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .custom(value => {
      if (value && (value.startsWith('_') || value.endsWith('_'))) {
        throw new Error('Username cannot start or end with underscore');
      }
      return true;
    })
    .custom(async (username) => {
      const reserved = [
        'admin', 'api', 'www', 'support', 'help', 'root', 'system', 'test', 'user',
        'moderator', 'mod', 'administrator', 'superuser', 'staff', 'employee',
        'transitflow', 'transit-flow', 'transit_flow', 'official', 'service',
        'info', 'contact', 'sales', 'marketing', 'legal', 'privacy', 'terms',
        'security', 'abuse', 'noreply', 'no-reply', 'postmaster', 'webmaster'
      ];

      if (reserved.includes(username.toLowerCase())) {
        throw new Error('This username is reserved and cannot be used');
      }

      const existingUser = await User.findOne({
        username: new RegExp(`^${username}$`, 'i'),
        isDeleted: { $ne: true }
      }).lean();

      if (existingUser) {
        throw new Error('This username is already taken');
      }

      return true;
    }),

  body('email')
    .trim()
    .isEmail({
      allow_utf8_local_part: false,
      require_tld: true,
      allow_ip_domain: false
    })
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ min: 5, max: 255 })
    .withMessage('Email must be between 5-255 characters')
    .custom(async (email) => {
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
        'throwaway.email', 'temp-mail.org', 'getairmail.com', 'fakeinbox.com',
        'yopmail.com', 'maildrop.cc', 'sharklasers.com', 'grr.la'
      ];

      const domain = email.split('@')[1]?.toLowerCase();
      if (disposableDomains.includes(domain)) {
        throw new Error('Disposable email addresses are not allowed');
      }

      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        isDeleted: { $ne: true }
      }).lean();

      if (existingUser) {
        throw new Error('An account with this email already exists');
      }

      return true;
    }),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-=_~`|\\(){}\[\]:";'<>,.\/])[A-Za-z\d@$!%*?&#+\-=_~`|\\(){}\[\]:";'<>,.\/]+$/)
    .withMessage('Password must contain at least: 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character'),

  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1-50 characters')
    .matches(/^[a-zA-Z\u00C0-\u017F\u0100-\u024F\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, apostrophes, and accented characters'),

  body('lastName')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1-50 characters')
    .matches(/^[a-zA-Z\u00C0-\u017F\u0100-\u024F\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, apostrophes, and accented characters'),

  

  
];

const loginValidation = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or username is required')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Invalid identifier length'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean value'),
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if device is trusted for user
 */
async function isDeviceTrusted(user, deviceInfo) {
  if (!user.trustedDevices || !deviceInfo?.deviceId) {
    return false;
  }

  return user.trustedDevices.some(device =>
    device.deviceId === deviceInfo.deviceId &&
    device.isTrusted &&
    device.isActive !== false
  );
}

/**
 * Send device verification email
 */
const sendDeviceVerificationEmail = async (user, deviceInfo, req) => {
  try {
    // Generate verification token
    const verificationToken = user.generateDeviceVerificationToken(deviceInfo);

    // Save user with pending verification
    await user.save();

    // Create verification URL
    const verificationUrl = `${process.env.NODE_ENV === 'production' ? process.env.PROD_FRONTEND_URL : process.env.FRONTEND_URL}/auth/verify-device?token=${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: 'New Device Login Verification Required',
      template: 'device-verification',
      data: {
        name: user.fullName || user.username,
        email: user.email,
        userProfilePic: 'https://spotless-orange-flea.myfilebase.com/ipfs/' + user.avatar,
        deviceName: deviceInfo.deviceName || 'Unknown Device',
        location: deviceInfo.location || 'Unknown Location',
        ipAddress: req.ip,
        verificationUrl,
        loginTime: new Date().toLocaleString(),
        expiresIn: '30 minutes'
      }
    });

    console.log('Device verification email sent to:', user.email);
    console.log('Verification token generated for device:', deviceInfo.deviceId);

    return true;
  } catch (error) {
    console.error('Error sending device verification email:', error);
    throw error;
  }
}

/**
 * Mark device as trusted after verification
 */
async function markDeviceAsTrusted(user, deviceInfo, isRegistration = false) {
  user.trustedDevices = user.trustedDevices || [];

  // Remove existing entry for this device if any
  user.trustedDevices = user.trustedDevices.filter(device =>
    device.deviceId !== deviceInfo.deviceId
  );

  // Add as trusted device
  user.trustedDevices.push({
    deviceId: deviceInfo.deviceId,
    deviceName: deviceInfo.deviceName || 'Unknown Device',
    deviceType: deviceInfo.platform || 'Unknown',
    browser: deviceInfo.browser || 'Unknown',
    os: deviceInfo.os || 'Unknown',
    ipAddress: deviceInfo.ipAddress,
    location: deviceInfo.location || 'Unknown Location',
    isTrusted: true,
    isActive: true,
    addedAt: new Date(),
    addedDuring: isRegistration ? 'registration' : 'login',
    lastUsed: new Date()
  });

  await user.save();
}

// =============================================================================
// FIREBASE CONFIGURATION
// =============================================================================

/**
 * @route   GET /api/auth/firebase-config
 * @desc    Get Firebase configuration for client
 * @access  Public
 */
router.get('/firebase-config',
  generalLimiter,
  logActivity('firebase_config_access'),
  asyncHandler(async (req, res) => {
    try {
      const config = getClientFirebaseConfig();

      res.json(new ApiResponse({
        success: true,
        message: 'Firebase configuration retrieved successfully',
        data: { config }
      }));
    } catch (error) {
      throw new ApiError('Unable to retrieve Firebase configuration', 500, 'FIREBASE_CONFIG_ERROR');
    }
  })
);

// =============================================================================
// REGISTRATION ROUTES
// =============================================================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user with trusted device management
 * @access  Public
 */
router.post('/register',
  authLimiter,
  ipRateLimit(10, 15 * 60 * 1000), // 10 registrations per IP per 15 minutes
  registerValidation,
  validateRequest,
  logActivity('user_registration'),
  asyncHandler(async (req, res) => {
    const { username, email, password, firstName, lastName, dateOfBirth } = req.body;

    // Input sanitization
    const sanitizedEmail = email?.toLowerCase()?.trim();
    const sanitizedUsername = username?.toLowerCase()?.trim();
    const sanitizedFirstName = firstName?.trim();
    const sanitizedLastName = lastName?.trim();

    // Validate required fields
    if (!sanitizedEmail || !sanitizedUsername || !password || !firstName) {
      const missingFields = {};
      if (!sanitizedEmail) missingFields.email = 'Email is required';
      if (!sanitizedUsername) missingFields.username = 'Username is required';
      if (!password) missingFields.password = 'Password is required';
      if (!firstName) missingFields.firstName = 'First name is required';

      return res.status(400).json(new ApiResponse({
        success: false,
        error: 'Missing required fields',
        message: 'Please provide all required information to create your account',
        code: 'MISSING_REQUIRED_FIELDS',
        data: {
          missingFields,
          requiredFields: ['email', 'username', 'password', 'firstName']
        }
      }));
    }

    // Validate device information
    if (!req.deviceInfo || !req.deviceInfo.deviceId) {
      return res.status(400).json(new ApiResponse({
        success: false,
        error: 'Device information is required for security',
        message: 'Device information must be provided for security verification',
        code: 'DEVICE_INFO_REQUIRED',
        data: {
          requiresDeviceInfo: true
        }
      }));
    }

    // Date of birth validation if provided
    let parsedDateOfBirth;
    if (dateOfBirth) {
      parsedDateOfBirth = new Date(dateOfBirth);
      if (isNaN(parsedDateOfBirth.getTime())) {
        return res.status(400).json(new ApiResponse({
          success: false,
          error: 'Invalid date of birth format',
          message: 'Please provide a valid date of birth in the correct format',
          code: 'INVALID_DATE_FORMAT',
          data: {
            expectedFormat: 'YYYY-MM-DD',
            receivedValue: dateOfBirth
          }
        }));
      }

      // COPPA compliance check
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 13);
      if (parsedDateOfBirth > minAge) {
        return res.status(400).json(new ApiResponse({
          success: false,
          error: 'You must be at least 13 years old to create an account',
          message: 'Account creation is restricted to users who are at least 13 years old',
          code: 'UNDERAGE_USER',
          data: {
            minimumAge: 13,
            coppaCompliance: true
          }
        }));
      }
    }

    // Use database transaction for data consistency
    const session = await User.startSession();
    let user;
    let verificationOTP;

    try {
      await session.withTransaction(async () => {
        const userData = {
          username: sanitizedUsername,
          email: sanitizedEmail,
          passwordHash: password,
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          role: 'user',
          dateOfBirth: parsedDateOfBirth,
          createdAt: new Date(),
          updatedAt: new Date()
        };



        user = new User(userData);

        // Generate email verification OTP
        verificationOTP = user.generateEmailVerificationOTP();

        // Mark registration device as trusted immediately
        await markDeviceAsTrusted(user, req.deviceInfo, true);

        // Add device info
        if (typeof user.addDevice === 'function') {
          user.addDevice(req.deviceInfo);
        }

        // Add registration audit log
        user.addAuditLog('REGISTRATION', {
          userType: user.userType,
          registrationMethod: 'email',
          
          deviceInfo: req.deviceInfo,
          deviceTrusted: true
        }, req);

        // Add welcome notification
        user.addNotification(
          'welcome',
          'Welcome to Authn!',
          'Thank you for joining us. Please verify your email to get started.',
          {
            registrationDate: new Date(),
            nextStep: 'email_verification',
            deviceTrusted: true
          }
        );

        await user.save({ session });
      });
    } catch (transactionError) {
      console.error('Registration transaction error:', transactionError);

      return res.status(500).json(new ApiResponse({
        success: false,
        error: 'Unable to create account',
        message: 'An error occurred while creating your account. Please try again',
        code: 'REGISTRATION_TRANSACTION_FAILED',
        data: {
          transactionFailed: true,
          timestamp: new Date()
        }
      }));
    } finally {
      await session.endSession();
    }

    // Send verification email
    let emailSent = false;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify Your Email Address - Welcome to Authn',
        template: 'email-verification',
        data: {
          name: user.firstName,
          otp: verificationOTP,
          expirationTime: '10 minutes'
        }
      });
      emailSent = true;
    } catch (emailError) {
      console.error('Registration email send error:', emailError);
      await User.findByIdAndUpdate(user._id, {
        'emailVerification.needsResend': true,
        'emailVerification.lastAttempt': new Date()
      });

      user.addAuditLog('EMAIL_SEND_FAILED', {
        emailType: 'verification',
        error: emailError.message
      }, req);
    }

    // Prepare response data (no token until email verification)
    const responseData = {
      user: sanitizeUser(user),
      requiresEmailVerification: true,
      verificationSent: emailSent,
      deviceTrusted: true,
      message: emailSent
        ? 'Please check your email for the verification code.'
        : 'Account created but verification email failed to send. You can request a new one.'
    };

    // Add phone validation info if provided
    if (req.validatedPhone) {
      responseData.phoneValidation = {
        carrier: req.validatedPhone.carrier?.name || 'Unknown',
        phoneType: req.validatedPhone.phoneType,
        localNumber: req.validatedPhone.localNumber,
        isValid: true
      };
    }

    res.status(201).json(new ApiResponse({
      success: true,
      message: emailSent
        ? 'Account created successfully! Please check your email for the verification code.'
        : 'Account created successfully! Please request a verification email to complete setup.',
      data: responseData
    }));
  })
);

/**
 * @route   POST /api/auth/google
 * @desc    Register/Login with Google OAuth
 * @access  Public
 */
router.post('/google',
  authLimiter,
  ipRateLimit(20, 15 * 60 * 1000),
  [
    body('idToken').notEmpty().withMessage('Google ID token is required'),
    
    body('username').optional().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/)
  ],
  validateRequest,
  logActivity('google_auth'),
  asyncHandler(async (req, res) => {
    const { idToken, firstName, lastName, username, rememberMe = false } = req.body;

    if (!req.deviceInfo || !req.deviceInfo.deviceId) {
      throw new ApiError('Device information is required for security', 400, 'DEVICE_INFO_REQUIRED');
    }

    // Verify Firebase token
    let decodedToken, googleUserData;
    try {
      decodedToken = await verifyIdToken(idToken);
      googleUserData = extractUserDataFromToken(decodedToken);
    } catch (firebaseError) {
      throw new ApiError('Invalid Google authentication token', 401, 'INVALID_GOOGLE_TOKEN');
    }

    // Check if user already exists
    let user = await User.findOne({
      $or: [
        { 'socialAccounts.provider': 'google', 'socialAccounts.providerId': googleUserData.googleId },
        { email: googleUserData.email }
      ],
      isDeleted: false
    });

    if (user) {
      // Existing user - login flow with trusted device check
      if (!user.isActive) {
        throw new ApiError('Account has been deactivated', 403, 'ACCOUNT_DEACTIVATED');
      }

      // Check if device is trusted
      const deviceTrusted = await isDeviceTrusted(user, req.deviceInfo);

      if (!deviceTrusted) {
        // Send device verification email
        await sendDeviceVerificationEmail(user, req.deviceInfo, req);

        user.addAuditLog('LOGIN_BLOCKED_UNTRUSTED_DEVICE', {
          deviceInfo: req.deviceInfo,
          loginMethod: 'google'
        }, req);

        return res.status(403).json(new ApiResponse({
          success: false,  // Changed from true to false
          error: 'Device verification required',  // Clear error message
          message: 'For your security, please verify this device using the link sent to your email.',
          code: 'DEVICE_NOT_TRUSTED',
          data: {
            requiresDeviceVerification: true,
            email: user.email.substring(0, 3) + '***' + user.email.substring(user.email.indexOf('@')),
            verificationMessage: 'For your security, please verify this device using the link sent to your email.'
          }
        }));
      }

      // Link Google account if not already linked
      if (!user.hasSocialProvider('google')) {
        user.socialAccounts.push({
          provider: 'google',
          providerId: googleUserData.googleId,
          email: googleUserData.email,
          displayName: googleUserData.displayName,
          profilePicture: googleUserData.profilePicture
        });
        user.isEmailVerified = googleUserData.isEmailVerified || user.isEmailVerified;
      }

      // Update login info and create session
      user.updateLoginInfo(req.deviceInfo);
      user.addDevice(req.deviceInfo);

      const expiresIn = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      const sessionId = user.createSession(req.deviceInfo, expiresIn);

      await user.save();

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user._id,
          sessionId,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: rememberMe ? '30d' : '7d' }
      );

      // Set secure HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'strict' : 'lax'),
        maxAge: parseInt(process.env.COOKIE_MAX_AGE) || expiresIn,
        path: process.env.COOKIE_PATH || '/'
      });

      user.addAuditLog('LOGIN_SUCCESS', {
        sessionId,
        loginMethod: 'google',
        deviceTrusted: true,
        rememberMe
      }, req);

      return res.json(new ApiResponse({
        success: true,
        message: 'Login successful',
        data: {
          user: sanitizeUser(user),
          sessionId,
          
          deviceTrusted: true
        }
      }));
    }

    // New user registration with Google
    if (!userType || !username) {
      return res.status(400).json(new ApiResponse({
        success: false,
        error: 'Additional information required for new account',
        code: 'REGISTRATION_INFO_REQUIRED',
        data: {
          requiresRegistration: true,
          userData: googleUserData,
          suggestedUsernames: generateUsernameSuggestions(
            googleUserData.firstName || googleUserData.displayName || 'user'
          )
        }
      }));
    }

    // Check if username is available
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      throw new ApiError('Username already taken', 409, 'USERNAME_TAKEN');
    }

    // Create new user with Google data
    user = new User({
      firstName: firstName || googleUserData.firstName,
      lastName: lastName || googleUserData.lastName,
      username: username.toLowerCase().trim(),
      email: googleUserData.email,
      phone: phone?.trim(),
      userType,
      isEmailVerified: googleUserData.isEmailVerified,
      socialAccounts: [{
        provider: 'google',
        providerId: googleUserData.googleId,
        email: googleUserData.email,
        displayName: googleUserData.displayName,
        profilePicture: googleUserData.profilePicture
      }]
    });

    // Mark registration device as trusted
    await markDeviceAsTrusted(user, req.deviceInfo, true);

    // Add device and audit log
    user.addDevice(req.deviceInfo);
    user.addAuditLog('GOOGLE_REGISTRATION', {
      userType,
      deviceTrusted: true
    }, req);

    // Update login info and create session
    user.updateLoginInfo(req.deviceInfo);
    const sessionId = user.createSession(req.deviceInfo);

    await user.save();

    // Send welcome email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Authn',
        template: 'welcome',
        data: {
          name: user.fullName || user.username,
          email: user.email,
          dashboardUrl: process.env.NODE_ENV === 'production' ? process.env.PROD_DASHBOARD_URL : process.env.DASHBOARD_URL,
          loginMethod: 'Google'
        }
      });
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id,
        sessionId,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.status(201).json(new ApiResponse({
      success: true,
      message: 'Account created successfully with Google',
      data: {
        user: sanitizeUser(user),
        sessionId,
        
        deviceTrusted: true
      }
    }));
  })
);

// =============================================================================
// LOGIN ROUTES
// =============================================================================

/**
 * @route   POST /api/auth/login
 * @desc    Login with email/username and password with trusted device check
 * @access  Public
 */
router.post('/login',
  authLimiter,
  ipRateLimit(15, 15 * 60 * 1000),
  loginValidation,
  validateRequest,
  checkAccountLock,
  logActivity('user_login'),
  asyncHandler(async (req, res) => {
    const { identifier, password, rememberMe = false, twoFactorCode } = req.body;

    if (!req.deviceInfo || !req.deviceInfo.deviceId) {
      return res.status(400).json(new ApiResponse({
        success: false,
        error: 'Device information is required for security',
        message: 'Device information must be provided for security verification',
        code: 'DEVICE_INFO_REQUIRED',
        data: {
          requiresDeviceInfo: true
        }
      }));
    }

    // Find user by email or username
    const user = await User.findByIdentifier(identifier);
    if (!user) {
      return res.status(401).json(new ApiResponse({
        success: false,
        error: 'Invalid credentials',
        message: 'The provided login credentials are incorrect',
        code: 'INVALID_CREDENTIALS',
        data: {
          loginFailed: true
        }
      }));
    }

    // Verify password
    if (!(await user.comparePassword(password))) {
      // Log failed attempt
      user.addAuditLog('LOGIN_FAILED', {
        reason: 'Invalid password',
        deviceInfo: req.deviceInfo,
        identifier: identifier?.substring(0, 3) + '***'
      }, req);

      user.addNotification(
        'security',
        'Failed Login Attempt',
        `A failed login attempt was made to your account from ${req.ip}`,
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date(),
          location: req.deviceInfo?.location
        }
      );

      if (typeof user.incrementFailedLogin === 'function') {
        user.incrementFailedLogin();
      }
      await user.save();

      return res.status(401).json(new ApiResponse({
        success: false,
        error: 'Invalid credentials',
        message: 'The provided login credentials are incorrect',
        code: 'INVALID_CREDENTIALS',
        data: {
          loginFailed: true,
          failedAttempts: user.failedLoginAttempts
        }
      }));
    }

    // Check account status
    if (!user.isActive) {
      user.addAuditLog('LOGIN_BLOCKED', {
        reason: 'Account deactivated',
        deviceInfo: req.deviceInfo
      }, req);

      return res.status(403).json(new ApiResponse({
        success: false,
        error: 'Account has been deactivated',
        message: 'Your account is currently deactivated. Please contact support for assistance',
        code: 'ACCOUNT_DEACTIVATED',
        data: {
          accountStatus: 'deactivated',
          contactSupport: true
        }
      }));
    }

    if (user.isLocked) {
      const timeLeft = Math.ceil((user.accountLockedUntil - Date.now()) / (1000 * 60));
      user.addAuditLog('LOGIN_BLOCKED', {
        reason: 'Account locked',
        timeLeft: `${timeLeft} minutes`,
        deviceInfo: req.deviceInfo
      }, req);

      return res.status(423).json(new ApiResponse({
        success: false,
        error: 'Account is locked',
        message: `Your account is temporarily locked. Please try again in ${timeLeft} minutes`,
        code: 'ACCOUNT_LOCKED',
        data: {
          accountLocked: true,
          timeLeftMinutes: timeLeft,
          lockExpiresAt: user.accountLockedUntil
        }
      }));
    }

    // Check if device is trusted
    const deviceTrusted = await isDeviceTrusted(user, req.deviceInfo);

    if (!deviceTrusted) {
      // Send device verification email
      await sendDeviceVerificationEmail(user, req.deviceInfo, req);

      user.addAuditLog('LOGIN_BLOCKED_UNTRUSTED_DEVICE', {
        deviceInfo: req.deviceInfo,
        loginMethod: 'password'
      }, req);

      return res.status(403).json(new ApiResponse({
        success: false,
        error: 'Device verification required',
        message: 'For your security, please verify this device using the link sent to your email',
        code: 'DEVICE_NOT_TRUSTED',
        data: {
          requiresDeviceVerification: true,
          email: user.email.substring(0, 3) + '***' + user.email.substring(user.email.indexOf('@')),
          verificationMessage: 'For your security, please verify this device using the link sent to your email'
        }
      }));
    }

    // Handle 2FA if enabled
    if (user.twoFactorAuth?.isEnabled) {
      if (!twoFactorCode) {
        const tempSessionId = user.createTempSession(req.deviceInfo, req.ip, req.get('User-Agent'));
        if (user.tempSession) {
          user.tempSession.rememberMe = rememberMe;
        }
        user.markModified('tempSession');
        await user.save();

        user.addAuditLog('LOGIN_2FA_REQUIRED', {
          tempSessionId,
          deviceInfo: req.deviceInfo
        }, req);

        return res.status(200).json(new ApiResponse({
          success: false,
          error: 'Two-factor authentication required',
          message: 'Please enter your two-factor authentication code to complete login',
          code: 'TWO_FACTOR_REQUIRED',
          data: {
            requires2FA: true,
            tempSessionId
          }
        }));
      }

      // Verify 2FA code
      const is2FAValid = await user.verify2FACode(twoFactorCode);
      if (!is2FAValid) {
        user.addAuditLog('LOGIN_2FA_FAILED', {
          deviceInfo: req.deviceInfo
        }, req);

        if (typeof user.incrementFailed2FA === 'function') {
          user.incrementFailed2FA();
        } else {
          user.incrementFailedLogin();
        }
        await user.save();

        return res.status(401).json(new ApiResponse({
          success: false,
          error: 'Invalid verification code',
          message: 'The two-factor authentication code you entered is incorrect',
          code: 'INVALID_2FA_CODE',
          data: {
            twoFactorFailed: true,
            attemptsRemaining: user.maxTwoFactorAttempts - (user.failed2FAAttempts || 0)
          }
        }));
      }
    }

    // Successful authentication - create session and login
    const sessionDuration = rememberMe ? parseInt(process.env.COOKIE_MAX_AGE_REMEMBER_ME || '2592000000') : parseInt(process.env.COOKIE_MAX_AGE_DEFAULT || '604800000');

    try {
      // Update user login information
      if (typeof user.updateLoginInfo === 'function') {
        user.updateLoginInfo(req.deviceInfo);
      }

      if (typeof user.addDevice === 'function') {
        user.addDevice(req.deviceInfo);
      }

      // Create session
      const sessionId = user.createSession(req.deviceInfo, sessionDuration);

      // Clear any temporary sessions
      if (user.tempSession) {
        user.clearTempSession();
      }

      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          sessionId,
          role: user.role,
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        {
          expiresIn: rememberMe ? '30d' : '7d',
          issuer: process.env.JWT_ISSUER || 'authn',
          audience: process.env.JWT_AUDIENCE || 'transitflow-users'
        }
      );

      // Set secure HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'strict' : 'lax'),
        maxAge: parseInt(process.env.COOKIE_MAX_AGE) || sessionDuration,
        path: process.env.COOKIE_PATH || '/'
      });

      // Audit log for successful login
      user.addAuditLog('LOGIN_SUCCESS', {
        sessionId,
        rememberMe,
        deviceInfo: req.deviceInfo,
        sessionDuration: rememberMe ? '30 days' : '7 days',
        deviceTrusted: true
      }, req);

      // Add welcome back notification
      user.addNotification(
        'info',
        'Welcome Back!',
        `You've successfully logged in from ${req.deviceInfo?.deviceName || 'your device'}`,
        {
          ipAddress: req.ip,
          deviceInfo: req.deviceInfo,
          timestamp: new Date(),
          sessionId
        }
      );

      const responseData = {
        user: sanitizeUser(user),
        sessionId,
        expiresIn: sessionDuration,
        requiresEmailVerification: !user.isEmailVerified,
        requiresOnboarding: !user.homeLocation && !user.profile?.isComplete,
        deviceTrusted: true
      };

      res.status(200).json(new ApiResponse({
        success: true,
        message: 'Login successful',
        data: responseData
      }));

    } catch (userUpdateError) {
      console.error('Login process error:', userUpdateError);
      user.addAuditLog('LOGIN_ERROR', {
        reason: 'User update failed',
        error: userUpdateError.message,
        deviceInfo: req.deviceInfo
      }, req);

      return res.status(500).json(new ApiResponse({
        success: false,
        error: 'Unable to complete login',
        message: 'An internal error occurred while processing your login. Please try again',
        code: 'LOGIN_PROCESS_ERROR',
        data: {
          internalError: true,
          timestamp: new Date()
        }
      }));
    }
  })
);

// =============================================================================
// DEVICE VERIFICATION ROUTES
// =============================================================================

/**
 * @route   POST /api/auth/verify-device
 * @desc    Verify and trust a new device
 * @access  Public
 */
router.post('/verify-device',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Verification token is required'),
    body('password').notEmpty().withMessage('Password is required for device verification')
  ],
  validateRequest,
  logActivity('device_verification'),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!req.deviceInfo || !req.deviceInfo.deviceId) {
      return res.status(400).json(new ApiResponse({
        success: false,
        error: 'Device information is required',
        message: 'Device information is required',
        code: 'DEVICE_INFO_REQUIRED'
      }));
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      'pendingDeviceVerifications.token': hashedToken,
      'pendingDeviceVerifications.expiresAt': { $gt: new Date() },
      isDeleted: false
    });

    if (!user) {
      return res.status(400).json(new ApiResponse({
        success: false,
        error: 'Invalid or expired verification token',
        message: 'Invalid or expired verification token'
      }));
    }

    // Verify password
    if (!(await user.comparePassword(password))) {
      user.addAuditLog('DEVICE_VERIFICATION_FAILED', {
        reason: 'Invalid password',
        deviceInfo: req.deviceInfo
      }, req);
      return res.status(401).json(new ApiResponse({
        success: false,
        error: 'Invalid password',
        message: 'Invalid password'
      }));
    }

    // Find the pending verification
    const pendingVerification = user.pendingDeviceVerifications.find(
      verification => verification.token === hashedToken
    );

    if (!pendingVerification) {
      return res.status(400).json(new ApiResponse({
        success: false,
        error: 'Verification not found',
        message: 'Verification not found'
      }));
    }

    // Verify device matches
    if (pendingVerification.deviceId !== req.deviceInfo.deviceId) {
      return res.status(400).json(new ApiResponse({
        success: false,
        error: 'Device mismatch',
        message: 'Device mismatch'
      }));
    }

    // Mark device as trusted
    await markDeviceAsTrusted(user, req.deviceInfo, false);

    // Remove the pending verification
    user.pendingDeviceVerifications = user.pendingDeviceVerifications.filter(
      verification => verification.token !== hashedToken
    );

    // Create login session
    const sessionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days default
    const sessionId = user.createSession(req.deviceInfo, sessionDuration);

    // Update login info
    user.updateLoginInfo(req.deviceInfo);
    user.addDevice(req.deviceInfo);

    user.addAuditLog('DEVICE_VERIFIED_AND_TRUSTED', {
      deviceInfo: req.deviceInfo,
      sessionId
    }, req);

    user.addNotification(
      'security',
      'New Device Verified',
      `Your ${req.deviceInfo.deviceName || 'device'} has been verified and added to your trusted devices.`,
      {
        deviceInfo: req.deviceInfo,
        timestamp: new Date()
      }
    );

    await user.save();

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user._id.toString(),
        sessionId,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d',
        issuer: process.env.JWT_ISSUER || 'transitflow',
        audience: process.env.JWT_AUDIENCE || 'transitflow-users'
      }
    );

    // Set secure HTTP-only cookie
    res.cookie('token', jwtToken, {
      httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'strict' : 'lax'),
      maxAge: parseInt(process.env.COOKIE_MAX_AGE) || sessionDuration,
      path: process.env.COOKIE_PATH || '/'
    });

    return res.json(new ApiResponse({
      success: true,
      message: 'Device verified successfully. You are now logged in.',
      data: {
        user: sanitizeUser(user),
        sessionId,
        deviceTrusted: true,
        requiresEmailVerification: !user.isEmailVerified,
        requiresOnboarding: !user.homeLocation && !user.profile?.isComplete
      }
    }));
  })
);

// =============================================================================
// TWO-FACTOR AUTHENTICATION ROUTES
// =============================================================================

/**
 * @route   POST /api/auth/verify-2fa
 * @desc    Verify 2FA code during login process
 * @access  Public
 */
router.post('/verify-2fa',
  authLimiter,
  twoFAVerifyLimit,
  [
    body('tempSessionId').notEmpty().withMessage('Temporary session ID is required'),
    body('twoFactorCode').notEmpty().withMessage('2FA code is required')
  ],
  validateRequest,
  logActivity('2fa_verification'),
  asyncHandler(async (req, res) => {
    const { tempSessionId, twoFactorCode, rememberMe = false } = req.body;

    if (!req.deviceInfo || !req.deviceInfo.deviceId) {
      return res.status(400).json(new ApiResponse({
        success: false,
        error: 'Device information is required',
        message: 'Device information must be provided for security verification',
        code: 'DEVICE_INFO_REQUIRED',
        data: {
          requiresDeviceInfo: true
        }
      }));
    }

    const user = await User.findByTempSession(tempSessionId);

    if (!user) {
      return res.status(401).json(new ApiResponse({
        success: false,
        error: 'Session expired',
        message: 'Your session has expired. Please login again',
        code: 'SESSION_EXPIRED',
        data: {
          sessionExpired: true,
          requiresLogin: true
        }
      }));
    }

    const tempSession = user.getTempSession(tempSessionId);
    if (!tempSession) {
      return res.status(401).json(new ApiResponse({
        success: false,
        error: 'Session expired',
        message: 'Your session has expired. Please login again',
        code: 'SESSION_EXPIRED',
        data: {
          sessionExpired: true,
          requiresLogin: true
        }
      }));
    }

    if (!user.twoFactorAuth?.isEnabled) {
      return res.status(400).json(new ApiResponse({
        success: false,
        error: '2FA is not enabled for this account',
        message: 'Two-factor authentication is not enabled for your account',
        code: 'TWO_FA_NOT_ENABLED',
        data: {
          twoFactorEnabled: false,
          requiresSetup: true
        }
      }));
    }

    // Check 2FA lockout
    if (user.twoFactorAuth.lockedUntil && user.twoFactorAuth.lockedUntil > new Date()) {
      const lockoutTime = Math.ceil((user.twoFactorAuth.lockedUntil - new Date()) / 60000);

      return res.status(423).json(new ApiResponse({
        success: false,
        error: 'Account locked due to failed 2FA attempts',
        message: `Your account is temporarily locked due to too many failed 2FA attempts. Please try again in ${lockoutTime} minutes`,
        code: 'TWO_FA_LOCKED',
        data: {
          twoFactorLocked: true,
          lockoutTimeMinutes: lockoutTime,
          lockedUntil: user.twoFactorAuth.lockedUntil
        }
      }));
    }

    // FIXED: Verify 2FA code with proper error handling
    const verified = await user.verify2FACode(twoFactorCode);
    
    if (!verified) {
      user.addAuditLog('TWO_FA_VERIFICATION_FAILED', {
        tempSessionId,
        failedAttempts: user.twoFactorAuth?.failedAttempts || 0,
        deviceInfo: req.deviceInfo
      }, req);

      // CRITICAL: Save failed attempt
      try {
        await user.save();
      } catch (saveError) {
        console.error('Failed to save 2FA failed attempt:', saveError);
      }

      const remainingAttempts = (user.twoFactorAuth?.maxAttempts || 5) - (user.twoFactorAuth?.failedAttempts || 0);

      return res.status(401).json(new ApiResponse({
        success: false,
        error: 'Invalid verification code',
        message: remainingAttempts > 0
          ? `The verification code you entered is incorrect. ${remainingAttempts} attempts remaining`
          : 'Your account has been locked due to too many failed attempts',
        code: 'INVALID_2FA_CODE',
        data: {
          twoFactorFailed: true,
          attemptsRemaining: remainingAttempts,
          maxAttempts: user.twoFactorAuth?.maxAttempts || 5,
          accountLocked: remainingAttempts <= 0
        }
      }));
    }

    // FIXED: 2FA verified - complete login
    const shouldRememberMe = rememberMe || tempSession.rememberMe || false;
    const sessionDuration = shouldRememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    try {
      // Update user login info and create session
      user.updateLoginInfo(tempSession.deviceInfo);
      
      if (typeof user.addDevice === 'function') {
        user.addDevice(tempSession.deviceInfo);
      }
      
      const sessionId = user.createSession(tempSession.deviceInfo, sessionDuration);

      // Clear temporary session
      if (user.preferences?.tempSession && user.preferences.tempSession.tempSessionId === tempSessionId) {
        user.preferences.tempSession = undefined;
        user.markModified('preferences.tempSession');
      }

      // CRITICAL: Save all changes
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          sessionId,
          role: user.role,
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        {
          expiresIn: shouldRememberMe ? '30d' : '7d',
          issuer: process.env.JWT_ISSUER || 'transitflow',
          audience: process.env.JWT_AUDIENCE || 'transitflow-users'
        }
      );

      // Set secure HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'strict' : 'lax'),
        maxAge: parseInt(process.env.COOKIE_MAX_AGE) || sessionDuration,
        path: process.env.COOKIE_PATH || '/'
      });

      user.addAuditLog('LOGIN_SUCCESS_2FA', {
        sessionId,
        tempSessionId,
        sessionDuration: shouldRememberMe ? '30 days' : '7 days'
      }, req);

      const responseData = {
        user: sanitizeUser(user),
        sessionId,
        expiresIn: sessionDuration,
        requiresEmailVerification: !user.isEmailVerified,
        requiresOnboarding: !user.homeLocation && !user.profile?.isComplete
      };

      res.status(200).json(new ApiResponse({
        success: true,
        message: '2FA verification successful',
        data: responseData
      }));

    } catch (sessionError) {
      console.error('2FA session creation error:', sessionError);

      try {
        user.addAuditLog('TWO_FA_SESSION_ERROR', {
          tempSessionId,
          error: sessionError.message,
          deviceInfo: req.deviceInfo
        }, req);
        await user.save();
      } catch (auditSaveError) {
        console.error('Failed to save 2FA error audit log:', auditSaveError);
      }

      return res.status(500).json(new ApiResponse({
        success: false,
        error: 'Unable to complete 2FA verification',
        message: 'An error occurred while completing your login. Please try again',
        code: 'TWO_FA_SESSION_ERROR',
        data: {
          internalError: true,
          timestamp: new Date()
        }
      }));
    }
  })
);

// =============================================================================
// EMAIL VERIFICATION ROUTES
// =============================================================================

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with OTP and activate account
 * @access  Public
 */
router.post('/verify-email',
  emailVerificationLimiter,
  ipRateLimit(10, 15 * 60 * 1000),
  [
    body('email').notEmpty().withMessage('Email address or username is required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit verification code is required')
  ],
  validateRequest,
  logActivity('email_verification'),
  asyncHandler(async (req, res) => {
    const { email: emailOrUsername, otp } = req.body;

    if (!req.deviceInfo || !req.deviceInfo.deviceId) {
      return res.status(400).json(new ApiResponse({
        success: false,
        error: 'Device information is required',
        message: 'Please provide valid device information',
        code: 'DEVICE_INFO_REQUIRED',
        data: {
          deviceInfoMissing: true
        }
      }));
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrUsername.trim());
    const searchField = isEmail ? 'email' : 'username';
    const searchValue = emailOrUsername.trim().toLowerCase();

    const user = await User.findOne({
      [searchField]: searchValue,
      isDeleted: { $ne: true }
    });

    if (!user) {
      return res.status(404).json(new ApiResponse({
        success: false,
        error: 'Account not found',
        message: 'The requested account could not be found. Please check your information and try again',
        code: 'USER_NOT_FOUND',
        data: {
          accountExists: false,
          suggestion: 'verify_account_details'
        }
      }));
    }

    if (user.isEmailVerified) {
      // User already verified, check if device is trusted
      const deviceTrusted = await isDeviceTrusted(user, req.deviceInfo);

      if (!deviceTrusted) {
        // Generate and save device verification token
        const verificationToken = user.generateDeviceVerificationToken(req.deviceInfo);

        // Save user with pending verification
        await user.save();

        // Send device verification email
        await sendDeviceVerificationEmail(user, req.deviceInfo, req);

        user.addAuditLog('LOGIN_BLOCKED_UNTRUSTED_DEVICE', {
          deviceInfo: req.deviceInfo,
          loginMethod: 'password',
          verificationTokenGenerated: true
        }, req);

        return res.status(403).json(new ApiResponse({
          success: false,  // Changed from true to false
          error: 'Device verification required',  // Clear error message
          message: 'For your security, please verify this device using the link sent to your email.',
          code: 'DEVICE_NOT_TRUSTED',
          data: {
            requiresDeviceVerification: true,
            email: user.email.substring(0, 3) + '***' + user.email.substring(user.email.indexOf('@')),
            verificationMessage: 'For your security, please verify this device using the link sent to your email.'
          }
        }));
      }

      // Create session for already verified user on trusted device
      const sessionDuration = 7 * 24 * 60 * 60 * 1000;
      const sessionId = user.createSession(req.deviceInfo, sessionDuration);

      const token = jwt.sign(
        {
          userId: user._id.toString(),
          sessionId,
          role: user.role,
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, {
        httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'strict' : 'lax'),
        maxAge: parseInt(process.env.COOKIE_MAX_AGE) || sessionDuration,
        path: process.env.COOKIE_PATH || '/'
      });

      return res.json(new ApiResponse({
        success: true,
        message: 'Email is already verified. You are now logged in.',
        data: {
          user: sanitizeUser(user),
          sessionId,

          alreadyVerified: true,
          deviceTrusted: true
        }
      }));
    }

    // Verify OTP
    const isValidOTP = user.verifyEmailOTP ?
      user.verifyEmailOTP(otp) :
      false;

    if (!isValidOTP) {
      user.addAuditLog('EMAIL_VERIFICATION_FAILED', {
        reason: 'Invalid or expired OTP',
        deviceInfo: req.deviceInfo
      }, req);

      return res.status(400).json(new ApiResponse({
        success: false,
        error: 'Invalid or expired verification code',
        message: 'The verification code you entered is either invalid or has expired. Please request a new one',
        code: 'INVALID_VERIFICATION_CODE',
        data: {
          verificationFailed: true,
          codeExpired: true,
          canRequestNew: true
        }
      }));
    }

    // Mark email as verified and device as trusted
    user.isEmailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpires = undefined;

    // Mark device as trusted during email verification
    await markDeviceAsTrusted(user, req.deviceInfo, false);

    const sessionDuration = 7 * 24 * 60 * 60 * 1000;
    const sessionId = user.createSession(req.deviceInfo, sessionDuration);

    user.updateLoginInfo(req.deviceInfo);

    user.addAuditLog('EMAIL_VERIFIED', {
      verificationMethod: 'OTP',
      deviceInfo: req.deviceInfo,
      deviceTrusted: true
    }, req);

    user.addNotification(
      'success',
      'Email Verified Successfully!',
      'Your email address has been verified and your account is now active.',
      {
        verificationDate: new Date(),
        deviceTrusted: true
      }
    );

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        sessionId,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: sessionDuration,
      path: '/'
    });

    // Send welcome email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Authn - Your Account is Active!',
        template: 'welcome',
        data: {
          name: user.fullName || user.username,
          username: user.username,
          dashboardUrl: process.env.DASHBOARD_URL
        }
      });
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
    }

    res.json(new ApiResponse({
      success: true,
      message: 'Email verified successfully! Welcome to Authn.',
      data: {
        user: sanitizeUser(user),
        sessionId,
        expiresIn: sessionDuration,
        requiresOnboarding: !user.homeLocation && !user.profile?.isComplete,
        isNewlyVerified: true,
        deviceTrusted: true
      }
    }));
  })
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification OTP
 * @access  Public
 */
router.post('/resend-verification',
  emailVerificationLimiter,
  ipRateLimit(5, 15 * 60 * 1000),
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email or username is required')
  ],
  validateRequest,
  logActivity('resend_verification'),
  asyncHandler(async (req, res) => {
    const { email: emailOrUsername } = req.body;

    // Check if email/username is provided
    if (!emailOrUsername || !emailOrUsername.trim()) {
      return res.status(400).json(new ApiResponse({
        success: false,
        error: 'Email or username is required',
        message: 'Please provide your email address or username to resend verification',
        code: 'EMAIL_USERNAME_REQUIRED',
        data: {
          fieldRequired: 'email_or_username',
          acceptedFormats: ['email', 'username']
        }
      }));
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrUsername);
    let user;

    try {
      if (isEmail) {
        user = await User.findByEmail(emailOrUsername);
      } else {
        user = await User.findOne({ username: emailOrUsername.toLowerCase() });
      }
    } catch (dbError) {
      console.error('Database error in resend verification:', dbError);

      return res.status(500).json(new ApiResponse({
        success: false,
        error: 'Database error occurred',
        message: 'An error occurred while processing your request. Please try again',
        code: 'DATABASE_ERROR',
        data: {
          internalError: true,
          timestamp: new Date()
        }
      }));
    }

    // Always return success to prevent enumeration
    if (!user || user.isEmailVerified) {
      return res.json(new ApiResponse({
        success: true,
        message: 'If the account exists and is unverified, a verification code has been sent',
        data: {
          emailSent: true,
          note: 'Response sent for security purposes'
        }
      }));
    }

    // Generate new OTP
    let verificationOTP;
    try {
      verificationOTP = user.generateEmailVerificationOTP();
      await user.save();
    } catch (otpError) {
      console.error('OTP generation error:', otpError);

      return res.status(500).json(new ApiResponse({
        success: false,
        error: 'Failed to generate verification code',
        message: 'Unable to generate a new verification code. Please try again',
        code: 'OTP_GENERATION_FAILED',
        data: {
          otpFailed: true,
          canRetry: true
        }
      }));
    }

    // Send verification email
    let emailSent = false;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify Your Email Address',
        template: 'email-verification',
        data: {
          name: user.fullName || user.username,
          email: user.email,
          otp: verificationOTP,
          expiresIn: '10 minutes'
        }
      });
      emailSent = true;
    } catch (emailError) {
      console.error('Resend verification email error:', emailError);

      // Update user to mark email send failure
      await User.findByIdAndUpdate(user._id, {
        'emailVerification.needsResend': true,
        'emailVerification.lastAttempt': new Date()
      });

      user.addAuditLog('EMAIL_SEND_FAILED', {
        emailType: 'verification_resend',
        error: emailError.message
      }, req);

      return res.status(500).json(new ApiResponse({
        success: false,
        error: 'Failed to send verification email',
        message: 'We were unable to send the verification email. Please try again in a few minutes',
        code: 'EMAIL_SEND_FAILED',
        data: {
          emailFailed: true,
          canRetry: true,
          retryAfter: '2 minutes'
        }
      }));
    }

    res.json(new ApiResponse({
      success: true,
      message: 'If the account exists and is unverified, a verification code has been sent',
      data: {
        emailSent: true,
        masked_email: user.email.substring(0, 3) + '***' + user.email.substring(user.email.indexOf('@')),
        expiresIn: '10 minutes'
      }
    }));
  })
);

// =============================================================================
// PASSWORD RESET ROUTES
// =============================================================================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password',
  passwordResetLimiter,
  ipRateLimit(5, 60 * 60 * 1000), // 5 per hour per IP
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  validateRequest,
  logActivity('password_reset_request'),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findByEmail(email);

    // Always return success to prevent enumeration
    if (!user || user.isDeleted || !user.isActive) {
      return res.json(new ApiResponse({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset link'
      }));
    }

    // Check if account is social-only
    if (user.isSocialUser && user.isSocialUser() && !user.passwordHash) {
      return res.json(new ApiResponse({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset link'
      }));
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    user.addAuditLog('PASSWORD_RESET_REQUESTED', {
      email: email.substring(0, 3) + '***',
      deviceInfo: req.deviceInfo
    }, req);
    await user.save();

    // Send reset email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request - TransitFLOW',
        template: 'password-reset',
        data: {
          name: user.fullName || user.username,
          email: user.email,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
          expiresIn: '30 minutes'
        }
      });
    } catch (emailError) {
      console.error('Password reset email error:', emailError);
    }

    res.json(new ApiResponse({
      success: true,
      message: 'If an account with this email exists, you will receive a password reset link'
    }));
  })
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password',
  authLimiter,
  ipRateLimit(10, 60 * 60 * 1000),
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8-128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-=_~`|\\(){}\[\]:";'<>,.\/])[A-Za-z\d@$!%*?&#+\-=_~`|\\(){}\[\]:";'<>,.\/]+$/)
      .withMessage('Password must contain at least: 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character')
  ],
  validateRequest,
  logActivity('password_reset'),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!req.deviceInfo || !req.deviceInfo.deviceId) {
      throw new ApiError('Device information is required', 400, 'DEVICE_INFO_REQUIRED');
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      isDeleted: false
    });

    if (!user) {
      throw new ApiError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

    // Set new password
    user.passwordHash = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = undefined;

    // Revoke all sessions for security
    user.revokeAllSessions();

    // Mark current device as trusted since user verified via email
    await markDeviceAsTrusted(user, req.deviceInfo, false);

    user.addAuditLog('PASSWORD_RESET_COMPLETED', {
      deviceInfo: req.deviceInfo,
      deviceTrusted: true
    }, req);

    user.addNotification(
      'security',
      'Password Changed Successfully',
      'Your password has been reset and this device has been marked as trusted.',
      {
        deviceInfo: req.deviceInfo,
        timestamp: new Date()
      }
    );

    await user.save();

    res.json(new ApiResponse({
      success: true,
      message: 'Password has been reset successfully. This device is now trusted.',
      data: {
        deviceTrusted: true,
        sessionsRevoked: true
      }
    }));
  })
);

// =============================================================================
// UTILITY ROUTES
// =============================================================================

/**
 * @route   GET /api/auth/check-username/:username
 * @desc    Check if username is available
 * @access  Public
 */
router.get('/check-username/:username',
  generalLimiter,
  ipRateLimit(30, 15 * 60 * 1000),
  [param('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/)],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const normalizedUsername = username.toLowerCase();

    const reserved = [
      'admin', 'api', 'www', 'support', 'help', 'root', 'system', 'test', 'user',
      'moderator', 'mod', 'administrator', 'superuser', 'staff', 'employee',
      'transitflow', 'transit-flow', 'transit_flow', 'official', 'service',
      'info', 'contact', 'sales', 'marketing', 'legal', 'privacy', 'terms',
      'security', 'abuse', 'noreply', 'no-reply', 'postmaster', 'webmaster'
    ];

    const isReserved = reserved.includes(normalizedUsername);
    const existingUser = await User.findByUsername(normalizedUsername);
    const available = !existingUser && !isReserved;

    res.json(new ApiResponse({
      success: true,
      message: 'Username availability checked',
      data: {
        username: normalizedUsername,
        available: available,
        reason: !available ? (isReserved ? 'reserved' : 'taken') : null
      }
    }));
  })
);

/**
 * @route   GET /api/auth/check-email/:email
 * @desc    Check if email is available
 * @access  Public
 */
router.get('/check-email/:email',
  generalLimiter,
  ipRateLimit(30, 15 * 60 * 1000),
  [param('email').isEmail().normalizeEmail()],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { email } = req.params;
    const existingUser = await User.findByEmail(email);

    res.json(new ApiResponse({
      success: true,
      message: 'Email availability checked',
      data: {
        email: email.toLowerCase(),
        available: !existingUser
      }
    }));
  })
);

/**
 * @route   GET /api/auth/suggest-usernames
 * @desc    Get username suggestions
 * @access  Public
 */
router.get('/suggest-usernames',
  generalLimiter,
  ipRateLimit(20, 15 * 60 * 1000),
  asyncHandler(async (req, res) => {
    const { name } = req.query;

    if (!name || !name.trim()) {
      throw new ApiError('Name parameter is required', 400, 'NAME_REQUIRED');
    }

    const existingUsernames = await User.find({
      isDeleted: false
    }).distinct('username');

    const suggestions = generateUsernameSuggestions(name.trim(), existingUsernames);

    res.json(new ApiResponse({
      success: true,
      message: 'Username suggestions generated',
      data: { suggestions }
    }));
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user with comprehensive validation
 * @access  Private
 */
router.get('/me',
  generalLimiter,
  authenticateToken,
  validateSession,
  requireTrustedDevice,
  userRateLimit(100, 15 * 60 * 1000),
  logActivity('profile_access'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId)
      .select('-passwordHash -twoFactorAuth.secret -twoFactorAuth.backupCodes -emailVerificationOTP -passwordResetToken');

    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive || user.isDeleted) {
      throw new ApiError('Account is not active', 403, 'ACCOUNT_INACTIVE');
    }

    res.json(new ApiResponse({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: sanitizeUser(user),
        unreadNotifications: user.getUnreadNotificationsCount ? user.getUnreadNotificationsCount() : 0,
        activeSessions: user.sessions?.filter(s => s.isActive && s.expiresAt > new Date()).length || 0,
        trustedDevicesCount: user.trustedDevices?.filter(d => d.isTrusted && d.isActive !== false).length || 0
      }
    }));
  })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh',
  generalLimiter,
  authenticateToken,
  validateSession,
  requireTrustedDevice,
  userRateLimit(50, 15 * 60 * 1000),
  logActivity('token_refresh'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);

    if (!user || !user.isActive || user.isDeleted) {
      throw new ApiError('User not found or inactive', 404, 'USER_NOT_FOUND');
    }

    // Validate current session
    const session = user.sessions?.find(s =>
      s.sessionId === req.user.sessionId &&
      s.isActive &&
      s.expiresAt > new Date()
    );

    if (!session) {
      throw new ApiError('Session expired or invalid', 401, 'SESSION_INVALID');
    }

    // Generate new token with same expiration as current session
    const remainingTime = Math.floor((session.expiresAt - Date.now()) / 1000);

    if (remainingTime < 60) { // Less than 1 minute remaining
      throw new ApiError('Session too close to expiry', 401, 'SESSION_EXPIRING');
    }

    const token = jwt.sign(
      {
        userId: user._id,
        sessionId: req.user.sessionId,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: remainingTime }
    );

    // Update session activity
    session.lastActivity = new Date();
    if (session.device) {
      session.device.lastUsed = new Date();
    }
    await user.save();

    // Set new cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: remainingTime * 1000,
      path: '/'
    });

    res.json(new ApiResponse({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        expiresAt: session.expiresAt,
        remainingTime: remainingTime
      }
    }));
  })
);

// =============================================================================
// COMPREHENSIVE ERROR HANDLER
// =============================================================================

const authErrorHandler = (err, req, res, next) => {
  console.error('Authentication Error:', {
    name: err.name,
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(new ApiResponse({
      success: false,
      error: err.message,
      code: err.code,
      data: err.data || null
    }));
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const validationErrors = {};
    Object.keys(err.errors).forEach(key => {
      validationErrors[key] = err.errors[key].message;
    });

    return res.status(400).json(new ApiResponse({
      success: false,
      error: 'Validation failed',
      message: 'One or more validation errors occurred',
      code: 'VALIDATION_ERROR',
      data: {
        details: validationErrors
      }
    }));
  }

  // Handle express-validator errors
  if (err.array && typeof err.array === 'function') {
    const validationErrors = {};
    err.array().forEach(error => {
      validationErrors[error.param || error.path] = error.msg;
    });

    return res.status(400).json(new ApiResponse({
      success: false,
      error: 'Invalid input data',
      message: 'One or more validation errors occurred' + (err.message ? `: ${err.message}` : ''),
      code: 'VALIDATION_ERROR',
      data: {
        details: validationErrors
      }
    }));
  }

  // Handle MongoDB errors
  if (err.name === 'CastError') {
    return res.status(400).json(new ApiResponse({
      success: false,
      error: 'Invalid resource ID format',
      message: 'The provided ID does not match the expected format',
      code: 'INVALID_ID_FORMAT'
    }));
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    let field = 'unknown';

    if (err.keyPattern) {
      field = Object.keys(err.keyPattern)[0];
      switch (field) {
        case 'email':
          message = 'An account with this email already exists';
          break;
        case 'username':
          message = 'This username is already taken';
          break;
        case 'phone':
          message = 'An account with this phone number already exists';
          break;
        default:
          message = `This ${field} is already in use`;
      }
    }

    return res.status(409).json(new ApiResponse({
      success: false,
      error: message,
      code: 'DUPLICATE_FIELD',
      data: {
        field: field
      }
    }));
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    // Clear invalid cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/'
    });

    return res.status(401).json(new ApiResponse({
      success: false,
      error: 'Invalid authentication token',
      message: 'The provided authentication token is invalid or malformed',
      code: 'INVALID_TOKEN'
    }));
  }

  if (err.name === 'TokenExpiredError') {
    // Clear expired cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/'
    });

    return res.status(401).json(new ApiResponse({
      success: false,
      message: 'Authentication token has expired',
      code: 'TOKEN_EXPIRED'
    }));
  }

  // Handle Firebase Auth errors
  if (err.code && err.code.startsWith('auth/')) {
    let message = 'Authentication failed';
    let code = 'FIREBASE_AUTH_ERROR';

    switch (err.code) {
      case 'auth/user-not-found':
        message = 'User not found';
        code = 'USER_NOT_FOUND';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address';
        code = 'INVALID_EMAIL';
        break;
      case 'auth/user-disabled':
        message = 'User account has been disabled';
        code = 'USER_DISABLED';
        break;
      case 'auth/invalid-credential':
        message = 'Invalid credentials provided';
        code = 'INVALID_CREDENTIALS';
        break;
      case 'auth/id-token-expired':
        message = 'Authentication token has expired';
        code = 'TOKEN_EXPIRED';
        break;
      case 'auth/id-token-revoked':
        message = 'Authentication token has been revoked';
        code = 'TOKEN_REVOKED';
        break;
      default:
        message = err.message || 'Authentication failed';
    }

    return res.status(401).json(new ApiResponse({
      success: false,
      error: message,
      code: code
    }));
  }

  // Handle rate limiting errors
  if (err.statusCode === 429 || err.status === 429) {
    return res.status(429).json(new ApiResponse({
      success: false,
      message: err.message || 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      data: {
        retryAfter: err.retryAfter || 900,
        resetTime: err.resetTime || new Date(Date.now() + 900000).toISOString()
      }
    }));
  }

  // Handle network/timeout errors
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(503).json(new ApiResponse({
      success: false,
      message: 'Service temporarily unavailable. Please try again later.',
      code: 'SERVICE_UNAVAILABLE'
    }));
  }

  // Handle SyntaxError (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json(new ApiResponse({
      success: false,
      message: 'Invalid JSON format in request body',
      code: 'INVALID_JSON'
    }));
  }

  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json(new ApiResponse({
      success: false,
      error: 'Cross-origin request not allowed',
      message: 'Cross-origin request not allowed',
      code: 'CORS_ERROR'
    }));
  }

  // Handle permission errors
  if (err.message && (err.message.includes('permission') || err.message.includes('authorize'))) {
    return res.status(403).json(new ApiResponse({
      success: false,
      error: 'Insufficient permissions to access this resource',
      message: 'Insufficient permissions to access this resource',
      code: 'INSUFFICIENT_PERMISSIONS'
    }));
  }

  // Handle database connection errors
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    return res.status(503).json(new ApiResponse({
      success: false,
      error: 'Database service temporarily unavailable',
      message: 'Database service temporarily unavailable',
      code: 'DATABASE_ERROR'
    }));
  }

  // Default server error
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again or contact support.'
    : err.message || 'Internal server error';

  res.status(statusCode).json(new ApiResponse({
    success: false,
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && {
      data: {
        stack: err.stack,
        name: err.name
      }
    })
  }));
};

// Apply error handler to all routes
router.use(authErrorHandler);

module.exports = router;