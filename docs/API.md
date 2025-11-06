# Authn API Documentation

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Authentication Endpoints](#authentication-endpoints)
- [User Management Endpoints](#user-management-endpoints)
- [Two-Factor Authentication](#two-factor-authentication)
- [Device Management](#device-management)
- [Session Management](#session-management)
- [Social Authentication](#social-authentication)
- [Permission Management](#permission-management)
- [Analytics & Audit Logs](#analytics--audit-logs)

---

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

---

## Authentication

Most endpoints require authentication via JWT token sent in cookies or Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

Or via cookie:
```
Cookie: token=<your-jwt-token>
```

---

## Rate Limiting

### Global Rate Limits
- **General API**: 1000 requests per 15 minutes
- **Authentication Routes**: 5 requests per 15 minutes
- **Per-User**: Configurable per endpoint

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2025-01-01T00:00:00.000Z
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - Duplicate entry |
| 422 | Unprocessable Entity - Validation failed |
| 423 | Locked - Account locked |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `DUPLICATE_FIELD` | Duplicate value (email, username) |
| `INVALID_CREDENTIALS` | Wrong email/password |
| `ACCOUNT_LOCKED` | Too many failed attempts |
| `EMAIL_NOT_VERIFIED` | Email verification required |
| `TWO_FACTOR_REQUIRED` | 2FA verification needed |
| `DEVICE_NOT_TRUSTED` | New device verification needed |
| `TOKEN_EXPIRED` | JWT token expired |
| `INSUFFICIENT_PERMISSIONS` | No permission for action |

---

## Authentication Endpoints

### Register User

Create a new user account.

```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+923001234567" // Optional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "_id": "user-id",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isEmailVerified": false,
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    "requiresEmailVerification": true
  }
}
```

**Validation Rules:**
- Username: 3-30 characters, alphanumeric + underscore
- Email: Valid email format
- Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- Phone: Optional, E.164 format (+923001234567)

---

### Login

Authenticate user and receive JWT token.

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "identifier": "johndoe", // Username or email
  "password": "SecurePass123!",
  "rememberMe": false // Optional, default: false (7 days vs 30 days)
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user-id",
      "username": "johndoe",
      "email": "john@example.com",
      "fullName": "John Doe",
      "avatar": "https://...",
      "isEmailVerified": true,
      "twoFactorAuth": {
        "isEnabled": false
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-01-08T00:00:00.000Z"
  }
}
```

**With 2FA Enabled:**
```json
{
  "success": true,
  "message": "2FA verification required",
  "data": {
    "requires2FA": true,
    "userId": "user-id",
    "tempSessionId": "temp-session-id"
  }
}
```

**Account Locked (423):**
```json
{
  "success": false,
  "error": "Account is locked",
  "message": "Account is locked. Try again in 25 minutes.",
  "code": "ACCOUNT_LOCKED",
  "data": {
    "lockedUntil": "2025-01-01T00:25:00.000Z",
    "attemptsRemaining": 0,
    "timeLeftMinutes": 25
  }
}
```

---

### Verify Email

Verify user's email with OTP.

```http
POST /api/auth/verify-email
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "ABC123" // 6-character alphanumeric code
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "_id": "user-id",
      "email": "john@example.com",
      "isEmailVerified": true
    }
  }
}
```

---

### Resend Verification Email

Request new verification OTP.

```http
POST /api/auth/resend-verification
Content-Type: application/json
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
  "message": "Verification email sent",
  "data": {
    "email": "john@example.com",
    "expiresIn": "10 minutes"
  }
}
```

---

### Forgot Password

Request password reset link.

```http
POST /api/auth/forgot-password
Content-Type: application/json
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
  "message": "Password reset link sent",
  "data": {
    "email": "john@example.com",
    "expiresIn": "30 minutes"
  }
}
```

---

### Reset Password

Reset password using token from email.

```http
POST /api/auth/reset-password
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful",
  "data": {
    "message": "You can now login with your new password"
  }
}
```

---

### Logout

Logout current session.

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Google OAuth Login

Authenticate with Google (Firebase).

```http
POST /api/auth/google
Content-Type: application/json
```

**Request Body:**
```json
{
  "idToken": "google-id-token-from-firebase"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": { /* user object */ },
    "token": "jwt-token",
    "isNewUser": false
  }
}
```

---

## User Management Endpoints

### Get Profile

Get authenticated user's profile.

```http
GET /api/users/profile
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user-id",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "phone": "+923001234567",
      "avatar": "https://...",
      "dateOfBirth": "1990-01-01",
      "gender": "male",
      "bio": "Software developer",
      "website": "https://johndoe.com",
      "role": "user",
      "isEmailVerified": true,
      "twoFactorAuth": {
        "isEnabled": false
      },
      "preferences": {
        "language": "en",
        "timezone": "Asia/Karachi",
        "theme": "auto"
      },
      "createdAt": "2025-01-01T00:00:00.000Z",
      "lastLogin": "2025-01-01T12:00:00.000Z"
    }
  }
}
```

---

### Update Profile

Update user profile information.

```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+923001234567",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "bio": "Full-stack developer",
  "website": "https://johnsmith.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": { /* updated user object */ }
  }
}
```

---

### Upload Avatar

Upload profile picture.

```http
POST /api/users/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `avatar`: Image file (JPEG, PNG, WebP, max 50MB)

**Response (200):**
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar": {
      "original": "ipfs-cid-original",
      "thumbnail": "ipfs-cid-thumbnail",
      "small": "ipfs-cid-small",
      "medium": "ipfs-cid-medium",
      "large": "ipfs-cid-large"
    },
    "urls": {
      "original": "https://ipfs.io/ipfs/...",
      "thumbnail": "https://ipfs.io/ipfs/...",
      "small": "https://ipfs.io/ipfs/...",
      "medium": "https://ipfs.io/ipfs/...",
      "large": "https://ipfs.io/ipfs/..."
    }
  }
}
```

---

### Change Password

Change user password (requires current password).

```http
POST /api/users/change-password
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "sessionsRevoked": 3
  }
}
```

---

### Update Preferences

Update user preferences (language, timezone, theme, notifications).

```http
PUT /api/users/preferences
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "language": "en",
  "timezone": "Asia/Karachi",
  "theme": "dark",
  "notifications": {
    "email": {
      "enabled": true,
      "security": true,
      "marketing": false,
      "updates": true
    },
    "push": {
      "enabled": true,
      "security": true,
      "marketing": false
    }
  },
  "privacy": {
    "profileVisibility": "public",
    "locationSharing": false,
    "dataCollection": {
      "analytics": true,
      "marketing": false
    }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "data": {
    "preferences": { /* updated preferences */ }
  }
}
```

---

### Request Account Deletion

Request account deletion (sends confirmation email).

```http
POST /api/users/request-deletion
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "password": "SecurePass123!",
  "reason": "user_request" // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Deletion request sent",
  "data": {
    "deletionToken": "sent to email",
    "expiresIn": "24 hours"
  }
}
```

---

### Confirm Account Deletion

Confirm account deletion with token from email.

```http
POST /api/users/confirm-deletion
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "deletion-token-from-email",
  "confirmText": "DELETE MY ACCOUNT",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": {
    "backupCreated": true,
    "deletedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## Two-Factor Authentication

### Setup 2FA

Generate 2FA secret and QR code.

```http
POST /api/users/2fa/setup
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA setup initiated",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,...",
    "backupCodes": [
      "A1B2C3D4",
      "E5F6G7H8",
      // 8 more codes...
    ]
  }
}
```

---

### Enable 2FA

Enable 2FA by verifying token.

```http
POST /api/users/2fa/enable
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "123456" // 6-digit TOTP code
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA enabled successfully",
  "data": {
    "backupCodes": ["A1B2C3D4", "E5F6G7H8", ...]
  }
}
```

---

### Verify 2FA

Verify 2FA token during login.

```http
POST /api/auth/verify-2fa
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "user-id",
  "token": "123456", // 6-digit TOTP or 8-char backup code
  "tempSessionId": "temp-session-id"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA verified successfully",
  "data": {
    "user": { /* user object */ },
    "token": "jwt-token"
  }
}
```

---

### Disable 2FA

Disable 2FA (requires password).

```http
POST /api/users/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

---

### Regenerate Backup Codes

Generate new backup codes.

```http
POST /api/users/2fa/regenerate-backup-codes
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Backup codes regenerated",
  "data": {
    "backupCodes": ["NEW1CODE", "NEW2CODE", ...]
  }
}
```

---

## Device Management

### Get Trusted Devices

List all trusted devices.

```http
GET /api/users/devices
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "_id": "device-id",
        "deviceId": "unique-device-hash",
        "deviceName": "Chrome on Windows",
        "platform": "desktop",
        "browser": "Chrome",
        "os": "Windows",
        "ipAddress": "192.168.1.1",
        "location": "Lahore, Punjab, Pakistan",
        "isTrusted": true,
        "firstUsed": "2025-01-01T00:00:00.000Z",
        "lastUsed": "2025-01-05T12:00:00.000Z",
        "isCurrentDevice": true
      }
    ]
  }
}
```

---

### Remove Device

Remove a trusted device.

```http
DELETE /api/users/devices/:deviceId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Device removed successfully"
}
```

---

### Verify New Device

Verify new device with token from email.

```http
POST /api/auth/verify-device
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "device-verification-token",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Device verified successfully",
  "data": {
    "user": { /* user object */ },
    "token": "jwt-token"
  }
}
```

---

## Session Management

### Get Active Sessions

List all active sessions.

```http
GET /api/users/sessions
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "_id": "session-id",
        "sessionId": "unique-session-id",
        "device": {
          "deviceName": "Chrome on Windows",
          "browser": "Chrome",
          "os": "Windows",
          "ipAddress": "192.168.1.1",
          "location": "Lahore, Punjab, Pakistan"
        },
        "isActive": true,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "expiresAt": "2025-01-08T00:00:00.000Z",
        "lastActivity": "2025-01-05T12:00:00.000Z",
        "isCurrentSession": true
      }
    ]
  }
}
```

---

### Revoke Session

Revoke a specific session.

```http
DELETE /api/users/sessions/:sessionId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

---

### Revoke All Sessions

Logout from all devices.

```http
POST /api/users/sessions/revoke-all
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "All sessions revoked",
  "data": {
    "revokedCount": 3
  }
}
```

---

## Social Authentication

### Get Social Accounts

List linked social accounts.

```http
GET /api/users/social-accounts
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
        "providerId": "google-user-id",
        "email": "john@gmail.com",
        "displayName": "John Doe",
        "profilePicture": "https://...",
        "connectedAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### Unlink Social Account

Remove linked social account.

```http
DELETE /api/users/social-accounts/:provider
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Social account unlinked successfully"
}
```

---

## Permission Management

### Get User Permissions

Get permission status for current device.

```http
GET /api/permissions/user-permissions
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user-id",
    "username": "johndoe",
    "permissions": [
      {
        "type": "location",
        "status": "granted",
        "grantedAt": "2025-01-01T00:00:00.000Z",
        "askCount": 1
      },
      {
        "type": "notification",
        "status": "denied",
        "deniedAt": "2025-01-01T00:00:00.000Z",
        "nextAskTime": "2025-01-02T00:00:00.000Z",
        "askCount": 2
      }
    ]
  }
}
```

---

### Record Permission Response

Record user's permission response.

```http
POST /api/permissions/record-permission
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "permissionType": "location",
  "response": "granted", // "granted" | "denied" | "prompt"
  "deviceFingerprint": {
    "hash": "device-hash",
    "userAgent": "...",
    "platform": "...",
    // other fingerprint data
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Permission response recorded"
}
```

---

## Analytics & Audit Logs

### Get Analytics

Get user account analytics.

```http
GET /api/users/analytics
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "totalSessions": 45,
      "lastSessionDate": "2025-01-05T12:00:00.000Z",
      "totalLoginTime": 18000, // minutes
      "averageSessionDuration": 120, // minutes
      "deviceCount": 3,
      "featuresUsed": ["2fa", "avatar_upload", "password_change"],
      "lastActiveDate": "2025-01-05T12:00:00.000Z"
    },
    "accountAge": 150 // days
  }
}
```

---

### Get Audit Logs

Get account activity audit logs.

```http
GET /api/users/audit-logs
Authorization: Bearer <token>
Query Parameters:
  - page (optional): Page number (default: 1)
  - limit (optional): Items per page (default: 20)
  - action (optional): Filter by action type
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "action": "login",
        "details": {
          "method": "password"
        },
        "ipAddress": "192.168.1.1",
        "userAgent": "Chrome/91.0",
        "timestamp": "2025-01-05T12:00:00.000Z"
      },
      {
        "action": "password_changed",
        "details": {},
        "ipAddress": "192.168.1.1",
        "userAgent": "Chrome/91.0",
        "timestamp": "2025-01-04T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

---

## Webhooks (Future Feature)

Webhook support is planned for version 1.5. Stay tuned for updates!

---

## SDK Support

Official SDKs are planned for:
- JavaScript/TypeScript (Version 2.0)
- React Native (Version 2.0)
- Flutter (Version 2.0)

---

## Support

For API support and questions:
- Email: hannanbhatti2006@gmail.com
- GitHub Issues: https://github.com/hanan-bhatti/authn/issues
- Documentation: https://github.com/hanan-bhatti/authn/docs

---

**Last Updated**: January 6, 2025  
**API Version**: 1.0.0