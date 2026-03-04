# FAQ

Frequently asked questions about Authn.

---

## Getting Started

**What is Authn?**  
Authn is a comprehensive, self-hosted authentication platform built with Node.js, Express, and MongoDB. It provides enterprise-grade security features — 2FA, Google OAuth, device management, session management, audit logging, and more — without vendor lock-in.

**What are the minimum system requirements?**  
Node.js ≥ 16, npm ≥ 8, MongoDB ≥ 5. For production, 2 GB RAM and 2 CPU cores are recommended.

**How do I get started quickly?**  
See [Getting Started](Getting-Started) for the full installation guide. The short version:
```bash
git clone https://github.com/hanan-bhatti/authn.git
cd authn && npm install
cp .env.example .env   # fill in required values
npm run dev
```

**What external services do I need?**  
Only MongoDB and an SMTP server are required. Google OAuth requires a Firebase project. File storage (avatars) requires AWS S3 or Filebase — a default avatar is used if not configured.

---

## Authentication & Security

**How are passwords stored?**  
Passwords are hashed using **bcrypt with 12 salt rounds**. Plain-text passwords are never stored or logged.

**How long do JWTs last?**  
7 days by default. 30 days with `rememberMe: true`. Configure via the `JWT_SECRET` and related settings.

**What happens after too many failed login attempts?**  
The account is locked for **30 minutes** after 10 failed attempts. A 2FA lockout of **15 minutes** is applied after 5 failed 2FA codes.

**Is 2FA required for all users?**  
No. 2FA is optional and user-initiated. Administrators can enforce it at the application level.

**What 2FA apps are supported?**  
Any RFC 6238-compliant TOTP app: Google Authenticator, Microsoft Authenticator, Authy, 1Password, Bitwarden, etc.

**What happens if I lose my 2FA device?**  
Use one of your 10 **backup codes** generated during 2FA setup. Each code is single-use. If all codes are exhausted, contact your administrator.

**How does Authn detect new devices?**  
It builds a SHA-256 fingerprint from browser, OS, IP, screen resolution, timezone, and hardware signals. Unrecognized fingerprints trigger an email verification step.

---

## User Management

**How do I verify my email address?**  
A 6-digit OTP is sent to your email after registration. Submit it at `POST /api/auth/verify-email`. It expires in **10 minutes**. Request a new one at `POST /api/auth/resend-verification`.

**Can I change my username?**  
Username changes are handled via `PUT /api/users/profile`. Usernames must be 3–30 characters and contain only letters, numbers, and underscores.

**How does account deletion work?**  
1. Request deletion at `POST /api/users/request-deletion` (password required).
2. Confirm via the token emailed to you at `POST /api/users/confirm-deletion`.
3. A backup is created before deletion. The account is soft-deleted and permanently removed after the grace period.

**Can I export my data?**  
Yes. `GET /api/users/export` returns a JSON file with your profile, session history, device list, and audit logs. Passwords and private keys are excluded.

**How many profile pictures can I upload?**  
One at a time. Each upload generates five sizes (thumbnail, small, medium, large, original) in WebP format.

---

## Sessions & Devices

**How many sessions can I have at once?**  
Up to **5 concurrent sessions**. When the limit is reached, the oldest inactive session is automatically revoked.

**Can I see where I'm logged in?**  
Yes. `GET /api/users/sessions` lists all active sessions with device info, IP address, location, and last-activity time.

**How do I log out of all devices?**  
Call `POST /api/auth/logout-all`. All sessions and tokens are immediately invalidated.

**How many trusted devices can I have?**  
Up to **10**. Devices inactive for more than 90 days are automatically removed by the maintenance scheduler.

---

## API & Integration

**Where is the API base URL?**  
Development: `http://localhost:3000/api`  
Production: `https://your-domain.com/api`

**How do I authenticate API requests?**  
Include a JWT in the `Authorization: Bearer <token>` header, or store it in an `HttpOnly` cookie (recommended).

**What are the rate limits?**  
Auth routes: 5 requests / 15 min. General API: 1 000 requests / 15 min.

**Does Authn support webhooks?**  
Not yet. Webhooks are planned for v2.5.

**Is there a GraphQL API?**  
Not yet. GraphQL is planned for v2.5.

---

## Deployment & Production

**What's the recommended way to deploy?**  
Docker + docker-compose with an Nginx reverse proxy. See [Deployment](Deployment).

**Should I use `COOKIE_SECURE=true`?**  
Yes, whenever serving over HTTPS (required in production).

**How do I scale Authn?**  
Currently Authn is designed for single-node deployments. Redis-based session storage is planned for v1.5 to enable horizontal scaling.

**How do I back up the database?**  
Use MongoDB Atlas's built-in backups, or `mongodump` for self-hosted deployments. Authn also creates per-user compressed backups before account deletion.

---

## Troubleshooting

**`MongoServerError: Authentication failed`**  
Verify your `MONGO_URL` — check the username, password, and database name.

**Emails aren't being sent**  
Confirm `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`. For Gmail, use a 16-character [App Password](https://support.google.com/accounts/answer/185833).

**`TOKEN_EXPIRED` errors**  
The JWT has expired. The client should redirect to login.

**Google OAuth "Firebase: Error (auth/invalid-credential)"**  
Verify that all `FIREBASE_*` environment variables are set correctly and that the Firebase project has Authentication enabled.

**`EADDRINUSE` on startup**  
Another process is using the configured port. Change `PORT` in `.env` or stop the conflicting process.

**Rate-limit errors (429) in development**  
Increase `AUTH_RATE_LIMIT_MAX_REQUESTS` or `GENERAL_RATE_LIMIT_MAX_REQUESTS` in `.env` during development.

---

## Contributing & Support

**How do I report a bug?**  
Open an issue at [github.com/hanan-bhatti/authn/issues](https://github.com/hanan-bhatti/authn/issues) with steps to reproduce, expected behavior, and environment details.

**How do I suggest a feature?**  
Open an issue with the `enhancement` label.

**How do I report a security vulnerability?**  
Email [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com). Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](https://github.com/hanan-bhatti/authn/blob/main/SECURITY.md).

**How do I contribute code?**  
See the [Contributing](Contributing) wiki page.

**What's the license?**  
MIT. See [LICENSE](https://github.com/hanan-bhatti/authn/blob/main/LICENSE).
