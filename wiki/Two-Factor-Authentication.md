# Two-Factor Authentication (2FA)

Authn implements **TOTP** (Time-based One-Time Passwords) as defined in RFC 6238, powered by the [speakeasy](https://github.com/speakeasyjs/speakeasy) library.

---

## Compatible Authenticator Apps

Any RFC 6238-compliant app works:

- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- Bitwarden
- Any other TOTP-compatible app

---

## Setting Up 2FA

### Step 1 — Generate secret and QR code

```http
POST /api/users/2fa/setup
Authorization: Bearer <token>
```

**Response**
```json
{
  "success": true,
  "data": {
    "qrCodeUrl": "data:image/png;base64,...",
    "manualEntryKey": "JBSWY3DPEHPK3PXP",
    "backupCodes": [
      "A1B2C3D4",
      "E5F6G7H8",
      ...
    ]
  }
}
```

| Field | Description |
|-------|-------------|
| `qrCodeUrl` | Base64-encoded QR code — scan with your authenticator app |
| `manualEntryKey` | Manual secret key for apps that don't support QR scan |
| `backupCodes` | 10 single-use 8-digit codes for account recovery |

### Step 2 — Confirm and enable

Open your authenticator app, get the 6-digit code, and confirm:

```http
POST /api/users/2fa/enable
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "token": "123456" }
```

**Response 200**
```json
{ "success": true, "message": "Two-factor authentication enabled" }
```

---

## Logging In with 2FA

When 2FA is enabled, login is a two-step process:

### Step 1 — Standard login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{ "identifier": "johndoe", "password": "SecurePass123!" }
```

**Response 200** (2FA required)
```json
{
  "success": true,
  "message": "2FA verification required",
  "data": {
    "requires2FA": true,
    "userId": "...",
    "tempSessionId": "..."
  }
}
```

### Step 2 — Submit 2FA code

```http
POST /api/auth/2fa/verify
Content-Type: application/json
```

```json
{
  "userId": "...",
  "tempSessionId": "...",
  "token": "123456"
}
```

**Response 200** (authenticated)
```json
{
  "success": true,
  "data": {
    "user": { "..." },
    "token": "eyJ...",
    "expiresAt": "..."
  }
}
```

---

## Using Backup Codes

If you've lost access to your authenticator app, use a backup code in place of the 6-digit TOTP:

```json
{ "userId": "...", "tempSessionId": "...", "token": "A1B2C3D4" }
```

- Each backup code is **single-use** — it is invalidated after use.
- You receive **10 backup codes** during setup.

### Regenerate backup codes

```http
POST /api/users/2fa/backup-codes/regenerate
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "token": "123456" }
```

---

## Disabling 2FA

```http
POST /api/users/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "password": "SecurePass123!", "token": "123456" }
```

Both your current password and a valid TOTP code are required to disable 2FA.

---

## Security Details

| Parameter | Value |
|-----------|-------|
| Algorithm | TOTP (RFC 6238) |
| Code length | 6 digits |
| Time window | 30 seconds |
| Grace window | ±1 step (±30 s) |
| Failed-attempt lockout | 5 attempts → 15-minute lock |
| Backup codes | 10 × 8-character alphanumeric (single-use) |

---

## Troubleshooting

**"Invalid 2FA code"**  
Ensure the clock on your device is synchronized (NTP). TOTP is time-based and requires accurate time.

**"2FA is locked"**  
After 5 consecutive failed attempts, 2FA is locked for 15 minutes. Wait for the lockout to expire or use a backup code.

**Lost authenticator app and no backup codes**  
Contact the site administrator to initiate an account recovery process.
