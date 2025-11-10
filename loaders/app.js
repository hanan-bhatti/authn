const express = require('express');
const config = require('../utils/config');
const { setLogger: setCommonLogger, setupCommonMiddleware } = require('../middleware/common');
const { setupCors } = require('../middleware/cors');
const { setupSession, setupPassport } = require('../middleware/passport');
const { setBackupService, setLogger: setBackupLogger, trackFailedAttempts, enhancedErrorHandler, preventDataLoss } = require('../middleware/backup');
const { configureRoutes } = require('../config/routes');
const healthRoutes = require('../routes/health');

// Import route modules
const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/user');
const pagesRoutes = require('../routes/pages');
const infoRoutes = require('../routes/info');
const docsRoutes = require('../routes/docs');

/**
 * Initialize Express application
 * @param {Object} backupService - User backup service instance
 * @param {Object} logger - Logger instance
 * @returns {Object} Express app instance
 */
const initializeApp = (backupService, logger) => {
  const app = express();

  // Disable x-powered-by header for security
  app.disable('x-powered-by');

  // Trust proxy for deployments behind reverse proxy
  if (config.IS_PRODUCTION) {
    app.set('trust proxy', 1);
  }

  // Setup backup service for middleware
  if (backupService) {
    setBackupService(backupService);
  }

  // Setup logger for middleware
  if (logger) {
    setBackupLogger(logger);
    setCommonLogger(logger);
  }

  // Setup common middleware (security, compression, body parser, logging, timeout)
  setupCommonMiddleware(app);

  // Setup CORS
  setupCors(app);

  // Setup session management
  setupSession(app);

  // Setup Passport authentication
  setupPassport(app);

  // Configure routes based on deployment mode (this includes HTML pages for /health, /info, etc.)
  configureRoutes(app, {
    authRoutes,
    userRoutes,
    infoRoutes,
    docsRoutes,
    pagesRoutes
  }, logger);

  // API Health check routes (mounted after HTML page routes)
  app.use('/api/health', healthRoutes);

  // Track failed backup attempts
  app.use(trackFailedAttempts);

  // Error handling middleware (must be last)
  app.use(enhancedErrorHandler);

  return app;
};

module.exports = initializeApp;
