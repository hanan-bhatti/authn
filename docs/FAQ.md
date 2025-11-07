# ❓ Authn - Frequently Asked Questions

<div class="faq-header">
  <p><strong>Last Updated:</strong> November 7, 2025 | <strong>Version:</strong> 1.0.0</p>
</div>

---

## 📑 Quick Navigation

| Category | Questions |
|----------|-----------|
| [🎯 Getting Started](#-getting-started) | 6 questions |
| [🔐 Authentication & Security](#-authentication--security) | 9 questions |
| [👤 User Management](#-user-management) | 7 questions |
| [📱 Sessions & Devices](#-sessions--devices) | 7 questions |
| [🔌 API & Integration](#-api--integration) | 6 questions |
| [🚀 Deployment & Production](#-deployment--production) | 7 questions |
| [🔧 Troubleshooting](#-troubleshooting) | 8 questions |
| [🎓 Advanced Features](#-advanced-features) | 6 questions |
| [🤝 Contributing & Support](#-contributing--support) | 6 questions |

---

## 🎯 Getting Started

<details>
<summary><strong>What is Authn?</strong></summary>

Authn is a **comprehensive, enterprise-grade authentication system** built with Node.js, Express, and MongoDB. It provides everything you need to implement secure user authentication in modern applications, from basic email/password login to advanced features like:

- **Two-Factor Authentication (2FA)**
- **Social Login (Google OAuth 2.0)**
- **Device Management & Fingerprinting**
- **Session Management**
- **Rate Limiting & DDoS Protection**
- **Comprehensive Audit Logging**

The system is designed to be **production-ready**, **highly secure**, and **developer-friendly** with clean APIs and extensive documentation.

**Key Benefits:**
- 🔒 Security-first architecture with industry best practices
- ⚡ Battle-tested in production environments
- 🎨 Easy to integrate with existing projects
- 📊 Built-in analytics and monitoring
- 🔧 Highly configurable to fit your needs

</details>

<details>
<summary><strong>What are the main features?</strong></summary>

Authn includes **20+ enterprise-grade features** organized into several categories:

### 🔐 Authentication Methods
- Email & password registration and login
- Google OAuth 2.0 social login
- Two-Factor Authentication (TOTP-based)
- Account linking for multiple providers
- Secure password reset flow

### 🛡️ Security Features
- Device fingerprinting and management
- Trusted device marking
- Session management (up to 5 concurrent sessions)
- Rate limiting and DDoS protection
- Progressive account lockout
- Email verification

### 👤 User Management
- Complete profile management
- Avatar upload with image processing
- Account deletion with pre-deletion backup
- GDPR data export capability
- User preferences and settings

### 📊 Monitoring & Analytics
- Comprehensive audit logging
- User activity tracking
- Device analytics
- Security event notifications
- Real-time alerts

For a complete feature list, see the [FEATURES.md](../FEATURES.md) document.

</details>

<details>
<summary><strong>What are the system requirements?</strong></summary>

**Minimum Requirements:**

| Component | Version | Notes |
|-----------|---------|-------|
| **Node.js** | >= 16.0.0 | LTS versions recommended |
| **npm** | >= 8.0.0 | Or use yarn 1.22+ |
| **MongoDB** | >= 5.0 | Cloud or self-hosted |
| **RAM** | 512 MB | Minimum for development |
| **Disk Space** | 1 GB | For dependencies and data |

**Recommended for Production:**

| Component | Recommendation |
|-----------|-----------------|
| **Node.js** | 18.x LTS or higher |
| **MongoDB** | 6.0+ with replica sets |
| **RAM** | 2-4 GB minimum |
| **CPU** | 2+ cores |
| **Database** | MongoDB Atlas or self-hosted with backups |
| **OS** | Linux (Ubuntu 20.04+ recommended) |

**External Services (Optional):**
- SMTP server (Gmail, SendGrid, etc.) for emails
- Firebase Project (for Google OAuth)
- AWS S3 or Filebase (for file storage)

</details>

<details>
<summary><strong>How do I install Authn?</strong></summary>

**Quick Installation (5 minutes):**

```bash
# 1. Clone the repository
git clone https://github.com/hanan-bhatti/authn.git
cd authn

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Start the server
npm run dev
```

**Detailed Installation Steps:**

1. **Prerequisites Check**
   ```bash
   node --version  # Should be >= 16.0.0
   npm --version   # Should be >= 8.0.0
   ```

2. **Clone Repository**
   ```bash
   git clone https://github.com/hanan-bhatti/authn.git
   cd authn
   ```

3. **Install Dependencies**
   ```bash
   npm install
   # or with yarn
   yarn install
   ```

4. **Setup MongoDB**
   - Local: Start MongoDB server (`mongod`)
   - Cloud: Get connection string from MongoDB Atlas
   - Docker: Use MongoDB Docker image

5. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit required fields in .env
   ```

6. **Start Server**
   - **Development**: `npm run dev` (with auto-reload)
   - **Production**: `npm start`

7. **Verify Installation**
   ```bash
   curl http://localhost:5000/health
   # Should return health check response
   ```

**Installation Complete!** Your Authn server is now running at `http://localhost:5000`.

</details>

<details>
<summary><strong>How do I configure environment variables?</strong></summary>

**Step 1: Create Environment File**
```bash
cp .env.example .env
```

**Step 2: Configure Required Variables**

```env
# ===== SERVER CONFIGURATION =====
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000

# ===== DATABASE =====
MONGO_URL=mongodb://localhost:27017/authn

# ===== JWT CONFIGURATION =====
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=7d

# ===== EMAIL CONFIGURATION =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=noreply@yourdomain.com
```

**Step 3: Configure Optional Variables**

```env
# ===== FIREBASE (for Google OAuth) =====
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com

# ===== FILE STORAGE (Filebase/S3) =====
FILEBASE_ACCESS_KEY_ID=your-access-key
FILEBASE_SECRET_ACCESS_KEY=your-secret-key
FILEBASE_BUCKET_NAME=your-bucket-name

# ===== ADDITIONAL URLS =====
FRONTEND_URL=https://app.yourdomain.com

# ===== RATE LIMITING =====
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5
```

**Step 4: Validate Configuration**
```bash
# Start server and check logs
npm run dev
```

**Best Practices:**
- ✅ Use strong, unique `JWT_SECRET` (min 32 characters)
- ✅ Never commit `.env` file to version control
- ✅ Use environment-specific configurations
- ✅ Store secrets in secure vaults for production
- ✅ Rotate secrets regularly

</details>

<details>
<summary><strong>Can I use Authn with my existing project?</strong></summary>

**Yes! Authn is designed to integrate seamlessly.**

### Integration Options

**Option 1: Use as Standalone Service** (Recommended)
- Run Authn as a separate microservice
- Integrate via REST API
- No code changes needed in existing project
- Scales independently

```javascript
// Your app - API calls to Authn
const loginResponse = await fetch('http://authn-server/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'user@example.com', password: 'pass' })
});
```

**Option 2: Embed as NPM Module** (For Node.js)
```bash
npm install authn-auth
```

```javascript
const { AuthService } = require('authn-auth');
const auth = new AuthService(mongoURL, jwtSecret);

// Use authentication in your app
const user = await auth.login(email, password);
```

**Option 3: Docker Container**
- Deploy in Docker alongside your app
- Use docker-compose for orchestration
- Environment variable configuration

**Integration Steps:**

1. **Generate API Keys/Tokens**
   - Create service account in Authn
   - Generate API credentials

2. **Update Your App**
   ```javascript
   // Middleware to verify tokens
   const verifyToken = (token) => {
     return fetch('http://authn/api/auth/verify', {
       headers: { Authorization: `Bearer ${token}` }
     });
   };
   ```

3. **Redirect to Authn**
   - Use hosted login page
   - Or use API for custom UI

4. **Handle Responses**
   - Store JWT tokens
   - Set up automatic token refresh

**Supported Frameworks:**
- ✅ Express.js
- ✅ Next.js
- ✅ React + Node backend
- ✅ Vue.js + API
- ✅ Angular + API
- ✅ Any REST API client

**Migration from Existing Auth:**
- Batch migrate users to Authn
- Maintain backward compatibility during transition
- Gradual rollout to new users
- Zero-downtime migration

</details>

---

## 🔐 Authentication & Security

<details>
<summary><strong>What authentication methods are supported?</strong></summary>

**Authn supports 3 primary authentication methods:**

### 1️⃣ Email & Password Authentication
**Most Common - Standard login/registration**

```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /api/auth/login
{
  "identifier": "user@example.com",  # or username
  "password": "SecurePass123!"
}
```

**Security Features:**
- bcryptjs hashing (12 salt rounds)
- Password strength validation
- Email verification
- Account lockout protection
- Session tracking

### 2️⃣ Google OAuth 2.0
**Social Login - "Sign in with Google"**

```javascript
// Frontend: Google Sign-In button initiates OAuth flow
// Redirects to: /auth?provider=google&code=...

POST /api/auth/social/google
{
  "idToken": "google-id-token"
}
```

**Features:**
- One-click sign-in
- Profile picture import
- Email auto-verified
- Account linking (connect to existing account)

### 3️⃣ Two-Factor Authentication (2FA)
**Enhanced Security - TOTP-based**

```bash
# Setup 2FA
POST /api/users/2fa/setup

# Enable 2FA with verification
POST /api/users/2fa/enable
{
  "token": "123456"  # From authenticator app
}

# Verify 2FA during login
POST /api/auth/verify-2fa
{
  "userId": "user-id",
  "token": "123456"
}
```

**Compatible Apps:**
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- Any RFC 6238 compliant app

### Password Requirements
- **Minimum 8 characters**
- **At least 1 uppercase letter** (A-Z)
- **At least 1 lowercase letter** (a-z)
- **At least 1 number** (0-9)
- **At least 1 special character** (@$!%*?&)

Example valid password: `MySecure@Pass123`

### Planned Features (v1.5+)
- 🔜 Magic link authentication
- 🔜 SMS-based OTP
- 🔜 Facebook, GitHub, Twitter login
- 🔜 WebAuthn (biometric auth)

</details>

<details>
<summary><strong>How does JWT authentication work?</strong></summary>

**JWT (JSON Web Token) - Stateless Authentication Explained:**

### JWT Structure

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Three Parts:**
1. **Header** - Token type (JWT) and algorithm (HS256)
2. **Payload** - User data (claims)
3. **Signature** - Verification code

### Authentication Flow

```
1. User logs in with email/password
   ↓
2. Server verifies credentials
   ↓
3. Server creates JWT token with user ID, session ID, expiry
   ↓
4. Server returns token to client
   ↓
5. Client stores token (localStorage, sessionStorage)
   ↓
6. Client sends token in Authorization header for future requests
   Authorization: Bearer eyJhbGc...
   ↓
7. Server verifies token signature and expiry
   ↓
8. Request is processed or rejected
```

### Token Configuration

```env
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d          # Default expiration
```

### Usage in Requests

```javascript
// Frontend - Include token in requests
const response = await fetch('/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

```javascript
// Backend - Middleware validates token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Token Expiration & Refresh

```javascript
// When token is about to expire, get a new one
POST /api/auth/refresh-token
{
  "refreshToken": "previous-refresh-token"
}

// Returns new access token
{
  "token": "new-jwt-token",
  "expiresIn": "7d"
}
```

### "Remember Me" Feature

```javascript
// Client enables "Remember Me" for 30-day session
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "pass",
  "rememberMe": true    // 30-day token instead of 7-day
}
```

### Token Security Best Practices

✅ **Do:**
- Store tokens securely (httpOnly cookies for web)
- Use HTTPS for all token transmission
- Refresh tokens before expiry
- Clear tokens on logout
- Validate token signatures

❌ **Don't:**
- Store tokens in localStorage (XSS vulnerable)
- Embed secrets in tokens
- Use tokens without HTTPS
- Share JWT_SECRET
- Ignore token expiration

</details>

<details>
<summary><strong>What are the password requirements?</strong></summary>

**Authn enforces strong password standards:**

### Minimum Requirements

| Requirement | Details | Example |
|-------------|---------|---------|
| **Length** | Minimum 8 characters | ✅ `MySecurePass123` |
| **Uppercase** | At least 1 uppercase letter (A-Z) | ✅ Contains `M` and `S` |
| **Lowercase** | At least 1 lowercase letter (a-z) | ✅ Contains `ecure` |
| **Numbers** | At least 1 digit (0-9) | ✅ Contains `123` |
| **Special Char** | At least 1 special character (@$!%*?&) | ❌ Missing |

### Valid Examples
✅ `MySecure@Pass123`
✅ `P@ssw0rd2024`
✅ `Authn$2025Secure`
✅ `Tr0pic@lBeach#42`

### Invalid Examples
❌ `password` - Too simple, no numbers/special chars
❌ `Pass123` - Too short (7 chars)
❌ `PASSWORD123` - No lowercase
❌ `password123` - No uppercase
❌ `MyPass@` - No numbers

### Password Validation Rules

```javascript
// Frontend validation example
const validatePassword = (password) => {
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[@$!%*?&]/.test(password)
  };
  
  return Object.values(rules).every(rule => rule === true);
};
```

### Password Strength Indicator

```
Weak        →  Red    - Missing 2+ requirements
Fair        →  Orange - Missing 1 requirement
Good        →  Yellow - Meets all requirements
Strong      →  Green  - 20+ characters + all requirements
Very Strong →  Blue   - 20+ chars + special pattern
```

### Security Features

**Password Protection:**
- 🔒 Hashed with bcryptjs (12 salt rounds)
- 🔒 Timing-safe comparison (prevents timing attacks)
- 🔒 Never stored in plain text
- 🔒 Never transmitted in logs

**Account Lockout:**
- 10 failed login attempts → 30-minute lockout
- Progressive delays between attempts
- Email notification on account lockout
- Manual unlock available via password reset

**Password History:**
- Can't reuse last 5 passwords
- Prevents weak pattern cycling
- Encouraged for admin accounts

### Changing Password

```bash
POST /api/users/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "currentPassword": "MySecure@Pass123",
  "newPassword": "NewSecure@Pass456"
}
```

**When changing password:**
- All active sessions are revoked
- Must log in again on all devices
- 2FA remains enabled
- Email confirmation sent

### Password Reset Flow

```bash
# Step 1: Request reset
POST /api/auth/forgot-password
{ "email": "user@example.com" }

# Step 2: Check email for reset link (30-min expiry)

# Step 3: Submit new password with token
POST /api/auth/reset-password
{
  "token": "reset-token-from-email",
  "password": "NewSecure@Pass456"
}
```

### Best Practices

✅ Use unique passwords for each service
✅ Use password manager (1Password, LastPass, Bitwarden)
✅ Change password if suspicious activity detected
✅ Use passphrase for better memorability: `Coffee@Sunrise2024`
✅ Enable 2FA for additional security

</details>

<details>
<summary><strong>How do I enable Two-Factor Authentication (2FA)?</strong></summary>

**Step-by-Step 2FA Setup:**

### Step 1: Access 2FA Settings

```bash
POST /api/users/2fa/setup
Authorization: Bearer {token}
```

Response includes:
```json
{
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "manualEntry": "JBSWY3DPEBLW64TMMQ======"
}
```

### Step 2: Choose Setup Method

**Method A: Scan QR Code (Easier)**
1. Open authenticator app (Google Authenticator, Authy, etc.)
2. Tap "+" or "Add account"
3. Choose "Scan QR Code"
4. Scan the QR code from Authn
5. 6-digit code appears

**Method B: Manual Entry**
1. Open authenticator app
2. Tap "+" or "Add account"
3. Choose "Enter setup key"
4. Enter the manual code: `JBSWY3DPEBLW64TMMQ======`
5. Account name: `Authn`
6. Key type: `Time-based`
7. 6-digit code appears

### Step 3: Save Backup Codes

After scanning QR code, you'll receive **8 backup codes**:
```
ABCD-1234
EFGH-5678
IJKL-9012
... (8 codes total)
```

⚠️ **IMPORTANT:** 
- Store these codes in a **secure location**
- Each code can only be used ONCE
- Use if you lose access to authenticator device
- Never share backup codes

### Step 4: Enable 2FA

```bash
POST /api/users/2fa/enable
Authorization: Bearer {token}
Content-Type: application/json

{
  "token": "123456"  # 6-digit code from authenticator
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA enabled successfully",
  "backupCodes": ["ABCD-1234", "EFGH-5678", ...]
}
```

### 2FA During Login

```
Login Flow:
1. Enter email and password
2. Server verifies credentials
3. Server prompts: "Enter 2FA code"
4. User opens authenticator app
5. User enters 6-digit code
6. Server verifies code
7. Login successful ✓
```

### Using Backup Codes

```bash
POST /api/auth/verify-2fa
{
  "userId": "user-id",
  "token": "ABCD-1234"  # Use backup code (used only once)
}
```

### Compatible Authenticator Apps

| App | Platform | Notes |
|-----|----------|-------|
| Google Authenticator | iOS, Android | Most popular |
| Microsoft Authenticator | iOS, Android | Enterprise-friendly |
| Authy | iOS, Android, Desktop | Multiple devices sync |
| 1Password | iOS, Android, Mac, Windows | Password manager + 2FA |
| FreeOTP | iOS, Android | Open source |
| LastPass Authenticator | iOS, Android | LastPass integration |

### Managing Backup Codes

**View Backup Codes:**
```bash
GET /api/users/2fa/backup-codes
Authorization: Bearer {token}
```

**Regenerate Backup Codes:**
```bash
POST /api/users/2fa/backup-codes/regenerate
Authorization: Bearer {token}
Content-Type: application/json

{
  "password": "YourPassword123"  # Confirmation required
}
```

**Disable 2FA:**
```bash
POST /api/users/2fa/disable
Authorization: Bearer {token}
Content-Type: application/json

{
  "password": "YourPassword123"  # Confirmation required
}
```

### Troubleshooting 2FA

**Code doesn't work:**
- Ensure phone time is synced (Settings → Date & Time)
- Check code expiry (6-digit codes expire every 30 seconds)
- Try next code (if just entered)
- Use backup code as alternative

**Lost authenticator device:**
- Use one of your backup codes
- Contact support if all backup codes used

**Can't find backup codes:**
- They were shown during initial 2FA setup
- Request new backup codes (requires password)
- Contact support for account recovery

</details>

<details>
<summary><strong>What authenticator apps are compatible?</strong></summary>

**Authn supports all RFC 6238-compliant TOTP authenticators:**

### Officially Tested & Recommended

| App | iOS | Android | Desktop | Notes |
|-----|-----|---------|---------|-------|
| **Google Authenticator** | ✅ | ✅ | ❌ | Industry standard |
| **Microsoft Authenticator** | ✅ | ✅ | ✅ | Enterprise use |
| **Authy** | ✅ | ✅ | ✅ | Multi-device sync |
| **1Password** | ✅ | ✅ | ✅ | Password + 2FA |
| **LastPass Authenticator** | ✅ | ✅ | ❌ | LastPass integration |
| **FreeOTP+** | ✅ | ✅ | ❌ | Open source |

### Installation

**Google Authenticator:**
- iOS: [App Store](https://apps.apple.com/app/google-authenticator)
- Android: [Play Store](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)

**Microsoft Authenticator:**
- iOS: [App Store](https://apps.apple.com/app/microsoft-authenticator)
- Android: [Play Store](https://play.google.com/store/apps/details?id=com.azure.authenticator)

**Authy:**
- iOS: [App Store](https://apps.apple.com/app/twilio-authy)
- Android: [Play Store](https://play.google.com/store/apps/details?id=com.authy.authy)

### Setup Instructions

**For Google Authenticator:**
1. Open app → Tap "+" button
2. Select "Scan QR code" or "Enter setup key"
3. Allow camera access
4. Scan Authn QR code
5. 6-digit code appears

**For Authy (with sync):**
1. Open app → Tap "+" button
2. Select "Scan QR code"
3. Account name: "Authn"
4. Scan QR code
5. Code syncs across your devices

**For 1Password:**
1. Open 1Password → Tap "+" 
2. Select "Add new login"
3. Choose "Scan with camera"
4. Scan Authn QR code
5. 2FA code appears in 1Password

### Backup Strategies

**Multiple Device Setup:**
```
Primary: Google Authenticator (phone)
Backup: Authy (phone - synced)
Offline: Written backup codes in safe
```

**Device Failure Plan:**
1. Use backup codes to login
2. Generate new backup codes
3. Set up 2FA again on new device

### Security Considerations

✅ **Best Practices:**
- Use strong device security (fingerprint/PIN)
- Keep OS and app updated
- Don't share authenticator codes
- Use backup codes responsibly
- Test 2FA in test account first

❌ **Avoid:**
- Taking screenshots of QR codes
- Sharing authenticator device
- Using outdated app versions
- Removing backup codes storage

### If 2FA Device Lost

**Immediate Action:**
1. Use one of your 8 backup codes to login
2. Go to 2FA settings
3. Disable current 2FA
4. Set up 2FA again with new device

**Permanent Loss:**
- Contact Authn support
- Verify identity through email
- Account recovery process initiated

</details>

<details>
<summary><strong>How do backup codes work?</strong></summary>

**Backup Codes Explained:**

### What Are Backup Codes?

Backup codes are **8 single-use security codes** generated during 2FA setup. Each code works as an alternative to your 6-digit authenticator code if:
- You lose access to your authenticator device
- Your authenticator app malfunctions
- You need emergency access to your account

### Backup Code Format

```
ABCD-1234
EFGH-5678
IJKL-9012
MNOP-3456
QRST-7890
UVWX-1234
YZAB-5678
CDEF-9012
```

- **8 codes total** (one-time use each)
- **Alphanumeric** format (letters + numbers)
- **Hyphen-separated** for readability
- **Case-insensitive** (ABCD-1234 = abcd-1234)

### Generating Backup Codes

**During 2FA Setup:**
```
You'll automatically receive 8 backup codes
Save them immediately in a secure location
```

**Generate New Codes:**
```bash
POST /api/users/2fa/backup-codes/regenerate
Authorization: Bearer {token}

{
  "password": "YourPassword123"  # Confirmation required
}
```

### Storing Backup Codes Securely

**Best Storage Methods:**

| Method | Security | Accessibility | Recommended |
|--------|----------|----------------|------------|
| **Printed paper in safe** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ✅ Best |
| **1Password/Bitwarden** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ Good |
| **Bank safe deposit box** | ⭐⭐⭐⭐⭐ | ⭐ | ✅ For critical |
| **Encrypted USB drive** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ Good |
| **Email** | ⭐⭐ | ⭐⭐⭐⭐ | ❌ Avoid |
| **Notes app/phone** | ⭐⭐ | ⭐⭐⭐⭐ | ❌ Avoid |

### Using a Backup Code

**Login with Backup Code:**

```
1. Go to Authn login page
2. Enter email and password
3. When prompted for 2FA code
4. Enter backup code: ABCD-1234
5. Login successful ✓
6. Backup code is marked as used
```

**API Call:**
```bash
POST /api/auth/verify-2fa
{
  "userId": "user-id",
  "token": "ABCD-1234"
}
```

### Backup Code Management

**View Unused Codes:**
```bash
GET /api/users/2fa/backup-codes
Authorization: Bearer {token}

Response:
{
  "totalCodes": 8,
  "usedCodes": 2,
  "remainingCodes": 6,
  "codes": [
    { "code": "ABCD-1234", "used": true, "usedAt": "2025-11-01" },
    { "code": "EFGH-5678", "used": false },
    ...
  ]
}
```

**Check Remaining Codes:**
- Dashboard shows count (e.g., "6 backup codes remaining")
- Warning shown when fewer than 3 codes left
- Regenerate codes when running low

### Regenerating Backup Codes

**When to Regenerate:**
- After using several codes
- If codes were compromised
- Periodic refresh (annually)
- If account had suspicious activity

**How to Regenerate:**
```bash
POST /api/users/2fa/backup-codes/regenerate
Authorization: Bearer {token}

{
  "password": "YourPassword123"  # Password confirmation
}

Response:
{
  "success": true,
  "backupCodes": ["IJKL-9012", "MNOP-3456", ...],
  "regeneratedAt": "2025-11-07T10:30:00Z"
}
```

**Important Notes:**
- ⚠️ Old codes become invalid after regeneration
- ⚠️ You MUST save new codes immediately
- ⚠️ Store in same secure location as before
- ✅ Previous uses are logged in audit trail

### Backup Code Security Best Practices

✅ **Do:**
- Store in secure location (password manager or safe)
- Create backup of backup codes
- Regenerate annually
- Treat like your password
- Use when needed without hesitation

❌ **Don't:**
- Share with anyone
- Store in email or cloud notes
- Screenshot and save on phone
- Share via messaging apps
- Use for testing purposes

### Troubleshooting Backup Codes

**"Backup code already used" error:**
- Each code works only once
- Try next backup code
- If all used, regenerate new codes

**Lost all backup codes:**
1. Use password reset
2. Disable 2FA temporarily
3. Generate new codes
4. Re-enable 2FA

**Regenerate doesn't work:**
- Confirm correct password
- Check 2FA is enabled
- Contact support if persistent

</details>

<details>
<summary><strong>What is device fingerprinting?</strong></summary>

**Device Fingerprinting - Understanding Your Device ID:**

### What Is It?

Device fingerprinting creates a **unique identifier for each device/browser combination** by collecting multiple attributes:

```
┌─ Browser Information
│  ├─ Browser type: Chrome 119.0
│  ├─ Browser engine: Blink
│  └─ Browser version: 119.0.6045.199
├─ Operating System
│  ├─ OS type: Windows
│  ├─ OS version: 10
│  └─ OS architecture: x64
├─ Hardware Information
│  ├─ Screen resolution: 1920x1080
│  ├─ Color depth: 24-bit
│  ├─ Pixel ratio: 1
│  └─ Timezone: UTC+5
├─ Network Information
│  ├─ IP Address: 192.168.1.100
│  ├─ ISP: XYZ Internet
│  └─ Geolocation: Lahore, Pakistan
└─ Device Information
   ├─ Device type: Desktop
   ├─ Device brand: Dell
   └─ Device model: XPS 15
```

### How It Works

```
1. User logs in on new device
   ↓
2. Authn collects device attributes
   ↓
3. Creates SHA-256 hash of attributes
   ↓
4. Device ID = Unique fingerprint
   ↓
5. Stores device info in database
   ↓
6. On future logins, compares fingerprints
   ↓
7. If different: New device verification
   ↓
8. If same: Trusted device login
```

### Data Collected

| Category | Data Points | Example |
|----------|-------------|---------|
| **Browser** | Type, Version, Engine | Chrome 119.0, WebKit |
| **OS** | Type, Version, Architecture | Windows 10, x64 |
| **Screen** | Resolution, Color depth, Pixel ratio | 1920x1080, 24-bit |
| **Network** | IP Address, Geolocation | 192.168.1.100, Lahore |
| **Language** | Language, Timezone | en-US, UTC+5 |
| **Hardware** | RAM, CPU cores | 16GB, 8 cores |

### Device Fingerprinting Flow

**First Login on New Device:**
```
1. User enters email/password
   ↓
2. Credentials verified
   ↓
3. Device fingerprint created
   ↓
4. Device not in trusted list
   ↓
5. Email sent: "New device login detected"
   ↓
6. User clicks verification link in email
   ↓
7. Device marked as trusted
   ↓
8. Future logins skip verification
```

**Subsequent Logins:**
```
Login on SAME DEVICE:
1. Fingerprint matches ✓
2. Trusted device ✓
3. Login succeeds (normal speed)

Login on DIFFERENT DEVICE:
1. Fingerprint doesn't match ✗
2. New device detected
3. Email verification required
4. Wait for user verification
5. Device marked as trusted after verification
```

### Trusted Device Management

**View Trusted Devices:**
```bash
GET /api/users/devices
Authorization: Bearer {token}

Response:
{
  "devices": [
    {
      "id": "device-123",
      "name": "Chrome on Windows",
      "browser": "Chrome 119.0",
      "os": "Windows 10",
      "ipAddress": "192.168.1.100",
      "lastUsed": "2025-11-07T10:30:00Z",
      "createdAt": "2025-11-01T14:22:00Z",
      "location": "Lahore, Pakistan"
    }
  ],
  "maxTrustedDevices": 10,
  "totalDevices": 3
}
```

**Add to Trusted Devices:**
```
Automatic after email verification
Or manual via dashboard: "Mark as Trusted"
```

**Remove from Trusted Devices:**
```bash
DELETE /api/users/devices/:deviceId
Authorization: Bearer {token}
```

### Security Features

**Maximum Devices:** 10 trusted devices per user
**Device Verification:** 24-hour token expiry
**Auto Cleanup:** Unused devices removed after 90 days
**Anomaly Detection:** Suspicious logins blocked

### Privacy Considerations

✅ **Anonymous Collection:**
- No personal data collected
- Only technical fingerprint
- Geolocation approximate (city level)
- No tracking across websites

⚠️ **Data Storage:**
- Device info stored in database
- Encrypted at rest
- Deleted with account
- GDPR compliant

❌ **Not Collected:**
- Browsing history
- Installed applications
- Personal files
- Passwords or credentials

### Bypassing Device Verification

**If verification email lost:**
1. Try backup code
2. Perform password reset
3. Contact support for manual verification

**If locked out:**
1. Use 2FA backup code + password
2. Recovery email if configured
3. Account recovery process

### Disabling Device Verification

```bash
# Remove from trusted devices
DELETE /api/users/devices/:deviceId

# This will require verification on next login
```

### Best Practices

✅ **Secure Your Devices:**
- Enable device lock (PIN/fingerprint)
- Keep OS updated
- Install antivirus
- Don't share credentials

✅ **Manage Devices:**
- Regularly review trusted devices
- Remove old devices
- Remove devices you sold/gifted
- Check email notifications

✅ **Account Security:**
- Use strong password
- Enable 2FA
- Monitor active sessions
- Review audit logs

</details>

<details>
<summary><strong>How does account lockout work?</strong></summary>

**Account Lockout - Protection Against Brute Force:**

### What Triggers Lockout?

**Failed Login Attempts:**
```
Attempt 1-9: Normal login (account active)
Attempt 10: ACCOUNT LOCKED for 30 minutes
```

**Email notification sent:**
> Your account has been locked due to multiple failed login attempts.
> If this wasn't you, please change your password immediately.

### Progressive Delay System

**Authn implements progressive delays:**

```
Attempt 1: Immediate
Attempt 2: 1 second delay
Attempt 3: 2 second delay
Attempt 4: 4 second delay
Attempt 5: 8 second delay
Attempt 6: 16 second delay
Attempt 7: 32 second delay
Attempt 8: 64 second delay
Attempt 9: 128 second delay
Attempt 10: LOCKED for 30 minutes
```

### Lockout Configuration

**Default Settings (configurable):**
```env
# In .env
ACCOUNT_LOCKOUT_ATTEMPTS=10          # Failed attempts before lock
ACCOUNT_LOCKOUT_DURATION_MS=1800000  # 30 minutes in milliseconds
ACCOUNT_LOCKOUT_RESET_TIME_MS=3600000  # Reset after 1 hour
```

### Automatic Unlock

**Account unlocks after 30 minutes:**
```
Locked at: 2:00 PM
Automatically unlocked: 2:30 PM
User can login again: 2:31 PM
```

**Counts reset after 1 hour of no attempts:**
```
Failed attempts: 10 (locked)
Wait 30 minutes → Account unlocks
Wait 30 more minutes (total 60 min) → Attempt count resets
Next failure starts at attempt 1
```

### Manual Unlock Options

**Option 1: Password Reset**
```bash
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}
```
- Email sent with reset link
- After reset, account unlocked
- Must set new password

**Option 2: Wait 30 Minutes**
- Automatic unlock
- Account remains accessible

**Option 3: Contact Support**
- Manual account unlock
- Identity verification required
- Available 24/7

### 2FA Lockout (Separate)

**Distinct from account lockout:**
```
2FA Attempt 1-4: Normal (can retry)
2FA Attempt 5: 2FA DISABLED for 15 minutes
```

**2FA Recovery:**
```
Locked out of 2FA: 2:00 PM
Wait 15 minutes
Re-enabled: 2:15 PM
Can verify again: 2:16 PM

OR use backup code immediately
```

### Security Notifications

**Email on Account Lockout:**
```
Subject: Your account has been locked

Your account (user@example.com) has been locked due to
multiple failed login attempts.

Lock Details:
- Failed attempts: 10
- Locked at: Nov 7, 2025, 2:00 PM
- Unlock time: Nov 7, 2025, 2:30 PM
- Your IP: 192.168.1.100

Actions:
1. If this was you, wait 30 minutes or reset password
2. If NOT you, change password immediately
3. Review "Audit Logs" for suspicious activity

Reset Password: [link]
```

### Viewing Lock Status

```bash
GET /api/users/profile
Authorization: Bearer {token}

Response includes:
{
  "isLocked": true,
  "accountLockedUntil": "2025-11-07T14:30:00Z",
  "failedAttempts": 10,
  "lastFailedAttempt": "2025-11-07T14:00:00Z"
}
```

### Audit Log Example

```
Event: Failed Login Attempt
Timestamp: Nov 7, 2025, 2:00 PM UTC+5
IP Address: 192.168.1.100
Device: Chrome on Windows
Status: ACCOUNT LOCKED (10/10 attempts)
```

### Prevention Strategies

✅ **For Users:**
- Use strong, unique password
- Save password in manager
- Enable 2FA for extra security
- Review active sessions regularly
- Check audit logs for suspicious activity

✅ **For Developers:**
- Implement rate limiting
- Use CAPTCHA after 3 failed attempts
- Monitor IP addresses
- Flag rapid password attempts
- Notify users of suspicious activity

### Bypassing Lockout Safely

**If locked out legitimately:**
1. Use password reset (fastest)
2. Click link in reset email
3. Set new password
4. Account automatically unlocked
5. Login with new password

**If account compromised:**
1. Use backup device to reset password
2. Change password to unique value
3. Enable 2FA if not active
4. Review active sessions
5. Remove untrusted devices
6. Check audit logs for unauthorized access

### Common Scenarios

**Scenario 1: Typo in Password**
```
User enters wrong password 10 times
Account locked
User realizes typo
Uses password reset to recover
Account unlocked in 5 minutes
```

**Scenario 2: Account Under Attack**
```
Attacker attempts login 10 times
Account locked for 30 minutes
Email notification to user
User sees suspicious activity in audit logs
User changes password
Attacker cannot proceed
```

**Scenario 3: Shared Device**
```
Family member enters wrong password
Tries multiple times (9 attempts max)
Account warns: "1 more attempt to lockout"
Family member enters correct password
No lockout occurs
Account stays accessible
```

### Reporting Lock Issues

**If experiencing repeated lockouts:**
1. Check if someone has your password
2. Change password to strong, unique value
3. Enable 2FA for protection
4. Review audit logs
5. Remove unrecognized devices
6. Contact support if persist

</details>

---

## 👤 User Management

<details>
<summary><strong>How do I register a new user?</strong></summary>

**User Registration Process:**

### Web Registration (Easiest)

1. **Go to Registration Page**
   - Visit: `http://localhost:5000/auth`
   - Click "Sign Up"

2. **Fill Registration Form**
   ```
   First Name:    John
   Last Name:     Doe
   Username:      johndoe
   Email:         john@example.com
   Password:      SecurePass123!
   Confirm Pass:  SecurePass123!
   ```

3. **Accept Terms**
   - Check "I agree to Terms of Service"
   - Check "I agree to Privacy Policy"

4. **Submit**
   - Click "Sign Up" button
   - Account created immediately
   - Verification email sent

5. **Verify Email**
   - Check email for verification code
   - 6-digit code (10-minute expiry)
   - Click link or enter code
   - Email verified ✓

### API Registration

**Register via API Call:**

```bash
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2025-11-07T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requiresEmailVerification": true
}
```

### JavaScript/Frontend Example

```javascript
async function registerUser() {
  const formData = {
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    username: document.getElementById('username').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  };

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (response.ok) {
      alert('Registration successful! Check email to verify.');
      localStorage.setItem('token', data.token);
      window.location.href = '/verify-email';
    } else {
      alert('Error: ' + data.message);
    }
  } catch (error) {
    console.error('Registration failed:', error);
  }
}
```

### Field Requirements

| Field | Requirements | Example |
|-------|--------------|---------|
| **First Name** | 1-50 characters | John |
| **Last Name** | 1-50 characters | Doe |
| **Username** | 3-30 chars, alphanumeric+underscore | john_doe |
| **Email** | Valid email format, unique | john@example.com |
| **Password** | Min 8 chars, uppercase, lowercase, number, special | Pass@123 |

### Username Rules
- Minimum 3 characters
- Maximum 30 characters
- Alphanumeric (a-z, A-Z, 0-9)
- Underscore (_) allowed
- Hyphen (-) allowed
- Must be unique
- Case-insensitive (JohnDoe = johndoe)

### Email Verification After Registration

```bash
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "ABC123"
}
```

**Resend Verification Code:**
```bash
POST /api/auth/resend-verification
{
  "email": "john@example.com"
}
```

### Social Registration

**Register with Google:**

1. Click "Sign in with Google"
2. Select Google account
3. Account created automatically
4. Email auto-verified
5. Profile picture imported

```javascript
// Using Google Sign-In button
function onSignIn(googleUser) {
  const profile = googleUser.getBasicProfile();
  
  fetch('/api/auth/social/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: googleUser.getAuthResponse().id_token
    })
  }).then(res => res.json())
    .then(data => {
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    });
}
```

### Registration Validation

**Real-time validation during registration:**

```javascript
// Username check
- At least 3 characters ✓
- Not already taken ✓

// Email validation  
- Valid format ✓
- Not already registered ✓

// Password strength
- At least 8 characters ✓
- Contains uppercase ✓
- Contains lowercase ✓
- Contains number ✓
- Contains special char ✓
```

### Common Registration Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Username taken | Username already exists | Choose different username |
| Email exists | Email already registered | Use different email or login |
| Invalid email | Email format wrong | Correct email format |
| Password too weak | Doesn't meet requirements | Use stronger password |
| Rate limited | Too many attempts | Wait 15 minutes try again |

### After Registration

✅ **Next Steps:**
1. Verify email (check inbox)
2. Complete profile (add avatar, bio)
3. Enable 2FA (Settings → Security)
4. Review privacy settings
5. Bookmark login page

✅ **Welcome Email Includes:**
- Account confirmation
- Email verification link
- Password reset link
- Security recommendations
- Support contact

</details>

<details>
<summary><strong>How do I verify email addresses?</strong></summary>

**Email Verification Process:**

### Why Verify Email?

✅ **Security Benefits:**
- Prevents fake email usage
- Confirms email ownership
- Required for password reset
- Blocks spam signups

### Automatic Verification During Registration

**Email sent immediately after signup:**

```
From: Authn <noreply@authn.io>
Subject: Verify Your Email Address

Dear John,

Welcome to Authn! Please verify your email address to complete 
your registration.

Verification Code: ABC123
(Valid for 10 minutes)

Or click link: https://authn.io/verify?token=xyz123...
```

### Verification Code Method

**1. Receive 6-digit code in email:**
```
Your verification code: ABC123
Expires: Nov 7, 2025, 10:40 AM (10 minutes)
```

**2. Enter code on verification page:**
```
┌─────────────────────────────┐
│ Verify Your Email Address   │
├─────────────────────────────┤
│ Enter 6-digit code:         │
│ [A][B][C][1][2][3]         │
│                             │
│ [Verify]                    │
│ [Resend Code]              │
└─────────────────────────────┘
```

**3. API verification call:**
```bash
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": {
    "email": "john@example.com",
    "emailVerified": true,
    "emailVerifiedAt": "2025-11-07T10:35:00Z"
  }
}
```

### Verification Link Method

**Click link in email:**
```
https://authn.io/verify?token=eyJhbGciOiJIUzI1NiIs...

Link expires: 10 minutes after email sent
One-time use only
```

### Resending Verification Code

**If code not received:**

```bash
POST /api/auth/resend-verification
{
  "email": "john@example.com"
}
```

**Rate Limits:**
- Max 3 resends per 15 minutes
- New code sent to email
- Previous code invalidated
- Always use latest code

### Verification Status

**Check if email verified:**

```bash
GET /api/users/profile
Authorization: Bearer {token}

Response:
{
  "email": "john@example.com",
  "emailVerified": true,
  "emailVerifiedAt": "2025-11-07T10:35:00Z"
}
```

### Unverified Account Limitations

**Before email verification:**
- Can login with account
- Limited feature access
- Cannot initiate password reset
- May see verification reminder

**After email verification:**
- Full feature access
- Can reset password
- Can use all services
- Enhanced security

### Email Change & Reverification

**Change email address:**

```bash
PUT /api/users/profile
Authorization: Bearer {token}

{
  "email": "newemail@example.com"
}
```

**Process:**
1. New email received
2. Verification code sent to new email
3. Enter code to confirm change
4. Previous email still active during verification
5. After verification, email updated

### Verification Troubleshooting

**Email not received:**
1. Check spam/junk folder
2. Check email address for typos
3. Request code resend
4. Check password change email folder
5. Whitelist authn.io domain

**Code expired:**
- Valid for 10 minutes only
- Request new code (resend button)
- Link in email stays valid for 10 min

**Wrong code entered:**
- Max 5 attempts per code
- After 5 attempts, request new code
- 1-minute wait between attempts

**Account without verified email:**
- Still can login
- See verification reminder
- Request new code anytime
- Click "Resend Code" in settings

### Verification Email Content

```html
From: Authn Support <noreply@authn.io>
To: john@example.com
Subject: Verify Your Email Address

---

Hi John,

Thank you for signing up with Authn!

Please verify your email address by entering this code:

  ABC123

This code expires in 10 minutes.

Alternatively, click here to verify:
https://authn.io/verify?token=...

If you didn't create an account, you can safely ignore 
this email.

---
Authn Support Team
```

### Best Practices

✅ **For Users:**
- Verify email immediately
- Use current, active email
- Check spam folder if not received
- Don't share verification codes
- Update email if it changes

✅ **For Developers:**
- Require email verification
- Set reasonable code expiry (10 min)
- Rate limit resend attempts
- Log verification events
- Notify of email changes

</details>

---

## 📱 Sessions & Devices

<details>
<summary><strong>How does session management work?</strong></summary>

**Session Management System:**

### What Is a Session?

A **session** represents an authenticated login on a specific device. Each session has:
- **Session ID** - Unique identifier
- **User ID** - Associated user
- **Device info** - Browser, OS, IP
- **Created date** - Login timestamp
- **Last activity** - Most recent action
- **Expiration** - Auto-logout time

### Session Flow

```
1. User enters email/password
   ↓
2. Server creates JWT token
   ↓
3. Server creates session record
   ↓
4. Session ID embedded in token
   ↓
5. Client stores token
   ↓
6. On each request, token sent
   ↓
7. Server verifies token + session
   ↓
8. If valid, request processed
   ↓
9. Last activity timestamp updated
   ↓
10. On logout, session deleted
```

### Session Configuration

```env
# .env
JWT_EXPIRES_IN=7d           # Token expiry
SESSION_TIMEOUT_MS=604800000 # 7 days
REMEMBER_ME_TIMEOUT=30d     # Remember Me duration
MAX_CONCURRENT_SESSIONS=5   # Per user
```

### Multiple Concurrent Sessions

**Authn allows up to 5 simultaneous sessions:**

```
Device 1 (Home):    Session active
Device 2 (Office):  Session active
Device 3 (Phone):   Session active
Device 4 (Tablet):  Session active
Device 5 (Laptop):  Session active

Device 6 attempt:   ERROR - Max sessions reached
                    Must logout on another device first
```

### Getting Active Sessions

```bash
GET /api/users/sessions
Authorization: Bearer {token}

Response:
{
  "sessions": [
    {
      "id": "session-123",
      "device": {
        "browser": "Chrome 119.0",
        "os": "Windows 10",
        "ip": "192.168.1.100",
        "location": "Lahore, Pakistan"
      },
      "createdAt": "2025-11-07T10:00:00Z",
      "lastActivityAt": "2025-11-07T14:30:00Z",
      "expiresAt": "2025-11-14T10:00:00Z",
      "isCurrent": true  # Your current session
    },
    {
      "id": "session-456",
      "device": {
        "browser": "Safari 17.0",
        "os": "iOS 17",
        "ip": "203.0.113.45",
        "location": "Karachi, Pakistan"
      },
      "createdAt": "2025-11-05T08:00:00Z",
      "lastActivityAt": "2025-11-06T12:00:00Z",
      "expiresAt": "2025-11-12T08:00:00Z",
      "isCurrent": false
    }
  ],
  "totalSessions": 2
}
```

### Session Timeout

**Automatic Logout After Inactivity:**

```
Session created: 2:00 PM
Last activity: 3:30 PM
5 days pass (no activity)
Session expires: 2:00 PM (7 days later)
Next request: UNAUTHORIZED
User must login again
```

**Remember Me Feature:**

```
Normal session: 7 days
Remember Me: 30 days
Lasts longer but still expires
```

### Revoking Individual Sessions

**Logout from specific device:**

```bash
DELETE /api/users/sessions/:sessionId
Authorization: Bearer {token}
```

**Example: Remove session from iPhone**

```
1. View active sessions
2. See iPhone session (ID: session-456)
3. Click "Logout" next to iPhone
4. Session deleted
5. iPhone app shows "Login Required"
6. iPhone user must login again
```

### Logout from All Devices

**Logout everywhere (strong security measure):**

```bash
POST /api/users/sessions/revoke-all
Authorization: Bearer {token}

{
  "reason": "Suspicious activity detected"
}
```

**Effect:**
- All other sessions terminated
- Current session stays active
- User logged out everywhere except current device
- Email notification sent
- Useful after password change

### Session Security Features

**Automatic Session Termination:**

```
When these events happen, all sessions terminate:
- Password changed
- 2FA disabled/enabled
- Email address changed
- Account lockout
- Security alert triggered
```

**Session Validation:**

```
Each request verifies:
✓ Token signature valid
✓ Token not expired
✓ Session still exists
✓ User still active
✓ Device unchanged (fingerprint)
```

### Session Activity Tracking

**Last Activity Updates:**

```
- Page view: 🔄 Updated
- API call: 🔄 Updated
- Profile view: 🔄 Updated
- Background sync: ❌ Not updated

Prevents premature timeout during active use
```

### Session Audit Log

```bash
GET /api/users/audit-logs?type=session

Response:
[
  {
    "type": "session_created",
    "timestamp": "2025-11-07T10:00:00Z",
    "device": "Chrome on Windows",
    "ip": "192.168.1.100"
  },
  {
    "type": "session_terminated",
    "timestamp": "2025-11-07T18:00:00Z",
    "reason": "manual_logout",
    "device": "Chrome on Windows"
  }
]
```

### Cross-Session Invalidation

**When one session affects others:**

```
Scenario: User changes password on Device 1

Device 1: Can stay logged in
Device 2: Automatically logged out
Device 3: Automatically logged out
Device 4: Automatically logged out
Device 5: Automatically logged out

User must login again on Devices 2-5
```

### Session Management Best Practices

✅ **For Users:**
- Regularly review active sessions
- Logout from unknown devices
- Check "Logout from all devices" after password change
- Use "Remember Me" only on trusted devices
- Monitor session activity

✅ **For Developers:**
- Set reasonable session timeouts
- Implement activity-based renewal
- Provide logout all function
- Log session events
- Detect suspicious sessions

### Troubleshooting Sessions

**"Session expired" error:**
- Your token expired after 7 days
- Login again to create new session
- Use "Remember Me" for 30-day sessions

**Multiple sessions not working:**
- Max 5 concurrent sessions reached
- Logout from one device
- Try login on new device again

**Session terminated unexpectedly:**
- Password changed on another device
- Admin revoked session
- Account security event triggered
- Session timeout reached

</details>

---

<details>
<summary><strong>How many concurrent sessions are allowed?</strong></summary>

**Concurrent Session Limits:**

### Session Limit: 5 per User

**Authn allows maximum 5 simultaneous sessions per user:**

```
Session Limit: 5
Devices you can use simultaneously: 5
```

### Example Scenario

**Company: Acme Corp - Employee with 5 Devices**

```
Device 1 (Desktop at work)     → Session 1 ✓ Active
Device 2 (Laptop)              → Session 2 ✓ Active  
Device 3 (iPhone)              → Session 3 ✓ Active
Device 4 (iPad)                → Session 4 ✓ Active
Device 5 (Work Laptop #2)      → Session 5 ✓ Active

Attempting login on Device 6 (Personal Laptop)
                              → ERROR ❌ Session limit reached

Options:
1. Logout from one device
2. Logout from all devices, then login
3. Wait for session to expire (7 days)
```

### What Happens at Session Limit?

**When max sessions reached:**

```bash
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response (HTTP 429):
{
  "success": false,
  "error": "SESSION_LIMIT_EXCEEDED",
  "message": "Maximum 5 sessions reached. Please logout from another device.",
  "activeSessions": 5,
  "maxSessions": 5
}
```

### Managing Sessions at Limit

**Option 1: Remove Oldest Inactive Session**
```bash
GET /api/users/sessions
# Sort by lastActivityAt
# DELETE the oldest session

DELETE /api/users/sessions/session-old-123
```

**Option 2: Manual Logout**
```bash
# From another device
DELETE /api/users/sessions/session-456
# Triggers logout on that device
```

**Option 3: Logout from All Devices**
```bash
# WARNING: You'll be logged out everywhere
POST /api/users/sessions/revoke-all
# Then login on desired device
```

### Adjusting Session Limit

**Configuration in .env:**
```env
MAX_CONCURRENT_SESSIONS=5  # Default

# Possible values:
# 3 = Very restrictive (conservative)
# 5 = Standard (recommended)
# 10 = Generous (enterprise)
# 20 = Very permissive
```

**Recommendations by Use Case:**

| Use Case | Recommended | Reasoning |
|----------|-------------|-----------|
| **Personal app** | 3 | Typical user has <3 devices |
| **General app** | 5 | Desktop, laptop, phone, tablet, other |
| **Enterprise** | 10 | Multiple work devices |
| **Developer** | 10 | Dev machine, staging, production, personal |
| **Shared account** | 15+ | Multiple team members using same account |

### Session Limit Enforcement

**Soft vs Hard Limits:**

```
Current Mode: SOFT (recommended)
- New login exceeds limit
- Show: "Logout from another device?"
- User chooses which session to remove
- Graceful experience

Alternative Mode: HARD
- New login fails immediately
- User must manually logout first
- More secure but less convenient
```

### Per-Device Session Limit

**Also enforces per-device limits:**
```
Same device reopens app: ✓ Reuses session (no new session)
Same device, different browser: × Creates new session
Same device, private/incognito: × Creates new session
```

### Session Limit Bypass

**No automatic bypass, but:**

```
Admin override: Can increase limit for specific user
Emergency access: Contact support for manual session reset
Security event: Admin can revoke all sessions
```

### Monitoring Session Count

**Check current sessions:**

```bash
GET /api/users/sessions
Authorization: Bearer {token}

Shows:
- Total active sessions: 5
- Session list with devices
- Last activity time for each
```

### Handling Session Limit Errors

**In Application Code:**

```javascript
async function login(email, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.status === 429) {
      const data = await response.json();
      if (data.error === 'SESSION_LIMIT_EXCEEDED') {
        showDialog("You're logged in on 5 devices. " +
                   "Logout from one?", [
          { text: 'View Sessions', action: viewSessions },
          { text: 'Retry', action: () => login(email, password) }
        ]);
      }
      return;
    }

    const token = await response.json();
    storeToken(token);
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

### Session Cleanup

**Old sessions auto-cleanup:**
```
Default retention: 30 days after expiry
Auto-deleted: Yes
Manual cleanup: Can delete anytime
Backup before delete: User data preserved
```

### Best Practices

✅ **For Users:**
- Check active sessions regularly
- Logout from devices you no longer use
- Use "Logout from all" when changing passwords
- Monitor unexpected new sessions

✅ **For Developers:**
- Set appropriate limit for user base
- Provide clear session management UI
- Notify users of new sessions
- Implement emergency override
- Log session limit hits

</details>

---

## 🔌 API & Integration

<details>
<summary><strong>What is the API base URL?</strong></summary>

**API Endpoint Configuration:**

### Development Environment

```
Base URL: http://localhost:5000
API Base: http://localhost:5000/api
Health Check: http://localhost:5000/health
```

### Production Environment

```
Base URL: https://api.yourdomain.com
API Base: https://api.yourdomain.com/api
Health Check: https://api.yourdomain.com/health
```

### Configuration

**In .env file:**
```env
# Server
PORT=5000
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Production
NODE_ENV=production
BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

### API Endpoints Overview

**Authentication:**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/verify-email
POST   /api/auth/resend-verification
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/verify-2fa
```

**User Management:**
```
GET    /api/users/profile
PUT    /api/users/profile
POST   /api/users/avatar
POST   /api/users/change-password
DELETE /api/users/delete
```

**2FA:**
```
POST   /api/users/2fa/setup
POST   /api/users/2fa/enable
POST   /api/users/2fa/disable
GET    /api/users/2fa/backup-codes
POST   /api/users/2fa/backup-codes/regenerate
```

**Sessions:**
```
GET    /api/users/sessions
DELETE /api/users/sessions/:sessionId
POST   /api/users/sessions/revoke-all
```

**Devices:**
```
GET    /api/users/devices
DELETE /api/users/devices/:deviceId
POST   /api/users/devices/:deviceId/verify
```

### Example API Calls

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "password": "SecurePass123!"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "johndoe",
    "password": "SecurePass123!"
  }'
```

**Get Profile (Authenticated):**
```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Rate Limiting Headers

**Responses include rate limit info:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699343640
```

### CORS Configuration

**Allowed Origins:**
```env
CORS_ORIGINS=http://localhost:3000,https://app.yourdomain.com
```

**Requests from other origins:**
```javascript
// Frontend
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:3000'
  },
  body: JSON.stringify({ ... })
});
```

### Response Format

**All responses follow ApiResponse structure:**

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "statusCode": 200
}
```

</details>

---

## 🚀 Deployment & Production

<details>
<summary><strong>What deployment options are available?</strong></summary>

**Multiple Deployment Strategies:**

### 1. Docker (Recommended)

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  authn:
    image: authn:latest
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGO_URL=mongodb://mongo:27017/authn
      - JWT_SECRET=your-secret-key
    depends_on:
      - mongo
    restart: always

  mongo:
    image: mongo:6.0
    volumes:
      - mongo_data:/data/db
    restart: always

volumes:
  mongo_data:
```

**Deploy:**
```bash
docker-compose up -d
```

### 2. Cloud Platforms

**Heroku:**
```bash
# Login
heroku login

# Create app
heroku create authn-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
# ... set all required vars

# Deploy
git push heroku main
```

**AWS (EC2):**
```bash
# Create EC2 instance
# SSH into instance
ssh -i key.pem ubuntu@instance-ip

# Install Node.js
sudo apt update
sudo apt install nodejs npm

# Clone repo
git clone https://github.com/hanan-bhatti/authn.git
cd authn

# Install dependencies
npm install --production

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name authn
pm2 save
pm2 startup
```

**Google Cloud Run:**
```bash
# Build image
docker build -t gcr.io/PROJECT_ID/authn .

# Push to registry
docker push gcr.io/PROJECT_ID/authn

# Deploy
gcloud run deploy authn \
  --image gcr.io/PROJECT_ID/authn \
  --platform managed \
  --region us-central1 \
  --set-env-vars NODE_ENV=production,JWT_SECRET=xxx
```

**Azure App Service:**
```bash
# Login
az login

# Create resource group
az group create -n authn-rg -l eastus

# Create App Service
az appservice plan create -n authn-plan -g authn-rg --sku F1

# Deploy
az webapp create -n authn-app -g authn-rg -p authn-plan
```

### 3. VPS/Self-Hosted

**DigitalOcean / Linode / Vultr:**

```bash
# 1. Create Droplet/Linode
# 2. SSH into server
ssh root@SERVER_IP

# 3. Update system
apt update && apt upgrade -y

# 4. Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# 5. Clone repository
git clone https://github.com/hanan-bhatti/authn.git
cd authn

# 6. Install dependencies
npm install --production

# 7. Setup PM2
npm install -g pm2
pm2 start server.js --name authn
pm2 save
pm2 startup
pm2 save

# 8. Setup Nginx reverse proxy
# (see Nginx section below)
```

### 4. PM2 (Process Manager)

```bash
# Install globally
npm install -g pm2

# Start application
pm2 start server.js --name authn

# View status
pm2 status

# View logs
pm2 logs authn

# Restart
pm2 restart authn

# Stop
pm2 stop authn

# Delete
pm2 delete authn

# Startup on reboot
pm2 startup
pm2 save
```

### 5. Nginx Reverse Proxy

**Configuration:**
```nginx
upstream authn {
  server 127.0.0.1:5000;
}

server {
  listen 80;
  server_name api.yourdomain.com;
  
  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

  client_max_body_size 10M;

  location / {
    proxy_pass http://authn;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 90;
  }
}
```

### 6. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Generate certificate
certbot certonly --standalone -d api.yourdomain.com

# Auto-renew
certbot renew --dry-run
# Already automated with systemd timer
```

### Deployment Checklist

✅ **Pre-deployment:**
- [ ] Node.js 16+ installed
- [ ] MongoDB configured
- [ ] .env file set up
- [ ] Database migrations run
- [ ] Tests passed locally
- [ ] Build process successful

✅ **Production Ready:**
- [ ] NODE_ENV=production
- [ ] Strong JWT_SECRET
- [ ] HTTPS enabled
- [ ] Firewall configured
- [ ] Backups scheduled
- [ ] Monitoring set up
- [ ] Error logging enabled

✅ **Post-deployment:**
- [ ] Health check passes
- [ ] API endpoints respond
- [ ] Database connection works
- [ ] Email sending works
- [ ] SSL certificate valid
- [ ] Rate limiting active
- [ ] Logging functional

</details>

---

## 🔧 Troubleshooting

<details>
<summary><strong>MongoDB connection errors</strong></summary>

**Common MongoDB Connection Issues and Solutions:**

### Error: "connect ECONNREFUSED 127.0.0.1:27017"

**Cause:** MongoDB not running locally

**Solutions:**
```bash
# 1. Start MongoDB (Linux/Mac)
mongod

# 2. Start MongoDB (Windows)
# Run as Administrator
"C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"

# 3. Check if MongoDB is running
netstat -an | grep 27017  # Linux/Mac
netstat -an | findstr 27017  # Windows

# 4. Start MongoDB as service (Linux)
sudo systemctl start mongod
sudo systemctl status mongod

# 5. Start MongoDB as service (Windows)
net start MongoDB
```

### Error: "getaddrinfo ENOTFOUND MongoDB_hostname"

**Cause:** Wrong MongoDB hostname/connection string

**Solution:**
```env
# Check your MONGO_URL in .env
# Correct format:
MONGO_URL=mongodb://localhost:27017/authn

# For MongoDB Atlas:
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/database

# Test connection:
mongosh "mongodb://localhost:27017/authn"
```

### Error: "Authentication failed" (MongoDB Atlas)

**Cause:** Wrong username/password in connection string

**Solution:**
```bash
# 1. Reset password in MongoDB Atlas console
# 2. Copy new connection string
# 3. Update .env with correct password
# 4. Special characters in password need URL encoding

# Example:
# Password: p@ss%word123
# Encoded:  p%40ss%25word123

MONGO_URL=mongodb+srv://user:p%40ss%25word123@cluster.mongodb.net/authn
```

### Error: "MongooseError: Server selection timed out"

**Cause:** Network connectivity issue

**Solutions:**
```bash
# 1. Check internet connection
ping 8.8.8.8

# 2. Whitelist IP in MongoDB Atlas
# Atlas → Security → IP Whitelist
# Add your current IP or 0.0.0.0/0

# 3. Check firewall
# Ensure port 27017 open for MongoDB
# Ensure 27017 not blocked by ISP

# 4. Increase timeout
MONGO_CONNECT_TIMEOUT=10000

# 5. Test connection directly
mongosh "mongodb://localhost:27017/authn"
```

### Error: "database error: command drop requires authentication"

**Cause:** No authentication credentials

**Solution:**
```env
# Add authentication to connection string
MONGO_URL=mongodb://username:password@localhost:27017/authn?authSource=admin

# For MongoDB Atlas (already includes auth):
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/authn
```

### Error: "E11000 duplicate key error"

**Cause:** Duplicate unique field (usually email/username)

**Solution:**
```bash
# 1. Clear duplicate collections during development
mongosh
use authn
db.users.deleteMany({})

# 2. In production, fix records:
db.users.updateMany({email: 'duplicate@example.com'}, {$set: {email: 'unique@example.com'}})

# 3. Rebuild indexes:
db.users.reIndex()
```

### Error: "Connection pool is closed"

**Cause:** Node.js process disconnected from MongoDB

**Solution:**
```javascript
// Add connection retry logic
const mongoUrl = process.env.MONGO_URL;
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true
};

mongoose.connect(mongoUrl, options);
```

### Debugging MongoDB Connection

```bash
# Enable debug logging
DEBUG=mongoose:* npm start

# Check MongoDB logs
mongod --logpath /var/log/mongodb/mongod.log

# Monitor connection pool
mongo
db.serverStatus().connections

# Test with mongosh
mongosh "mongodb://localhost:27017/authn"
show dbs
use authn
db.users.findOne()
```

</details>

<details>
<summary><strong>Email not sending</strong></summary>

**Email Delivery Issues and Solutions:**

### Error: "Invalid credentials"

**Cause:** Wrong email/password in SMTP config

**Solution (Gmail):**
```env
# 1. Enable "Less secure app access" OR use App Password
# 2. Generate App Password:
# Gmail Settings → Security → App Passwords
# 3. Use in .env:
SMTP_USER=your-email@gmail.com
SMTP_PASS=generated-app-password  # Not your Gmail password!
```

### Error: "Connection timeout" / "getaddrinfo ENOTFOUND smtp.gmail.com"

**Cause:** Network issue or firewall blocking SMTP port

**Solution:**
```env
# Test SMTP connection
telnet smtp.gmail.com 587

# If connection refused:
# 1. Check firewall settings
# 2. Contact ISP if port 587 blocked
# 3. Try alternative SMTP provider

# Alternative SMTP providers:
# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key

# Mailgun
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-password

# AWS SES
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-username
SMTP_PASS=your-ses-password
```

### Error: "User not registered" / "Login credentials invalid"

**Cause:** SMTP authentication failed

**Solution:**
```bash
# 1. Verify credentials:
mongosh
use authn
db.settings.findOne()  # Check saved SMTP config

# 2. Test with Node.js:
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'app-password'
  }
});

transport.verify((error, success) => {
  if (error) console.log('Error:', error);
  else console.log('Success:', success);
});
```

### Emails Going to Spam

**Cause:** SPF/DKIM/DMARC records not configured

**Solution:**
```bash
# 1. Add SPF record to DNS:
yourdomain.com  TXT  "v=spf1 include:sendgrid.net ~all"

# 2. Add DKIM records:
# Get from email provider, add to DNS

# 3. Add DMARC record:
_dmarc.yourdomain.com  TXT  "v=DMARC1; p=none"

# 4. Allow extra time for DNS propagation (24-48 hours)

# 5. Test SPF/DKIM:
# Use mxtoolbox.com to verify records
```

### Email Not Received at All

**Cause:** Email service issue or wrong recipient

**Solution:**
```javascript
// Add email logging
console.log('Sending email to:', recipient);
console.log('Subject:', subject);
console.log('Transport:', transport.options);

// Check delivery receipt
// Gmail: Check "Sent" folder
// Outlook: Check "Sent Items"
// Spam: Check Spam/Junk folder

// Use different test email:
const testEmail = 'test-' + Date.now() + '@example.com';
```

### Rate Limiting (SendGrid, Mailgun)

**Cause:** Too many emails sent too fast

**Solution:**
```env
# Add email rate limiting
EMAIL_RATE_LIMIT=10  # 10 emails per hour per user
EMAIL_RATE_LIMIT_WINDOW=3600000  # 1 hour

# Or add delay between sends
await delay(1000);  // 1 second delay
sendEmail(...);
```

### Debugging Email Service

```bash
# Check Authn logs
npm start  # Look for email logs

# Test email endpoint
curl -X POST http://localhost:5000/api/test-email \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com"}'

# Check email service status
# SendGrid: https://status.sendgrid.com
# Gmail: https://www.google.com/appsstatus
# AWS SES: https://status.aws.amazon.com
```

</details>

---

## 🎓 Advanced Features

<details>
<summary><strong>How do I set up Google OAuth?</strong></summary>

**Step-by-step Google OAuth Setup:**

### Step 1: Create Google Cloud Project

1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a Project" → "NEW PROJECT"
3. Enter name: "Authn"
4. Click "CREATE"
5. Wait for creation to complete

### Step 2: Enable Google+ API

1. Search for "Google+ API"
2. Click on result
3. Click "ENABLE"
4. Wait for enablement

### Step 3: Create OAuth 2.0 Credentials

1. Go to "Credentials" in left sidebar
2. Click "CREATE CREDENTIALS" → "OAuth 2.0 Client ID"
3. Choose application type: "Web application"
4. Fill in:
   - Name: "Authn Web App"
   - Authorized origins: `http://localhost:5000`
   - Authorized redirect URIs: `http://localhost:5000/auth/callback`
5. Click "CREATE"
6. Download JSON (save as `google-credentials.json`)

### Step 4: Setup Firebase Project

1. Visit [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Enter name: "Authn"
4. Continue through setup
5. Go to "Project Settings" (gear icon)
6. Click "Service Accounts"
7. Click "Generate New Private Key"
8. Save as `firebase-key.json`

### Step 5: Configure Environment Variables

```env
# .env

# Firebase Configuration
FIREBASE_PRIVATE_KEY_ID=xxxx-from-json
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADA..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@project.iam.gserviceaccount.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_ID=xxxx.apps.googleusercontent.com
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
```

### Step 6: Frontend Setup

```html
<!-- In your HTML -->
<script src="https://accounts.google.com/gsi/client" async defer></script>

<div id="g_id_onload"
  data-client_id="YOUR_CLIENT_ID.apps.googleusercontent.com"
  data-callback="handleCredentialResponse">
</div>
<div class="g_id_signin" data-type="standard"></div>
```

```javascript
// JavaScript
function handleCredentialResponse(response) {
  // Send token to Authn backend
  fetch('/api/auth/social/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: response.credential
    })
  }).then(res => res.json())
    .then(data => {
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    });
}
```

### Step 7: Backend Implementation

```javascript
// In your Authn server

const admin = require('firebase-admin');

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(require('./firebase-key.json'))
});

// Verify Google token
async function verifyGoogleToken(idToken) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid Google token');
  }
}

// Login with Google
router.post('/auth/social/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    const decodedToken = await verifyGoogleToken(idToken);
    
    const { email, name, picture, uid } = decodedToken;
    
    // Find or create user
    let user = await User.findOne({
      $or: [
        { email },
        { 'socialAccounts.providerId': uid }
      ]
    });
    
    if (!user) {
      // Create new user
      user = new User({
        email,
        firstName: name.split(' ')[0],
        lastName: name.split(' ')[1] || '',
        avatar: picture,
        socialAccounts: [{
          provider: 'google',
          providerId: uid,
          email,
          name,
          picture
        }]
      });
    } else {
      // Link social account if not already linked
      if (!user.socialAccounts.find(acc => acc.providerId === uid)) {
        user.socialAccounts.push({
          provider: 'google',
          providerId: uid,
          email,
          name,
          picture
        });
      }
    }
    
    await user.save();
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Google authentication failed'
    });
  }
});
```

### Production Configuration

**Update environment for production:**

```env
# .env.production

# Change callback URL
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/auth/callback
FRONTEND_URL=https://app.yourdomain.com
```

### Testing Google OAuth

```bash
# 1. Local testing with ngrok
ngrok http 5000
# Gets URL like: https://abc123.ngrok.io

# 2. Update Google Console:
# Authorized origins: https://abc123.ngrok.io
# Redirect URI: https://abc123.ngrok.io/auth/callback

# 3. Test login flow
# Visit https://abc123.ngrok.io
# Click "Sign in with Google"
# Should work locally
```

### Troubleshooting

**"Invalid client ID":**
- Check Google Client ID matches
- Verify origin URL in Google Console

**"Token verification failed":**
- Check Firebase credentials
- Verify JWT_SECRET is set

**"Social account already linked":**
- User already has Google account linked
- Use "Link another account" feature

</details>

---

## 🤝 Contributing & Support

<details>
<summary><strong>How do I contribute to Authn?</strong></summary>

**Contributing to Authn - Welcome! 🎉**

### Getting Help

First time contributing? Check our [Contributing Guide](../CONTRIBUTING.md)

### Development Setup

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/authn.git
cd authn

# 3. Add upstream remote
git remote add upstream https://github.com/hanan-bhatti/authn.git

# 4. Install dependencies
npm install

# 5. Create .env file
cp .env.example .env
# Edit with your MongoDB, email config

# 6. Start development server
npm run dev
```

### Making Changes

```bash
# 1. Create feature branch
git checkout -b feature/my-amazing-feature

# 2. Make your changes
# Follow coding standards
# Add comments where needed
# Test your changes

# 3. Commit with conventional format
git commit -m "feat(auth): add magic link authentication"

# 4. Push to your fork
git push origin feature/my-amazing-feature

# 5. Create Pull Request on GitHub
```

### Types of Contributions

**🐛 Bug Reports:**
- Found a bug?
- Open an issue with reproduction steps
- Include environment details

**✨ Features:**
- Have a feature idea?
- Check if it's already planned in FEATURES.md
- Open feature request issue
- Discuss before coding

**📝 Documentation:**
- Fix typos
- Improve clarity
- Add examples
- Translate docs

**💻 Code:**
- Bug fixes
- Feature implementation
- Performance improvements
- Code refactoring

### Coding Standards

- Use meaningful variable names
- Add comments for complex logic
- Follow ESLint rules
- Write unit tests
- Update documentation

### Testing Your Changes

```bash
# Run tests
npm test

# Run linter
npm run lint

# Test manually
npm run dev
# Visit http://localhost:5000
```

### Pull Request Process

1. Update documentation
2. Follow commit message guidelines
3. Link related issues
4. Wait for code review
5. Address feedback
6. Get approval
7. Merge!

### Recognized Contributors

Contributors are recognized in:
- README.md Contributors section
- CHANGELOG.md
- Release notes

</details>

---

## 📞 Getting Help & Support

**Need Assistance?**

| Channel | Use For | Response Time |
|---------|---------|---|
| **Email** | Security issues, urgent matters | 24 hours |
| **GitHub Issues** | Bug reports, feature requests | 2-3 days |
| **GitHub Discussions** | Questions, ideas, general help | 1-2 days |
| **Documentation** | How-to guides, reference | Immediate |

**📧 Email:** [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com)  
**🔗 Repository:** [GitHub](https://github.com/hanan-bhatti/authn)

---

**Last Updated:** November 7, 2025  
**Version:** 1.0.0  
**Maintained by:** Abdul Hannan Bhatti
