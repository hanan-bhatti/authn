# Database Seeding Script

## Overview

The `seed.js` script populates your MongoDB database with comprehensive test users for development and testing purposes. It includes **15 diverse user accounts** covering all authentication states, security scenarios, and edge cases.

## Features

- Creates **15 test users** with complete, realistic profiles
- Includes **1 superadmin**, **1 admin**, and **13 regular users**
- Covers **all authentication states and security scenarios**:
  - ✅ Active accounts with verified emails
  - ⚠️ Unverified email accounts with active OTPs
  - 🔒 Locked accounts (failed login attempts & 2FA)
  - 🔐 Two-factor authentication (enabled/disabled/locked)
  - 📱 Multiple trusted devices and sessions
  - 🗑️ Soft-deleted accounts (anonymized)
  - ⏳ Pending deletion requests with backups
  - 🔄 Password reset tokens
  - 🌐 Social authentication (Google, Facebook)
  - 🔑 API key management
  - 📊 Complete analytics data
  - 🕐 Session history and device tracking
  - 🎨 Custom preferences and privacy settings

## Usage

### Run the seeder:

```bash
npm run seed
```

Or directly:

```bash
node scripts/seed.js
```

Or:

```bash
node seed.js
```

## Test Credentials

### 👑 Superadmin Account
- **Username:** `superadmin`
- **Email:** `superadmin@example.com`
- **Password:** `SuperAdmin123!`
- **Role:** superadmin
- **2FA:** ✅ Enabled
- **2FA Secret:** `LBSWY3DPEHPK3PXP`
- **Permissions:** Full system access (all permissions)
- **Backup Codes:** 4 available

### 🛡️ Admin Account
- **Username:** `sarah_admin`
- **Email:** `sarah.admin@example.com`
- **Password:** `AdminPass123!`
- **Role:** admin
- **2FA:** ✅ Enabled
- **2FA Secret:** `JBSWY3DPEHPK3PXP`
- **Permissions:** manage_users, view_analytics, manage_content, system_settings
- **Backup Codes:** 3 available

### 👤 Regular Active User
- **Username:** `johndoe`
- **Email:** `john.doe@example.com`
- **Password:** `Password123!`
- **Status:** ✅ Verified, Active
- **2FA:** ❌ Disabled
- **Sessions:** 1 active session (Chrome on Windows)
- **Trusted Devices:** 1 device
- **Login Count:** 45

### ⚠️ Unverified Email User
- **Username:** `alice_pending`
- **Email:** `alice.pending@example.com`
- **Password:** `Password123!`
- **Status:** ⚠️ Email not verified
- **Verification OTP:** `123456` (hashed in DB)
- **OTP Expires:** 10 minutes from seed time

### 🔒 Locked Account (Failed Login Attempts)
- **Username:** `bob_locked`
- **Email:** `bob.locked@example.com`
- **Password:** `Password123!`
- **Status:** 🔒 Account locked
- **Failed Attempts:** 10/10
- **Lock Reason:** too_many_failed_attempts
- **Locked Until:** ~25 minutes from seed time

### 🔄 Password Reset User
- **Username:** `charlie_reset`
- **Email:** `charlie.reset@example.com`
- **Password:** `Password123!`
- **Status:** ✅ Verified
- **Reset Token:** `reset_token_xyz` (hashed in DB)
- **Token Expires:** 30 minutes from seed time

### 🌐 Social Authentication User
- **Username:** `diana_social`
- **Email:** `diana.social@example.com`
- **Password:** None (social login only)
- **Providers:** ✅ Google, ✅ Facebook
- **Social Accounts:**
  - Google: `google_12345`
  - Facebook: `fb_67890`

### 📱 Pending Device Verification
- **Username:** `edward_device`
- **Email:** `edward.device@example.com`
- **Password:** `Password123!`
- **Status:** ✅ Verified
- **Trusted Devices:** 1 (iPhone 13)
- **Pending Device:** Chrome on Linux
- **Device Token:** `device_token_abc` (hashed in DB)
- **Token Expires:** 24 hours from seed time

### 🔑 API Keys User
- **Username:** `fiona_dev`
- **Email:** `fiona.dev@example.com`
- **Password:** `Password123!`
- **Status:** ✅ Verified
- **API Keys:**
  - ✅ Active: `ak_active_key_123` (Production API)
  - ❌ Inactive: `ak_inactive_key_456` (Testing API)

### 🗑️ Pending Deletion User
- **Username:** `george_deleting`
- **Email:** `george.deleting@example.com`
- **Password:** `Password123!`
- **Status:** ⏳ Deletion requested
- **Deletion Token:** `deletion_token_xyz` (hashed in DB)
- **Token Expires:** 23 hours from seed time
- **Backup:** ✅ Created
- **Reason:** user_request

### 💀 Soft-Deleted User (Anonymized)
- **Username:** `deleted_user_abc12345`
- **Email:** `deleted_abc12345@deleted.local`
- **Status:** 🗑️ Soft-deleted (15 days ago)
- **Original Email:** `original.user@example.com` (in audit logs)
- **Original Username:** `original_user` (in audit logs)
- **All Data:** Anonymized/cleared
- **Backup:** ✅ Created

### 📱 Multiple Sessions User
- **Username:** `hannah_multi`
- **Email:** `hannah.multi@example.com`
- **Password:** `Password123!`
- **Status:** ✅ Verified
- **Active Sessions:** 3
  - Chrome on macOS (Desktop)
  - Safari on iPhone (Mobile)
  - Chrome on iPad (Tablet)
- **Trusted Devices:** 3
- **Login Count:** 78

### 🔐 2FA Locked User
- **Username:** `ian_2fa`
- **Email:** `ian.2fa@example.com`
- **Password:** `Password123!`
- **Status:** ✅ Verified
- **2FA:** ✅ Enabled but 🔒 Locked
- **2FA Secret:** `KBSWY3DPEHPK3PXP`
- **Failed 2FA Attempts:** 5/5
- **Locked Until:** ~10 minutes from seed time
- **Backup Codes:** 2 available

### ⏱️ Temp Session User
- **Username:** `julia_temp`
- **Email:** `julia.temp@example.com`
- **Password:** `Password123!`
- **Status:** ✅ Verified
- **Temp Session:** Active (expires in ~3 minutes)
- **Remember Me:** ✅ Enabled
- **Theme:** Dark
- **Notifications:** Custom settings configured

### 🔐 Privacy-Focused User
- **Username:** `karen_privacy`
- **Email:** `karen.privacy@example.com`
- **Password:** `Password123!`
- **Phone:** `+923009876543` (verified)
- **Status:** ✅ Fully verified
- **Profile Visibility:** 🔒 Private
- **Location Sharing:** ❌ Disabled
- **Data Collection:**
  - Analytics: ❌ Disabled
  - Marketing: ❌ Disabled
  - Personalization: ❌ Disabled
- **All Tracking:** Opted out

## What Gets Created

### For Each User:

#### 🔐 Authentication & Security
- ✅ Bcrypt hashed passwords (12 rounds)
- ✅ Email verification status
- ✅ Phone verification (where applicable)
- ✅ Two-factor authentication setup (where enabled)
  - TOTP secret keys
  - 2-10 backup codes (hashed)
  - Failed attempt tracking
  - Lock status
- ✅ Password reset tokens (hashed)
- ✅ Account deletion tokens (hashed)
- ✅ Failed login attempt tracking
- ✅ Account lock status

#### 📱 Sessions & Devices
- ✅ Active sessions with:
  - Unique session IDs
  - Device information (fingerprint, name, browser, OS)
  - IP addresses and location data
  - Creation and expiration times
  - Last activity timestamps
- ✅ Trusted devices (1-3 per user)
- ✅ Pending device verifications
- ✅ Temporary sessions (remember me flow)

#### 👤 Profile & Preferences
- ✅ Complete profile information
  - First name, last name, username
  - Email, phone number
  - Date of birth, gender
  - Bio, website, avatar
- ✅ User preferences:
  - Language & timezone
  - Theme (light/dark/auto)
  - Notification settings (email, push, SMS)
  - Privacy settings
  - Data collection preferences

#### 🌐 Social Accounts
- ✅ Google OAuth connections
- ✅ Facebook OAuth connections
- ✅ Provider IDs and profile data

#### 🔑 API Keys
- ✅ Active API keys (hashed)
- ✅ Inactive/revoked API keys
- ✅ Key names and permissions
- ✅ Usage timestamps

#### 📊 Analytics & Tracking
- ✅ Total sessions count
- ✅ Total login time (minutes)
- ✅ Average session duration
- ✅ Device count
- ✅ Features used
- ✅ Last active date
- ✅ Login count and history

#### 📋 Audit Logs
- ✅ Account actions (creation, updates, deletion)
- ✅ Security events (locks, 2FA changes)
- ✅ IP addresses and user agents
- ✅ Timestamps for all events

#### 🔔 Notifications
- ✅ Welcome messages
- ✅ Security alerts
- ✅ System notifications
- ✅ Read/unread status

## Database Reset

⚠️ **Warning:** Running the seed script will **DELETE ALL EXISTING USERS** and create new test users.

```javascript
await User.deleteMany({});
```

If you want to keep existing users, comment out this line in `seed.js`:

```javascript
// await User.deleteMany({});
```

## Testing Scenarios

Use these test accounts for different scenarios:

### Authentication Flows
1. **Normal Login:** Use `johndoe` or `diana_social`
2. **2FA Flow:** Use `sarah_admin` or `superadmin`
3. **Email Verification:** Use `alice_pending` with OTP `123456`
4. **Password Reset:** Use `charlie_reset` with token `reset_token_xyz`
5. **Social Login:** Use `diana_social` (Google/Facebook)

### Security Testing
6. **Account Lockout (Login):** Use `bob_locked` (already locked)
7. **Account Lockout (2FA):** Use `ian_2fa` (2FA locked)
8. **Device Verification:** Use `edward_device` with token `device_token_abc`
9. **API Authentication:** Use `fiona_dev` with key `ak_active_key_123`

### Session Management
10. **Single Session:** Use `johndoe`
11. **Multiple Sessions:** Use `hannah_multi` (3 active sessions)
12. **Temp Session:** Use `julia_temp` (remember me flow)
13. **Session Expiration:** Wait for temp session to expire

### Account Lifecycle
14. **Pending Deletion:** Use `george_deleting` with token `deletion_token_xyz`
15. **Soft Deleted:** Query for `deleted_user_abc12345` (anonymized)
16. **Account Restoration:** Restore `deleted_user_abc12345`

### Privacy & Permissions
17. **Admin Functions:** Use `sarah_admin` or `superadmin`
18. **Privacy Settings:** Use `karen_privacy` (all tracking disabled)
19. **Custom Preferences:** Use `julia_temp` (custom notifications)

### Edge Cases
20. **Expired Tokens:** Wait for OTPs/tokens to expire
21. **Backup Recovery:** Check backups for `george_deleting`
22. **Audit Trail:** Review audit logs for all users

## Environment Requirements

Ensure your `.env` file has:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/your_db_name

# Security
BCRYPT_ROUNDS=12
JWT_SECRET=your_jwt_secret_key

# Email Verification
EMAIL_VERIFICATION_EXPIRY=600000  # 10 minutes

# Password Reset
PASSWORD_RESET_EXPIRY=1800000  # 30 minutes

# Device Verification
DEVICE_VERIFICATION_EXPIRY=86400000  # 24 hours

# Account Lockout
AUTH_MAX_LOGIN_ATTEMPTS=10
AUTH_ACCOUNT_LOCK_DURATION=1800000  # 30 minutes

# 2FA
AUTH_MAX_2FA_ATTEMPTS=5
AUTH_2FA_LOCK_DURATION=900000  # 15 minutes
TWO_FACTOR_ISSUER=YourAppName

# Sessions
MAX_ACTIVE_SESSIONS=5
MAX_TRUSTED_DEVICES=10

# Features
FEATURE_AUDIT_LOGS_ENABLED=true
FEATURE_NOTIFICATIONS_ENABLED=true

# Defaults
DEFAULT_LANGUAGE=en
DEFAULT_TIMEZONE=UTC
```

## Output

The script provides detailed output:

```
✅ Connected to MongoDB
🗑️  Cleared existing users
✅ Created user: johndoe (john.doe@example.com)
✅ Created user: sarah_admin (sarah.admin@example.com)
...

📊 Seeding Summary:
Total users created: 15
Users with 2FA: 3
Admin users: 2
Locked accounts: 2
Soft-deleted users: 1
Users with pending deletion: 1
Users with social accounts: 1

🔑 Test Credentials:
────────────────────────────────────────────────────────────────────────────────
Regular User:
  Email: john.doe@example.com | Password: Password123!
...
```

## Troubleshooting

### Connection Error
```
❌ Error: connect ECONNREFUSED
```
**Solution:**
- Ensure MongoDB is running: `sudo systemctl start mongodb`
- Check `MONGODB_URI` in `.env`
- Verify MongoDB port (default: 27017)

### Duplicate Key Error
```
❌ E11000 duplicate key error
```
**Solution:**
- Run the script again (it clears existing data first)
- Check for unique index conflicts
- Manually clear: `db.users.deleteMany({})`

### Password Hash Error
```
❌ Error: data and hash arguments required
```
**Solution:**
- Verify `bcryptjs` is installed: `npm install bcryptjs`
- Check `BCRYPT_ROUNDS` in `.env` (should be 10-14)
- Ensure passwords are strings

### Validation Error
```
❌ User validation failed
```
**Solution:**
- Check User model schema matches seed data
- Verify required fields are present
- Check enum values are valid

### Out of Memory
```
❌ JavaScript heap out of memory
```
**Solution:**
- Reduce number of users in seed data
- Process users in batches
- Increase Node memory: `node --max-old-space-size=4096 seed.js`

## Security Notes

🔒 **CRITICAL SECURITY WARNINGS:**

- ⚠️ These are **TEST ACCOUNTS ONLY**
- ⚠️ **NEVER use these in production environments**
- ⚠️ All passwords are intentionally weak for testing
- ⚠️ All tokens are predictable (not cryptographically random)
- ⚠️ **DELETE OR CHANGE these accounts before production deployment**
- ⚠️ Use strong, unique passwords for real accounts
- ⚠️ Implement proper rate limiting in production
- ⚠️ Enable all security features (2FA, email verification, etc.)

### Production Checklist

Before deploying to production:

- [ ] Delete all seed users: `User.deleteMany({})`
- [ ] Change all default passwords
- [ ] Rotate all JWT secrets and API keys
- [ ] Enable rate limiting
- [ ] Configure proper CORS settings
- [ ] Set up email service (SMTP/SendGrid)
- [ ] Configure 2FA properly
- [ ] Set up proper logging and monitoring
- [ ] Review and harden all security settings
- [ ] Conduct security audit

## Customization

To add more users, add to the `seedUsers` array in `seed.js`:

```javascript
const seedUsers = [
  // ... existing users
  {
    firstName: 'New',
    lastName: 'User',
    username: 'newuser',
    email: 'newuser@example.com',
    passwordHash: 'SecurePassword123!',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    // ... other fields
  }
];
```

### Available Fields

Refer to the User model for all available fields:
- Authentication: `passwordHash`, `isEmailVerified`, `twoFactorAuth`
- Profile: `firstName`, `lastName`, `bio`, `avatar`, `dateOfBirth`, `gender`
- Security: `failedLoginAttempts`, `accountLockedUntil`, `deletionToken`
- Sessions: `sessions[]`, `trustedDevices[]`, `pendingDeviceVerifications[]`
- Social: `socialAccounts[]`
- API: `apiKeys[]`
- Tracking: `analytics`, `auditLogs[]`, `notifications[]`
- Preferences: `preferences{language, timezone, theme, notifications, privacy}`

## Related Scripts

```bash
npm start          # Start the server
npm run dev        # Start with nodemon (auto-restart)
npm test           # Run tests
npm run seed       # Seed database (this script)
npm run clean-db   # Clear all data (if available)
```

## Database Collections

After seeding, you'll have:

- **users** - 15 test users with complete data
- **userbackups** - Backups for deleted/deleting users

## Querying Seeded Data

### MongoDB Shell Examples

```javascript
// Find all users
db.users.find({})

// Find admin users
db.users.find({ role: { $in: ['admin', 'superadmin'] } })

// Find users with 2FA enabled
db.users.find({ 'twoFactorAuth.isEnabled': true })

// Find locked accounts
db.users.find({ accountLockedUntil: { $gt: new Date() } })

// Find soft-deleted users
db.users.find({ isDeleted: true })

// Find users with active sessions
db.users.find({ 'sessions.isActive': true })

// Count by role
db.users.aggregate([
  { $group: { _id: '$role', count: { $sum: 1 } } }
])
```

### Mongoose Examples

```javascript
// Find user by email
const user = await User.findByEmail('john.doe@example.com');

// Find user with deletion token
const user = await User.findByDeletionToken('deletion_token_xyz');

// Find user with temp session
const user = await User.findByTempSession(tempSessionId);

// Get user with all virtual fields
const user = await User.findById(userId);
console.log(user.fullName);
console.log(user.isLocked);
console.log(user.hasPendingDeletion);
```

## Support

For issues or questions:

- 📖 Check the main README.md
- 📝 Review the User model in `models/User.js`
- ⚙️ Check environment configuration in `.env`
- 🐛 Open an issue on GitHub
- 📧 Contact the development team

## Contributing

To improve the seed script:

1. Add more diverse test cases
2. Include edge cases for new features
3. Update documentation
4. Test with different MongoDB versions
5. Ensure compatibility with User model changes

## License

This seed script is part of the main project and follows the same license.

---

**Last Updated:** 2025
**Version:** 2.0
**Compatible With:** User Model v2.0+