# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Magic link authentication
- SMS-based OTP
- Additional OAuth providers (Facebook, GitHub, Twitter, LinkedIn)
- Admin dashboard UI
- WebAuthn support
- GraphQL API

---

## [1.0.0] - 2025-11-06

### 🎉 Initial Public Release

The first stable release of Authn, a comprehensive authentication system with enterprise-grade security features.

### Added

#### Authentication & Security
- **Core Authentication**
  - Email and password registration with secure bcryptjs hashing (12 salt rounds)
  - Login with username or email support
  - JWT-based stateless authentication with configurable expiration
  - "Remember Me" functionality (30-day sessions)
  - Password reset flow with secure token generation and email delivery
  - Email verification with 6-character alphanumeric OTP (10-minute expiry)
  - Google OAuth 2.0 integration via Firebase Admin SDK

- **Two-Factor Authentication**
  - TOTP-based 2FA compatible with standard authenticator apps
  - QR code generation for easy setup
  - 8-digit alphanumeric backup codes with one-time use
  - Backup code regeneration capability
  - Progressive lockout after failed 2FA attempts (15 min after 5 attempts)
  - Session-based 2FA verification with 5-minute grace period

- **Device Management**
  - Comprehensive device fingerprinting (browser, OS, IP, geolocation)
  - Trusted device marking and management
  - New device email verification with 24-hour token expiry
  - Device activity tracking and history
  - Maximum 10 trusted devices per user
  - Automatic cleanup of unused devices

- **Session Management**
  - Track up to 5 concurrent active sessions
  - Session activity monitoring with last activity timestamps
  - View all active sessions with device information
  - Revoke individual sessions or logout from all devices
  - Automatic session expiration handling
  - Session cleanup on password change

- **Rate Limiting & Protection**
  - Global API rate limiting (1000 requests per 15 minutes)
  - Authentication route limiting (5 attempts per 15 minutes)
  - Per-user and IP-based throttling
  - Progressive account lockout (30 min after 10 failed login attempts)
  - Configurable rate limits per endpoint
  - Rate limit bypass for health check endpoints

- **HTTP Security**
  - Helmet integration for secure HTTP headers
  - CORS configuration with whitelist-based origin control
  - Content Security Policy (CSP) headers
  - XSS protection headers
  - Clickjacking prevention (X-Frame-Options)
  - MIME-type sniffing prevention

#### User Management
- **Profile Management**
  - Comprehensive user profiles (name, username, email, phone, bio, website)
  - Profile picture upload with automatic image processing
  - Multiple image sizes generation (thumbnail, small, medium, large)
  - WebP format conversion and quality optimization
  - IPFS/S3 storage integration with Filebase support
  - Location management (coordinates, address, landmark)
  - Date of birth and gender fields

- **Account Operations**
  - Email verification flow with OTP
  - Secure password change with current password confirmation
  - Account deletion with mandatory pre-deletion backup
  - Data anonymization on deletion
  - Account recovery within grace period
  - Complete data export (GDPR compliance)

- **Preferences & Settings**
  - Language selection (10+ languages supported)
  - Timezone configuration
  - Theme preference (light/dark/auto)
  - Notification preferences (email, push, SMS)
  - Privacy settings (profile visibility, location sharing, data collection)

#### Permissions & Roles
- **Role-Based Access Control**
  - Four-tier role system (user, moderator, admin, superadmin)
  - Permission inheritance hierarchy
  - Role-based route protection middleware
  - Granular permission checking

- **Permission Management**
  - Device-specific permission tracking (location, notification, camera, microphone)
  - Permission grant/deny/prompt states
  - Smart permission prompting with benefit-driven requests
  - Contextual permission timing
  - Permission request history and analytics

#### Monitoring & Analytics
- **Audit Logging**
  - Comprehensive logging of all security events
  - Login attempts tracking (success and failure)
  - Password changes, email verifications, 2FA setup/disable
  - Profile updates and permission changes
  - Session and device management events
  - Last 50 audit log entries per user
  - IP address, user agent, and timestamp for each event

- **User Analytics**
  - Total sessions count and duration
  - Average session duration calculation
  - Device count and most active device tracking
  - Login count and last login timestamp
  - Features used tracking
  - Last active date monitoring

- **Notifications**
  - In-app notification system (last 20 notifications)
  - Security alerts for suspicious activity
  - Account update notifications
  - System announcements
  - Unread notification count
  - Mark as read functionality

#### Data Management
- **Backup System**
  - Automated pre-deletion backups (mandatory)
  - Periodic scheduled backups
  - Manual backup trigger API
  - Gzip compression support
  - Optional AES-256 encryption
  - Configurable retention period (default: 365 days)
  - Sensitive data redaction in backups

- **Cleanup Services**
  - Automated expired session removal
  - Old backup deletion based on retention policy
  - Unused device cleanup
  - Expired token removal
  - Pending verification cleanup
  - Daily scheduled maintenance tasks

#### User Interface
- **Authentication Pages**
  - Modern, responsive login page
  - Registration page with real-time validation
  - Email verification interface
  - Password reset flow pages
  - 2FA verification (TOTP and backup codes)
  - Device verification page
  - Dark mode support
  - Smooth animations and transitions

- **User Dashboard**
  - Account overview with statistics
  - Profile management interface
  - Security center with session and device management
  - 2FA setup and management
  - Social account linking interface
  - Audit log viewer
  - Notification center

#### Developer Experience
- **API Design**
  - RESTful API endpoints
  - Consistent response format (ApiResponse class)
  - Comprehensive error handling (ApiError class)
  - Input validation with express-validator
  - Standardized error codes

- **Documentation**
  - Detailed README with quick start guide
  - API documentation with examples
  - Code comments and inline documentation
  - Environment variable documentation
  - Deployment guides

- **Development Tools**
  - ESLint configuration for code quality
  - Nodemon for auto-reload in development
  - Environment-based configuration
  - Health check endpoints
  - Debug logging in development mode

### Changed
- Migrated Google OAuth verification to Firebase Admin SDK for better security
- Improved code structure with service-oriented architecture
- Refactored error responses for consistency across all endpoints
- Enhanced device fingerprinting with geolocation support
- Optimized session management for better performance

### Fixed
- Fixed duplicate sessions bug in concurrent login scenarios
- Resolved timezone issues in token expiration
- Corrected email template rendering on some SMTP servers
- Fixed race condition in 2FA backup code usage
- Resolved CORS issues with certain frontend frameworks

### Security
- Implemented bcryptjs with 12 salt rounds for password hashing
- Added timing-safe password comparison
- Implemented CSRF protection for state-changing operations
- Added rate limiting to prevent brute-force attacks
- Implemented progressive account lockout
- Added device fingerprinting for anomaly detection
- Implemented secure token generation for password reset
- Added email notifications for security events

---

## [0.9.0-beta] - 2025-10-25

### Added
- Beta release for early testing
- Core authentication functionality
- Basic user profile management
- Email verification flow
- Password reset functionality
- JWT token generation and verification

### Changed
- Improved error handling
- Enhanced validation messages
- Refactored middleware structure

### Fixed
- Token expiration edge cases
- Email sending failures on certain SMTP configurations

---

## [0.8.0-alpha] - 2025-10-20

### Added
- Social login framework with Google OAuth 2.0
- Security middleware integration (Helmet, Rate Limiting)
- CORS support for cross-origin requests
- Initial permission system model
- Device fingerprinting prototype

### Changed
- Database schema improvements
- API route restructuring
- Enhanced security headers

---

## [0.5.0-alpha] - 2025-09-15

### Added
- JWT authentication core implementation
- Password hashing with bcryptjs
- Protected route middleware
- Authentication and user route separation
- Basic session management

### Changed
- Modularized authentication logic
- Improved code organization

### Fixed
- Token verification edge cases
- Session cleanup issues

---

## [0.1.0-alpha] - 2025-08-30

### Added
- Initial project setup with Node.js and Express.js
- Basic server structure
- MongoDB connection with Mongoose
- User model schema
- ESLint configuration
- Nodemon for development

---

## Version History Summary

| Version | Date | Key Features |
|---------|------|--------------|
| 1.0.0 | 2025-11-06 | Full production release with 2FA, device management, comprehensive security |
| 0.9.0-beta | 2025-10-25 | Beta testing release with core features |
| 0.8.0-alpha | 2025-10-20 | Social login and security middleware |
| 0.5.0-alpha | 2025-09-15 | JWT authentication implementation |
| 0.1.0-alpha | 2025-08-30 | Initial project setup |

---

## Upgrade Guide

### From 0.9.0-beta to 1.0.0

#### Breaking Changes
1. **Session Structure**: Session schema has new fields. Run migration:
   ```bash
   npm run migrate:sessions
   ```

2. **Environment Variables**: New required variables:
   ```env
   FIREBASE_PRIVATE_KEY_ID=your-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
   ```

3. **API Response Format**: Updated to use `ApiResponse` class consistently

#### Migration Steps
1. Backup your database
2. Update environment variables
3. Run `npm install` to update dependencies
4. Run database migrations: `npm run migrate`
5. Restart the application

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this changelog.

---

## Links

- [Repository](https://github.com/hanan-bhatti/authn)
- [Issues](https://github.com/hanan-bhatti/authn/issues)
- [Documentation](https://github.com/hanan-bhatti/authn/tree/main/docs)

---

**Maintained by**: Abdul Hannan Bhatti  
**Contact**: hannanbhatti2006@gmail.com