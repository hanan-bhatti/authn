const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Helper function to get environment variables with a default value
const getEnv = (key, defaultValue = undefined) => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      // In a real application, you might want to throw an error for critical missing variables
      console.warn(`WARNING: Environment variable "${key}" is not set. Using undefined.`);
    }
    return defaultValue;
  }
  return value;
};

// Helper to parse boolean values
const getEnvBoolean = (key, defaultValue) => {
  const value = getEnv(key, defaultValue);
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return value;
};

// Helper to parse integer values
const getEnvInt = (key, defaultValue) => {
  const value = getEnv(key, defaultValue);
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return value;
};

// Helper to parse array values (comma-separated)
const getEnvArray = (key, defaultValue = []) => {
  const value = getEnv(key);
  if (typeof value === 'string' && value.length > 0) {
    return value.split(',').map(item => item.trim());
  }
  return defaultValue;
};

// ============================================================================
// DEPLOYMENT MODE LOGIC - Calculate ports and URLs
// ============================================================================
/**
 * Calculate ports and URLs based on deployment mode
 * - same-port: Frontend and backend on same port (e.g., localhost:5000)
 * - different-ports: Frontend on PORT, backend on PORT+1
 * - separate-domains: Use explicitly configured URLs
 */
let deploymentMode = getEnv('DEPLOYMENT_MODE', 'same-port');

// Normalize deployment mode (handle typos like 'same-ports' -> 'same-port')
deploymentMode = deploymentMode.toLowerCase().trim();
if (deploymentMode === 'same-ports') {
  console.warn(`⚠️  DEPLOYMENT_MODE "same-ports" corrected to "same-port"`);
  deploymentMode = 'same-port';
}

// Validate deployment mode
const validModes = ['same-port', 'different-ports', 'separate-domains'];
if (!validModes.includes(deploymentMode)) {
  console.warn(`⚠️  Invalid DEPLOYMENT_MODE: "${deploymentMode}". Valid options: ${validModes.join(', ')}. Defaulting to 'same-port'`);
  deploymentMode = 'same-port';
}

const basePort = getEnvInt('PORT', 5000);
const nodeEnv = getEnv('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';

let frontendPort, backendPort, frontendUrl, backendUrl, dashboardUrl, corsAllowedOrigins;

if (deploymentMode === 'same-port') {
  // Both frontend and backend on same port
  frontendPort = basePort;
  backendPort = basePort;
  
  // Use env values if provided, otherwise auto-generate
  if (isProduction) {
    frontendUrl = getEnv('PROD_FRONTEND_URL') || getEnv('FRONTEND_URL') || 'https://yourdomain.com';
    backendUrl = getEnv('PROD_BASE_URL') || getEnv('BASE_URL') || 'https://yourdomain.com';
  } else {
    frontendUrl = getEnv('FRONTEND_URL') || `http://localhost:${basePort}`;
    backendUrl = getEnv('BASE_URL') || `http://localhost:${basePort}`;
  }
  
  // For same-port, CORS is less critical but still configure
  corsAllowedOrigins = getEnvArray('CORS_ALLOWED_ORIGINS').length > 0 
    ? getEnvArray('CORS_ALLOWED_ORIGINS') 
    : [frontendUrl];
  
} else if (deploymentMode === 'different-ports') {
  // Frontend on base port, backend on base port + 1
  frontendPort = basePort;
  backendPort = basePort + 1;
  
  // Use env values if provided, otherwise auto-generate
  if (isProduction) {
    frontendUrl = getEnv('PROD_FRONTEND_URL') || getEnv('FRONTEND_URL') || `https://yourdomain.com:${frontendPort}`;
    backendUrl = getEnv('PROD_BASE_URL') || getEnv('BASE_URL') || `https://api.yourdomain.com:${backendPort}`;
  } else {
    frontendUrl = getEnv('FRONTEND_URL') || `http://localhost:${frontendPort}`;
    backendUrl = getEnv('BASE_URL') || `http://localhost:${backendPort}`;
  }
  
  // For different ports, CORS must include frontend URL
  corsAllowedOrigins = getEnvArray('CORS_ALLOWED_ORIGINS').length > 0 
    ? getEnvArray('CORS_ALLOWED_ORIGINS') 
    : [frontendUrl, backendUrl];
  
} else if (deploymentMode === 'separate-domains') {
  // Use explicitly configured URLs (completely different domains)
  frontendPort = basePort;
  backendPort = basePort;
  
  // Use env values if provided, otherwise defaults
  if (isProduction) {
    frontendUrl = getEnv('PROD_FRONTEND_URL') || getEnv('FRONTEND_URL') || 'https://yourdomain.com';
    backendUrl = getEnv('PROD_BASE_URL') || getEnv('BASE_URL') || 'https://api.yourdomain.com';
  } else {
    frontendUrl = getEnv('FRONTEND_URL') || 'http://localhost:3000';
    backendUrl = getEnv('BASE_URL') || 'http://localhost:5000';
  }
  
  // For separate domains, CORS is critical
  corsAllowedOrigins = getEnvArray('CORS_ALLOWED_ORIGINS').length > 0 
    ? getEnvArray('CORS_ALLOWED_ORIGINS') 
    : [frontendUrl];
  
} else {
  // Default to same-port if invalid mode
  console.warn(`⚠️  Invalid DEPLOYMENT_MODE: "${deploymentMode}". Defaulting to 'same-port'`);
  frontendPort = basePort;
  backendPort = basePort;
  frontendUrl = getEnv('FRONTEND_URL') || `http://localhost:${basePort}`;
  backendUrl = getEnv('BASE_URL') || `http://localhost:${basePort}`;
  corsAllowedOrigins = getEnvArray('CORS_ALLOWED_ORIGINS').length > 0 
    ? getEnvArray('CORS_ALLOWED_ORIGINS') 
    : [frontendUrl];
}

// Calculate dashboard URL - prefer env, fallback to auto-generated
dashboardUrl = isProduction 
  ? (getEnv('PROD_DASHBOARD_URL') || `${frontendUrl}/dashboard`)
  : (getEnv('DASHBOARD_URL') || `${frontendUrl}/dashboard`);

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

const config = {
  // Application Information
  APP_NAME: getEnv('APP_NAME', 'Authn'),
  APP_VERSION: getEnv('APP_VERSION', '1.0.0'),
  APP_DESCRIPTION: getEnv('APP_DESCRIPTION', 'Enterprise-grade authentication and user management system'),
  APP_AUTHOR: getEnv('APP_AUTHOR', 'Authn Team'),
  APP_SUPPORT_EMAIL: getEnv('APP_SUPPORT_EMAIL', 'support@yourdomain.com'),
  APP_TERMS_URL: getEnv('APP_TERMS_URL', 'https://yourdomain.com/terms'),
  APP_PRIVACY_URL: getEnv('APP_PRIVACY_URL', 'https://yourdomain.com/privacy'),

  // Environment & Deployment
  NODE_ENV: nodeEnv,
  DEPLOYMENT_MODE: deploymentMode,
  IS_PRODUCTION: isProduction,
  IS_DEVELOPMENT: nodeEnv === 'development',
  IS_TEST: nodeEnv === 'test',

  // Server Configuration (calculated based on deployment mode)
  PORT: backendPort,
  FRONTEND_PORT: frontendPort,
  BACKEND_PORT: backendPort,
  BASE_URL: backendUrl,
  PROD_BASE_URL: getEnv('PROD_BASE_URL', 'https://api.yourdomain.com'),

  // Frontend Configuration (calculated based on deployment mode)
  FRONTEND_URL: frontendUrl,
  PROD_FRONTEND_URL: getEnv('PROD_FRONTEND_URL', 'https://yourdomain.com'),
  DASHBOARD_URL: dashboardUrl,
  PROD_DASHBOARD_URL: getEnv('PROD_DASHBOARD_URL', 'https://yourdomain.com/dashboard'),

  // Database Configuration
  MONGO_URL: getEnv('MONGO_URL', 'mongodb://localhost:27017/authn'),
  MONGO_MAX_POOL_SIZE: getEnvInt('MONGO_MAX_POOL_SIZE', 500), // Increased from 10 to 500 for high concurrency
  MONGO_MIN_POOL_SIZE: getEnvInt('MONGO_MIN_POOL_SIZE', 50), // Minimum pool size for faster connection reuse
  MONGO_TIMEOUT_MS: getEnvInt('MONGO_TIMEOUT_MS', 10000), // Increased to 10s for high load
  MONGO_SOCKET_TIMEOUT_MS: getEnvInt('MONGO_SOCKET_TIMEOUT_MS', 60000), // Increased to 60s

  // Redis Configuration
  REDIS_ENABLED: getEnvBoolean('REDIS_ENABLED', true),
  REDIS_URL: getEnv('REDIS_URL', 'redis://localhost:6379'),
  REDIS_PASSWORD: getEnv('REDIS_PASSWORD'),
  REDIS_CONNECT_TIMEOUT: getEnvInt('REDIS_CONNECT_TIMEOUT', 5000),
  REDIS_SESSION_TTL: getEnvInt('REDIS_SESSION_TTL', 604800), // 7 days
  REDIS_USER_TTL: getEnvInt('REDIS_USER_TTL', 3600), // 1 hour

  // JWT (JSON Web Token) Configuration
  JWT_SECRET: getEnv('JWT_SECRET', 'your-super-secret-jwt-key-min-32-chars-CHANGE-THIS'),
  JWT_ALGORITHM: getEnv('JWT_ALGORITHM', 'HS256'),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),
  JWT_ISSUER: getEnv('JWT_ISSUER', 'authn-auth-system'),
  JWT_AUDIENCE: getEnv('JWT_AUDIENCE', 'authn-users'),
  JWT_REFRESH_EXPIRES_IN: getEnv('JWT_REFRESH_EXPIRES_IN', '30d'),
  JWT_PRIVATE_KEY: getEnv('JWT_PRIVATE_KEY'),
  JWT_PUBLIC_KEY: getEnv('JWT_PUBLIC_KEY'),

  // Session & Cookie Configuration
  SESSION_SECRET: getEnv('SESSION_SECRET', 'your-session-secret-key-min-32-chars-CHANGE-THIS'),
  COOKIE_HTTP_ONLY: getEnvBoolean('COOKIE_HTTP_ONLY', true),
  COOKIE_SECURE: getEnvBoolean('COOKIE_SECURE', false),
  COOKIE_SAME_SITE: getEnv('COOKIE_SAME_SITE', 'lax'),
  COOKIE_MAX_AGE: getEnvInt('COOKIE_MAX_AGE', 604800000),
  COOKIE_PATH: getEnv('COOKIE_PATH', '/'),
  COOKIE_DOMAIN: getEnv('COOKIE_DOMAIN'),

  // Security Configuration
  BCRYPT_ROUNDS: getEnvInt('BCRYPT_ROUNDS', 12),
  ENCRYPTION_KEY: getEnv('ENCRYPTION_KEY', 'your-64-char-encryption-key-here'),
  AUTH_MAX_LOGIN_ATTEMPTS: getEnvInt('AUTH_MAX_LOGIN_ATTEMPTS', 10),
  AUTH_ACCOUNT_LOCK_DURATION: getEnvInt('AUTH_ACCOUNT_LOCK_DURATION', 1800000),
  AUTH_MAX_2FA_ATTEMPTS: getEnvInt('AUTH_MAX_2FA_ATTEMPTS', 5),
  AUTH_2FA_LOCK_DURATION: getEnvInt('AUTH_2FA_LOCK_DURATION', 900000),
  PASSWORD_RESET_EXPIRY: getEnvInt('PASSWORD_RESET_EXPIRY', 1800000),
  EMAIL_VERIFICATION_EXPIRY: getEnvInt('EMAIL_VERIFICATION_EXPIRY', 600000),
  DEVICE_VERIFICATION_EXPIRY: getEnvInt('DEVICE_VERIFICATION_EXPIRY', 86400000),
  MAX_TRUSTED_DEVICES: getEnvInt('MAX_TRUSTED_DEVICES', 10),
  MAX_ACTIVE_SESSIONS: getEnvInt('MAX_ACTIVE_SESSIONS', 5),
  SESSION_ACTIVITY_TIMEOUT: getEnvInt('SESSION_ACTIVITY_TIMEOUT', 3600000),

  // Rate Limiting Configuration
  RATE_LIMIT_MAX_REQUESTS: getEnvInt('RATE_LIMIT_MAX_REQUESTS', 1000),
  RATE_LIMIT_WINDOW_MS: getEnvInt('RATE_LIMIT_WINDOW_MS', 900000),
  AUTH_RATE_LIMIT_MAX_REQUESTS: getEnvInt('AUTH_RATE_LIMIT_MAX_REQUESTS', 5),
  AUTH_RATE_LIMIT_WINDOW_MS: getEnvInt('AUTH_RATE_LIMIT_WINDOW_MS', 900000),
  RATE_LIMIT_SKIP_PATHS: getEnvArray('RATE_LIMIT_SKIP_PATHS', ['/health', '/api/health']),
  RATE_LIMIT_MESSAGE: getEnv('RATE_LIMIT_MESSAGE', 'Too many requests from this IP, please try again later'),

  // CORS (Cross-Origin Resource Sharing) Configuration (calculated based on deployment mode)
  CORS_ALLOWED_ORIGINS: corsAllowedOrigins,
  CORS_ALLOW_CREDENTIALS: getEnvBoolean('CORS_ALLOW_CREDENTIALS', true),
  CORS_ALLOWED_METHODS: getEnv('CORS_ALLOWED_METHODS', 'GET,HEAD,OPTIONS,POST,PUT,DELETE,PATCH'),
  CORS_ALLOWED_HEADERS: getEnv('CORS_ALLOWED_HEADERS', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,X-API-Key'),
  CORS_MAX_AGE: getEnvInt('CORS_MAX_AGE', 86400),

  // Email / SMTP Configuration
  SMTP_HOST: getEnv('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: getEnvInt('SMTP_PORT', 587),
  SMTP_USER: getEnv('SMTP_USER', 'your-email@gmail.com'),
  SMTP_PASS: getEnv('SMTP_PASS', 'your-smtp-password-or-app-password'),
  EMAIL_FROM: getEnv('EMAIL_FROM', 'noreply@yourdomain.com'),
  EMAIL_FROM_NAME: getEnv('EMAIL_FROM_NAME', 'Authn Auth System'),
  SMTP_SECURE: getEnvBoolean('SMTP_SECURE', false),
  EMAIL_ENABLED: getEnvBoolean('EMAIL_ENABLED', true),
  EMAIL_LOGO_URL: getEnv('EMAIL_LOGO_URL', 'https://yourdomain.com/logo.png'),
  EMAIL_PRIMARY_COLOR: getEnv('EMAIL_PRIMARY_COLOR', '#2563eb'),
  EMAIL_COMPANY_NAME: getEnv('EMAIL_COMPANY_NAME', 'Your Company'),
  EMAIL_COMPANY_ADDRESS: getEnv('EMAIL_COMPANY_ADDRESS', '123 Main St, City, Country'),

  // Social Login Configuration
  SOCIAL_LOGIN_ENABLED: getEnvBoolean('SOCIAL_LOGIN_ENABLED', true),
  GOOGLE_AUTH_ENABLED: getEnvBoolean('GOOGLE_AUTH_ENABLED', true),
  GOOGLE_CLIENT_ID: getEnv('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: getEnv('GOOGLE_CLIENT_SECRET'),
  GOOGLE_CALLBACK_URL: getEnv('GOOGLE_CALLBACK_URL', `${backendUrl}/api/auth/google/callback`),
  FACEBOOK_AUTH_ENABLED: getEnvBoolean('FACEBOOK_AUTH_ENABLED', false),
  FACEBOOK_CLIENT_ID: getEnv('FACEBOOK_CLIENT_ID'),
  FACEBOOK_CLIENT_SECRET: getEnv('FACEBOOK_CLIENT_SECRET'),
  FACEBOOK_CALLBACK_URL: getEnv('FACEBOOK_CALLBACK_URL', `${backendUrl}/api/auth/facebook/callback`),
  GITHUB_AUTH_ENABLED: getEnvBoolean('GITHUB_AUTH_ENABLED', false),
  GITHUB_CLIENT_ID: getEnv('GITHUB_CLIENT_ID'),
  GITHUB_CLIENT_SECRET: getEnv('GITHUB_CLIENT_SECRET'),
  GITHUB_CALLBACK_URL: getEnv('GITHUB_CALLBACK_URL', `${backendUrl}/api/auth/github/callback`),
  TWITTER_AUTH_ENABLED: getEnvBoolean('TWITTER_AUTH_ENABLED', false),
  TWITTER_CLIENT_ID: getEnv('TWITTER_CLIENT_ID'),
  TWITTER_CLIENT_SECRET: getEnv('TWITTER_CLIENT_SECRET'),
  TWITTER_CALLBACK_URL: getEnv('TWITTER_CALLBACK_URL', `${backendUrl}/api/auth/twitter/callback`),
  LINKEDIN_AUTH_ENABLED: getEnvBoolean('LINKEDIN_AUTH_ENABLED', false),
  LINKEDIN_CLIENT_ID: getEnv('LINKEDIN_CLIENT_ID'),
  LINKEDIN_CLIENT_SECRET: getEnv('LINKEDIN_CLIENT_SECRET'),
  LINKEDIN_CALLBACK_URL: getEnv('LINKEDIN_CALLBACK_URL', `${backendUrl}/api/auth/linkedin/callback`),

  // File Storage Configuration
  FILE_STORAGE_ENABLED: getEnvBoolean('FILE_STORAGE_ENABLED', true),
  STORAGE_SERVICE: getEnv('STORAGE_SERVICE', 'filebase'), // 'filebase', 's3', 'local'
  FILEBASE_ACCESS_KEY_ID: getEnv('FILEBASE_ACCESS_KEY_ID'),
  FILEBASE_SECRET_ACCESS_KEY: getEnv('FILEBASE_SECRET_ACCESS_KEY'),
  FILEBASE_BUCKET_NAME: getEnv('FILEBASE_BUCKET_NAME'),
  FILEBASE_ENDPOINT: getEnv('FILEBASE_ENDPOINT', 'https://s3.filebase.com'),
  FILEBASE_REGION: getEnv('FILEBASE_REGION', 'us-east-1'),
  IPFS_GATEWAY: getEnv('IPFS_GATEWAY'),
  AWS_ACCESS_KEY_ID: getEnv('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: getEnv('AWS_SECRET_ACCESS_KEY'),
  AWS_S3_BUCKET: getEnv('AWS_S3_BUCKET'),
  AWS_S3_REGION: getEnv('AWS_S3_REGION', 'us-east-1'),
  AWS_S3_ENDPOINT: getEnv('AWS_S3_ENDPOINT', 'https://s3.amazonaws.com'),
  MAX_FILE_SIZE: getEnvInt('MAX_FILE_SIZE', 52428800), // Default 50MB
  ALLOWED_FILE_TYPES: getEnvArray('ALLOWED_FILE_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']),
  IMAGE_OPTIMIZATION_ENABLED: getEnvBoolean('IMAGE_OPTIMIZATION_ENABLED', true),
  IMAGE_QUALITY: getEnvInt('IMAGE_QUALITY', 85),
  IMAGE_GENERATE_SIZES: getEnvBoolean('IMAGE_GENERATE_SIZES', true),

  // Backup Configuration
  BACKUP_ENABLED: getEnvBoolean('BACKUP_ENABLED', true),
  BACKUP_PATH: getEnv('BACKUP_PATH', './backups'),
  BACKUP_RETENTION_DAYS: getEnvInt('BACKUP_RETENTION_DAYS', 365),
  BACKUP_COMPRESSION_ENABLED: getEnvBoolean('BACKUP_COMPRESSION_ENABLED', true),
  BACKUP_ENCRYPTION_ENABLED: getEnvBoolean('BACKUP_ENCRYPTION_ENABLED', true),
  BACKUP_ENCRYPTION_KEY: getEnv('BACKUP_ENCRYPTION_KEY'),
  BACKUP_CRON_SCHEDULE: getEnv('BACKUP_CRON_SCHEDULE', '0 2 * * *'),

  // Theme & Weather API
  DYNAMIC_THEME_ENABLED: getEnvBoolean('DYNAMIC_THEME_ENABLED', true),
  OPENWEATHER_API_KEY: getEnv('OPENWEATHER_API_KEY'),
  WEATHER_API_KEY: getEnv('WEATHER_API_KEY'),
  CALENDARIFIC_API_KEY: getEnv('CALENDARIFIC_API_KEY'),
  DEFAULT_WEATHER_LOCATION: getEnv('DEFAULT_WEATHER_LOCATION', 'Islamabad'),
  DEFAULT_WEATHER_LAT: getEnv('DEFAULT_WEATHER_LAT', 33.6844),
  DEFAULT_WEATHER_LON: getEnv('DEFAULT_WEATHER_LON', 73.0479),

  // Device Fingerprinting & Security
  DEVICE_FINGERPRINTING_ENABLED: getEnvBoolean('DEVICE_FINGERPRINTING_ENABLED', true),
  DEVICE_FINGERPRINT_COMPONENTS: getEnvArray('DEVICE_FINGERPRINT_COMPONENTS', ['userAgent', 'platform', 'screenResolution', 'timezone', 'ip', 'geolocation']),
  BYPASS_DEVICE_VERIFICATION: getEnvBoolean('BYPASS_DEVICE_VERIFICATION', false),
  GEOLOCATION_ENABLED: getEnvBoolean('GEOLOCATION_ENABLED', true),
  GEOLOCATION_SERVICE: getEnv('GEOLOCATION_SERVICE', 'geoip-lite'),
  MAXMIND_LICENSE_KEY: getEnv('MAXMIND_LICENSE_KEY'),
  NEW_DEVICE_EMAIL_NOTIFICATION: getEnvBoolean('NEW_DEVICE_EMAIL_NOTIFICATION', true),

  // Two-Factor Authentication (2FA)
  TWO_FACTOR_AUTH_ENABLED: getEnvBoolean('TWO_FACTOR_AUTH_ENABLED', true),
  TWO_FACTOR_ISSUER: getEnv('TWO_FACTOR_ISSUER', 'Authn'),
  TWO_FACTOR_BACKUP_CODES_COUNT: getEnvInt('TWO_FACTOR_BACKUP_CODES_COUNT', 10),
  TWO_FACTOR_BACKUP_CODE_LENGTH: getEnvInt('TWO_FACTOR_BACKUP_CODE_LENGTH', 8),
  TWO_FACTOR_TOTP_WINDOW: getEnvInt('TWO_FACTOR_TOTP_WINDOW', 1),
  TWO_FACTOR_TOTP_STEP: getEnvInt('TWO_FACTOR_TOTP_STEP', 30),

  // Logging & Monitoring
  LOGGING_ENABLED: getEnvBoolean('LOGGING_ENABLED', true),
  LOG_LEVEL: getEnv('LOG_LEVEL', 'debug'),
  LOG_FORMAT: getEnv('LOG_FORMAT', 'json'),
  LOG_REQUESTS: getEnvBoolean('LOG_REQUESTS', true),
  LOG_FILE_PATH: getEnv('LOG_FILE_PATH', './logs/app.log'),
  LOG_MAX_FILE_SIZE: getEnvInt('LOG_MAX_FILE_SIZE', 10485760),
  LOG_MAX_FILES: getEnvInt('LOG_MAX_FILES', 10),
  ERROR_TRACKING_ENABLED: getEnvBoolean('ERROR_TRACKING_ENABLED', false),
  SENTRY_DSN: getEnv('SENTRY_DSN'),
  PERFORMANCE_MONITORING_ENABLED: getEnvBoolean('PERFORMANCE_MONITORING_ENABLED', false),

  // Maintenance Mode
  MAINTENANCE_MODE: getEnvBoolean('MAINTENANCE_MODE', false),
  MAINTENANCE_MESSAGE: getEnv('MAINTENANCE_MESSAGE', 'System under maintenance. Please try again later.'),
  MAINTENANCE_RETRY_AFTER: getEnvInt('MAINTENANCE_RETRY_AFTER', 3600),

  // Feature Flags
  FEATURE_REGISTRATION_ENABLED: getEnvBoolean('FEATURE_REGISTRATION_ENABLED', true),
  FEATURE_PASSWORD_RESET_ENABLED: getEnvBoolean('FEATURE_PASSWORD_RESET_ENABLED', true),
  FEATURE_EMAIL_VERIFICATION_ENABLED: getEnvBoolean('FEATURE_EMAIL_VERIFICATION_ENABLED', true),
  FEATURE_REQUIRE_EMAIL_VERIFICATION: getEnvBoolean('FEATURE_REQUIRE_EMAIL_VERIFICATION', true),
  FEATURE_PROFILE_PICTURE_ENABLED: getEnvBoolean('FEATURE_PROFILE_PICTURE_ENABLED', true),
  FEATURE_LOCATION_ENABLED: getEnvBoolean('FEATURE_LOCATION_ENABLED', true),
  FEATURE_SOCIAL_LINKING_ENABLED: getEnvBoolean('FEATURE_SOCIAL_LINKING_ENABLED', true),
  FEATURE_DEVICE_MANAGEMENT_ENABLED: getEnvBoolean('FEATURE_DEVICE_MANAGEMENT_ENABLED', true),
  FEATURE_SESSION_MANAGEMENT_ENABLED: getEnvBoolean('FEATURE_SESSION_MANAGEMENT_ENABLED', true),
  FEATURE_AUDIT_LOGS_ENABLED: getEnvBoolean('FEATURE_AUDIT_LOGS_ENABLED', true),
  FEATURE_ANALYTICS_ENABLED: getEnvBoolean('FEATURE_ANALYTICS_ENABLED', true),
  FEATURE_NOTIFICATIONS_ENABLED: getEnvBoolean('FEATURE_NOTIFICATIONS_ENABLED', true),
  FEATURE_API_KEYS_ENABLED: getEnvBoolean('FEATURE_API_KEYS_ENABLED', false),
  FEATURE_WEBAUTHN_ENABLED: getEnvBoolean('FEATURE_WEBAUTHN_ENABLED', false),
  FEATURE_MAGIC_LINK_ENABLED: getEnvBoolean('FEATURE_MAGIC_LINK_ENABLED', false),

  // Development & Debugging
  DEV_MODE: getEnvBoolean('DEV_MODE', true),
  GRAPHQL_PLAYGROUND_ENABLED: getEnvBoolean('GRAPHQL_PLAYGROUND_ENABLED', false),
  API_DOCS_ENABLED: getEnvBoolean('API_DOCS_ENABLED', true),
  API_DOCS_PATH: getEnv('API_DOCS_PATH', '/api/docs'),
  DEV_CORS_ALL_ORIGINS: getEnvBoolean('DEV_CORS_ALL_ORIGINS', true),
  DEV_DISABLE_RATE_LIMITING: getEnvBoolean('DEV_DISABLE_RATE_LIMITING', false),
  DEV_DETAILED_ERRORS: getEnvBoolean('DEV_DETAILED_ERRORS', true),
  DEV_LOG_QUERIES: getEnvBoolean('DEV_LOG_QUERIES', false),
  DEV_SEED_DATABASE: getEnvBoolean('DEV_SEED_DATABASE', false),

  // Advanced Configuration
  TZ: getEnv('TZ', 'UTC'),
  DEFAULT_USER_ROLE: getEnv('DEFAULT_USER_ROLE', 'user'),
  DEFAULT_LANGUAGE: getEnv('DEFAULT_LANGUAGE', 'en'),
  SUPPORTED_LANGUAGES: getEnvArray('SUPPORTED_LANGUAGES', ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']),
  DEFAULT_TIMEZONE: getEnv('DEFAULT_TIMEZONE', 'UTC'),
  DATE_FORMAT: getEnv('DATE_FORMAT', 'ISO'),
  WEBHOOKS_ENABLED: getEnvBoolean('WEBHOOKS_ENABLED', false),
  WEBHOOK_SECRET: getEnv('WEBHOOK_SECRET'),
  GRAPHQL_ENABLED: getEnvBoolean('GRAPHQL_ENABLED', false),
  GRAPHQL_PATH: getEnv('GRAPHQL_PATH', '/graphql'),
  API_VERSIONING_ENABLED: getEnvBoolean('API_VERSIONING_ENABLED', false),
  API_VERSION: getEnv('API_VERSION', 'v1'),
  MAX_REQUEST_SIZE: getEnv('MAX_REQUEST_SIZE', '50mb'),
  REQUEST_TIMEOUT: getEnvInt('REQUEST_TIMEOUT', 30000),
  COMPRESSION_ENABLED: getEnvBoolean('COMPRESSION_ENABLED', true),
  COMPRESSION_LEVEL: getEnvInt('COMPRESSION_LEVEL', 6),
  HTTP2_ENABLED: getEnvBoolean('HTTP2_ENABLED', false),

  // Search & Indexing
  SEARCH_ENABLED: getEnvBoolean('SEARCH_ENABLED', false),
  SEARCH_SERVICE: getEnv('SEARCH_SERVICE', 'mongodb'),
  ELASTICSEARCH_URL: getEnv('ELASTICSEARCH_URL'),
  ELASTICSEARCH_INDEX: getEnv('ELASTICSEARCH_INDEX', 'authn'),
  ALGOLIA_APP_ID: getEnv('ALGOLIA_APP_ID'),
  ALGOLIA_API_KEY: getEnv('ALGOLIA_API_KEY'),
  ALGOLIA_INDEX: getEnv('ALGOLIA_INDEX', 'authn'),

  // Mobile App Configuration
  MOBILE_APP_ENABLED: getEnvBoolean('MOBILE_APP_ENABLED', false),
  IOS_APP_URL: getEnv('IOS_APP_URL'),
  ANDROID_APP_URL: getEnv('ANDROID_APP_URL'),
  DEEP_LINK_SCHEME: getEnv('DEEP_LINK_SCHEME'),

  // Internationalization (i18n)
  I18N_ENABLED: getEnvBoolean('I18N_ENABLED', true),
  DEFAULT_LOCALE: getEnv('DEFAULT_LOCALE', 'en'),
  FALLBACK_LOCALE: getEnv('FALLBACK_LOCALE', 'en'),
  SUPPORTED_LOCALES: getEnvArray('SUPPORTED_LOCALES', ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'ur']),

  // Payment Integration (Future Feature)
  PAYMENTS_ENABLED: getEnvBoolean('PAYMENTS_ENABLED', false),
  PAYMENT_PROVIDER: getEnv('PAYMENT_PROVIDER'),
  STRIPE_PUBLIC_KEY: getEnv('STRIPE_PUBLIC_KEY'),
  STRIPE_SECRET_KEY: getEnv('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: getEnv('STRIPE_WEBHOOK_SECRET'),

  // SMS/PHONE VERIFICATION (Future Feature)
  SMS_ENABLED: getEnvBoolean('SMS_ENABLED', false),
  SMS_PROVIDER: getEnv('SMS_PROVIDER'),
  TWILIO_ACCOUNT_SID: getEnv('TWILIO_ACCOUNT_SID'),
  TWILIO_AUTH_TOKEN: getEnv('TWILIO_AUTH_TOKEN'),
  TWILIO_PHONE_NUMBER: getEnv('TWILIO_PHONE_NUMBER'),

  // Security Headers
  CSP_ENABLED: getEnvBoolean('CSP_ENABLED', true),
  CSP_DIRECTIVES: getEnv('CSP_DIRECTIVES', '{}'),
  X_FRAME_OPTIONS: getEnv('X_FRAME_OPTIONS', 'DENY'),
  X_CONTENT_TYPE_OPTIONS: getEnv('X_CONTENT_TYPE_OPTIONS', 'nosniff'),
  X_XSS_PROTECTION: getEnv('X_XSS_PROTECTION', '1; mode=block'),
  REFERRER_POLICY: getEnv('REFERRER_POLICY', 'no-referrer-when-downgrade'),

  // Analytics & Tracking
  ANALYTICS_ENABLED: getEnvBoolean('ANALYTICS_ENABLED', false),
  GOOGLE_ANALYTICS_ID: getEnv('GOOGLE_ANALYTICS_ID'),
  USER_TRACKING_ENABLED: getEnvBoolean('USER_TRACKING_ENABLED', false),
  ERROR_REPORTING_ENABLED: getEnvBoolean('ERROR_REPORTING_ENABLED', false),
};

module.exports = config;
