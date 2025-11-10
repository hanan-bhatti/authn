const config = require('../utils/config');
const { closeDatabase } = require('../loaders/database');
const redisService = require('../services/redis');

let logger = null;

/**
 * Set logger instance
 * @param {Object} loggerInstance - Logger instance
 */
const setLogger = (loggerInstance) => {
  logger = loggerInstance;
};

/**
 * Display application startup banner
 */
const displayStartupBanner = () => {
  console.log('\n' + '='.repeat(70));
  console.log(`🚀  ${config.APP_NAME} v${config.APP_VERSION}`);
  console.log(`    ${config.APP_DESCRIPTION}`);
  console.log('='.repeat(70));
  console.log('');
  console.log(`📍 Environment: ${config.NODE_ENV.toUpperCase()}`);
  console.log(`🔌 Deployment Mode: ${config.DEPLOYMENT_MODE}`);
  console.log(`⚙️  Server Port: ${config.PORT}`);
  console.log('');
  console.log(`🔗 Backend URL: ${config.IS_PRODUCTION ? config.PROD_BASE_URL : config.BASE_URL}`);
  console.log(`🌐 API Base: ${config.IS_PRODUCTION ? config.PROD_BASE_URL : config.BASE_URL}/api${config.API_VERSIONING_ENABLED ? `/${config.API_VERSION}` : ''}`);
  
  if (config.API_DOCS_ENABLED) {
    console.log(`📚 API Docs: ${config.IS_PRODUCTION ? config.PROD_BASE_URL : config.BASE_URL}/api${config.API_VERSIONING_ENABLED ? `/${config.API_VERSION}` : ''}/docs`);
  }
  
  console.log(`🎨 Frontend URL: ${config.IS_PRODUCTION ? config.PROD_FRONTEND_URL : config.FRONTEND_URL}`);
  console.log(`📊 Dashboard: ${config.IS_PRODUCTION ? config.PROD_DASHBOARD_URL : config.DASHBOARD_URL}`);
  console.log('');
  console.log(`💚 Health Check: ${config.IS_PRODUCTION ? config.PROD_BASE_URL : config.BASE_URL}/health`);
  console.log(`📈 Status: Running`);
  console.log('');
  console.log('⚙️  Configuration:');
  console.log(`   • Deployment Mode: ${config.DEPLOYMENT_MODE.toUpperCase()}`);
  
  // Show deployment mode port configuration
  if (config.DEPLOYMENT_MODE === 'same-port') {
    console.log(`   • Port Strategy: Frontend & Backend on port ${config.PORT}`);
  } else if (config.DEPLOYMENT_MODE === 'different-ports') {
    console.log(`   • Port Strategy: Frontend:${config.FRONTEND_PORT}, Backend:${config.BACKEND_PORT}`);
  } else if (config.DEPLOYMENT_MODE === 'separate-domains') {
    console.log(`   • Port Strategy: Separate domains`);
  }
  
  console.log(`   • CORS All Origins: ${config.DEV_CORS_ALL_ORIGINS ? 'Enabled (Dev)' : 'Restricted'}`);
  console.log(`   • Rate Limiting: ${config.DEV_DISABLE_RATE_LIMITING ? 'Disabled (Dev)' : 'Enabled'}`);
  console.log(`   • Detailed Errors: ${config.DEV_DETAILED_ERRORS ? 'Enabled (Dev)' : 'Disabled'}`);
  console.log(`   • Compression: ${config.COMPRESSION_ENABLED ? 'Enabled' : 'Disabled'}`);
  console.log(`   • API Versioning: ${config.API_VERSIONING_ENABLED ? `Enabled (${config.API_VERSION})` : 'Disabled'}`);
  console.log('');
  console.log(`📧 Support: ${config.APP_SUPPORT_EMAIL}`);
  console.log(`👨‍💻 Author: ${config.APP_AUTHOR}`);
  console.log('');
  console.log('='.repeat(70));
  console.log('');
};

/**
 * Graceful shutdown handler
 * @param {String} signal - Shutdown signal
 * @param {Object} backendServer - HTTP backend server instance
 * @param {Object} frontendServer - HTTP frontend server instance (optional)
 */
const gracefulShutdown = (signal, backendServer, frontendServer) => {
  console.log(`\n⚠️  Received ${signal}. Starting graceful shutdown...`);
  
  const closeServers = async () => {
    // Close backend server
    if (backendServer) {
      await new Promise((resolve) => {
        backendServer.close(() => {
          console.log('✅ Backend server closed');
          resolve();
        });
      });
    }
    
    // Close frontend server if it exists
    if (frontendServer) {
      await new Promise((resolve) => {
        frontendServer.close(() => {
          console.log('✅ Frontend server closed');
          resolve();
        });
      });
    }
  };
  
  closeServers().then(async () => {
    try {
      // Close Redis connection
      if (config.REDIS_ENABLED) {
        await redisService.disconnect();
        console.log('✅ Redis disconnected');
      }
      
      // Close database connection
      await closeDatabase();
      
      console.log('👋 Process terminated gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after 30 seconds');
    process.exit(1);
  }, 30000);
};

/**
 * Setup shutdown handlers
 * @param {Object} backendServer - HTTP backend server instance
 * @param {Object} frontendServer - HTTP frontend server instance (optional)
 */
const setupShutdownHandlers = (backendServer, frontendServer = null) => {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', backendServer, frontendServer));
  process.on('SIGINT', () => gracefulShutdown('SIGINT', backendServer, frontendServer));
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    if (logger && typeof logger.error === 'function') {
      logger.error('Unhandled Rejection', { reason, promise });
    }
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (logger && typeof logger.error === 'function') {
      logger.error('Uncaught Exception', error);
    }
    process.exit(1);
  });
};

module.exports = {
  setLogger,
  displayStartupBanner,
  gracefulShutdown,
  setupShutdownHandlers
};
