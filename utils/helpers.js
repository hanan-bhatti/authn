const { validationResult } = require('express-validator');
const crypto = require('crypto');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, isOperational = true, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.name = 'ApiError';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standardized API Response class
 */
class ApiResponse {
  constructor({ data = null, message = 'Success', meta = null, pagination = null } = {}) {
    this.success = true;
    this.message = message;
    this.timestamp = new Date().toISOString();

    if (data !== null) this.data = data;
    if (meta !== null) this.meta = meta;
    if (pagination !== null) this.pagination = pagination;
  }
}

/**
 * Async error handler wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Enhanced validation middleware
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Request validation failed:', errors.array());

    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param || error.location,
      message: error.msg,
      value: error.value
    }));

    console.log('Formatted validation errors:', formattedErrors);

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Please check your input and try again',
      details: formattedErrors.map(e => `${e.field}: ${e.message}`),
      fields: formattedErrors
    });
  }
  next();
};

/**
 * Enhanced user sanitization function
 */
const sanitizeUser = (user) => {
  if (!user) return null;

  // Convert to object if it's a Mongoose document
  const userObj = user.toObject ? user.toObject() : user;

  // Remove sensitive fields
  const sanitized = { ...userObj };
  delete sanitized.passwordHash;
  delete sanitized.emailVerificationOTP;
  delete sanitized.passwordResetToken;
  delete sanitized.failedLoginAttempts;
  delete sanitized.accountLockedUntil;
  delete sanitized.__v;

  // Sanitize two-factor auth
  if (sanitized.twoFactorAuth) {
    delete sanitized.twoFactorAuth.secret;
    delete sanitized.twoFactorAuth.backupCodes;
  }

  // Sanitize API keys
  if (sanitized.apiKeys) {
    sanitized.apiKeys = sanitized.apiKeys.map(key => ({
      _id: key._id,
      name: key.name,
      permissions: key.permissions,
      isActive: key.isActive,
      lastUsed: key.lastUsed,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt
    }));
  }

  // Sanitize sessions
  if (sanitized.sessions) {
    sanitized.sessions = sanitized.sessions.map(session => ({
      device: session.device,
      isActive: session.isActive,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    }));
  }

  // Convert coordinates for easier frontend consumption
  if (sanitized.homeLocation && sanitized.homeLocation.coordinates) {
    sanitized.homeLocation.latitude = sanitized.homeLocation.coordinates[1];
    sanitized.homeLocation.longitude = sanitized.homeLocation.coordinates[0];
  }

  // Clean up undefined values
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });

  return sanitized;
};

/**
 * Enhanced activity logging
 */
const logActivity = (user, action, details = {}, req = {}) => {
  const logData = {
    userId: typeof user === 'object' ? (user._id || user.id) : user,
    action,
    details,
    ipAddress: req.ip || (req.connection && req.connection.remoteAddress),
    userAgent: req.get && req.get('User-Agent'),
    timestamp: new Date()
  };

  // If user object has addAuditLog method, use it
  if (user && typeof user.addAuditLog === 'function') {
    user.addAuditLog(action, details, req);
  }

  // Log in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('Activity Log:', JSON.stringify(logData, null, 2));
  }

  return logData;
};

/**
 * Time utilities
 */
const timeUtils = {
  addTime: (date, amount, unit) => {
    const result = new Date(date);

    switch (unit) {
      case 'seconds':
        result.setSeconds(result.getSeconds() + amount);
        break;
      case 'minutes':
        result.setMinutes(result.getMinutes() + amount);
        break;
      case 'hours':
        result.setHours(result.getHours() + amount);
        break;
      case 'days':
        result.setDate(result.getDate() + amount);
        break;
      case 'weeks':
        result.setDate(result.getDate() + (amount * 7));
        break;
      case 'months':
        result.setMonth(result.getMonth() + amount);
        break;
      case 'years':
        result.setFullYear(result.getFullYear() + amount);
        break;
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }

    return result;
  },

  formatDuration: (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  },

  isExpired: (date) => {
    return new Date() > new Date(date);
  },

  secondsToMs: (seconds) => seconds * 1000,
  minutesToMs: (minutes) => minutes * 60 * 1000,
  hoursToMs: (hours) => hours * 60 * 60 * 1000,
  daysToMs: (days) => days * 24 * 60 * 60 * 1000,

  msToSeconds: (ms) => Math.floor(ms / 1000),
  msToMinutes: (ms) => Math.floor(ms / (60 * 1000)),
  msToHours: (ms) => Math.floor(ms / (60 * 60 * 1000)),
  msToDays: (ms) => Math.floor(ms / (24 * 60 * 60 * 1000)),

  timeUntilExpiry: (date) => {
    const now = new Date();
    const expiry = new Date(date);
    return Math.max(0, expiry.getTime() - now.getTime());
  }
};

/**
 * Validation utilities
 */
const validationUtils = {
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidPhone: (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{9,15}$/;
    return phoneRegex.test(phone);
  },

  isValidUsername: (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  },

  isStrongPassword: (password) => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  },

  validatePasswordStrength: (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const checks = {
      length: password.length >= minLength,
      uppercase: hasUpperCase,
      lowercase: hasLowerCase,
      numbers: hasNumbers,
      specialChar: hasSpecialChar
    };

    const score = Object.values(checks).filter(Boolean).length;

    let strength = 'weak';
    if (score >= 4) strength = 'strong';
    else if (score >= 3) strength = 'medium';

    return {
      isValid: Object.values(checks).every(Boolean),
      strength,
      checks,
      score
    };
  },

  isValidCoordinate: (longitude, latitude) => {
    return (
      longitude >= -180 && longitude <= 180 &&
      latitude >= -90 && latitude <= 90
    );
  },

  isString: (value) => typeof value === 'string',
  isNumber: (value) => typeof value === 'number' && !isNaN(value),
  isArray: (value) => Array.isArray(value),
  isObject: (value) => value && typeof value === 'object' && !Array.isArray(value),
  isBoolean: (value) => typeof value === 'boolean',
  isDate: (value) => value instanceof Date && !isNaN(value),
  isEmpty: (value) => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },
  isUrl: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Transformation utilities
 */
const transformUtils = {
  toCamelCase: (str) => {
    return str.replace(/([-_][a-z])/gi, ($1) => {
      return $1.toUpperCase().replace('-', '').replace('_', '');
    });
  },

  toSnakeCase: (str) => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  },

  toKebabCase: (str) => {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  },

  capitalizeFirst: (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  capitalize: (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  generateSlug: (str) => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  formatPhoneNumber: (phone) => {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('92')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+92${cleaned.slice(1)}`;
    } else {
      return `+92${cleaned}`;
    }
  },

  truncate: (str, length, suffix = '...') => {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  },

  removeHtml: (str) => str.replace(/<[^>]*>/g, ''),

  extractUrls: (str) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return str.match(urlRegex) || [];
  },

  countWords: (str) => str.trim().split(/\s+/).length,

  escapeHtml: (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
};

/**
 * Security utilities with alphanumeric OTP
 */
const securityUtils = {
  generateRandomString: (length = 32) => {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  },

  hashString: (str, algorithm = 'sha256') => {
    return crypto.createHash(algorithm).update(str).digest('hex');
  },

  generateOTP: (length = 6, type = 'alphanumeric') => {
    let chars = '';

    switch (type) {
      case 'numeric':
        chars = '0123456789';
        break;
      case 'alphabetic':
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        break;
      case 'alphanumeric':
      default:
        chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        break;
    }

    let otp = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      otp += chars[randomIndex];
    }

    return otp;
  },

  generateApiKey: () => {
    const prefix = 'ak_';
    const randomPart = securityUtils.generateRandomString(32);
    return `${prefix}${randomPart}`;
  },

  isValidApiKey: (apiKey) => {
    return /^ak_[a-f0-9]{32}$/.test(apiKey);
  },

  maskEmail: (email) => {
    if (!email) return '';
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + '*'.repeat(Math.max(0, username.length - 2)) + username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
  },

  maskPhone: (phone) => {
    if (!phone || phone.length <= 4) return phone;
    return phone.slice(0, 3) + '*'.repeat(Math.max(0, phone.length - 6)) + phone.slice(-3);
  },

  maskCreditCard: (cardNumber) => {
    if (!cardNumber) return '';
    return cardNumber.replace(/\d(?=\d{4})/g, '*');
  },

  encrypt: (text, key = process.env.ENCRYPTION_KEY) => {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  },

  decrypt: (encryptedData, key = process.env.ENCRYPTION_KEY) => {
    const algorithm = 'aes-256-cbc';
    const [ivHex, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(algorithm, key);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
};

/**
 * Rate limiting utilities
 */
const rateLimitUtils = {
  createWindowKey: (identifier, window) => {
    const now = Date.now();
    const windowStart = Math.floor(now / window) * window;
    return `${identifier}:${windowStart}`;
  },

  isWithinLimit: async (redis, key, limit, window) => {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, Math.ceil(window / 1000));
    }
    return count <= limit;
  },

  createRateLimitKey: (identifier, action = 'default') => {
    return `ratelimit:${action}:${identifier}`;
  }
};

/**
 * Database utilities
 */
const dbUtils = {
  buildQuery: (filters) => {
    const query = {};

    Object.keys(filters).forEach(key => {
      const value = filters[key];

      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && value.includes('*')) {
          const regexPattern = value.replace(/\*/g, '.*');
          query[key] = { $regex: new RegExp(regexPattern, 'i') };
        } else if (Array.isArray(value)) {
          query[key] = { $in: value };
        } else {
          query[key] = value;
        }
      }
    });

    return query;
  },

  buildSort: (sortBy, sortOrder = 'desc') => {
    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }
    return sort;
  },

  paginate: async (Model, query = {}, options = {}) => {
    const {
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      populate = null,
      select = null
    } = options;

    const skip = (page - 1) * limit;

    let queryBuilder = Model.find(query);

    if (select) queryBuilder = queryBuilder.select(select);
    if (populate) queryBuilder = queryBuilder.populate(populate);

    const [results, total] = await Promise.all([
      queryBuilder.sort(sort).skip(skip).limit(limit).exec(),
      Model.countDocuments(query)
    ]);

    return {
      results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
        nextPage: page < Math.ceil(total / limit) ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      }
    };
  }
};

/**
 * Error handling utilities
 */
const errorUtils = {
  handleDuplicateKey: (error) => {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      return new ApiError(`${field} '${value}' already exists`, 409);
    }
    return error;
  },

  handleValidation: (error) => {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return new ApiError('Validation Error', 400, true, messages);
    }
    return error;
  },

  handleCastError: (error) => {
    if (error.name === 'CastError') {
      return new ApiError(`Invalid ${error.path}: ${error.value}`, 400);
    }
    return error;
  },

  formatError: (error) => {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Environment utilities
 */
const envUtils = {
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production',
  isTesting: () => process.env.NODE_ENV === 'test',

  getRequiredEnv: (key) => {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is missing`);
    }
    return value;
  },

  getOptionalEnv: (key, defaultValue = null) => {
    return process.env[key] || defaultValue;
  }
};

/**
 * Array utilities
 */
const arrayUtils = {
  unique: (arr) => [...new Set(arr)],

  chunk: (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  shuffle: (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  intersection: (arr1, arr2) => arr1.filter(x => arr2.includes(x)),

  difference: (arr1, arr2) => arr1.filter(x => !arr2.includes(x)),

  groupBy: (arr, key) => {
    return arr.reduce((groups, item) => {
      const group = typeof key === 'function' ? key(item) : item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }
};

/**
 * Utility helpers
 */
const utilityHelpers = {
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatDate: (date, format = 'iso') => {
    if (!date) return null;

    const d = new Date(date);

    switch (format) {
      case 'iso':
        return d.toISOString();
      case 'date':
        return d.toDateString();
      case 'time':
        return d.toTimeString();
      case 'locale':
        return d.toLocaleString();
      default:
        return d.toISOString();
    }
  },

  deepMerge: (target, source) => {
    const output = { ...target };

    if (validationUtils.isObject(target) && validationUtils.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (validationUtils.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = utilityHelpers.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  },

  cleanObject: (obj, removeNull = true) => {
    const cleaned = {};

    Object.keys(obj).forEach(key => {
      const value = obj[key];

      if (value !== undefined && (!removeNull || value !== null)) {
        if (validationUtils.isObject(value)) {
          const cleanedNested = utilityHelpers.cleanObject(value, removeNull);
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested;
          }
        } else {
          cleaned[key] = value;
        }
      }
    });

    return cleaned;
  },

  generateCacheKey: (...parts) => {
    return parts.filter(Boolean).join(':');
  },

  safeJsonParse: (str, defaultValue = null) => {
    try {
      return JSON.parse(str);
    } catch (error) {
      return defaultValue;
    }
  },

  debounce: (func, wait) => {
    let timeout;

    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle: (func, limit) => {
    let inThrottle;

    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  toBoolean: (str) => {
    if (typeof str === 'boolean') return str;
    if (typeof str === 'string') {
      return ['true', '1', 'yes', 'on'].includes(str.toLowerCase());
    }
    return false;
  },

  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  generateUsernameSuggestions: (baseName, existingUsernames = []) => {
    const suggestions = [];
    const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const reserved = [
      'admin', 'api', 'www', 'support', 'help', 'root', 'system', 'test', 'user',
      'moderator', 'mod', 'administrator', 'superuser', 'staff', 'employee',
      'transitflow', 'transit-flow', 'transit_flow', 'official', 'service',
      'info', 'contact', 'sales', 'marketing', 'legal', 'privacy', 'terms',
      'security', 'abuse', 'noreply', 'no-reply', 'postmaster', 'webmaster'
    ];
    // Basic variations
    suggestions.push(cleanBase);
    suggestions.push(`${cleanBase}_user`);
    suggestions.push(`user_${cleanBase}`);

    // Add numbers
    for (let i = 1; i <= 99; i++) {
      suggestions.push(`${cleanBase}${i}`);
      suggestions.push(`${cleanBase}_${i}`);
    }

    // Filter out existing usernames and reserved names
    return suggestions.filter(username =>
      !existingUsernames.includes(username) &&
      !reserved.includes(username) &&
      username.length >= 3
    ).slice(0, 10);
  },

  isValidFileType: (filename, allowedTypes) => {
    const extension = filename.split('.').pop().toLowerCase();
    return allowedTypes.includes(extension);
  },

  generateSecureFilename: (originalFilename) => {
    const extension = originalFilename.split('.').pop();
    const timestamp = Date.now();
    const random = securityUtils.generateRandomString(8);
    return `${timestamp}_${random}.${extension}`;
  },

  parseUserAgent: (userAgent) => {
    const isWindows = /Windows/i.test(userAgent);
    const isMac = /Macintosh/i.test(userAgent);
    const isLinux = /Linux/i.test(userAgent);
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent);
    const isFirefox = /Firefox/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !isChrome;

    return {
      browser: isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Unknown',
      os: isWindows ? 'Windows' : isMac ? 'macOS' : isLinux ? 'Linux' : 'Unknown',
      device: isMobile ? 'mobile' : 'desktop'
    };
  }
};

/**
 * Pagination utilities
 */
const paginationUtils = {
  getPaginationMeta: (page, limit, total) => {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      currentPage: parseInt(page),
      totalPages,
      totalItems: total,
      itemsPerPage: parseInt(limit),
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null
    };
  },

  validatePaginationParams: (page, limit, maxLimit = 100) => {
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.min(maxLimit, Math.max(1, parseInt(limit) || 20));

    return { page: validPage, limit: validLimit };
  }
};

/**
 * Performance monitoring utilities
 */
const performanceUtils = {
  startTimer: () => {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1e6; // Convert to milliseconds
    };
  },

  measureAsync: async (fn, label = 'Operation') => {
    const timer = performanceUtils.startTimer();
    try {
      const result = await fn();
      const duration = timer();
      if (envUtils.isDevelopment()) {
        console.log(`${label} completed in ${duration.toFixed(2)}ms`);
      }
      return result;
    } catch (error) {
      const duration = timer();
      if (envUtils.isDevelopment()) {
        console.log(`${label} failed after ${duration.toFixed(2)}ms`);
      }
      throw error;
    }
  }
};

module.exports = {
  // Core classes
  ApiResponse,
  ApiError,

  // Middleware and handlers
  asyncHandler,
  validateRequest,

  // Data utilities
  sanitizeUser,
  logActivity,

  // Time utilities
  timeUtils,

  // Validation utilities
  validationUtils,

  // Transformation utilities  
  transformUtils,

  // Security utilities
  securityUtils,

  // Rate limiting utilities
  rateLimitUtils,

  // Database utilities
  dbUtils,

  // Error handling utilities
  errorUtils,

  // Environment utilities
  envUtils,

  // Array utilities
  arrayUtils,

  // General utility helpers
  utilityHelpers,

  // Performance utilities
  performanceUtils,

  // Pagination utilities
  paginationUtils,

  // Legacy exports for backward compatibility
  generateRandomString: securityUtils.generateRandomString,
  generateOTP: securityUtils.generateOTP,
  hashString: securityUtils.hashString,
  encrypt: securityUtils.encrypt,
  decrypt: securityUtils.decrypt,
  formatFileSize: utilityHelpers.formatFileSize,
  isValidEmail: validationUtils.isValidEmail,
  isValidPhone: validationUtils.isValidPhone,
  validatePasswordStrength: validationUtils.validatePasswordStrength,
  getPaginationMeta: paginationUtils.getPaginationMeta,
  formatDate: utilityHelpers.formatDate,
  deepMerge: utilityHelpers.deepMerge,
  isObject: validationUtils.isObject,
  capitalize: transformUtils.capitalize,
  generateSlug: transformUtils.generateSlug,
  cleanObject: utilityHelpers.cleanObject,
  escapeHtml: transformUtils.escapeHtml,
  generateApiKey: securityUtils.generateApiKey,
  isValidApiKey: securityUtils.isValidApiKey,
  maskEmail: securityUtils.maskEmail,
  maskPhone: securityUtils.maskPhone,
  maskCreditCard: securityUtils.maskCreditCard,
  isValidCoordinate: validationUtils.isValidCoordinate,
  calculateDistance: utilityHelpers.calculateDistance,
  isValidFileType: utilityHelpers.isValidFileType,
  generateSecureFilename: utilityHelpers.generateSecureFilename,
  generateUsernameSuggestions: utilityHelpers.generateUsernameSuggestions,
  parseUserAgent: utilityHelpers.parseUserAgent,
  createRateLimitKey: rateLimitUtils.createRateLimitKey,
  generateCacheKey: utilityHelpers.generateCacheKey,
  safeJsonParse: utilityHelpers.safeJsonParse,
  debounce: utilityHelpers.debounce,
  throttle: utilityHelpers.throttle,
  toBoolean: utilityHelpers.toBoolean
};