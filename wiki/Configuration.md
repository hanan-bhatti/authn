# Configuration

All runtime configuration is managed through environment variables loaded from a `.env` file via `dotenv`.

Copy `.env.example` to `.env` and adjust the values before starting the server.

---

## Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port the server listens on |
| `NODE_ENV` | `development` | `development` or `production`. In production mode, stricter security policies are applied (HTTPS-only cookies, stack traces hidden, CORS origin validation enforced) and backup encryption is enabled. |

---

## Database

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | ✅ | MongoDB connection string (Atlas or self-hosted) |

---

## JSON Web Tokens

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Secret key used to sign tokens — use a long random string |

---

## URLs

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Server base URL |
| `CLIENT_URL` | `http://localhost:3000` | Client-facing URL |
| `FRONTEND_URL` | `http://localhost:3001` | Frontend application URL |
| `DASHBOARD_URL` | `http://localhost:3001/dashboard` | Dashboard URL |
| `PROD_BASE_URL` | — | Production server URL |
| `PROD_FRONTEND_URL` | — | Production frontend URL |
| `PROD_DASHBOARD_URL` | — | Production dashboard URL |

---

## Email (SMTP)

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | ✅ | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | ✅ | SMTP port (e.g. `587` for TLS, `465` for SSL) |
| `SMTP_USER` | ✅ | SMTP username / email address |
| `SMTP_PASS` | ✅ | SMTP password or App Password |
| `APP_NAME` | — | Application name shown in emails |

---

## Security

| Variable | Default | Description |
|----------|---------|-------------|
| `BCRYPT_ROUNDS` | `12` | bcrypt salt rounds for password hashing |
| `SESSION_SECRET` | — | Secret for session middleware |

---

## Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Global rate-limit window in ms (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `1000` | Max requests per IP per global window |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000` | Auth route rate-limit window in ms |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | `5` | Max auth requests (login/register) per window |
| `GENERAL_RATE_LIMIT_WINDOW_MS` | `900000` | General auth-path rate-limit window in ms |
| `GENERAL_RATE_LIMIT_MAX_REQUESTS` | `50` | Max requests on general auth paths per window |
| `PASSWORD_RESET_RATE_LIMIT_WINDOW_MS` | `3600000` | Password reset window in ms (1 hour) |
| `PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS` | `3` | Max password-reset requests per window |
| `EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS` | `600000` | Email verification window in ms (10 min) |
| `EMAIL_VERIFICATION_RATE_LIMIT_MAX_REQUESTS` | `3` | Max verification emails per window |

---

## CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,...` | Comma-separated list of allowed origins |

---

## Cookies

| Variable | Default | Description |
|----------|---------|-------------|
| `COOKIE_HTTP_ONLY` | `true` | Set `HttpOnly` flag on auth cookie |
| `COOKIE_SECURE` | `false` | Set `Secure` flag (enable in production with HTTPS) |
| `COOKIE_SAME_SITE` | `lax` | SameSite policy: `strict`, `lax`, or `none` |
| `COOKIE_MAX_AGE` | `604800000` | Cookie max-age in ms (7 days) |
| `COOKIE_PATH` | `/` | Cookie path scope |

---

## Google / Firebase

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_API_KEY` | For Google auth | Firebase Web API key |
| `FIREBASE_AUTH_DOMAIN` | For Google auth | Firebase auth domain |
| `FIREBASE_PROJECT_ID` | For Google auth | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | For Google auth | Firebase storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | For Google auth | Firebase sender ID |
| `FIREBASE_APP_ID` | For Google auth | Firebase app ID |
| `FIREBASE_PRIVATE_KEY_ID` | For Google auth | Admin SDK private key ID |
| `FIREBASE_PRIVATE_KEY` | For Google auth | Admin SDK private key (PEM) |
| `FIREBASE_CLIENT_EMAIL` | For Google auth | Admin SDK service account email |
| `FIREBASE_CLIENT_ID` | For Google auth | Admin SDK client ID |
| `FIREBASE_CLIENT_CERT_URL` | For Google auth | Admin SDK cert URL |

---

## OAuth Clients

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | For Google OAuth | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | For Google OAuth | Google OAuth 2.0 client secret |
| `FACEBOOK_CLIENT_ID` | For Facebook OAuth | Facebook app ID |
| `FACEBOOK_CLIENT_SECRET` | For Facebook OAuth | Facebook app secret |
| `GITHUB_CLIENT_ID` | For GitHub OAuth | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | For GitHub OAuth | GitHub OAuth app client secret |

---

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `COOKIE_SECURE=true` (HTTPS required)
- [ ] Use a strong, unique `JWT_SECRET` (≥ 64 characters)
- [ ] Set `CORS_ALLOWED_ORIGINS` to your actual frontend domain(s)
- [ ] Configure a production MongoDB URI
- [ ] Configure SMTP credentials for transactional emails
