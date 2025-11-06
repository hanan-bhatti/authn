# Authn - Universal Authentication System

<p align="center">
  <img src="https://spotless-orange-flea.myfilebase.com/ipfs/QmSaqA9tpYReUdr4Xw3uyvsCts5xTeHKsfdiHDiDjTUN4W" alt="Authn Logo" width="120">
</p>

<p align="center">
  <strong>A robust, secure, and production-ready authentication system for modern applications</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen" alt="Node.js Version">
  <img src="https://img.shields.io/badge/npm-%3E%3D8.0.0-blue" alt="NPM Version">
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
  <img src="https://img.shields.io/github/stars/hanan-bhatti/authn?style=social" alt="GitHub Stars">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Support](#-support)
- [License](#-license)

---

## 🎯 Overview

**Authn** is a comprehensive, enterprise-grade authentication system built with Node.js, Express, and MongoDB. It provides everything you need to implement secure user authentication in your applications, from basic email/password login to advanced features like two-factor authentication, device management, and social login.

### Why Authn?

- **🔒 Security First**: Built with industry best practices and security standards
- **⚡ Production Ready**: Battle-tested features ready for real-world applications
- **🎨 Developer Friendly**: Clean API, comprehensive documentation, easy integration
- **🚀 Feature Rich**: JWT auth, 2FA, social login, device management, and more
- **📊 Analytics Built-in**: Track user sessions, devices, and activity
- **🔧 Highly Configurable**: Customize every aspect to fit your needs

---

## ✨ Key Features

### 🔐 Authentication Methods

- **Email & Password Authentication**
  - Secure password hashing with bcryptjs (12 salt rounds)
  - Password strength validation
  - Account lockout after failed attempts
  - Password reset via email with secure tokens

- **Social Authentication**
  - Google OAuth 2.0 (via Firebase Admin SDK)
  - Account linking for existing users
  - Profile picture import
  - Future support: Facebook, GitHub, Twitter, LinkedIn

- **Two-Factor Authentication (2FA)**
  - TOTP-based (Time-based One-Time Password)
  - Compatible with Google Authenticator, Authy
  - 8-digit alphanumeric backup codes
  - Progressive lockout on failed attempts
  - Session-based 2FA verification status

### 🛡️ Security Features

- **Device Management**
  - Comprehensive device fingerprinting
  - Trusted device marking
  - New device email verification
  - Session tracking per device

- **Rate Limiting**
  - Authentication routes: 5 attempts per 15 minutes
  - General API: 1000 requests per 15 minutes
  - Per-user and IP-based throttling
  - Configurable limits

- **Session Management**
  - JWT-based stateless authentication
  - Configurable expiration (default: 7 days)
  - "Remember Me" feature (30 days)
  - Track up to 5 concurrent sessions
  - Activity monitoring

- **Account Protection**
  - Progressive delay after failed attempts
  - Account lockout (30 min after 10 attempts)
  - 2FA lockout (15 min after 5 attempts)
  - Auto session termination on password change
  - Email notifications for suspicious activity

### 👤 User Management

- **Profile Management**
  - Full name, username, email, phone
  - Profile picture upload with image processing
  - Date of birth, gender, bio, website
  - Location tracking (coordinates, address)
  - Customizable preferences

- **Account Operations**
  - Email verification flow
  - Secure password reset
  - Account deletion with backup
  - Data export (GDPR compliance)
  - Account restoration

- **Permissions & Roles**
  - Role-based access control (RBAC)
  - Roles: user, moderator, admin, superadmin
  - Granular permission system
  - Permission inheritance

### 📊 Monitoring & Analytics

- **Audit Logging**
  - All security events logged
  - IP address and user agent tracking
  - Searchable and filterable logs
  - Timestamp with timezone support

- **User Analytics**
  - Total sessions and login count
  - Average session duration
  - Device count and last active date
  - Feature usage tracking
  - Location-based analytics

### 💾 Data Management

- **Automated Backups**
  - Pre-deletion backups (mandatory)
  - Periodic backups (scheduled)
  - Manual backup triggers
  - Compression and encryption
  - 365-day retention (configurable)

- **Cleanup Services**
  - Expired session cleanup
  - Old backup deletion
  - Unused device removal
  - Token cleanup
  - Scheduled maintenance

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Backend** | Node.js v16+, Express.js v4.21 |
| **Database** | MongoDB with Mongoose ODM |
| **Authentication** | JWT, bcryptjs, Firebase Admin SDK |
| **Security** | Helmet, CORS, express-rate-limit |
| **Email** | Nodemailer |
| **Storage** | AWS S3-compatible (Filebase) with IPFS |
| **Image Processing** | Sharp |
| **2FA** | Speakeasy, QRCode |
| **Validation** | express-validator |
| **Utilities** | node-cron, uuid, ua-parser-js, geoip-lite |

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB instance (local or cloud)
- SMTP server for emails (Gmail, SendGrid, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hanan-bhatti/authn.git
   cd authn
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   ```env
   # Server
   PORT=5000
   NODE_ENV=development
   BASE_URL=http://localhost:5000
   
   # Database
   MONGO_URL=mongodb://localhost:27017/authn
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-min-32-characters
   
   # Email (Example: Gmail)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-specific-password
   EMAIL_FROM=noreply@yourdomain.com
   ```

4. **Start the server**
   
   Development mode:
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

5. **Access the application**
   
   - API: http://localhost:5000/api
   - Health Check: http://localhost:5000/health
   - Auth UI: http://localhost:5000/

### Quick Test

Test the API with curl:

```bash
# Health check
curl http://localhost:5000/health

# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser",
    "password": "SecurePass123!"
  }'
```

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────┐
│         Client Applications             │
│   (Web, Mobile, Third-party Apps)      │
└──────────────┬──────────────────────────┘
               │ HTTPS/REST API
               │
┌──────────────▼──────────────────────────┐
│         Express.js Server               │
│  ┌────────────────────────────────┐    │
│  │  Middleware Layer              │    │
│  │  • CORS  • Helmet              │    │
│  │  • Rate Limiting  • Auth       │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │  Route Handlers                │    │
│  │  /auth  /users  /permissions   │    │
│  └────────────────────────────────┘    │
└──────────┬────────────┬─────────────────┘
           │            │
    ┌──────▼──────┐  ┌─▼─────────────┐
    │  MongoDB    │  │ External      │
    │  Database   │  │ Services      │
    │             │  │ • Email       │
    │             │  │ • Firebase    │
    │             │  │ • Storage     │
    └─────────────┘  └───────────────┘
```

### Directory Structure

```
authn/
├── middleware/          # Auth & validation middleware
│   ├── auth.js         # JWT, device fingerprinting
│   └── errorHandler.js # Global error handling
├── models/             # Mongoose data models
│   ├── User.js         # User schema
│   └── Userpermissions.js # Permission tracking
├── routes/             # API route definitions
│   ├── auth.js         # Authentication endpoints
│   ├── user.js         # User management
│   └── permissionManager.js # Permissions
├── services/           # Business logic services
│   ├── email.js        # Email service
│   ├── firebaseService.js # Firebase
│   ├── storage.js      # File storage
│   └── usersBackup.js  # Backup services
├── utils/              # Utility functions
│   ├── helpers.js      # Common utilities
│   └── theme.js        # Dynamic theming
├── public/             # Frontend static files
│   ├── css/           # Stylesheets
│   ├── js/            # Client-side JS
│   └── *.html         # UI pages
├── scripts/            # Maintenance scripts
└── server.js          # Application entry point
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "johndoe",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "ABC123"
}
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### User Management Endpoints

#### Get Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Software Developer"
}
```

#### Upload Avatar
```http
POST /api/users/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

avatar: <file>
```

#### Change Password
```http
POST /api/users/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

### 2FA Endpoints

#### Setup 2FA
```http
POST /api/users/2fa/setup
Authorization: Bearer <token>
```

#### Enable 2FA
```http
POST /api/users/2fa/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}
```

#### Verify 2FA
```http
POST /api/auth/verify-2fa
Content-Type: application/json

{
  "userId": "user-id",
  "token": "123456"
}
```

#### Disable 2FA
```http
POST /api/users/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "SecurePass123!"
}
```

### Device Management

#### Get Trusted Devices
```http
GET /api/users/devices
Authorization: Bearer <token>
```

#### Remove Device
```http
DELETE /api/users/devices/:deviceId
Authorization: Bearer <token>
```

### Session Management

#### Get Active Sessions
```http
GET /api/users/sessions
Authorization: Bearer <token>
```

#### Revoke Session
```http
DELETE /api/users/sessions/:sessionId
Authorization: Bearer <token>
```

#### Revoke All Sessions
```http
POST /api/users/sessions/revoke-all
Authorization: Bearer <token>
```

For complete API documentation, see [API.md](docs/API.md)

---

## 🔒 Security

### Security Features

- **Password Security**: bcryptjs with 12 salt rounds
- **JWT Tokens**: Signed with HS256, configurable expiration
- **Rate Limiting**: Prevents brute-force attacks
- **Account Lockout**: Progressive delays and lockouts
- **Device Fingerprinting**: Track and verify devices
- **Session Management**: Secure session handling
- **CORS**: Configurable cross-origin policies
- **Helmet**: HTTP security headers
- **Input Validation**: express-validator for all inputs
- **SQL Injection**: Mongoose parameterized queries
- **XSS Protection**: Input sanitization

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

### Reporting Security Issues

Please report security vulnerabilities to: [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com)

For more details, see [SECURITY.md](SECURITY.md)

---

## ⚙️ Configuration

### Environment Variables

#### Required Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGO_URL=mongodb://localhost:27017/authn

# JWT Secret (min 32 characters)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

#### Optional Variables

```env
# JWT Configuration
JWT_EXPIRES_IN=7d

# Rate Limiting
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Firebase (for Google Auth)
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com

# File Storage (Filebase/S3)
FILEBASE_ACCESS_KEY_ID=your-access-key
FILEBASE_SECRET_ACCESS_KEY=your-secret-key
FILEBASE_BUCKET_NAME=your-bucket-name

# URLs
BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

### Configuration Files

- `.env` - Environment variables
- `.env.example` - Example configuration
- `server.js` - Server configuration

---

## 🚢 Deployment

### Docker Deployment

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t authn .
docker run -p 5000:5000 --env-file .env authn
```

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name authn

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Heroku Deployment

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
# ... set other variables

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

For detailed deployment guides, see [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/authn.git
cd authn

# Add upstream remote
git remote add upstream https://github.com/hanan-bhatti/authn.git

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

### Code Style

- Follow ESLint configuration
- Use meaningful variable names
- Add comments for complex logic
- Write unit tests for new features
- Update documentation

---

## 📖 Documentation

- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md)
- [Features Roadmap](FEATURES.md)

---

## 💬 Support

### Getting Help

- 📧 Email: [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com)
- 🐛 Issues: [GitHub Issues](https://github.com/hanan-bhatti/authn/issues)
- 💡 Discussions: [GitHub Discussions](https://github.com/hanan-bhatti/authn/discussions)

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check MONGO_URL in .env

2. **Email Not Sending**
   - Verify SMTP credentials
   - Check firewall settings
   - Use app-specific password for Gmail

3. **JWT Token Invalid**
   - Ensure JWT_SECRET is set
   - Check token expiration

For more help, see [FAQ.md](docs/FAQ.md)

---

## 🗺️ Roadmap

### Version 1.5 (Q2 2025)
- [ ] Magic link authentication
- [ ] Email-based OTP
- [ ] OAuth: Facebook, GitHub, Twitter
- [ ] Advanced RBAC API
- [ ] Webhook support

### Version 2.0 (Q4 2025)
- [ ] Admin dashboard UI
- [ ] SAML 2.0 support
- [ ] WebAuthn (biometric auth)
- [ ] Official JavaScript SDK
- [ ] Multi-tenancy support

See [FEATURES.md](FEATURES.md) for complete roadmap.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👏 Acknowledgments

- Built with ❤️ by [Abdul Hannan Bhatti](https://github.com/hanan-bhatti)
- Inspired by industry best practices
- Thanks to all contributors

---

## 📊 Project Stats

<p align="center">
  <img src="https://img.shields.io/github/contributors/hanan-bhatti/authn" alt="Contributors">
  <img src="https://img.shields.io/github/forks/hanan-bhatti/authn" alt="Forks">
  <img src="https://img.shields.io/github/issues/hanan-bhatti/authn" alt="Issues">
  <img src="https://img.shields.io/github/license/hanan-bhatti/authn" alt="License">
</p>

---

<p align="center">
  Made with ❤️ by Abdul Hannan Bhatti
</p>

<p align="center">
  <a href="https://github.com/hanan-bhatti/authn">⭐ Star us on GitHub</a>
</p>