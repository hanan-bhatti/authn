const rateLimit = require('express-rate-limit');
const config = require('../utils/config');

/**
 * Create rate limiter with custom configuration
 * @param {Object} options - Rate limit options
 * @returns {Function} Rate limiter middleware
 */
const createRateLimiter = (options) => {
  const defaultOptions = {
    windowMs: options.windowMs || config.RATE_LIMIT_WINDOW_MS || 900000,
    max: options.max || config.RATE_LIMIT_MAX_REQUESTS || 100,
    message: options.message || config.RATE_LIMIT_MESSAGE || 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting if disabled in dev mode
      if (config.DEV_DISABLE_RATE_LIMITING) return true;
      
      // Skip specific paths
      const skipPaths = config.RATE_LIMIT_SKIP_PATHS || [];
      return skipPaths.some(path => req.path.startsWith(path));
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * General API rate limiter
 */
const generalRateLimiter = createRateLimiter({
  windowMs: config.GENERAL_RATE_LIMIT_WINDOW_MS,
  max: config.GENERAL_RATE_LIMIT_MAX_REQUESTS,
  message: config.GENERAL_RATE_LIMIT_MESSAGE
});

/**
 * Authentication endpoints rate limiter
 */
const authRateLimiter = createRateLimiter({
  windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
  max: config.AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: config.AUTH_RATE_LIMIT_MESSAGE
});

/**
 * Password reset rate limiter
 */
const passwordResetRateLimiter = createRateLimiter({
  windowMs: config.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
  max: config.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS,
  message: config.PASSWORD_RESET_RATE_LIMIT_MESSAGE
});

/**
 * Email verification rate limiter
 */
const emailVerificationRateLimiter = createRateLimiter({
  windowMs: config.EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS,
  max: config.EMAIL_VERIFICATION_RATE_LIMIT_MAX_REQUESTS,
  message: config.EMAIL_VERIFICATION_RATE_LIMIT_MESSAGE
});

/**
 * Google auth rate limiter
 */
const googleAuthRateLimiter = createRateLimiter({
  windowMs: config.GOOGLE_AUTH_RATE_LIMIT_WINDOW_MS,
  max: config.GOOGLE_AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: config.GOOGLE_AUTH_RATE_LIMIT_MESSAGE
});

module.exports = {
  createRateLimiter,
  generalRateLimiter,
  authRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
  googleAuthRateLimiter
};
