/**
 * Authn - Authentication Server
 * Main Entry Point
 * 
 * This file initializes the Express server with modular architecture.
 * All complex logic is extracted into separate modules for maintainability.
 */

require('dotenv').config();
const config = require('./utils/config');
const { initializeLogger } = require('./loaders/logger');
const { connectDatabase } = require('./loaders/database');
const { initializeServices, initializeBackupServices } = require('./loaders/services');
const initializeApp = require('./loaders/app');
const { displayStartupBanner, setupShutdownHandlers, setLogger: setStartupLogger } = require('./loaders/startup');
const { startFrontendServer } = require('./loaders/frontend-server');

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================
let backendServer;
let frontendServer;
let logger;
let backupService;

// ============================================================================
// MAIN STARTUP SEQUENCE
// ============================================================================

const startServer = async () => {
  try {
    // 1. Initialize Logger
    logger = initializeLogger();
    logger.info('Starting server initialization...');

    // Set logger for other modules
    setStartupLogger(logger);

    // 2. Connect to Database
    await connectDatabase();
    
    // 3. Initialize Services
    await initializeServices();
    
    // 4. Initialize Backup Services
    backupService = await initializeBackupServices();
    
    // 5. Initialize Express App
    const app = initializeApp(backupService, logger);
    
    // 6. Start HTTP Server(s) based on deployment mode
    if (config.DEPLOYMENT_MODE === 'different-ports') {
      // Start frontend server on FRONTEND_PORT
      frontendServer = startFrontendServer(config.FRONTEND_PORT, config, logger);
      
      // Start backend server on BACKEND_PORT with optimizations
      backendServer = app.listen(config.BACKEND_PORT, () => {
        logger.info(`🔧 Backend API server started on port ${config.BACKEND_PORT}`);
        displayStartupBanner(config.BACKEND_PORT, config);
      });
    } else {
      // Same-port or separate-domains: single server with high-performance optimizations
      backendServer = app.listen(config.PORT, () => {
        displayStartupBanner(config.PORT, config);
      });
    }

    // Optimize server for high concurrency and low memory footprint (1GB RAM)
    backendServer.maxConnections = 1000; // Reduced from 10k for memory efficiency
    backendServer.timeout = 30000; // 30s timeout for faster failure detection
    backendServer.keepAliveTimeout = 65000; // Keep connections alive for reuse
    backendServer.headersTimeout = 66000; // Slightly higher than keepAliveTimeout
    
    // Prevent memory leaks on high load
    backendServer.maxHeadersCount = 100; // Limit headers per request
    
    // Enable TCP optimization for low latency
    if (backendServer.on) {
      backendServer.on('connection', (socket) => {
        socket.setNoDelay(true); // Disable Nagle's algorithm for faster responses
        socket.setKeepAlive(true, 60000); // Keep connections alive
      });
    }

    // 7. Setup Shutdown Handlers
    setupShutdownHandlers(backendServer, frontendServer);

    // Handle backend server errors
    backendServer.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof config.PORT === 'string' ? 'Pipe ' + config.PORT : 'Port ' + config.PORT;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    if (logger && typeof logger.error === 'function') {
      logger.error('Failed to start server:', error.message);
    } else {
      console.error('Failed to start server:', error.message);
    }
    process.exit(1);
  }
};

// ============================================================================
// START SERVER
// ============================================================================
if (require.main === module) {
  startServer();
}

// Export for testing
module.exports = { startServer };
