# API Reference

The Authn REST API uses JSON for all requests and responses.

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3000/api` |
| Production | `https://your-domain.com/api` |

---

## Authentication

Most endpoints require a JWT token. Send it as a cookie **or** in the `Authorization` header:

```http
Authorization: Bearer <your-jwt-token>
```

```http
Cookie: token=<your-jwt-token>
```

---

## Rate Limiting

| Scope | Limit |
|-------|-------|
| General API | 1 000 requests / 15 min |
| Auth routes | 5 requests / 15 min |

Rate-limit headers are returned on every response:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2025-01-01T00:15:00.000Z
```

---

## Response Format

**Success**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

**Error**
```json
{
  "success": false,
  "error": "Short error title",
  "message": "Detailed description",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 422 | Validation failed |
| 423 | Locked (account locked) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `DUPLICATE_FIELD` | Duplicate email or username |
| `INVALID_CREDENTIALS` | Wrong email / password |
| `ACCOUNT_LOCKED` | Too many failed attempts |
| `EMAIL_NOT_VERIFIED` | Email verification required |
| `TWO_FACTOR_REQUIRED` | 2FA verification needed |
| `DEVICE_NOT_TRUSTED` | New device verification needed |
| `TOKEN_EXPIRED` | JWT has expired |
| `INSUFFICIENT_PERMISSIONS` | Role/permission check failed |

---

## Authentication Endpoints

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+923001234567"
}
```

Password rules: ≥ 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character.

**Response 201**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { "_id": "...", "email": "john@example.com", "isEmailVerified": false },
    "requiresEmailVerification": true
  }
}
```

---

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "identifier": "johndoe",
  "password": "SecurePass123!",
  "rememberMe": false
}
```

`identifier` can be a username or email address.

**Response 200** (no 2FA)
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "username": "johndoe" },
    "token": "eyJ...",
    "expiresAt": "2025-01-08T00:00:00.000Z"
  }
}
```

**Response 200** (2FA enabled)
```json
{
  "success": true,
  "message": "2FA verification required",
  "data": { "requires2FA": true, "userId": "...", "tempSessionId": "..." }
}
```

**Response 423** (account locked)
```json
{
  "success": false,
  "code": "ACCOUNT_LOCKED",
  "data": { "lockedUntil": "...", "timeLeftMinutes": 25 }
}
```

---

### Verify Email

```http
POST /api/auth/verify-email
Content-Type: application/json
```

```json
{ "email": "john@example.com", "otp": "ABC123" }
```

---

### Resend Verification Email

```http
POST /api/auth/resend-verification
Content-Type: application/json
```

```json
{ "email": "john@example.com" }
```

---

### Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json
```

```json
{ "email": "john@example.com" }
```

---

### Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json
```

```json
{ "token": "<reset-token>", "password": "NewSecurePass123!" }
```

---

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

---

### Google OAuth

```http
POST /api/auth/google
Content-Type: application/json
```

```json
{ "idToken": "<firebase-id-token>" }
```

---

## User Management Endpoints

### Get Profile

```http
GET /api/users/profile
Authorization: Bearer <token>
```

### Update Profile

```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+923001234567",
  "bio": "Full-stack developer",
  "website": "https://johnsmith.com"
}
```

### Upload Avatar

```http
POST /api/users/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Field: `avatar` — JPEG, PNG, or WebP (max 50 MB). Returns IPFS/S3 URLs at multiple sizes.

### Change Password

```http
POST /api/users/change-password
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "currentPassword": "OldPass123!", "newPassword": "NewPass123!" }
```

### Update Preferences

```http
PUT /api/users/preferences
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "language": "en",
  "timezone": "Asia/Karachi",
  "theme": "dark",
  "notifications": { "email": { "enabled": true, "security": true } },
  "privacy": { "profileVisibility": "public" }
}
```

### Export User Data

```http
GET /api/users/export
Authorization: Bearer <token>
```

Returns a JSON file containing all profile data, session history, and audit logs. Sensitive data (passwords, keys) is excluded.

### Request Account Deletion

```http
POST /api/users/request-deletion
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "password": "SecurePass123!" }
```

### Confirm Account Deletion

```http
POST /api/users/confirm-deletion
Content-Type: application/json
```

```json
{
  "token": "<deletion-token>",
  "confirmText": "DELETE MY ACCOUNT",
  "password": "SecurePass123!"
}
```

---

## Two-Factor Authentication

### Setup 2FA

```http
POST /api/users/2fa/setup
Authorization: Bearer <token>
```

Returns a `qrCodeUrl` and `manualEntryKey` for authenticator apps plus 10 `backupCodes`.

### Enable 2FA

```http
POST /api/users/2fa/enable
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "token": "123456" }
```

### Verify 2FA (login flow)

```http
POST /api/auth/2fa/verify
Content-Type: application/json
```

```json
{ "userId": "...", "tempSessionId": "...", "token": "123456" }
```

### Disable 2FA

```http
POST /api/users/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "password": "SecurePass123!", "token": "123456" }
```

---

## Device Management

### List Trusted Devices

```http
GET /api/users/devices
Authorization: Bearer <token>
```

### Remove Trusted Device

```http
DELETE /api/users/devices/:deviceId
Authorization: Bearer <token>
```

---

## Session Management

### List Sessions

```http
GET /api/users/sessions
Authorization: Bearer <token>
```

### Revoke Session

```http
DELETE /api/users/sessions/:sessionId
Authorization: Bearer <token>
```

### Logout All Devices

```http
POST /api/auth/logout-all
Authorization: Bearer <token>
```

---

## Social Authentication

### List Connected Providers

```http
GET /api/users/social-accounts
Authorization: Bearer <token>
```

### Unlink Social Provider

```http
DELETE /api/users/social-accounts/:provider
Authorization: Bearer <token>
```

---

## Analytics & Audit Logs

### Get Analytics

```http
GET /api/users/analytics
Authorization: Bearer <token>
```

### Get Audit Logs

```http
GET /api/users/audit-logs?page=1&limit=50
Authorization: Bearer <token>
```

---

## Notifications

### Get Notifications

```http
GET /api/users/notifications
Authorization: Bearer <token>
```

### Mark Notification as Read

```http
PUT /api/users/notifications/:notificationId/read
Authorization: Bearer <token>
```
