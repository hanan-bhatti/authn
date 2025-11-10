const config = require('../utils/config');
const { preventDataLoss } = require('../middleware/backup');

/**
 * Configure and mount all application routes
 * @param {Express} app - Express application instance
 * @param {Object} routes - Object containing route modules
 * @param {Object} logger - Logger instance (optional)
 */
const configureRoutes = (app, routes, logger) => {
  const { authRoutes, userRoutes, infoRoutes, docsRoutes, pagesRoutes } = routes;

  // Determine API prefix based on versioning
  const apiPrefix = config.API_VERSIONING_ENABLED ? `/api/${config.API_VERSION}` : '/api';
  if (logger) {
    logger.info(`API routes mounted at: ${apiPrefix}`);
  } else {
    console.log(`API routes mounted at: ${apiPrefix}`);
  }

  // Mount API routes
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/user`, preventDataLoss, userRoutes);
  app.use(`${apiPrefix}/info`, infoRoutes);

  // Mount documentation routes with versioning support
  if (config.API_DOCS_ENABLED) {
    app.use(`${apiPrefix}/docs`, docsRoutes);
    if (logger) {
      logger.info(`📚 API documentation available at: ${apiPrefix}/docs`);
    } else {
      console.log(`📚 API documentation available at: ${apiPrefix}/docs`);
    }
  }

  // Backward compatibility redirects (only if versioning is enabled)
  if (config.API_VERSIONING_ENABLED) {
    setupBackwardCompatibilityRedirects(app, apiPrefix, logger);
  }

  // Frontend routes (only in same-port mode)
  if (config.DEPLOYMENT_MODE === 'same-port') {
    setupFrontendRoutes(app, pagesRoutes);
  } else {
    setupApiOnlyMode(app);
  }
};

/**
 * Setup backward compatibility redirects for versioned APIs
 * @param {Express} app - Express application instance
 * @param {String} apiPrefix - Versioned API prefix
 * @param {Object} logger - Logger instance (optional)
 */
const setupBackwardCompatibilityRedirects = (app, apiPrefix, logger) => {
  const routes = ['auth', 'user', 'info', 'docs'];
  
  routes.forEach(route => {
    app.use(`/api/${route}`, (req, res) => {
      const path = req.url || '';
      res.redirect(308, `${apiPrefix}/${route}${path}`);
    });
  });
  
  if (logger) {
    logger.info('✅ Backward compatibility redirects configured');
  } else {
    console.log('✅ Backward compatibility redirects configured');
  }
};

/**
 * Setup frontend routes for same-port deployment
 * @param {Express} app - Express application instance
 * @param {Object} pagesRoutes - Pages route module
 */
const setupFrontendRoutes = (app, pagesRoutes) => {
  const express = require('express');
  const path = require('path');
  
  console.log('📦 Serving static frontend files (same-port mode)');
  
  // Serve static files
  app.use(express.static('public'));
  
  // Root and page routes
  app.use('/', pagesRoutes);

  // Server status pages
  app.get('/health', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'health.html'));
  });

  app.get('/info', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'info.html'));
  });

  app.get('/server-status', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'server-status.html'));
  });

  // Favicon
  app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
  });

  // CSS route
  app.get('/css', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', '/css/all.main.css'));
  });

  // Reset password route with validation
  app.get('/reset-password', async (req, res) => {
    const crypto = require('crypto');
    const User = require('../models/User');
    const { token } = req.query;
    
    if (!token) {
      console.log('Reset password accessed without token');
      return res.redirect('/forgot-password?error=missing-token');
    }
    
    if (token.length < 20) {
      console.log('Reset password accessed with invalid token format');
      return res.redirect('/forgot-password?error=invalid-token');
    }
    
    try {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
        isDeleted: false
      });
      
      if (!user) {
        console.log('Reset password token not found or expired');
        return res.redirect('/forgot-password?error=invalid-token');
      }
      
      res.sendFile(path.join(__dirname, '../public', 'reset-password.html'));
    } catch (error) {
      console.error('Error validating reset token:', error);
      res.redirect('/forgot-password?error=server-error');
    }
  });

  // Static pages
  app.use('/auth/verify-device', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'verify-device.html'));
  });

  app.use('/terms', (req, res) => {
    const termsUrl = config.APP_TERMS_URL;
    if (termsUrl) return res.redirect(termsUrl);
    res.sendFile(path.join(__dirname, '../public', 'terms.html'));
  });

  app.use('/privacy', (req, res) => {
    const privacyUrl = config.APP_PRIVACY_URL;
    if (privacyUrl) return res.redirect(privacyUrl);
    res.sendFile(path.join(__dirname, '../public', 'privacy.html'));
  });

  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
  });

  // 404 handler for web routes
  app.use(async (req, res) => {
    const skipPaths = [
      '/.well-known/', '/robots.txt', '/sitemap.xml', '/favicon.ico',
      '/apple-touch-icon', '/android-chrome', '/browserconfig.xml',
      '/manifest.json', '/.env', '/wp-admin', '/admin.php', '/phpmyadmin'
    ];
    
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return res.status(404).end();
    }
    
    res.status(404).sendFile(path.join(__dirname, '../public', '404.html'));
  });
};

/**
 * Setup API-only mode for different-ports/separate-domains deployment
 * @param {Express} app - Express application instance
 */
const setupApiOnlyMode = (app) => {
  const path = require('path');
  
  console.log('🔌 API-only mode (different-ports/separate-domains)');
  console.log(`ℹ️  Frontend should be running separately on: ${config.FRONTEND_URL}`);
  
  // Root endpoint - serve HTML status page
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'server-status.html'));
  });

  // Health and info pages (HTML)
  app.get('/health', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'health.html'));
  });

  app.get('/info', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'info.html'));
  });

  app.get('/server-status', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'server-status.html'));
  });

  // Send helpful JSON responses for frontend-specific routes
  const frontendRoutes = ['/dashboard', '/auth', '/login', '/register', '/profile'];
  
  frontendRoutes.forEach(route => {
    app.get(route, (req, res) => {
      res.status(400).json({
        error: 'Frontend route accessed on backend server',
        message: 'This is an API-only server. Please access the frontend application.',
        frontendUrl: config.FRONTEND_URL,
        hint: `Visit ${config.FRONTEND_URL}${route}`
      });
    });
  });

  // 404 handler for API routes
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'API endpoint not found',
      path: req.path,
      availableEndpoints: [
        `${config.API_VERSIONING_ENABLED ? `/api/${config.API_VERSION}` : '/api'}/auth`,
        `${config.API_VERSIONING_ENABLED ? `/api/${config.API_VERSION}` : '/api'}/user`,
        `${config.API_VERSIONING_ENABLED ? `/api/${config.API_VERSION}` : '/api'}/info`,
        `${config.API_VERSIONING_ENABLED ? `/api/${config.API_VERSION}` : '/api'}/docs`
      ]
    });
  });
};

module.exports = { configureRoutes };
