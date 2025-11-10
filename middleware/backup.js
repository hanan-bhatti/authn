const User = require('../models/User');
const { ApiResponse, ApiError } = require('../utils/helpers');
const config = require('../utils/config');

let backupService = null;
let logger = null;

/**
 * Set logger instance
 * @param {Object} loggerInstance - Logger instance
 */
const setLogger = (loggerInstance) => {
  logger = loggerInstance;
};

/**
 * Set backup service instance
 * @param {Object} service - Backup service instance
 */
const setBackupService = (service) => {
  backupService = service;
};

/**
 * Track failed login attempts middleware
 */
const trackFailedAttempts = async (req, res, next) => {
  try {
    res.on('finish', async () => {
      if (req.user && (req.failedLogin || req.failed2FA)) {
        try {
          await req.user.save();
          console.log('Failed attempt tracked and saved');
        } catch (saveError) {
          console.error('Failed to save failed attempt:', saveError);
        }
      }
    });
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Enhanced error handling middleware with backup creation
 */
const enhancedErrorHandler = (err, req, res, next) => {
  if (logger) {
    logger.error({
      message: err.message,
      name: err.name,
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?._id
    });
  } else {
    console.error('Error:', err.message, err.stack);
  }

  // Create backup if user data might be affected
  if (req.user && err.statusCode >= 500 && backupService) {
    setImmediate(async () => {
      try {
        const user = await User.findById(req.user.userId);
        if (user) {
          await backupService.createUserBackup(user, 'error_backup', {
            error: err.message,
            errorCode: err.code,
            url: req.url,
            method: req.method
          });
        }
      } catch (backupError) {
        console.error('Failed to create error backup:', backupError);
      }
    });
  }

  // Handle ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      data: err.data || null
    });
  }

  // Handle MongoDB duplicate key errors
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

    return res.status(409).json({
      success: false,
      error: message,
      code: 'DUPLICATE_FIELD',
      data: { field }
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const validationErrors = {};
    Object.keys(err.errors).forEach(key => {
      validationErrors[key] = err.errors[key].message;
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'One or more validation errors occurred',
      code: 'VALIDATION_ERROR',
      data: { details: validationErrors }
    });
  }

  // Default server error
  const statusCode = err.statusCode || err.status || 500;
  const message = config.DEV_DETAILED_ERRORS
    ? err.message || 'Internal server error'
    : 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
    ...(config.DEV_DETAILED_ERRORS && {
      data: {
        stack: err.stack,
        name: err.name
      }
    })
  });
};

/**
 * Pre-deletion middleware to prevent data loss
 */
const preventDataLoss = async (req, res, next) => {
  if (req.user && backupService) {
    try {
      const user = await User.findById(req.user.userId);
      if (user && !user.isBackedUp) {
        await backupService.createUserBackup(user, 'safety_backup', {
          trigger: 'pre_operation_safety',
          route: req.route?.path || req.url,
          method: req.method
        });
      }
    } catch (error) {
      console.error('Safety backup failed:', error);
    }
  }
  next();
};

module.exports = {
  setBackupService,
  setLogger,
  trackFailedAttempts,
  enhancedErrorHandler,
  preventDataLoss
};
