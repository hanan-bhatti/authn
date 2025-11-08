# Authn - Documentation

<p align="center">
  <img src="https://spotless-orange-flea.myfilebase.com/ipfs/QmTxYFh6onsouXAS3Jw3kBMJkvbdAuf9LYQ7FnTT5f6mnZ" alt="Authn Logo" width="120">
</p>

<p align="center">
  <strong>Enterprise-Grade Authentication System</strong><br>
  Complete Technical Documentation
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#security">Security</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Authentication Flows](#authentication-flows)
8. [Security Features](#security-features)
9. [Database Schema](#database-schema)
10. [Frontend Integration](#frontend-integration)
11. [Deployment Guide](#deployment)
12. [Monitoring & Maintenance](#monitoring--maintenance)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)
15. [License](#license)

---

## Overview

**Authn** is a production-ready, enterprise-grade authentication system built with modern web technologies. It provides a complete authentication solution with advanced security features, social login integration, and comprehensive user management capabilities.

### Key Features

- ✅ **Multi-Factor Authentication (2FA)** with TOTP and backup codes
- ✅ **Social Login** (Google, Facebook, GitHub, Twitter, LinkedIn)
- ✅ **Email Verification** with OTP
- ✅ **Password Reset** with secure token-based flow
- ✅ **Device Management** with fingerprinting and verification
- ✅ **Session Management** with JWT tokens
- ✅ **Rate Limiting** to prevent brute-force attacks
- ✅ **API Key Management** for third-party integrations
- ✅ **User Backups** with automated cleanup
- ✅ **Audit Logging** for compliance and security
- ✅ **Permission Management** with RBAC
- ✅ **File Upload** with S3-compatible storage (Filebase)
- ✅ **Theme System** with dynamic weather and festival themes

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 16+, Express.js 4.x |
| **Database** | MongoDB with Mongoose ODM |
| **Authentication** | JWT, bcryptjs, Speakeasy (2FA) |
| **Security** | Helmet, CORS, Rate Limiting |
| **Email** | Nodemailer |
| **Storage** | AWS S3 / Filebase (IPFS) |
| **Social Auth** | Firebase Admin SDK |
| **Frontend** | Vanilla JavaScript, CSS3 |

### System Requirements

```yaml
Node.js: >= 16.0.0
npm: >= 8.0.0
MongoDB: >= 4.4
RAM: >= 2GB
Storage: >= 10GB
```

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/hanan-bhatti/authn.git
cd authn
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Access Application

```
http://localhost:5000
```

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Browser │  │  Mobile  │  │  API     │  │  CLI     │     │
│  │  App     │  │  App     │  │  Client  │  │  Tool    │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Rate Limiting  │  CORS  │  Helmet  │  Compression   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Layer                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ JWT Auth   │  │ 2FA Auth   │  │ Device     │             │
│  │            │  │            │  │ Fingerprint│             │
│  └────────────┘  └────────────┘  └────────────┘             │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ User       │  │ Session    │  │ Permission │             │
│  │ Service    │  │ Service    │  │ Service    │             │
│  └────────────┘  └────────────┘  └────────────┘             │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ MongoDB    │  │ Redis      │  │ S3/Filebase│             │
│  │ (Primary)  │  │ (Cache)    │  │ (Storage)  │             │
│  └────────────┘  └────────────┘  └────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
authn/
├── middleware/          # Express middleware
│   ├── auth.js         # Authentication middleware
│   └── errorHandler.js # Error handling
├── models/             # Mongoose models
│   ├── User.js         # User schema
│   └── Userpermissions.js  # Permission schema
├── routes/             # API routes
│   ├── auth.js         # Authentication endpoints
│   ├── user.js         # User management
│   ├── pages.js        # Page routing
│   └── permissionManager.js  # Permission management
├── services/           # Business logic
│   ├── firebaseService.js   # Firebase integration
│   ├── storage.js      # File storage (S3/Filebase)
│   ├── email.js        # Email service
│   └── usersBackup.js  # User backup service
├── utils/              # Utility functions
│   ├── helpers.js      # General utilities
│   ├── theme.js        # Theme management
│   └── islamicDatesFetcher.js  # Islamic calendar
├── public/             # Static files
│   ├── css/           # Stylesheets
│   ├── js/            # Client-side JavaScript
│   └── *.html         # HTML pages
├── scripts/           # Utility scripts
│   └── migration.js   # Database migrations
├── server.js          # Application entry point
├── package.json       # Dependencies
└── .env.example       # Environment template
```

---

## Installation

### Prerequisites

1. **Install Node.js & npm**
   ```bash
   # Download from https://nodejs.org/
   node --version  # Should be >= 16.0.0
   npm --version   # Should be >= 8.0.0
   ```

2. **Install MongoDB**
   ```bash
   # Option 1: Local installation
   # Download from https://www.mongodb.com/try/download/community
   
   # Option 2: Use MongoDB Atlas (Cloud)
   # Sign up at https://www.mongodb.com/cloud/atlas
   ```

3. **Install Git**
   ```bash
   git --version  # Verify installation
   ```

### Step-by-Step Installation

#### 1. Clone and Setup

```bash
# Clone repository
git clone https://github.com/hanan-bhatti/authn.git
cd authn

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

#### 2. Configure MongoDB

**Local MongoDB:**
```env
MONGO_URL=mongodb://localhost:27017/authn
```

**MongoDB Atlas:**
```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/authn?retryWrites=true&w=majority
```

#### 3. Configure JWT

```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Add to `.env`:
```env
JWT_SECRET=your_generated_secret_here
JWT_EXPIRES_IN=7d
```

#### 4. Configure Email Service

**Gmail Example:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

> **Note:** For Gmail, use [App Passwords](https://support.google.com/accounts/answer/185833)

#### 5. Configure Firebase (Optional)

For Google social login:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project
3. Enable Authentication → Google provider
4. Generate service account key (Project Settings → Service Accounts)
5. Add to `.env`:

```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"..."}'
```

#### 6. Configure File Storage (Optional)

**Filebase (S3-compatible with IPFS):**

```env
FILEBASE_ACCESS_KEY_ID=your_access_key
FILEBASE_SECRET_ACCESS_KEY=your_secret_key
FILEBASE_BUCKET_NAME=your_bucket_name
FILEBASE_ENDPOINT=https://s3.filebase.com
```

#### 7. Start Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

---

## Configuration

### Environment Variables

#### Server Configuration

```env
# Server
PORT=5000
NODE_ENV=development  # development | production | test

# Application
APP_NAME=Authn
BASE_URL=https://yourdomain.com
FRONTEND_URL=https://yourfrontend.com
```

#### Database Configuration

```env
# MongoDB
MONGO_URL=mongodb://localhost:27017/authn
MONGO_OPTIONS='{"maxPoolSize":10,"serverSelectionTimeoutMS":5000}'
```

#### Authentication Configuration

```env
# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Session
SESSION_SECRET=your_session_secret_key
```

#### Email Configuration

```env
# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

#### Social Authentication

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

#### Storage Configuration

```env
# Filebase (S3-compatible)
FILEBASE_ACCESS_KEY_ID=your_access_key
FILEBASE_SECRET_ACCESS_KEY=your_secret_key
FILEBASE_BUCKET_NAME=your_bucket
FILEBASE_ENDPOINT=https://s3.filebase.com
FILEBASE_REGION=us-east-1
IPFS_GATEWAY=https://your-bucket.myfilebase.com
```

#### Security Configuration

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_WINDOW_MS=900000   # 15 minutes
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Account Security
AUTH_MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_DURATION=1800000      # 30 minutes

# Password
BCRYPT_ROUNDS=12
```

#### Backup Configuration

```env
# User Backups
BACKUP_PATH=./backups
BACKUP_RETENTION_DAYS=365
BACKUP_ENCRYPTION_KEY=your_32_char_hex_key
```

### CORS Configuration

Edit `server.js` to configure allowed origins:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      // Add your domains here
    ];
    
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
```

---

## API Reference

### Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

### Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Response Format

#### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### API Endpoints

#### Authentication Endpoints

##### 1. Register User

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-15",
  "gender": "male"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "_id": "user_id",
      "email": "john@example.com",
      "username": "johndoe",
      "isEmailVerified": false
    },
    "requiresVerification": true
  }
}
```

**Error Codes:**
- `400`: Validation error
- `409`: User already exists

##### 2. Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "identifier": "john@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "_id": "user_id",
      "email": "john@example.com",
      "username": "johndoe",
      "role": "user"
    },
    "requires2FA": false,
    "requiresEmailVerification": false
  }
}
```

**Error Codes:**
- `400`: Invalid credentials
- `401`: Incorrect password
- `403`: Email not verified
- `423`: Account locked

##### 3. Logout

```http
POST /api/auth/logout
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

##### 4. Verify Email

```http
POST /api/auth/verify-email
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "token": "jwt_token_here"
  }
}
```

##### 5. Resend Verification

```http
POST /api/auth/resend-verification
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Verification code sent"
}
```

##### 6. Forgot Password

```http
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

##### 7. Reset Password

```http
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### User Management Endpoints

##### 1. Get Profile

```http
GET /api/users/profile
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "email": "john@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "ipfs_cid_or_url",
      "role": "user",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

##### 2. Update Profile

```http
PUT /api/users/profile
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Software Developer",
  "website": "https://johndoe.com",
  "dateOfBirth": "1990-01-15",
  "gender": "male"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      // Updated user object
    }
  }
}
```

##### 3. Update Avatar

```http
POST /api/users/avatar
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
avatar: <image file>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "avatarUrl": "ipfs://QmHash...",
    "sizes": {
      "thumbnail": "ipfs://QmHash1...",
      "small": "ipfs://QmHash2...",
      "medium": "ipfs://QmHash3..."
    }
  }
}
```

##### 4. Change Password

```http
PUT /api/users/password
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!",
  "confirmPassword": "NewPass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

##### 5. Delete Account

```http
DELETE /api/users/account
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "password": "CurrentPass123!",
  "reason": "user_request"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Account deletion initiated",
  "data": {
    "deletionToken": "token_for_confirmation"
  }
}
```

#### Two-Factor Authentication (2FA)

##### 1. Setup 2FA

```http
POST /api/users/2fa/setup
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA setup initiated",
  "data": {
    "secret": "BASE32_SECRET",
    "qrCode": "data:image/png;base64,..."
  }
}
```

##### 2. Verify 2FA Setup

```http
POST /api/users/2fa/verify-setup
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA enabled successfully",
  "data": {
    "backupCodes": [
      "AAAAAAAA",
      "BBBBBBBB",
      // ... 8 more codes
    ]
  }
}
```

##### 3. Verify 2FA Code

```http
POST /api/auth/verify-2fa
```

**Request Body:**
```json
{
  "tempSessionId": "temp_session_id",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA verified successfully",
  "data": {
    "token": "jwt_token",
    "user": {
      // User object
    }
  }
}
```

##### 4. Disable 2FA

```http
POST /api/users/2fa/disable
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "password": "CurrentPass123!",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

#### Session Management

##### 1. Get Active Sessions

```http
GET /api/users/sessions
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "session_id",
        "device": {
          "deviceId": "device_fingerprint",
          "deviceName": "Chrome on Windows",
          "ipAddress": "192.168.1.1",
          "location": "New York, US"
        },
        "isActive": true,
        "createdAt": "2025-01-15T10:00:00.000Z",
        "lastActivity": "2025-01-15T11:30:00.000Z",
        "expiresAt": "2025-01-22T10:00:00.000Z"
      }
    ]
  }
}
```

##### 2. Revoke Session

```http
DELETE /api/users/sessions/:sessionId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

##### 3. Revoke All Sessions

```http
DELETE /api/users/sessions/all
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "All sessions revoked successfully"
}
```

#### Social Accounts

##### 1. Link Social Account

```http
POST /api/users/oauth/:provider
```

**Parameters:**
- `provider`: google | facebook | github | twitter | linkedin

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://oauth-provider.com/authorize?..."
  }
}
```

##### 2. Get Linked Accounts

```http
GET /api/users/social-accounts
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "socialAccounts": [
      {
        "provider": "google",
        "providerId": "google_user_id",
        "email": "john@gmail.com",
        "displayName": "John Doe",
        "profilePicture": "https://...",
        "connectedAt": "2025-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

##### 3. Unlink Social Account

```http
DELETE /api/users/social-accounts/:provider
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Social account unlinked successfully"
}
```

#### Permission Management

##### 1. Get User Permissions

```http
GET /api/permissions/user-permissions
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user_id",
    "username": "johndoe",
    "permissions": [
      {
        "type": "location",
        "status": "granted",
        "grantedAt": "2025-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

##### 2. Record Permission

```http
POST /api/permissions/record-permission
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "permissionType": "location",
  "response": "granted",
  "deviceFingerprint": {
    "hash": "device_hash",
    "userAgent": "Mozilla/5.0...",
    "platform": "Win32"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Permission recorded successfully"
}
```

---

## Authentication Flows

### 1. Standard Registration & Login Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Server
    participant DB as Database
    participant E as Email Service

    U->>C: Enter registration details
    C->>S: POST /api/auth/register
    S->>DB: Create user (unverified)
    S->>E: Send verification email
    E->>U: Email with OTP
    S->>C: Registration successful
    
    U->>C: Enter OTP
    C->>S: POST /api/auth/verify-email
    S->>DB: Verify user
    S->>C: JWT token
    C->>U: Redirect to dashboard
```

### 2. Two-Factor Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Server
    participant DB as Database

    U->>C: Enter credentials
    C->>S: POST /api/auth/login
    S->>DB: Verify credentials
    DB->>S: User has 2FA enabled
    S->>C: Temporary session ID
    C->>U: Show 2FA prompt
    
    U->>C: Enter 2FA code
    C->>S: POST /api/auth/verify-2fa
    S->>DB: Verify TOTP code
    S->>C: Full JWT token
    C->>U: Login successful
```

### 3. Social Login Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Server
    participant OAuth as OAuth Provider
    participant DB as Database

    U->>C: Click "Login with Google"
    C->>S: Request OAuth URL
    S->>C: OAuth authorization URL
    C->>OAuth: Redirect to OAuth
    OAuth->>U: Show consent screen
    U->>OAuth: Grant permission
    OAuth->>C: Authorization code
    C->>S: POST /api/auth/google (with code)
    S->>OAuth: Exchange code for token
    OAuth->>S: User profile data
    S->>DB: Find or create user
    S->>C: JWT token
    C->>U: Login successful
```

### 4. Password Reset Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Server
    participant DB as Database
    participant E as Email Service

    U->>C: Request password reset
    C->>S: POST /api/auth/forgot-password
    S->>DB: Generate reset token
    S->>E: Send reset email
    E->>U: Email with reset link
    
    U->>C: Click reset link
    C->>U: Show reset form
    U->>C: Enter new password
    C->>S: POST /api/auth/reset-password
    S->>DB: Validate token & update password
    S->>C: Password reset successful
    C->>U: Redirect to login
```

### 5. Device Verification Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Server
    participant DB as Database
    participant E as Email Service

    U->>C: Login from new device
    C->>S: POST /api/auth/login
    S->>DB: Check device fingerprint
    DB->>S: Unknown device detected
    S->>E: Send verification email
    E->>U: Email with verification link
    S->>C: Pending device verification
    
    U->>C: Click verification link
    C->>S: POST /api/auth/verify-device
    S->>DB: Mark device as trusted
    S->>C: JWT token
    C->>U: Login successful
```

---

## Security Features

### 1. Password Security

#### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

#### Password Hashing

```javascript
// Using bcryptjs with 12 salt rounds
const salt = await bcrypt.genSalt(12);
const hashedPassword = await bcrypt.hash(password, salt);
```

**Best Practices:**
- Passwords are hashed before storage
- Never store plain-text passwords
- Salt rounds: 12 (configurable via BCRYPT_ROUNDS)
- Passwords are never logged or exposed in API responses

### 2. Account Protection

#### Failed Login Attempts

```javascript
// Configuration
MAX_LOGIN_ATTEMPTS: 5
LOCK_DURATION: 30 minutes
```

**Behavior:**
- After 5 failed attempts, account is locked for 30 minutes
- Lock duration increases exponentially for repeated violations
- Failed attempts are tracked per account, not per IP
- Account lockout notifications sent via email

#### Rate Limiting

```javascript
// Global rate limit
windowMs: 15 minutes
maxRequests: 1000

// Auth endpoint rate limit
windowMs: 15 minutes
maxRequests: 5
```

**Protection Against:**
- Brute-force attacks
- DDoS attempts
- API abuse
- Credential stuffing

### 3. Session Security

#### JWT Token Management

```javascript
// Token configuration
Algorithm: HS256
ExpiresIn: 7 days (configurable)
Issuer: authn-system
Audience: authn-users
```

**Token Payload:**
```json
{
  "userId": "user_id",
  "sessionId": "session_id",
  "role": "user",
  "iat": 1705329600,
  "exp": 1705934400
}
```

**Security Measures:**
- Tokens stored in httpOnly cookies
- CSRF protection enabled
- Session invalidation on logout
- Concurrent session management
- Token refresh mechanism

#### Session Tracking

```javascript
// Session properties
sessionId: Unique identifier
device: Device fingerprint
ipAddress: User's IP
location: Geolocation data
lastActivity: Timestamp
expiresAt: Expiration date
```

### 4. Two-Factor Authentication (2FA)

#### Implementation

- **Algorithm:** Time-based One-Time Password (TOTP)
- **Library:** Speakeasy
- **Window:** ±2 time steps (60 seconds each)
- **Backup Codes:** 10 single-use codes

#### Security Features

- QR code generation for easy setup
- Backup codes for recovery
- Rate limiting on verification attempts
- Account lockout after 5 failed 2FA attempts
- 2FA required for sensitive operations

### 5. Device Fingerprinting

#### Collected Data Points

```javascript
{
  deviceId: "SHA-256 hash",
  deviceName: "Chrome on Windows",
  userAgent: "Mozilla/5.0...",
  platform: "Win32",
  browser: "Chrome",
  os: "Windows 10",
  ipAddress: "192.168.1.1",
  location: "New York, US",
  timezone: "America/New_York",
  screenResolution: "1920x1080",
  language: "en-US"
}
```

#### Device Verification Flow

1. New device detected → Email verification required
2. User clicks verification link
3. Device marked as trusted
4. Future logins skip verification

### 6. Email Security

#### Email Verification

- **OTP Length:** 6 digits (alphanumeric)
- **Expiration:** 10 minutes
- **Rate Limiting:** Max 3 requests per hour

#### Password Reset

- **Token:** 32-byte cryptographically secure random string
- **Expiration:** 30 minutes
- **Single-use:** Token invalidated after use
- **Rate Limiting:** Max 3 requests per hour

### 7. Data Protection

#### Encryption at Rest

```javascript
// Sensitive data encryption
Algorithm: AES-256-CBC
Key: 32-byte hex string
IV: Random 16 bytes per encryption
```

#### Encryption in Transit

- **TLS/SSL:** Required in production
- **HTTPS:** Enforced for all endpoints
- **HSTS:** Strict-Transport-Security header enabled
- **Certificate Pinning:** Recommended for mobile apps

#### Data Sanitization

```javascript
// Removed from API responses
- passwordHash
- emailVerificationOTP
- passwordResetToken
- twoFactorAuth.secret
- twoFactorAuth.backupCodes
- apiKeys (raw values)
```

### 8. API Security

#### Headers

```javascript
// Helmet.js security headers
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

#### CORS Configuration

```javascript
// Allowed origins
origin: [process.env.FRONTEND_URL, 'http://localhost:3000']
credentials: true
methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
```

#### Request Validation

- Input sanitization
- Schema validation (express-validator)
- Type checking
- Size limits (10MB for file uploads)

### 9. Audit Logging

#### Logged Events

```javascript
// Security events
- Login attempts (success/failure)
- Password changes
- Email verification
- 2FA setup/disable
- Account deletion requests
- Permission changes
- API key generation/revocation
- Session creation/revocation
```

#### Log Format

```json
{
  "userId": "user_id",
  "action": "login_success",
  "details": {
    "method": "password"
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 10. Security Best Practices

#### For Developers

- ✅ Never commit `.env` files
- ✅ Use environment variables for secrets
- ✅ Keep dependencies updated
- ✅ Run security audits regularly (`npm audit`)
- ✅ Implement proper error handling
- ✅ Sanitize user inputs
- ✅ Use parameterized queries
- ✅ Implement rate limiting
- ✅ Enable CSRF protection
- ✅ Use HTTPS in production

#### For Administrators

- ✅ Rotate JWT secrets regularly
- ✅ Monitor failed login attempts
- ✅ Review audit logs regularly
- ✅ Keep MongoDB secured
- ✅ Use strong database passwords
- ✅ Implement network firewalls
- ✅ Enable MongoDB authentication
- ✅ Backup database regularly
- ✅ Use secure SMTP credentials
- ✅ Monitor server resources

---

## Database Schema

### User Model

```javascript
{
  // Basic Information
  firstName: String,
  lastName: String,
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  phone: { type: String, unique: true, sparse: true },
  passwordHash: String,
  
  // Verification
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  emailVerificationOTP: String,
  emailVerificationExpires: Date,
  
  // Password Reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Account Security
  failedLoginAttempts: { type: Number, default: 0 },
  lastFailedLogin: Date,
  accountLockedUntil: Date,
  lockReason: String,
  lastLogin: Date,
  lastLoginIP: String,
  loginCount: { type: Number, default: 0 },
  
  // Two-Factor Authentication
  twoFactorAuth: {
    isEnabled: { type: Boolean, default: false },
    secret: String,
    backupCodes: [String],
    enabledAt: Date,
    lastUsed: Date,
    failedAttempts: { type: Number, default: 0 },
    lastFailedAttempt: Date,
    lockedUntil: Date
  },
  
  // Profile
  avatar: String,
  profilePicture: String,
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  bio: String,
  website: String,
  
  // Account Status
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletionToken: String,
  deletionTokenExpires: Date,
  deletionRequestedAt: Date,
  deletionReason: String,
  
  // Backup
  isBackedUp: { type: Boolean, default: false },
  backupCreatedAt: Date,
  
  // Role & Permissions
  role: { type: String, enum: ['user', 'moderator', 'admin', 'superadmin'], default: 'user' },
  permissions: [String],
  
  // Social Accounts
  socialAccounts: [{
    provider: { type: String, enum: ['google', 'facebook', 'apple', 'twitter'] },
    providerId: String,
    email: String,
    displayName: String,
    profilePicture: String,
    connectedAt: Date
  }],
  
  // Sessions
  sessions: [{
    sessionId: String,
    device: {
      deviceId: String,
      deviceName: String,
      userAgent: String,
      platform: String,
      browser: String,
      os: String,
      ipAddress: String,
      location: Object,
      firstUsed: Date,
      lastUsed: Date
    },
    isActive: { type: Boolean, default: true },
    createdAt: Date,
    expiresAt: Date,
    lastActivity: Date
  }],
  
  // Trusted Devices
  trustedDevices: [{
    deviceId: String,
    deviceName: String,
    userAgent: String,
    platform: String,
    browser: String,
    os: String,
    ipAddress: String,
    location: Object,
    firstUsed: Date,
    lastUsed: Date,
    isTrusted: { type: Boolean, default: false }
  }],
  
  // Pending Device Verifications
  pendingDeviceVerifications: [{
    token: String,
    deviceId: String,
    deviceInfo: Object,
    createdAt: Date,
    expiresAt: Date
  }],
  
  // API Keys
  apiKeys: [{
    key: String,
    name: String,
    permissions: [String],
    isActive: { type: Boolean, default: true },
    lastUsed: Date,
    createdAt: Date,
    expiresAt: Date
  }],
  
  // Audit Logs
  auditLogs: [{
    action: String,
    details: Mixed,
    ipAddress: String,
    userAgent: String,
    timestamp: Date
  }],
  
  // Notifications
  notifications: [{
    id: String,
    type: { type: String, enum: ['info', 'account', 'security', 'system', 'welcome', 'success'] },
    title: String,
    message: String,
    read: { type: Boolean, default: false },
    createdAt: Date,
    data: Mixed
  }],
  
  // Analytics
  analytics: {
    totalSessions: { type: Number, default: 0 },
    lastSessionDate: Date,
    totalLoginTime: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 },
    deviceCount: { type: Number, default: 0 },
    featuresUsed: [String],
    lastActiveDate: Date
  },
  
  // Preferences
  preferences: {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    notifications: {
      email: {
        enabled: { type: Boolean, default: true },
        security: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
        updates: { type: Boolean, default: true }
      },
      push: {
        enabled: { type: Boolean, default: true },
        security: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
        updates: { type: Boolean, default: true }
      },
      sms: {
        enabled: { type: Boolean, default: false },
        security: { type: Boolean, default: false },
        marketing: { type: Boolean, default: false }
      }
    },
    privacy: {
      profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
      locationSharing: { type: Boolean, default: false },
      dataCollection: {
        analytics: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
        personalization: { type: Boolean, default: true }
      }
    }
  },
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### User Permissions Model

```javascript
{
  userId: { type: ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  
  permissions: [{
    type: { type: String, enum: ['location', 'notification', 'camera', 'microphone', 'storage'] },
    status: { type: String, enum: ['granted', 'denied', 'prompt', 'never_asked'] },
    grantedAt: Date,
    deniedAt: Date,
    lastAskedAt: Date,
    askCount: { type: Number, default: 0 },
    deviceFingerprint: {
      userAgent: String,
      screenResolution: String,
      timezone: String,
      language: String,
      platform: String,
      hash: String
    },
    nextAskTime: Date,
    strategy: { type: String, enum: ['immediate', 'delayed', 'contextual', 'benefit_driven'] }
  }],
  
  globalSettings: {
    permissionPromptingEnabled: { type: Boolean, default: true },
    respectDoNotAsk: { type: Boolean, default: true },
    maxAskAttempts: { type: Number, default: 5 },
    cooldownPeriod: { type: Number, default: 86400000 }
  },
  
  analytics: {
    totalPermissionsGranted: { type: Number, default: 0 },
    totalPermissionsDenied: { type: Number, default: 0 },
    averageTimeToGrant: Number,
    mostActiveDevice: String,
    lastActivity: Date
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### User Backup Model

```javascript
{
  userId: { type: ObjectId, required: true },
  backupType: { type: String, enum: ['pre_deletion', 'periodic', 'manual'], required: true },
  userData: { type: Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  retainUntil: { type: Date, required: true },
  metadata: {
    reason: String,
    userAgent: String,
    ipAddress: String,
    initiatedBy: String
  }
}
```

### Indexes

```javascript
// User model indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ phone: 1 }, { unique: true, sparse: true });
db.users.createIndex({ 'sessions.sessionId': 1 }, { sparse: true });
db.users.createIndex({ 'socialAccounts.provider': 1, 'socialAccounts.providerId': 1 });
db.users.createIndex({ deletionToken: 1 }, { sparse: true });
db.users.createIndex({ isDeleted: 1, deletedAt: 1 });

// User permissions indexes
db.userpermissions.createIndex({ userId: 1, username: 1 });
db.userpermissions.createIndex({ 'permissions.type': 1, 'permissions.status': 1 });
db.userpermissions.createIndex({ 'permissions.deviceFingerprint.hash': 1 });
```

---

## Frontend Integration

### 1. Client-Side Setup

#### Initialize Authentication Client

```javascript
class AuthClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return response;
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (response.data.token) {
      this.token = response.data.token;
      localStorage.setItem('authToken', this.token);
    }
    
    return response;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async getProfile() {
    return await this.request('/users/profile');
  }

  isAuthenticated() {
    return !!this.token;
  }
}

// Usage
const auth = new AuthClient('http://localhost:5000/api');
```

### 2. Registration Flow

```javascript
// Registration form handler
async function handleRegister(formData) {
  try {
    const response = await auth.register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      username: formData.username,
      email: formData.email,
      password: formData.password
    });

    if (response.data.requiresVerification) {
      showMessage('success', 'Registration successful! Please check your email.');
      redirectTo('/verify-email');
    } else {
      showMessage('success', 'Registration successful!');
      redirectTo('/dashboard');
    }
  } catch (error) {
    showMessage('error', error.message);
  }
}
```

### 3. Login Flow

```javascript
// Login form handler
async function handleLogin(formData) {
  try {
    const response = await auth.login({
      identifier: formData.identifier,
      password: formData.password,
      rememberMe: formData.rememberMe
    });

    if (response.data.requires2FA) {
      // Store temp session
      sessionStorage.setItem('tempSessionId', response.data.tempSessionId);
      redirectTo('/2fa');
    } else if (response.data.requiresEmailVerification) {
      redirectTo('/verify-email');
    } else {
      showMessage('success', 'Login successful!');
      redirectTo('/dashboard');
    }
  } catch (error) {
    showMessage('error', error.message);
  }
}
```

### 4. Protected Routes

```javascript
// Route protection middleware
function requireAuth(callback) {
  if (!auth.isAuthenticated()) {
    redirectTo('/login');
    return;
  }
  
  // Verify token is still valid
  auth.getProfile()
    .then(() => callback())
    .catch(() => {
      auth.logout();
      redirectTo('/login');
    });
}

// Usage
requireAuth(() => {
  loadDashboard();
});
```

### 5. File Upload

```javascript
// Avatar upload
async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch(`${auth.baseURL}/users/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.token}`
    },
    body: formData
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
}
```

### 6. Error Handling

```javascript
// Global error handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  if (event.reason.message.includes('Unauthorized')) {
    auth.logout();
    redirectTo('/login');
  } else {
    showMessage('error', 'An unexpected error occurred');
  }
});

// API error handler
function handleAPIError(error) {
  const errorMap = {
    'INVALID_CREDENTIALS': 'Invalid email or password',
    'ACCOUNT_LOCKED': 'Your account has been locked',
    'EMAIL_NOT_VERIFIED': 'Please verify your email first',
    'TOKEN_EXPIRED': 'Your session has expired',
    'RATE_LIMIT_EXCEEDED': 'Too many requests, please try again later'
  };

  const message = errorMap[error.code] || error.message;
  showMessage('error', message);
}
```

### 7. Real-time Updates

```javascript
// WebSocket connection for real-time notifications
class NotificationClient {
  constructor(authToken) {
    this.ws = new WebSocket(`wss://your-domain.com/ws?token=${authToken}`);
    this.setupListeners();
  }

  setupListeners() {
    this.ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      this.handleNotification(notification);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Implement reconnection logic
    };
  }

  handleNotification(notification) {
    // Display notification to user
    showNotification(notification.title, notification.message);
  }
}
```

---

## Deployment

### 1. Production Checklist

#### Environment Configuration

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong JWT secret
- [ ] Configure MongoDB connection string
- [ ] Set up SMTP credentials
- [ ] Configure Firebase service account
- [ ] Set up S3/Filebase credentials
- [ ] Configure allowed CORS origins
- [ ] Enable HTTPS
- [ ] Set secure cookie flags

#### Security

- [ ] Enable rate limiting
- [ ] Configure firewall rules
- [ ] Set up SSL/TLS certificates
- [ ] Enable MongoDB authentication
- [ ] Rotate all secrets and keys
- [ ] Review and test all security headers
- [ ] Enable audit logging
- [ ] Set up intrusion detection

#### Performance

- [ ] Enable compression
- [ ] Configure CDN for static assets
- [ ] Set up database indexes
- [ ] Enable connection pooling
- [ ] Configure caching strategy
- [ ] Optimize image sizes
- [ ] Minify and bundle assets

#### Monitoring

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure application logging
- [ ] Set up uptime monitoring
- [ ] Configure performance monitoring
- [ ] Set up database monitoring
- [ ] Configure alerts and notifications

### 2. Docker Deployment

#### Dockerfile

```dockerfile
FROM node:16-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p uploads backups

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

# Start application
CMD ["node", "server.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGO_URL=mongodb://mongo:27017/authn
    env_file:
      - .env.production
    depends_on:
      - mongo
      - redis
    restart: unless-stopped
    volumes:
      - ./uploads:/app/uploads
      - ./backups:/app/backups

  mongo:
    image: mongo:4.4
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=secure_password
      - MONGO_INITDB_DATABASE=authn
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  mongo-data:
  redis-data:
```

### 3. PM2 Deployment

#### ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'authn',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

#### Commands

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs authn

# Restart
pm2 restart authn

# Stop
pm2 stop authn

# Startup script
pm2 startup
pm2 save
```

### 4. Nginx Configuration

```nginx
upstream authn_backend {
    least_conn;
    server localhost:5000;
    # Add more servers for load balancing
    # server localhost:5001;
    # server localhost:5002;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy settings
    location / {
        proxy_pass http://authn_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location /uploads/ {
        alias /path/to/authn/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
```

### 5. SSL/TLS Setup

#### Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (runs twice daily)
sudo certbot renew --dry-run

# Cron job for auto-renewal
0 0,12 * * * certbot renew --quiet
```

### 6. Database Backup

#### Automated MongoDB Backup Script

```bash
#!/bin/bash

# Configuration
MONGO_HOST="localhost"
MONGO_PORT="27017"
MONGO_DB="authn"
BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
mongodump --host=$MONGO_HOST --port=$MONGO_PORT --db=$MONGO_DB --out=$BACKUP_DIR/$DATE

# Compress backup
tar -czf $BACKUP_DIR/$DATE.tar.gz -C $BACKUP_DIR $DATE
rm -rf $BACKUP_DIR/$DATE

# Remove old backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE.tar.gz"
```

#### Cron Job

```bash
# Add to crontab (crontab -e)
0 2 * * * /path/to/backup-script.sh >> /var/log/mongodb-backup.log 2>&1
```

---

## Monitoring & Maintenance

### 1. Health Checks

#### Health Check Endpoint

```javascript
// Add to server.js
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
    services: {}
  };

  // Check MongoDB
  try {
    await mongoose.connection.db.admin().ping();
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'degraded';
  }

  // Check email service
  health.services.email = emailService.isReady ? 'ready' : 'not configured';

  // Check storage service
  health.services.storage = storageService.isEnabled ? 'enabled' : 'disabled';

  const httpStatus = health.status === 'ok' ? 200 : 503;
  res.status(httpStatus).json(health);
});
```

### 2. Application Monitoring

#### Using PM2 Monitor

```bash
# Install PM2 Plus for advanced monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Monitor metrics
pm2 monitor

# Custom metrics
pm2 install pm2-server-monit
```

#### Custom Metrics Collection

```javascript
// utils/metrics.js
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: { total: 0, failed: 0, success: 0 },
      auth: { logins: 0, registrations: 0, failures: 0 },
      performance: { avgResponseTime: 0 }
    };
  }

  incrementCounter(metric, subMetric) {
    if (this.metrics[metric] && this.metrics[metric][subMetric] !== undefined) {
      this.metrics[metric][subMetric]++;
    }
  }

  recordResponseTime(time) {
    const current = this.metrics.performance.avgResponseTime;
    this.metrics.performance.avgResponseTime = (current + time) / 2;
  }

  getMetrics() {
    return this.metrics;
  }

  reset() {
    Object.keys(this.metrics).forEach(key => {
      if (typeof this.metrics[key] === 'object') {
        Object.keys(this.metrics[key]).forEach(subKey => {
          this.metrics[key][subKey] = 0;
        });
      }
    });
  }
}

module.exports = new MetricsCollector();
```

### 3. Error Tracking

#### Sentry Integration

```javascript
// Install Sentry
npm install @sentry/node

// Initialize in server.js
const Sentry = require('@sentry/node');

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    beforeSend(event, hint) {
      // Filter sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers['authorization'];
      }
      return event;
    }
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());
}
```

### 4. Logging Strategy

#### Winston Logger Setup

```javascript
// utils/logger.js
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'authn' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write all logs with level 'error' to error.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Create a stream for Morgan
logger.stream = {
  write: (message) => logger.info(message.trim())
};

module.exports = logger;
```

#### Usage

```javascript
const logger = require('./utils/logger');

logger.info('User logged in', { userId: user._id, ip: req.ip });
logger.error('Database connection failed', { error: err.message });
logger.warn('Rate limit exceeded', { ip: req.ip });
```

### 5. Database Monitoring

#### MongoDB Monitoring Queries

```javascript
// Check database size
db.stats()

// Check collection sizes
db.users.stats()

// Monitor slow queries
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()

// Check index usage
db.users.aggregate([{ $indexStats: {} }])

// Monitor connections
db.serverStatus().connections

// Check replication lag (if using replica sets)
rs.printSlaveReplicationInfo()
```

#### Automated Monitoring Script

```javascript
// scripts/monitor-db.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function checkDatabaseHealth() {
  try {
    const stats = await mongoose.connection.db.stats();
    
    const healthCheck = {
      dataSize: (stats.dataSize / 1024 / 1024).toFixed(2) + ' MB',
      indexSize: (stats.indexSize / 1024 / 1024).toFixed(2) + ' MB',
      collections: stats.collections,
      objects: stats.objects,
      avgObjSize: (stats.avgObjSize / 1024).toFixed(2) + ' KB'
    };

    logger.info('Database health check', healthCheck);

    // Alert if database size exceeds threshold
    if (stats.dataSize > 10 * 1024 * 1024 * 1024) { // 10GB
      logger.warn('Database size exceeds 10GB', healthCheck);
    }

    return healthCheck;
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    throw error;
  }
}

module.exports = { checkDatabaseHealth };
```

### 6. Performance Optimization

#### Caching Strategy

```javascript
// utils/cache.js
const NodeCache = require('node-cache');

class CacheService {
  constructor(ttlSeconds = 300) {
    this.cache = new NodeCache({ 
      stdTTL: ttlSeconds, 
      checkperiod: ttlSeconds * 0.2 
    });
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value, ttl) {
    return this.cache.set(key, value, ttl);
  }

  del(key) {
    return this.cache.del(key);
  }

  flush() {
    return this.cache.flushAll();
  }

  getStats() {
    return this.cache.getStats();
  }
}

// Usage example
const cache = new CacheService(600); // 10 minutes TTL

// Cache user profile
app.get('/api/users/profile', async (req, res) => {
  const cacheKey = `user:${req.user.userId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return res.json({ success: true, data: cached, fromCache: true });
  }

  const user = await User.findById(req.user.userId);
  cache.set(cacheKey, sanitizeUser(user), 300); // Cache for 5 minutes
  
  res.json({ success: true, data: sanitizeUser(user) });
});
```

### 7. Automated Maintenance Tasks

#### Cleanup Script

```javascript
// scripts/cleanup.js
const cron = require('node-cron');
const User = require('../models/User');
const UserBackup = require('../models/User').UserBackup;
const logger = require('../utils/logger');

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  logger.info('Starting daily cleanup tasks');

  try {
    // Clean expired sessions
    const sessionResult = await User.updateMany(
      { 'sessions.expiresAt': { $lt: new Date() } },
      { $pull: { sessions: { expiresAt: { $lt: new Date() } } } }
    );
    logger.info(`Cleaned ${sessionResult.modifiedCount} expired sessions`);

    // Clean expired device verifications
    const deviceResult = await User.updateMany(
      { 'pendingDeviceVerifications.expiresAt': { $lt: new Date() } },
      { $pull: { pendingDeviceVerifications: { expiresAt: { $lt: new Date() } } } }
    );
    logger.info(`Cleaned ${deviceResult.modifiedCount} expired device verifications`);

    // Clean expired backups
    const backupResult = await UserBackup.deleteMany({
      retainUntil: { $lt: new Date() }
    });
    logger.info(`Deleted ${backupResult.deletedCount} expired backups`);

    // Clean old audit logs (keep last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    await User.updateMany(
      {},
      { $pull: { auditLogs: { timestamp: { $lt: ninetyDaysAgo } } } }
    );
    logger.info('Cleaned old audit logs');

    logger.info('Daily cleanup completed successfully');
  } catch (error) {
    logger.error('Daily cleanup failed', { error: error.message });
  }
});

// Clean inactive sessions every hour
cron.schedule('0 * * * *', async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await User.updateMany(
      { 'sessions.lastActivity': { $lt: thirtyDaysAgo } },
      { $pull: { sessions: { lastActivity: { $lt: thirtyDaysAgo } } } }
    );

    logger.info('Cleaned inactive sessions');
  } catch (error) {
    logger.error('Session cleanup failed', { error: error.message });
  }
});
```

### 8. Alerts & Notifications

#### Alert Configuration

```javascript
// utils/alerts.js
const nodemailer = require('nodemailer');
const logger = require('./logger');

class AlertService {
  constructor() {
    this.adminEmail = process.env.ADMIN_EMAIL;
    this.thresholds = {
      errorRate: 0.05, // 5% error rate
      responseTime: 2000, // 2 seconds
      diskUsage: 0.85, // 85% disk usage
      memoryUsage: 0.90 // 90% memory usage
    };
  }

  async sendAlert(type, message, data) {
    logger.error(`ALERT [${type}]: ${message}`, data);

    if (process.env.NODE_ENV === 'production' && this.adminEmail) {
      try {
        const transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: this.adminEmail,
          subject: `🚨 Authn Alert: ${type}`,
          html: `
            <h2>Alert Notification</h2>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Message:</strong> ${message}</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
            <p><em>Timestamp: ${new Date().toISOString()}</em></p>
          `
        });
      } catch (error) {
        logger.error('Failed to send alert email', { error: error.message });
      }
    }
  }

  checkErrorRate(metrics) {
    const errorRate = metrics.requests.failed / metrics.requests.total;
    if (errorRate > this.thresholds.errorRate) {
      this.sendAlert(
        'HIGH_ERROR_RATE',
        `Error rate is ${(errorRate * 100).toFixed(2)}%`,
        metrics
      );
    }
  }

  checkResponseTime(avgTime) {
    if (avgTime > this.thresholds.responseTime) {
      this.sendAlert(
        'SLOW_RESPONSE_TIME',
        `Average response time is ${avgTime}ms`,
        { avgResponseTime: avgTime }
      );
    }
  }

  checkSystemResources() {
    const memUsage = process.memoryUsage();
    const memPercent = memUsage.heapUsed / memUsage.heapTotal;

    if (memPercent > this.thresholds.memoryUsage) {
      this.sendAlert(
        'HIGH_MEMORY_USAGE',
        `Memory usage is ${(memPercent * 100).toFixed(2)}%`,
        memUsage
      );
    }
  }
}

module.exports = new AlertService();
```

---

## Troubleshooting

### Common Issues

#### 1. Connection Issues

**Problem:** Cannot connect to MongoDB

```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Verify connection string in .env
MONGO_URL=mongodb://localhost:27017/authn
```

#### 2. Authentication Errors

**Problem:** JWT token verification fails

```
JsonWebTokenError: invalid signature
```

**Solutions:**
```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Generate new secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Clear old tokens
# Users need to log in again after changing JWT_SECRET
```

#### 3. Email Delivery Issues

**Problem:** Email verification/reset emails not sending

**Solutions:**
```javascript
// Test email configuration
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log('Email configuration error:', error);
  } else {
    console.log('Email server is ready');
  }
});
```

**Common fixes:**
- Enable "Less secure app access" for Gmail (or use App Passwords)
- Check firewall blocking port 587/465
- Verify SMTP credentials
- Check spam folder

#### 4. File Upload Issues

**Problem:** File uploads failing

```
Error: File upload failed: Missing required environment variables
```

**Solutions:**
```bash
# Verify Filebase credentials
echo $FILEBASE_ACCESS_KEY_ID
echo $FILEBASE_SECRET_ACCESS_KEY
echo $FILEBASE_BUCKET_NAME

# Check file permissions
chmod -R 755 uploads/

# Verify file size limits
# Default is 10MB, adjust in server.js if needed
```

#### 5. Rate Limiting Issues

**Problem:** Legitimate users being rate limited

**Solutions:**
```javascript
// Adjust rate limits in .env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

// Whitelist specific IPs (server.js)
const ipWhitelist = ['192.168.1.1', '10.0.0.1'];

app.use((req, res, next) => {
  if (ipWhitelist.includes(req.ip)) {
    return next();
  }
  rateLimiter(req, res, next);
});
```

#### 6. Session Issues

**Problem:** Users getting logged out randomly

**Solutions:**
```javascript
// Increase session duration
JWT_EXPIRES_IN=30d

// Check for session cleanup issues
// Disable aggressive session cleanup
// Review session expiration logic in User model
```

#### 7. 2FA Issues

**Problem:** 2FA codes not working

**Solutions:**
```javascript
// Verify system time is synchronized
// TOTP requires accurate system time

// Check time sync
timedatectl status

// Sync time
sudo ntpdate -s time.nist.gov

// Increase time window tolerance
// In User.js, modify verify2FACode window parameter
speakeasy.totp.verify({
  secret: this.twoFactorAuth.secret,
  encoding: 'base32',
  token: code,
  window: 2 // Increase this if needed
});
```

### Debugging Tools

#### Enable Debug Logging

```javascript
// Add to .env
LOG_LEVEL=debug
DEBUG=authn:*

// Use debug module
const debug = require('debug')('authn:auth');

debug('User login attempt', { email: user.email });
```

#### Database Query Profiling

```javascript
// Enable Mongoose debugging
mongoose.set('debug', true);

// Log slow queries
mongoose.set('debug', (collectionName, method, query, doc) => {
  console.log(`${collectionName}.${method}`, JSON.stringify(query), doc);
});
```

#### Request/Response Logging

```javascript
// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});
```

---

## Contributing

We welcome contributions from the community! Here's how you can help:

### How to Contribute

1. **Fork the Repository**
   ```bash
   git clone https://github.com/hanan-bhatti/authn.git
   cd authn
   git remote add upstream https://github.com/hanan-bhatti/authn.git
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Write clean, documented code
   - Follow existing code style
   - Add tests for new features
   - Update documentation

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

5. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to GitHub and create a PR
   - Provide a clear description
   - Link related issues

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: add new feature
fix: resolve bug
docs: update documentation
style: format code
refactor: restructure code
test: add tests
chore: update dependencies
```

### Code Style Guidelines

- Use ESLint configuration provided
- Follow JavaScript Standard Style
- Write meaningful variable names
- Add JSDoc comments for functions
- Keep functions small and focused
- Use async/await over callbacks

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint
```

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No breaking changes (or documented)
- [ ] All checks passing

---

## API Rate Limits

### Default Limits

| Endpoint | Window | Max Requests | Scope |
|----------|--------|--------------|-------|
| `/api/auth/register` | 15 min | 5 | Per IP |
| `/api/auth/login` | 15 min | 5 | Per IP |
| `/api/auth/forgot-password` | 1 hour | 3 | Per Email |
| `/api/auth/verify-email` | 1 hour | 10 | Per Email |
| `/api/users/*` | 15 min | 100 | Per Token |
| All other endpoints | 15 min | 1000 | Per IP |

### Custom Rate Limits

To implement custom rate limits:

```javascript
const rateLimit = require('express-rate-limit');

const customLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/custom-endpoint', customLimiter);
```

---

## Support

### Getting Help

- 📧 **Email:** hannanbhatti2006@gmail.com
- 🐛 **Issues:** [GitHub Issues](https://github.com/hanan-bhatti/authn/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/hanan-bhatti/authn/discussions)
- 📚 **Documentation:** [Full Docs](https://github.com/hanan-bhatti/authn/wiki)

### Reporting Security Issues

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, email security concerns to: hannanbhatti2006@gmail.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you to resolve the issue.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Abdul Hannan Bhatti

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Acknowledgments

Special thanks to:

- The Node.js community
- MongoDB team
- Firebase team
- All open-source contributors
- Everyone who has provided feedback and suggestions

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

---

## Roadmap

See [FEATURES.md](FEATURES.md) for upcoming features and long-term plans.

---

**Built with ❤️ by [Abdul Hannan Bhatti](https://github.com/hanan-bhatti)**

**Repository:** https://github.com/hanan-bhatti/authn

**Last Updated:** January 15, 2025

---

*This documentation is continuously updated. For the latest version, please visit the GitHub repository.*