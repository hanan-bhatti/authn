const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const express = require('express');
const config = require('../utils/config');

let logger = null;

/**
 * Set logger instance
 * @param {Object} loggerInstance - Logger instance
 */
const setLogger = (loggerInstance) => {
  logger = loggerInstance;
};

/**
 * Configure and apply security middleware (Helmet)
 * @param {Express} app - Express application
 */
const setupSecurity = (app) => {
  app.use(helmet({
    contentSecurityPolicy: config.CSP_ENABLED ? {
      directives: JSON.parse(config.CSP_DIRECTIVES || '{"defaultSrc":["\'self\'"],"styleSrc":["\'self\'","\'unsafe-inline\'","https://cdnjs.cloudflare.com"],"scriptSrcAttr":["\'unsafe-inline\'"]}')
    } : false,
    crossOriginEmbedderPolicy: false,
    xFrameOptions: { action: config.X_FRAME_OPTIONS || 'deny' },
    xContentTypeOptions: config.X_CONTENT_TYPE_OPTIONS === 'nosniff',
    xXssProtection: config.X_XSS_PROTECTION === '1; mode=block',
    referrerPolicy: { policy: config.REFERRER_POLICY || 'no-referrer-when-downgrade' }
  }));
};

/**
 * Configure and apply compression middleware
 * @param {Express} app - Express application
 */
const setupCompression = (app) => {
  if (config.COMPRESSION_ENABLED) {
    app.use(compression({
      level: 1, // Fastest compression for low latency (was 6)
      threshold: 1024,
      filter: (req, res) => {
        // Skip compression for small responses and already compressed content
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      }
    }));
  }
};

/**
 * Configure logging middleware
 * @param {Express} app - Express application
 */
const setupLogging = (app) => {
  if (config.LOG_REQUESTS) {
    const morganFormat = config.LOG_FORMAT === 'json' ? 'combined' : config.LOG_FORMAT || 'dev';
    app.use(morgan(morganFormat, {
      stream: {
        write: (message) => {
          if (logger && logger.info) {
            logger.info(message.trim());
          } else {
            console.log(message.trim());
          }
        }
      }
    }));
  }
};

/**
 * Configure body parsing middleware
 * @param {Express} app - Express application
 */
const setupBodyParser = (app) => {
  app.use(express.json({ 
    limit: config.MAX_REQUEST_SIZE || '1mb' // Reduced from 50mb for security and performance
  }));
  app.use(express.urlencoded({ 
    extended: true,
    limit: config.MAX_REQUEST_SIZE || '1mb'
  }));
  app.use(cookieParser());
};

/**
 * Configure request timeout middleware
 * @param {Express} app - Express application
 */
const setupRequestTimeout = (app) => {
  if (config.REQUEST_TIMEOUT) {
    app.use((req, res, next) => {
      req.setTimeout(config.REQUEST_TIMEOUT, () => {
        if (logger && logger.warn) {
          logger.warn(`Request timeout after ${config.REQUEST_TIMEOUT}ms: ${req.method} ${req.url}`);
        } else {
          console.warn(`Request timeout after ${config.REQUEST_TIMEOUT}ms: ${req.method} ${req.url}`);
        }
        if (!res.headersSent) {
          res.status(408).json({
            error: 'Request Timeout',
            message: 'The request took too long to process'
          });
        }
      });
      next();
    });
  }
};

/**
 * Apply all common middleware
 * @param {Express} app - Express application
 */
const setupCommonMiddleware = (app) => {
  setupSecurity(app);
  setupCompression(app);
  setupBodyParser(app);
  setupLogging(app);
  setupRequestTimeout(app);
};

module.exports = { 
  setLogger,
  setupCommonMiddleware,
  setupSecurity,
  setupCompression,
  setupLogging,
  setupBodyParser,
  setupRequestTimeout
};
