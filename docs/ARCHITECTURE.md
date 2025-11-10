# Modular Architecture Overview

## Directory Structure

```
Authn/
│
├── server.js (79 lines) ⭐ Main entry point
│
├── loaders/                      # Initialization modules
│   ├── logger.js                 # Winston logger setup
│   ├── database.js               # MongoDB connection
│   ├── services.js               # Email & Backup services init
│   ├── startup.js                # Banner & shutdown handlers
│   └── app.js                    # Express app orchestrator
│
├── middleware/                   # Middleware configurations
│   ├── auth.js                   # (Existing) Authentication
│   ├── common.js                 # Security, compression, parsing, logging, timeout
│   ├── cors.js                   # CORS configuration
│   ├── passport.js               # OAuth strategies (5 providers)
│   ├── rateLimiter.js            # Rate limiting configs
│   ├── backup.js                 # Backup middleware & error handling
│   └── errorHandler.js           # (Existing) Error handling
│
├── routes/                       # Route definitions
│   ├── auth.js                   # (Existing) Auth routes
│   ├── user.js                   # (Existing) User routes  
│   ├── pages.js                  # (Existing) Page routes
│   └── health.js                 # Health check endpoints
│
├── config/                       # Configuration files
│   └── routes.js                 # Route configuration by mode
│
├── models/                       # (Existing) Mongoose models
├── services/                     # (Existing) Business logic services
└── utils/                        # (Existing) Utility functions
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         server.js (Entry Point)                  │
│                                                                   │
│  1. Initialize Logger                                            │
│  2. Connect Database                                             │
│  3. Initialize Services                                          │
│  4. Initialize Backup Services                                   │
│  5. Create Express App                                           │
│  6. Start HTTP Server                                            │
│  7. Setup Shutdown Handlers                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
  ┌──────────┐       ┌──────────┐       ┌──────────┐
  │ loaders/ │       │middleware│       │ routes/  │
  └──────────┘       └──────────┘       └──────────┘
        │                   │                   │
        ├─logger.js         ├─common.js         ├─health.js
        ├─database.js       ├─cors.js           ├─auth.js
        ├─services.js       ├─passport.js       ├─user.js
        ├─startup.js        ├─rateLimiter.js    └─pages.js
        └─app.js            └─backup.js
                                  │
                                  ▼
                            ┌──────────┐
                            │ config/  │
                            └──────────┘
                                  │
                                  └─routes.js
```

## Module Dependencies

### loaders/logger.js
- Dependencies: `winston`, `winston-daily-rotate-file`, `utils/config`
- Exports: `initializeLogger()`
- Used by: `server.js`

### loaders/database.js
- Dependencies: `mongoose`, `utils/config`, `loaders/logger`
- Exports: `connectDatabase()`, `closeDatabase()`
- Used by: `server.js`, `loaders/startup.js`

### loaders/services.js
- Dependencies: `services/email`, `services/usersBackup`, `utils/config`
- Exports: `initializeServices()`, `initializeBackupServices()`
- Used by: `server.js`

### loaders/startup.js
- Dependencies: `utils/config`, `loaders/logger`, `loaders/database`
- Exports: `displayStartupBanner()`, `setupShutdownHandlers()`, `gracefulShutdown()`
- Used by: `server.js`

### loaders/app.js
- Dependencies: All middleware modules, `config/routes`, `express`
- Exports: `initializeApp(backupService)`
- Used by: `server.js`

### middleware/common.js
- Dependencies: `helmet`, `compression`, `morgan`, `cookie-parser`, `express`, `utils/config`
- Exports: Multiple middleware setup functions
- Used by: `loaders/app.js`

### middleware/cors.js
- Dependencies: `cors`, `utils/config`
- Exports: `setupCors()`, `getCorsOptions()`
- Used by: `loaders/app.js`

### middleware/passport.js
- Dependencies: `passport`, 5 OAuth strategy packages, `models/User`, `utils/config`
- Exports: `setupPassport()`, `configurePassportStrategies()`
- Used by: `loaders/app.js`

### middleware/rateLimiter.js
- Dependencies: `express-rate-limit`, `utils/config`
- Exports: Multiple rate limiter instances
- Used by: `loaders/app.js`

### middleware/backup.js
- Dependencies: `models/User`, `utils/helpers`, `loaders/logger`
- Exports: `trackFailedAttempts`, `enhancedErrorHandler`, `preventDataLoss`
- Used by: `loaders/app.js`

### routes/health.js
- Dependencies: `express`, `mongoose`, `utils/config`
- Exports: Express router with health endpoints
- Used by: `loaders/app.js`

### config/routes.js
- Dependencies: All route modules, `express`, `path`
- Exports: `configureRoutes(app, routes)`
- Used by: `loaders/app.js`

## Request Flow

```
1. HTTP Request → Express App (app.js)
                        ↓
2. Security Middleware (common.js: helmet, compression)
                        ↓
3. CORS Middleware (cors.js)
                        ↓
4. Session & Passport Middleware (passport.js)
                        ↓
5. Body Parsing (common.js: json, urlencoded)
                        ↓
6. Request Logging (common.js: morgan)
                        ↓
7. Request Timeout (common.js)
                        ↓
8. Backup Tracking (backup.js: trackFailedAttempts)
                        ↓
9. Rate Limiting (rateLimiter.js)
                        ↓
10. Route Handlers (routes/*)
                        ↓
11. Error Handling (backup.js: enhancedErrorHandler)
                        ↓
12. HTTP Response
```

## Initialization Sequence

```
Step 1: Logger Initialization
        ↓
Step 2: Database Connection
        │
        ├─ MongoDB connect with options
        ├─ Setup error handlers
        ├─ Setup disconnection handlers
        └─ Setup reconnection handlers
        ↓
Step 3: Service Initialization
        │
        ├─ Email Service
        └─ File Storage Service
        ↓
Step 4: Backup Service Initialization
        │
        ├─ UserBackupService
        ├─ UserCleanupService
        └─ UserMaintenanceScheduler
        ↓
Step 5: Express App Creation
        │
        ├─ Setup view engine (EJS)
        ├─ Setup trust proxy
        ├─ Apply common middleware
        ├─ Apply CORS middleware
        ├─ Apply Passport middleware
        ├─ Apply rate limiting
        ├─ Configure routes
        └─ Apply error handlers
        ↓
Step 6: HTTP Server Start
        │
        └─ Listen on PORT
        ↓
Step 7: Shutdown Handlers Setup
        │
        ├─ SIGTERM handler
        ├─ SIGINT handler
        ├─ Uncaught exception handler
        └─ Unhandled rejection handler
```

## Benefits of This Architecture

✅ **Separation of Concerns**: Each module has a single, well-defined responsibility

✅ **Maintainability**: Changes to one component don't affect others

✅ **Testability**: Each module can be unit tested independently

✅ **Scalability**: Easy to add new features without bloating server.js

✅ **Readability**: Clear, organized structure that's easy to understand

✅ **Reusability**: Modules can be imported and used in other projects

✅ **Debugging**: Easier to locate and fix issues

✅ **Onboarding**: New developers can quickly understand the architecture

## File Size Comparison

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| server.js | 1,263 lines | 79 lines | **93.7%** |

The same functionality is now spread across 11 well-organized modules,
making the codebase significantly more maintainable.
