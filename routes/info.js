const express = require('express');
const router = express.Router();
const path = require('path');
const config = require('../utils/config');
const { ApiResponse } = require('../utils/helpers');

/**
 * System Information Routes
 * Provides information about the application and server
 * Supports both JSON (API) and HTML responses
 */

/**
 * Helper function to determine if HTML response is preferred
 */
const prefersHtml = (req) => {
  // Check if ?format=html query parameter is present
  if (req.query.format === 'html') return true;
  
  // Check Accept header for browsers
  const acceptHeader = req.get('Accept') || '';
  return acceptHeader.includes('text/html') && !acceptHeader.includes('application/json');
};

/**
 * GET /api/info
 * Get application information (public, non-sensitive data)
 */
router.get('/', (req, res) => {
  // If HTML is preferred, serve the HTML page
  if (prefersHtml(req)) {
    return res.sendFile(path.join(__dirname, '../public', 'info.html'));
  }
  
  // Otherwise return JSON
  const info = {
    application: {
      name: config.APP_NAME,
      version: config.APP_VERSION,
      description: config.APP_DESCRIPTION,
      author: config.APP_AUTHOR
    },
    environment: config.NODE_ENV,
    deployment: {
      mode: config.DEPLOYMENT_MODE,
      baseUrl: config.IS_PRODUCTION ? config.PROD_BASE_URL : config.BASE_URL,
      frontendUrl: config.IS_PRODUCTION ? config.PROD_FRONTEND_URL : config.FRONTEND_URL,
      dashboardUrl: config.IS_PRODUCTION ? config.PROD_DASHBOARD_URL : config.DASHBOARD_URL
    },
    features: {
      apiVersioning: config.API_VERSIONING_ENABLED,
      apiVersion: config.API_VERSION,
      apiDocs: config.API_DOCS_ENABLED,
      apiDocsPath: config.API_DOCS_PATH,
      registration: config.FEATURE_REGISTRATION_ENABLED,
      socialLogin: config.SOCIAL_LOGIN_ENABLED,
      twoFactorAuth: config.TWO_FACTOR_AUTH_ENABLED,
      emailVerification: config.FEATURE_EMAIL_VERIFICATION_ENABLED,
      passwordReset: config.FEATURE_PASSWORD_RESET_ENABLED
    },
    support: {
      email: config.APP_SUPPORT_EMAIL,
      termsUrl: config.APP_TERMS_URL,
      privacyUrl: config.APP_PRIVACY_URL
    },
    security: {
      cookieSecure: config.COOKIE_SECURE,
      cookieSameSite: config.COOKIE_SAME_SITE,
      corsAllOrigins: config.DEV_CORS_ALL_ORIGINS,
      rateLimitingEnabled: !config.DEV_DISABLE_RATE_LIMITING
    }
  };

  res.json(new ApiResponse({ data: info, message: 'Application information retrieved', req }));
});

/**
 * GET /api/info/version
 * Get version information
 */
router.get('/version', (req, res) => {
  // If HTML is preferred, serve a simple HTML page
  if (prefersHtml(req)) {
    return res.sendFile(path.join(__dirname, '../public', 'version.html'));
  }
  
  // Otherwise return JSON
  res.json(new ApiResponse({ 
    data: {
      name: config.APP_NAME,
      version: config.APP_VERSION,
      environment: config.NODE_ENV,
      apiVersion: config.API_VERSION
    },
    message: 'Version information',
    req
  }));
});

/**
 * GET /api/info/health
 * Health check endpoint (detailed)
 */
router.get('/health', (req, res) => {
  // If HTML is preferred, serve the HTML health page
  if (prefersHtml(req)) {
    return res.sendFile(path.join(__dirname, '../public', 'health.html'));
  }
  
  // Otherwise return JSON
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
    },
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
    },
    environment: config.NODE_ENV,
    nodeVersion: process.version
  };

  res.json(new ApiResponse({ data: health, message: 'System is healthy', req }));
});

/**
 * GET /api/info/features
 * Get enabled features
 */
router.get('/features', (req, res) => {
  // If HTML is preferred, serve an HTML page
  if (prefersHtml(req)) {
    return res.sendFile(path.join(__dirname, '../public', 'features.html'));
  }
  
  // Otherwise return JSON
  const features = {
    authentication: {
      registration: config.FEATURE_REGISTRATION_ENABLED,
      emailVerification: config.FEATURE_EMAIL_VERIFICATION_ENABLED,
      requireEmailVerification: config.FEATURE_REQUIRE_EMAIL_VERIFICATION,
      passwordReset: config.FEATURE_PASSWORD_RESET_ENABLED,
      twoFactorAuth: config.TWO_FACTOR_AUTH_ENABLED,
      socialLogin: config.SOCIAL_LOGIN_ENABLED,
      socialLinking: config.FEATURE_SOCIAL_LINKING_ENABLED
    },
    social: {
      google: config.GOOGLE_AUTH_ENABLED,
      facebook: config.FACEBOOK_AUTH_ENABLED,
      github: config.GITHUB_AUTH_ENABLED,
      twitter: config.TWITTER_AUTH_ENABLED,
      linkedin: config.LINKEDIN_AUTH_ENABLED
    },
    user: {
      profilePicture: config.FEATURE_PROFILE_PICTURE_ENABLED,
      location: config.FEATURE_LOCATION_ENABLED,
      deviceManagement: config.FEATURE_DEVICE_MANAGEMENT_ENABLED,
      sessionManagement: config.FEATURE_SESSION_MANAGEMENT_ENABLED
    },
    system: {
      apiDocs: config.API_DOCS_ENABLED,
      apiVersioning: config.API_VERSIONING_ENABLED,
      auditLogs: config.FEATURE_AUDIT_LOGS_ENABLED,
      analytics: config.FEATURE_ANALYTICS_ENABLED,
      notifications: config.FEATURE_NOTIFICATIONS_ENABLED
    }
  };

  res.json(new ApiResponse({ data: features, message: 'Feature flags retrieved', req }));
});

/**
 * GET /api/info/config (development only)
 * Get detailed configuration (only in development mode)
 */
router.get('/config', (req, res) => {
  if (!config.IS_DEVELOPMENT && !config.DEV_MODE) {
    if (prefersHtml(req)) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html><head><title>Access Denied</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>🔒 Access Denied</h1>
          <p>Configuration endpoint is only available in development mode</p>
        </body></html>
      `);
    }
    return res.status(403).json({ 
      success: false, 
      message: 'Configuration endpoint is only available in development mode' 
    });
  }

  // If HTML is preferred, serve an HTML page
  if (prefersHtml(req)) {
    return res.sendFile(path.join(__dirname, '../public', 'config.html'));
  }

  // Otherwise return JSON - Filter out sensitive information
  const safeConfig = {
    app: {
      name: config.APP_NAME,
      version: config.APP_VERSION,
      description: config.APP_DESCRIPTION,
      author: config.APP_AUTHOR,
      supportEmail: config.APP_SUPPORT_EMAIL
    },
    environment: {
      nodeEnv: config.NODE_ENV,
      deploymentMode: config.DEPLOYMENT_MODE,
      isProduction: config.IS_PRODUCTION,
      isDevelopment: config.IS_DEVELOPMENT,
      port: config.PORT
    },
    urls: {
      base: config.BASE_URL,
      frontend: config.FRONTEND_URL,
      dashboard: config.DASHBOARD_URL,
      prodBase: config.PROD_BASE_URL,
      prodFrontend: config.PROD_FRONTEND_URL,
      prodDashboard: config.PROD_DASHBOARD_URL
    },
    api: {
      versioning: config.API_VERSIONING_ENABLED,
      version: config.API_VERSION,
      docsEnabled: config.API_DOCS_ENABLED,
      docsPath: config.API_DOCS_PATH,
      maxRequestSize: config.MAX_REQUEST_SIZE,
      requestTimeout: config.REQUEST_TIMEOUT,
      compressionEnabled: config.COMPRESSION_ENABLED,
      compressionLevel: config.COMPRESSION_LEVEL
    },
    development: {
      devMode: config.DEV_MODE,
      corsAllOrigins: config.DEV_CORS_ALL_ORIGINS,
      disableRateLimiting: config.DEV_DISABLE_RATE_LIMITING,
      detailedErrors: config.DEV_DETAILED_ERRORS
    },
    localization: {
      defaultLanguage: config.DEFAULT_LANGUAGE,
      supportedLanguages: config.SUPPORTED_LANGUAGES,
      defaultTimezone: config.DEFAULT_TIMEZONE,
      dateFormat: config.DATE_FORMAT
    },
    security: {
      bcryptRounds: config.BCRYPT_ROUNDS,
      maxLoginAttempts: config.AUTH_MAX_LOGIN_ATTEMPTS,
      maxTrustedDevices: config.MAX_TRUSTED_DEVICES,
      maxActiveSessions: config.MAX_ACTIVE_SESSIONS
    },
    features: {
      registration: config.FEATURE_REGISTRATION_ENABLED,
      emailVerification: config.FEATURE_EMAIL_VERIFICATION_ENABLED,
      twoFactorAuth: config.TWO_FACTOR_AUTH_ENABLED,
      socialLogin: config.SOCIAL_LOGIN_ENABLED,
      deviceManagement: config.FEATURE_DEVICE_MANAGEMENT_ENABLED,
      sessionManagement: config.FEATURE_SESSION_MANAGEMENT_ENABLED
    }
  };

  res.json(new ApiResponse({ data: safeConfig, message: 'Development configuration retrieved', req }));
});

module.exports = router;
