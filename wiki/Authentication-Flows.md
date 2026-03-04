# Authentication Flows

This page describes the complete lifecycle for every authentication action in Authn.

---

## Registration Flow

```
Client → POST /api/auth/register
       ← 201 { user, requiresEmailVerification: true }

Server sends 6-digit OTP to user's email (expires in 10 minutes)

Client → POST /api/auth/verify-email { email, otp }
       ← 200 { user.isEmailVerified: true }
```

1. Client submits username, email, and password.
2. Server validates input (password strength, duplicate check).
3. Password is hashed with bcrypt (12 salt rounds).
4. User record is created with `isEmailVerified: false`.
5. A 6-character alphanumeric OTP is generated, SHA-256 hashed, and stored with a 10-minute TTL.
6. OTP is emailed to the user.
7. Client submits the OTP to `/api/auth/verify-email`.
8. Server verifies the hash and marks the account as verified.

---

## Login Flow

### Standard Login (no 2FA)

```
Client → POST /api/auth/login { identifier, password }
       ← 200 { user, token, expiresAt }
```

1. Server looks up user by username **or** email.
2. Compares submitted password against bcrypt hash (timing-safe).
3. Checks account lock status.
4. Detects device fingerprint.
   - **Known device** → proceed.
   - **New device** → send verification email, return `DEVICE_NOT_TRUSTED`.
5. Creates a new session (max 5 concurrent).
6. Signs and returns a JWT (7 days default, 30 days with `rememberMe`).

### Login with 2FA Enabled

```
Client → POST /api/auth/login { identifier, password }
       ← 200 { requires2FA: true, userId, tempSessionId }

Client → POST /api/auth/2fa/verify { userId, tempSessionId, token }
       ← 200 { user, token, expiresAt }
```

### Account Lockout

After **10 failed login attempts**, the account is locked for **30 minutes**.  
After **5 failed 2FA attempts**, the 2FA is locked for **15 minutes**.

---

## Password Reset Flow

```
Client → POST /api/auth/forgot-password { email }
       ← 200 { expiresIn: "30 minutes" }

Server emails a time-limited reset link containing a signed token

Client → POST /api/auth/reset-password { token, password }
       ← 200 { message: "Password reset successful" }
```

- The reset token is single-use and expires after **30 minutes**.
- On successful reset, **all existing sessions are terminated**.

---

## Email Verification Flow

```
Client → POST /api/auth/resend-verification { email }
       ← 200 { expiresIn: "10 minutes" }

Client → POST /api/auth/verify-email { email, otp }
       ← 200 { user.isEmailVerified: true }
```

- The OTP is a 6-character alphanumeric code, valid for **10 minutes**.
- Each resend request invalidates the previous OTP.

---

## Google OAuth Flow

```
Client obtains idToken from Firebase SDK

Client → POST /api/auth/google { idToken }
       ← 200 { user, token, isNewUser }
```

1. Client completes Google sign-in via Firebase Web SDK.
2. Firebase returns an `idToken`.
3. Client sends `idToken` to `/api/auth/google`.
4. Server verifies the token with Firebase Admin SDK.
5. If email matches an existing account → link and log in.
6. If no match → create a new account with `isEmailVerified: true`.

---

## New Device Verification Flow

When a login is attempted from an unrecognized device:

```
Client → POST /api/auth/login { identifier, password }
       ← 403 { code: "DEVICE_NOT_TRUSTED" }

Server sends device-verification email (token valid 24 hours)

User clicks link in email

       ← Account is now accessible from the new device
```

- The device is added to the trusted-devices list after verification.
- Up to **10 trusted devices** per user.

---

## Logout Flow

### Single Session

```
Client → POST /api/auth/logout
       ← 200
```

The current JWT is blacklisted and the session record is removed.

### All Devices

```
Client → POST /api/auth/logout-all
       ← 200
```

All active sessions are revoked and all tokens are blacklisted.

---

## Change Password Flow

```
Client → POST /api/users/change-password { currentPassword, newPassword }
       ← 200 { sessionsRevoked: N }
```

- The current password must be provided.
- On success, **all other sessions are terminated** (the current session is preserved).

---

## Two-Factor Authentication Setup Flow

```
Client → POST /api/users/2fa/setup
       ← 200 { qrCodeUrl, manualEntryKey, backupCodes }

User scans QR code with authenticator app

Client → POST /api/users/2fa/enable { token: "123456" }
       ← 200 { message: "2FA enabled" }
```

See the [Two-Factor Authentication](Two-Factor-Authentication) wiki page for full details.

---

## Account Deletion Flow

```
Client → POST /api/users/request-deletion { password }
       ← 200 (deletion token sent to email)

Client → POST /api/users/confirm-deletion { token, confirmText, password }
       ← 200 { backupCreated: true, deletedAt }
```

- A backup of the user's data is created before deletion (AES-256 compressed).
- The account is soft-deleted; permanent deletion occurs after the grace period.
