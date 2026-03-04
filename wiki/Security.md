# Security

Authn is built on a **security-first** philosophy. This page describes every security layer and the reasoning behind each decision.

---

## Authentication Security

### Password Hashing

- **bcrypt** with **12 salt rounds** (configurable via `BCRYPT_ROUNDS`)
- Protection against rainbow-table attacks
- Timing-safe comparison via bcryptjs

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### JWT Tokens

| Property | Value |
|----------|-------|
| Algorithm | HS256 |
| Default expiry | 7 days |
| Extended expiry (`rememberMe`) | 30 days |
| Payload | User ID + session ID |
| Storage | HttpOnly cookie (recommended) or Authorization header |

---

## Account Lockout

| Trigger | Threshold | Lockout Duration |
|---------|-----------|-----------------|
| Failed login attempts | 10 | 30 minutes |
| Failed 2FA attempts | 5 | 15 minutes |

Progressive delay is applied before lockout is reached.

---

## Rate Limiting

Powered by `express-rate-limit` with a sliding window algorithm.

| Scope | Limit | Window |
|-------|-------|--------|
| Authentication routes | 5 requests | 15 minutes |
| General API | 1 000 requests | 15 minutes |

Rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are included on all responses.

---

## HTTP Security Headers (Helmet)

Authn uses [Helmet](https://helmetjs.github.io/) to set the following headers:

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | See below |

**Content Security Policy**
```
default-src 'self'
script-src  'self' 'unsafe-inline' cdnjs.cloudflare.com
style-src   'self' 'unsafe-inline' fonts.googleapis.com
font-src    'self' fonts.gstatic.com
img-src     'self' data: https:
connect-src 'self' api.weather.gov
```

---

## CORS

Only origins listed in `CORS_ALLOWED_ORIGINS` are permitted. Credentials (cookies) are supported. Pre-flight `OPTIONS` requests are handled automatically.

---

## Two-Factor Authentication

TOTP (RFC 6238) with:
- 6-digit codes, 30-second window
- ±1 step grace period for clock skew
- 5-attempt lockout (15 min)
- 10 single-use backup codes per account

See [Two-Factor Authentication](Two-Factor-Authentication) for setup instructions.

---

## Device Trust & Fingerprinting

New devices must be verified via email before access is granted. Up to 10 trusted devices per user. See [Device Management](Device-Management).

---

## Session Isolation

Each session has a unique ID embedded in the JWT. Revoking a session blacklists the token. Password changes terminate all other active sessions.

---

## Data Backup & Encryption

- Pre-deletion backups are **mandatory** — no account can be deleted without a backup.
- Backups are gzip-compressed and optionally AES-256 encrypted.
- Sensitive fields (passwords, private keys) are excluded from backups and data exports.
- Backup retention: 365 days (configurable).

---

## Audit Logging

Every security-relevant action is logged:

- Login attempts (success / failure)
- Password changes and resets
- Email verification
- 2FA enable / disable
- Device additions and removals
- Session creation and termination
- Role and permission changes
- Profile updates

Each log entry includes a timestamp, IP address, user agent, and action result.

---

## Email Security

Transactional emails (verification OTPs, password reset links, device alerts) are:
- Single-use
- Time-limited (10 min for OTPs, 30 min for reset links, 24 h for device verification)
- SHA-256 hashed before storage

---

## Vulnerability Disclosure

Please report security vulnerabilities to [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com). See [SECURITY.md](https://github.com/hanan-bhatti/authn/blob/main/SECURITY.md) for the full responsible disclosure policy.
