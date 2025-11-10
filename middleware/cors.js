const cors = require('cors');
const config = require('../utils/config');

/**
 * Configure CORS options
 * @returns {Object} CORS configuration
 */
const getCorsOptions = () => {
  return {
    origin: function (origin, callback) {
      const allowedOrigins = config.CORS_ALLOWED_ORIGINS;
      if (config.DEV_CORS_ALL_ORIGINS || !origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: config.CORS_ALLOW_CREDENTIALS,
    methods: config.CORS_ALLOWED_METHODS,
    allowedHeaders: config.CORS_ALLOWED_HEADERS,
    maxAge: config.CORS_MAX_AGE,
    optionsSuccessStatus: 200
  };
};

/**
 * Setup CORS middleware
 * @param {Express} app - Express application
 */
const setupCors = (app) => {
  const corsOptions = getCorsOptions();
  
  // Apply CORS middleware
  app.use(cors(corsOptions));
  
  // Handle preflight requests explicitly
  app.options('*', cors(corsOptions));
};

module.exports = { setupCors, getCorsOptions };
