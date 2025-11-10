/**
 * Frontend Static File Server
 * Serves the public folder on a separate port for different-ports deployment mode
 */

const express = require('express');
const path = require('path');
const compression = require('compression');

/**
 * Initialize and start the frontend static file server
 * @param {number} port - Port to run the frontend server on
 * @param {object} config - Configuration object
 * @param {object} logger - Logger instance
 * @returns {object} - Frontend server instance
 */
const startFrontendServer = (port, config, logger) => {
  const app = express();
  
  // Enable compression for static files
  if (config.COMPRESSION_ENABLED) {
    app.use(compression());
  }
  
  // Serve static files from public directory
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath, {
    maxAge: config.IS_PRODUCTION ? '1d' : 0, // Cache in production
    etag: true,
    lastModified: true
  }));
  
  // Health and info pages
  app.get('/health', (req, res) => {
    res.sendFile(path.join(publicPath, 'health.html'));
  });

  app.get('/info', (req, res) => {
    res.sendFile(path.join(publicPath, 'info.html'));
  });

  app.get('/server-status', (req, res) => {
    res.sendFile(path.join(publicPath, 'server-status.html'));
  });

  // Root route - serve server status
  app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'server-status.html'));
  });

  // Auth routes - serve auth.html
  const authRoutes = ['/login', '/register', '/signup', '/forgot-password', '/verify-email', '/2fa', '/backup-code'];
  authRoutes.forEach(route => {
    app.get(route, (req, res) => {
      res.sendFile(path.join(publicPath, 'auth.html'));
    });
  });
  
  // SPA fallback - serve auth.html for other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'auth.html'));
  });
  
  // Start the server
  const server = app.listen(port, () => {
    if (logger && logger.info) {
      logger.info(`🎨 Frontend server started on port ${port}`);
      logger.info(`📂 Serving static files from: ${publicPath}`);
      logger.info(`🌐 Frontend URL: http://localhost:${port}`);
    } else {
      console.log(`🎨 Frontend server started on port ${port}`);
      console.log(`📂 Serving static files from: ${publicPath}`);
      console.log(`🌐 Frontend URL: http://localhost:${port}`);
    }
  });
  
  // Handle server errors
  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    switch (error.code) {
      case 'EACCES':
        console.error(`❌ ${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`❌ ${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });
  
  return server;
};

module.exports = { startFrontendServer };
