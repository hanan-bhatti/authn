# Authn - AI Coding Agent Instructions

## Project Overview

**Authn** is a production-grade, enterprise authentication platform with 19 integrated security features. It's a self-hosted alternative to Auth0/Firebase Auth, built with Node.js, Express, MongoDB, and Redis for high-performance session management.

**Tech Stack**: Node.js 16+, Express 4, MongoDB 4.4+, Redis 5+, JWT, bcryptjs, Passport (OAuth), Winston (logging)

---

## Architecture Pattern: Modular Loader System

This codebase uses a **strict modular initialization pattern** where `server.js` (79 lines) orchestrates startup through specialized loader modules:

```
server.js (entry) → loaders/ → middleware/ → routes/ → services/
```

### Critical Rule: Never bloat server.js
- All initialization logic belongs in `loaders/` (logger, database, services, app)
- All middleware belongs in `middleware/` (auth, cors, passport, rateLimiter, backup)
- All route mounting logic belongs in `config/routes.js`
- `server.js` should remain under 100 lines

See `docs/ARCHITECTURE.md` for the complete flow diagram.

---

## Deployment Modes (Critical for URL generation)

The system supports **3 deployment modes** that affect port allocation and CORS:

1. **same-port**: Frontend + Backend on same port (monolithic)
2. **different-ports**: Frontend on `PORT`, Backend on `PORT+1` (dev with Vite/React)
3. **separate-domains**: Completely different URLs (production microservices)

**Configuration**: Set `DEPLOYMENT_MODE` in `.env`. URLs auto-calculate unless explicitly overridden.

**When working with URLs/CORS**: Always check `utils/config.js` deployment mode logic (lines 60-140) before hardcoding any URL.

See `docs/DEPLOYMENT_MODES.md` for examples and troubleshooting.

---

## Authentication & Security Layers

### JWT Authentication Flow
1. **Login** → JWT generated with `{ userId, sessionId, deviceId }` payload
2. **Stored** → HTTP-only cookie (secure in prod) + optional Bearer token
3. **Validated** → `middleware/auth.js::authenticate()` checks signature + expiry
4. **Session** → Cached in Redis (7-day TTL), MongoDB as source of truth

**Device Fingerprinting**: Uses `UAParser` + `geoip-lite` to track trusted devices. New devices require email verification (token expires in 24h).

### Account Lockout Mechanism
- **Login failures**: 10 attempts → 30min lockout
- **2FA failures**: 5 attempts → 15min lockout
- **Implementation**: `middleware/auth.js::trackLoginAttempts()` increments `user.failedLoginAttempts` and sets `accountLockedUntil`

### Rate Limiting Strategy
- **Auth endpoints**: 5 req/15min (per IP + user)
- **General API**: 1000 req/15min
- **Implementation**: `middleware/rateLimiter.js` uses `express-rate-limit` with Redis store (if enabled)

---

## Database Patterns

### MongoDB Connection (loaders/database.js)
- Pool size: 500 max, 50 min (high concurrency optimized)
- Auto-reconnect with exponential backoff
- Indexes: username, email (unique), sessions.sessionId, deletionToken, passwordResetToken

### User Model (models/User.js)
Key fields and their purposes:
- `sessions[]`: Active JWT sessions (max 5 concurrent)
- `trustedDevices[]`: Device fingerprints for 2FA bypass
- `accountLockedUntil`: Timestamp for lockout expiry
- `deletionToken`: Hashed token for account deletion flow (expires 24h)
- `twoFactorAuth.secret`: TOTP secret (generated with `speakeasy`)

**Virtual Fields**: `fullName`, `isLocked`, `activeSessions` (computed, not stored)

### Redis Caching Strategy (services/redis.js)
- **Sessions**: 7-day TTL, 90-95% hit rate expected
- **Users**: 1-hour TTL (frequently updated)
- **Rate limits**: Sliding window counters (faster than MongoDB queries)
- **Pattern**: Always check Redis first, fallback to MongoDB on cache miss

**Cache Invalidation**: User updates trigger `post('save')` hook that calls `redis.invalidateUser(userId)`

---

## Critical Developer Workflows

### Starting the Server
```powershell
# Development (hot reload)
npm run dev

# Production
npm start

# With specific deployment mode
$env:DEPLOYMENT_MODE="different-ports"; npm run dev
```

### Running Tests
```powershell
# All tests (Jest)
npm test

# Specific test file
npx jest __tests__/auth.test.js

# With coverage
npm run test:coverage
```

**Test Structure**: Uses `supertest` for API testing, `jest` as runner. Test users created via `scripts/seed.js`.

### Database Seeding
```powershell
npm run seed
```
Creates 15 test users with all auth states (locked, 2FA-enabled, soft-deleted, etc.). See `scripts/README.md` for credentials.

### Running Postman Collections
```powershell
.\run-postman-tests.bat
```
Executes all 5 Postman collections sequentially using `newman`.

### Checking Logs
```powershell
# Last 50 lines
Get-Content logs/*.log -Tail 50

# Follow in real-time
Get-Content logs/app.log -Wait
```

Logs rotate daily (Winston with `winston-daily-rotate-file`). Format: JSON in production, simple in dev.

---

## Code Conventions & Patterns

### Error Handling
**Use the helpers, not raw throws**:
```javascript
const { ApiError, ApiResponse, asyncHandler } = require('../utils/helpers');

// ✅ Correct
router.post('/endpoint', asyncHandler(async (req, res) => {
  if (!req.body.email) throw ApiError.badRequest('Email required');
  res.json(ApiResponse.success(data, 'Success message'));
}));

// ❌ Wrong - bypasses error handling middleware
router.post('/endpoint', async (req, res) => {
  throw new Error('This won\'t be caught properly');
});
```

All errors flow through `middleware/backup.js::enhancedErrorHandler()` which auto-creates backups on critical failures.

### Backup Before Delete Pattern
**Critical**: User deletions must create backups BEFORE database operations:
```javascript
// In routes/user.js
router.delete('/account', authenticate, asyncHandler(async (req, res) => {
  const backup = await backupService.createBackup(req.user._id, 'user_request');
  await User.findByIdAndUpdate(req.user._id, { isDeleted: true });
  // Backup saved at backups/{userId}_{timestamp}.json (AES-256 encrypted)
}));
```

### Password Validation Rules
- Min 8 chars, must include: uppercase, lowercase, number, special char (`@$!%*?&`)
- Validation regex in `utils/helpers.js::validatePassword()`
- Hashing: `bcryptjs` with 12 rounds (configurable via `BCRYPT_ROUNDS`)

### Session Creation Pattern
```javascript
const Session = require('../models/Session');
const { generateSessionId } = require('../utils/helpers');

// Create session with device fingerprinting
const session = await Session.create({
  user: userId,
  sessionId: generateSessionId(),
  deviceFingerprint: req.deviceFingerprint, // Added by middleware
  ipAddress: req.deviceFingerprint.ip,
  userAgent: req.get('User-Agent'),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
});

// Generate JWT
const token = jwt.sign(
  { userId, sessionId: session.sessionId, deviceId: req.deviceFingerprint.id },
  config.JWT_SECRET,
  { expiresIn: config.JWT_EXPIRES_IN }
);
```

---

## Testing Strategy (Current Gaps)

**Test Coverage**: ~30% (CRITICAL GAP - needs improvement)

### Existing Tests
- `__tests__/auth.test.js`: Registration, login, email verification (basic flows)
- `__tests__/file.test.js`: File upload with authentication checks
- `__tests__/api-keys.test.js`: API key generation/validation
- `__tests__/test-mongodb.js`: Database connection smoke test
- `__tests__/test-deployment-modes.js`: URL generation validation

### Testing Pattern
```javascript
describe('Auth - Registration', () => {
  beforeAll(async () => {
    await mongoose.connect(config.MONGO_URL);
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'test', email: 'test@example.com', password: 'Test123!@#' });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'test@example.com' });
    await mongoose.disconnect();
  });
});
```

**When adding tests**: Use `asyncHandler` in routes to ensure errors are caught by Jest.

---

## Environment Variables - Critical Ones

```env
# Required for startup
MONGO_URL=mongodb://localhost:27017/authn
JWT_SECRET=min-32-char-random-string-CHANGE-THIS
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-specific-password

# Deployment mode (affects URL generation)
DEPLOYMENT_MODE=same-port  # or different-ports, separate-domains
PORT=5000

# Redis (optional but recommended)
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379

# Security
BCRYPT_ROUNDS=12
MAX_ACTIVE_SESSIONS=5
AUTH_MAX_LOGIN_ATTEMPTS=10

# Feature flags (enable/disable entire features)
FEATURE_REGISTRATION_ENABLED=true
FEATURE_2FA_ENABLED=true
TWO_FACTOR_AUTH_ENABLED=true
```

See `utils/config.js` for all 150+ config variables and their defaults.

---

## Common Pitfalls & Solutions

### Issue: CORS Errors in different-ports mode
**Cause**: `CORS_ALLOWED_ORIGINS` doesn't include frontend URL
**Fix**: Add frontend to `.env`:
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Issue: Redis connection fails but server crashes
**Cause**: Redis connection is synchronous in `loaders/services.js`
**Fix**: Already wrapped in try-catch, falls back gracefully. Check `REDIS_ENABLED=false` if not using Redis.

### Issue: Password reset tokens not expiring
**Cause**: Token expiry not checked in `routes/auth.js::resetPassword()`
**Fix**: Always check `user.passwordResetExpires > Date.now()` before accepting token.

### Issue: Device fingerprints changing on every request
**Cause**: IP address extraction issues (localhost, proxies)
**Fix**: `middleware/auth.js::deviceFingerprint()` handles IPv6→IPv4 conversion and proxy headers. Check logs for "IP Detection Debug".

### Issue: Tests failing with "connect ECONNREFUSED"
**Cause**: MongoDB not running
**Fix**: Start MongoDB: `sudo systemctl start mongodb` (Linux) or `mongod` (Windows)

---

## File Organization Rules

### When adding new authentication methods:
1. Add strategy to `middleware/passport.js::configurePassportStrategies()`
2. Add callback route to `routes/auth.js`
3. Update `models/User.js::socialAccounts[]` schema if needed
4. Add config vars to `utils/config.js` (e.g., `TWITTER_CLIENT_ID`)

### When adding new middleware:
1. Create file in `middleware/` with setup function
2. Export setup function (e.g., `setupMyMiddleware(app)`)
3. Import and call in `loaders/app.js` (maintain order: security → parsing → logging → business)

### When adding new models:
1. Create schema in `models/`
2. Add indexes for frequently queried fields
3. Add `post('save')` hook to invalidate Redis cache if cacheable
4. Export both model and any static methods

### When adding new services:
1. Create service in `services/` with clear interface
2. Initialize in `loaders/services.js::initializeServices()`
3. Handle initialization failures gracefully (service should be optional if possible)

---

## Performance Optimization Notes

### MongoDB Queries
- Always use indexes for lookups: `User.findOne({ email })` uses index
- Avoid `$where` and JavaScript expressions (they disable indexes)
- Use `.lean()` for read-only queries to skip Mongoose overhead

### Redis Usage
- Session validation is the #1 hotspot (100ms → 2ms with Redis)
- User profile lookups are #2 (50ms → 2ms with Redis)
- Rate limiting with Redis is 50x faster than MongoDB counters

### Request Timeout
- Default: 30s (`utils/config.js::REQUEST_TIMEOUT`)
- Set via `middleware/common.js::setupTimeout()`
- Override per-route if needed for long operations (file uploads, etc.)

---

## Integration Points

### Email Service (services/email.js)
- Uses `nodemailer` with SMTP
- Templates: Plain text generated dynamically (no external template engine)
- Async sending (doesn't block response)
- **Gmail users**: Use app-specific password, not account password

### File Storage (services/storage.js)
- Supports: AWS S3, Filebase (IPFS-backed), Local filesystem
- Image optimization with `sharp` (85% quality, auto-resize)
- Max file size: 50MB (configurable via `MAX_FILE_SIZE`)

### Backup Service (services/usersBackup.js)
- Auto-backup on deletion/critical errors
- AES-256-CBC encryption with key from `BACKUP_ENCRYPTION_KEY`
- Retention: 365 days (configurable)
- Cron schedule: Daily at 2 AM UTC

---

## Documentation Locations

- **API Reference**: `docs/API.md` - Complete endpoint documentation with curl examples
- **Architecture**: `docs/ARCHITECTURE.md` - Modular loader system explained
- **Deployment**: `docs/DEPLOYMENT_MODES.md` - Port allocation and CORS setup
- **Redis**: `docs/REDIS_IMPLEMENTATION.md` - Caching strategy and performance gains
- **Features**: `FEATURES.md` - Feature matrix and roadmap
- **Migration**: `docs/MIGRATION_GUIDE.md` - Breaking changes between versions

---

## Quick Reference

### Get authenticated user in route handler:
```javascript
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  // req.user populated by authenticate middleware
  res.json(ApiResponse.success(req.user));
}));
```

### Check user permissions:
```javascript
const { authorize } = require('../middleware/auth');
router.delete('/admin/users/:id', authenticate, authorize(['admin', 'superadmin']), ...);
```

### Generate OTP (6-digit):
```javascript
const { generateOTP } = require('../utils/helpers');
const otp = generateOTP(); // Returns string like "123456"
const hashedOtp = await bcrypt.hash(otp, 10);
user.emailVerificationOTP = hashedOtp;
```

### Log structured events:
```javascript
const logger = require('../loaders/logger');
logger.info('User action', { userId, action: 'login', ip: req.ip });
logger.error('Auth failure', { userId, reason: 'invalid_password' });
```

---

## Support & Contributing

- **Issues**: Check `docs/TROUBLESHOOTING.md` first
- **Pull Requests**: Follow commit convention: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- **Testing**: All PRs must include tests for new features
- **Security**: Report vulnerabilities to `hannanbhatti2006@gmail.com` (not GitHub issues)

**License**: MIT - See `LICENSE` file
