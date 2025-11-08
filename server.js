const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const crypto = require('crypto');

// Import services
const { initializeEmailService } = require('./services/email');
const { sendTestEmail } = require('./services/email');
const { validateFirebaseConfig } = require('./services/firebaseService');
const { fixSessionsIndex } = require('./scripts/migration');
const User = require('./models/User');
const { getThemeForDate, getCurrentWeatherTheme } = require('./utils/theme');

// Import backup and maintenance services
const { 
  UserBackupService, 
  UserCleanupService, 
  UserMaintenanceScheduler 
} = require('./services/usersBackup');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

// Import middleware
const { ApiResponse, ApiError } = require('./utils/helpers');

// Initialize backup and cleanup services
let backupService, cleanupService, maintenanceScheduler;

const initializeBackupServices = () => {
  try {
    backupService = new UserBackupService({
      backupPath: process.env.BACKUP_PATH || './backups',
      compressionEnabled: true,
      encryptionEnabled: process.env.NODE_ENV === 'production',
      encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 365
    });

    cleanupService = new UserCleanupService(backupService);
    maintenanceScheduler = new UserMaintenanceScheduler(backupService, cleanupService);

    // Start maintenance scheduler in production
    if (process.env.NODE_ENV === 'production') {
      maintenanceScheduler.start();
      console.log('✅ Maintenance scheduler started');
    }

    console.log('✅ Backup services initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize backup services:', error.message);
    return false;
  }
};

// Backup service middlewares
const trackFailedAttempts = async (req, res, next) => {
  try {
    // Ensure all failed attempts are saved immediately
    res.on('finish', async () => {
      if (req.user && (req.failedLogin || req.failed2FA)) {
        try {
          await req.user.save();
          console.log('Failed attempt tracked and saved');
        } catch (saveError) {
          console.error('Failed to save failed attempt:', saveError);
        }
      }
    });
    next();
  } catch (error) {
    next(error);
  }
};

// Enhanced error handling middleware with backup creation
const enhancedErrorHandler = (err, req, res, next) => {
  console.error('Enhanced Error Handler:', {
    name: err.name,
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    userId: req.user?.userId
  });

  // Create backup if user data might be affected and backup service is available
  if (req.user && err.statusCode >= 500 && backupService) {
    setImmediate(async () => {
      try {
        const user = await User.findById(req.user.userId);
        if (user) {
          await backupService.createUserBackup(user, 'error_backup', {
            error: err.message,
            errorCode: err.code,
            url: req.url,
            method: req.method
          });
        }
      } catch (backupError) {
        console.error('Failed to create error backup:', backupError);
      }
    });
  }

  // Handle ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(new ApiResponse({
      success: false,
      error: err.message,
      code: err.code,
      data: err.data || null
    }));
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    let field = 'unknown';

    if (err.keyPattern) {
      field = Object.keys(err.keyPattern)[0];
      switch (field) {
        case 'email':
          message = 'An account with this email already exists';
          break;
        case 'username':
          message = 'This username is already taken';
          break;
        case 'phone':
          message = 'An account with this phone number already exists';
          break;
        default:
          message = `This ${field} is already in use`;
      }
    }

    return res.status(409).json(new ApiResponse({
      success: false,
      error: message,
      code: 'DUPLICATE_FIELD',
      data: { field }
    }));
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const validationErrors = {};
    Object.keys(err.errors).forEach(key => {
      validationErrors[key] = err.errors[key].message;
    });

    return res.status(400).json(new ApiResponse({
      success: false,
      error: 'Validation failed',
      message: 'One or more validation errors occurred',
      code: 'VALIDATION_ERROR',
      data: { details: validationErrors }
    }));
  }

  // Default server error
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again or contact support.'
    : err.message || 'Internal server error';

  res.status(statusCode).json(new ApiResponse({
    success: false,
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && {
      data: {
        stack: err.stack,
        name: err.name
      }
    })
  }));
};

// Pre-deletion middleware to prevent data loss
const preventDataLoss = async (req, res, next) => {
  if (req.user && backupService) {
    try {
      const user = await User.findById(req.user.userId);
      if (user && !user.isBackedUp) {
        // Force backup creation for safety
        await backupService.createUserBackup(user, 'safety_backup', {
          trigger: 'pre_operation_safety',
          route: req.route?.path || req.url,
          method: req.method
        });
      }
    } catch (error) {
      console.error('Safety backup failed:', error);
      // Don't block the request, but log the error
    }
  }
  next();
};

// Create Express app
const app = express();

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// Trust proxy (important for rate limiting when behind reverse proxy)
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],

      "script-src": [
        "'self'",
        "'unsafe-inline'",
        "https://apis.google.com",
        "https://authn.firebaseapp.com",
      ],

      "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://unpkg.com"
      ],

      "font-src": [
        "'self'",
        "https://fonts.gstatic.com",
        "https://unpkg.com"
      ],

      "img-src": [
        "'self'", 
        "https://placehold.co", 
        "https://dummyimage.com",
        "https://via.placeholder.com",
        "https://*.tile.openstreetmap.org", // For map tiles
        "https://s3.filebase.com", // For S3 images
        "https://*.amazonaws.com", // In case you switch to AWS S3
        "data:",
        "https:"
      ],

      "frame-src": [
        "https://accounts.google.com",
        "https://authn.firebaseapp.com",
      ],

      "connect-src": [
        "'self'",
        "https://www.googleapis.com", // Firebase & Google Sign-In APIs
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
        "https://accounts.google.com",
        "https://firebasestorage.googleapis.com",
        "https://nominatim.openstreetmap.org", // For geocoding services
        "https://s3.filebase.com", // For Filebase S3 storage
        "https://*.amazonaws.com", // In case you use AWS S3
        "https://*.s3.amazonaws.com" // Alternative S3 endpoint format
      ],

      // Add object-src for potential file uploads
      "object-src": ["'none'"],
      
      // Add media-src for audio/video content if needed
      "media-src": [
        "'self'",
        "https://s3.filebase.com"
      ]
    },
  }
}));

app.get('/debug-csp', (req, res) => {
  res.set('Content-Security-Policy', res.get('Content-Security-Policy'));
  res.json({
    csp: res.get('Content-Security-Policy'),
    allHeaders: res.getHeaders()
  });
});

app.use(compression());
app.use(cookieParser());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    console.log('Request origin:', origin, 'Type:', typeof origin);
    
    // Allow requests with no origin (form submissions, direct navigation, mobile apps, etc.)
    if (origin === null || origin === undefined || origin === 'null' || !origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean).concat([process.env.PROD_FRONTEND_URL])
      : (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean).concat([process.env.FRONTEND_URL]);
        
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn('✗ CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cookie', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token'
  ],
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400 // Only log errors in production
  }));
}

// Apply backup middleware to routes that need user tracking
app.use('/api/auth', trackFailedAttempts);
app.use('/api/users', preventDataLoss);

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Default: 1000 requests per window
  message: {
    error: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    const skipPaths = process.env.RATE_LIMIT_SKIP_PATHS 
      ? process.env.RATE_LIMIT_SKIP_PATHS.split(',').map(path => path.trim())
      : ['/health', '/api/health'];
    
    return skipPaths.includes(req.path);
  }
});

app.use(globalLimiter);

// Serve static files (for uploaded files in development)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint with backup service status
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      backup: backupService ? 'initialized' : 'not initialized',
      cleanup: cleanupService ? 'initialized' : 'not initialized',
      scheduler: maintenanceScheduler ? (maintenanceScheduler.isRunning ? 'running' : 'stopped') : 'not initialized'
    }
  });
});

// Backup management endpoints
app.get('/api/backup/status', async (req, res) => {
  try {
    if (!backupService) {
      return res.status(503).json(new ApiResponse({
        success: false,
        error: 'Backup service not initialized'
      }));
    }

    const status = {
      enabled: !!backupService,
      schedulerRunning: maintenanceScheduler?.isRunning || false,
      lastCleanup: cleanupService?.lastCleanupTime || null,
      retentionDays: backupService.retentionDays,
      encryptionEnabled: backupService.encryptionEnabled,
      compressionEnabled: backupService.compressionEnabled
    };

    res.json(new ApiResponse({
      success: true,
      data: status
    }));
  } catch (error) {
    res.status(500).json(new ApiResponse({
      success: false,
      error: 'Failed to get backup status',
      message: error.message
    }));
  }
});

app.post('/api/backup/manual-cleanup', async (req, res) => {
  try {
    if (!cleanupService) {
      return res.status(503).json(new ApiResponse({
        success: false,
        error: 'Cleanup service not initialized'
      }));
    }

    console.log('Starting manual cleanup...');
    
    const expiredDataCleaned = await cleanupService.cleanupExpiredUserData();
    const deletionRequestsCancelled = await cleanupService.processExpiredDeletionRequests();
    const backupsCleaned = await backupService.cleanupExpiredBackups();
    
    const results = {
      expiredDataCleaned,
      deletionRequestsCancelled,
      backupsCleaned
    };

    console.log('Manual cleanup completed:', results);

    res.json(new ApiResponse({
      success: true,
      data: results,
      message: 'Manual cleanup completed successfully'
    }));
  } catch (error) {
    console.error('Manual cleanup failed:', error);
    res.status(500).json(new ApiResponse({
      success: false,
      error: 'Manual cleanup failed',
      message: error.message
    }));
  }
});

app.get('/api/backup/user/:userId', async (req, res) => {
  try {
    if (!backupService) {
      return res.status(503).json(new ApiResponse({
        success: false,
        error: 'Backup service not initialized'
      }));
    }

    const { userId } = req.params;
    const { limit = 10, includeExpired = false } = req.query;

    const backups = await backupService.getUserBackups(userId, {
      limit: parseInt(limit),
      includeExpired: includeExpired === 'true'
    });

    res.json(new ApiResponse({
      success: true,
      data: backups
    }));
  } catch (error) {
    res.status(500).json(new ApiResponse({
      success: false,
      error: 'Failed to get user backups',
      message: error.message
    }));
  }
});

app.post('/api/backup/create/:userId', async (req, res) => {
  try {
    if (!backupService) {
      return res.status(503).json(new ApiResponse({
        success: false,
        error: 'Backup service not initialized'
      }));
    }

    const { userId } = req.params;
    const { reason = 'manual_request' } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(new ApiResponse({
        success: false,
        error: 'User not found'
      }));
    }

    const backup = await backupService.createUserBackup(user, 'manual', {
      requestedBy: req.user?.userId || 'anonymous',
      reason
    });

    res.json(new ApiResponse({
      success: true,
      data: {
        backupId: backup._id,
        userId: user._id,
        size: JSON.stringify(backup.userData).length
      },
      message: 'Backup created successfully'
    }));
  } catch (error) {
    res.status(500).json(new ApiResponse({
      success: false,
      error: 'Failed to create backup',
      message: error.message
    }));
  }
});


app.get('/api/theme', async (req, res) => {
    try {
        const { date, weather, location } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        
        // Pass weather to getThemeForDate for proper priority
        let theme = getThemeForDate(targetDate, weather);
        
        if (!theme) {
            theme = {
                name: 'default',
                theme: 'auto',
                description: 'Default system preference theme',
                colors: {
                    '--bg-primary': '#1a1a1a',
                    '--bg-secondary': '#2d2d2d',
                    '--bg-tertiary': '#404040',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#b3b3b3',
                    '--text-muted': '#808080',
                    '--border-color': '#404040',
                    '--accent-primary': '#0d6efd',
                    '--accent-secondary': '#6c757d',
                    '--success': '#198754',
                    '--warning': '#fd7e14',
                    '--danger': '#dc3545',
                    '--info': '#0dcaf0',
                    '--shadow': 'rgba(0, 0, 0, 0.3)',
                    '--shadow-lg': 'rgba(0, 0, 0, 0.5)',
                    '--bg-overlay': 'rgba(32, 147, 157, 1)'
                }
            };
        }
        
        theme.generatedAt = new Date().toISOString();
        theme.location = location || 'Pakistan';
        
        res.json(theme);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to generate theme',
            message: error.message 
        });
    }
});

app.get('/api/weather', async (req, res) => {
    try {
        const { lat, lon, city } = req.query;
        
        if (!lat && !lon && !city) {
            return res.status(400).json({
              error: 'Either coordinates (lat, lon) or city name is required',
              message: 'Either coordinates (lat, lon) or city name is required'
            });
        }
        
        const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;
        
        if (!WEATHER_API_KEY) {
            return res.status(500).json({
              error: 'Weather service temporarily unavailable',
              message: 'Weather service temporarily unavailable'
            });
        }
        
        let weatherUrl;
        if (lat && lon) {
            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
        } else {
            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric`;
        }
        
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) {
            switch (weatherResponse.status) {
                case 401:
                return res.status(500).json({ error: 'Weather service authentication failed', message: 'Weather service authentication failed' });
                case 404:
                    return res.status(404).json({ error: 'Location not found', message: 'Location not found' });
                case 429:
                    return res.status(429).json({ error: 'Weather service rate limit exceeded', message: 'Weather service rate limit exceeded' });
                default:
                    return res.status(500).json({ error: 'Weather service temporarily unavailable', message: 'Weather service temporarily unavailable' });
            }
        }
        
        const weatherData = await weatherResponse.json();
        
        const simplifiedWeather = {
            condition: parseWeatherCondition(weatherData.weather[0].main.toLowerCase()),
            description: weatherData.weather[0].description,
            temperature: Math.round(weatherData.main.temp),
            humidity: weatherData.main.humidity,
            windSpeed: weatherData.wind?.speed || 0,
            city: weatherData.name,
            country: weatherData.sys.country,
            timestamp: new Date().toISOString(),
            sunrise: new Date(weatherData.sys.sunrise * 1000).toISOString(),
            sunset: new Date(weatherData.sys.sunset * 1000).toISOString()
        };
        
        res.json(simplifiedWeather);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch weather data',
            message: error.message
        });
    }
});

function parseWeatherCondition(weatherMain) {
    const weatherMap = {
        'clear': 'sunny',
        'clouds': 'cloudy',
        'rain': 'rainy',
        'drizzle': 'rainy',
        'thunderstorm': 'stormy',
        'snow': 'cloudy',
        'mist': 'cloudy',
        'fog': 'cloudy',
        'haze': 'cloudy',
        'dust': 'cloudy',
        'sand': 'cloudy',
        'ash': 'cloudy',
        'squall': 'stormy',
        'tornado': 'stormy'
    };
    return weatherMap[weatherMain] || 'cloudy';
}

if (process.env.NODE_ENV === 'development') {
  app.get('/api/weather/test', async (req, res) => {
    const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;
    
    res.json({
      hasApiKey: !!WEATHER_API_KEY,
      keyLength: WEATHER_API_KEY ? WEATHER_API_KEY.length : 0,
      isPlaceholder: WEATHER_API_KEY === 'your_actual_api_key_here' || WEATHER_API_KEY === 'your-weather-api-key',
      environment: process.env.NODE_ENV
    });
  });
}

// Get available themes endpoint
app.get('/api/themes/available', (req, res) => {
  const availableThemes = [
    'Independence Day (Green)',
    'Pakistan Day (Green & White)',
    'Ramadan (Gold & Purple)',
    'Eid (Festive Colors)',
    'Kashmir Day (Black & White)',
    'Defence Day (Military Green)',
    'Quaid-e-Azam Birthday (Formal)',
    'Sunny Weather (Warm)',
    'Rainy Weather (Cool)',
    'Stormy Weather (Dark)',
    'Winter (Cool Blues)',
    'Spring (Fresh Greens)',
    'Summer (Bright)',
    'Autumn (Warm Orange)'
  ];
  
  res.json({ themes: availableThemes });
});

// API health check with more details
app.get('/api/health', (req, res) => {
  const healthcheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      email: require('./services/email').isReady ? 'ready' : 'not configured',
      firebase: validateFirebaseConfig() ? 'configured' : 'not configured',
      backup: backupService ? 'initialized' : 'not initialized',
      cleanup: cleanupService ? 'initialized' : 'not initialized',
      scheduler: maintenanceScheduler ? (maintenanceScheduler.isRunning ? 'running' : 'stopped') : 'not initialized'
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  };

  const httpStatus = healthcheck.services.database === 'connected' ? 200 : 503;
  res.status(httpStatus).json(healthcheck);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use(express.static('public'));
// Root endpoint
app.use('/', require('./routes/pages'));

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.get('/css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '/css/all.main.css'));
});

app.get('/reset-password', async (req, res) => {
  const { token } = req.query;
  
  // Check if token is provided
  if (!token) {
    console.log('Reset password accessed without token, redirecting to forgot-password');
    return res.redirect('/forgot-password?error=missing-token');
  }
  
  // Basic token format validation
  if (token.length < 20) {
    console.log('Reset password accessed with invalid token format');
    return res.redirect('/forgot-password?error=invalid-token');
  }
  
  try {
    // Validate token exists in database
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
    
    // Token is valid, serve the reset password page
    res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
    
  } catch (error) {
    console.error('Error validating reset token:', error);
    res.redirect('/forgot-password?error=server-error');
  }
});

app.use('/auth/verify-device', (req, res, next) => {
  res.sendFile(path.join(__dirname, 'public', 'verify-device.html'));
});

app.use('/terms', (req, res, next) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.use('/privacy', (req, res, next) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 404 handler for web routes
app.use(async (req, res) => {
  // Skip logging for common bot/scanner requests
  const skipPaths = [
    '/.well-known/',
    '/robots.txt',
    '/sitemap.xml',
    '/favicon.ico',
    '/apple-touch-icon',
    '/android-chrome',
    '/browserconfig.xml',
    '/manifest.json',
    '/.env',
    '/wp-admin',
    '/admin.php',
    '/phpmyadmin'
  ];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return res.status(404).end();
  }
  
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Use the enhanced error handler
app.use(enhancedErrorHandler);

// Database connection
const connectDB = async () => {
  try {
    const mongoOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    await mongoose.connect(process.env.MONGO_URL, mongoOptions);
    
    console.log('✅ MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Initialize services
const initializeServices = async () => {
  try {
    console.log('🚀 Initializing services...');

    // Initialize email service
    await initializeEmailService();
    // await sendTestEmail();
    // await fixSessionsIndex();

    // Validate Firebase configuration
    if (validateFirebaseConfig()) {
      console.log('✅ Firebase configuration validated');
    } else {
      console.warn('⚠️ Firebase configuration incomplete');
    }

    console.log('✅ Services initialized successfully');

  } catch (error) {
    console.error('❌ Service initialization failed:', error.message);
    // Don't exit the process, some services may not be critical
  }
};

// FIXED: Graceful shutdown handling with proper async/await for Mongoose
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    try {
      // Use promise-based approach instead of callback
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
      console.log('👋 Process terminated gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize services
    await initializeServices();
    
    // Start HTTP server
    server = app.listen(PORT, () => {
      const baseUrl = process.env.NODE_ENV === 'production' ? process.env.PROD_BASE_URL : process.env.BASE_URL;
      const frontendUrl = process.env.NODE_ENV === 'production' ? process.env.PROD_FRONTEND_URL : process.env.FRONTEND_URL;

      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: ${baseUrl}/health`);
      console.log(`🌐 API Base URL: ${baseUrl}/api`);
      
      if (frontendUrl) {
        console.log(`🎨 Frontend URL: ${frontendUrl}`);
      }
      
      console.log('\n✅ Server started successfully!\n');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

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

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

// Export app for testing
module.exports = app;