const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { timeUtils } = require('../utils/helpers');

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  deviceName: String,
  userAgent: String,
  platform: String,
  browser: String,
  os: String,
  ipAddress: String,
  location: Object,
  firstUsed: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: Date.now },
  isTrusted: { type: Boolean, default: false }
});

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  device: deviceSchema,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  lastActivity: { type: Date, default: Date.now }
});

const pendingDeviceVerificationSchema = new mongoose.Schema({
  token: { type: String, required: true },
  deviceId: { type: String, required: true },
  deviceInfo: {
    deviceId: String,
    deviceName: String,
    userAgent: String,
    platform: String,
    browser: String,
    os: String,
    ipAddress: String,
    location: Object
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

const socialAccountSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['google', 'facebook', 'apple', 'twitter'],
    required: true
  },
  providerId: { type: String, required: true },
  email: String,
  displayName: String,
  profilePicture: String,
  connectedAt: { type: Date, default: Date.now }
});

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  id: { type: String, default: () => crypto.randomBytes(16).toString('hex') },
  type: {
    type: String,
    enum: ['info', 'account', 'security', 'system', 'welcome', 'success'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  data: mongoose.Schema.Types.Mixed
});

const apiKeySchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: String,
  permissions: [String],
  isActive: { type: Boolean, default: true },
  lastUsed: Date,
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date
});



// Analytics schema
const analyticsSchema = new mongoose.Schema({
  totalSessions: { type: Number, default: 0 },
  lastSessionDate: Date,
  totalLoginTime: { type: Number, default: 0 }, // in minutes
  averageSessionDuration: { type: Number, default: 0 }, // in minutes
  deviceCount: { type: Number, default: 0 },
  featuresUsed: [String],
  lastActiveDate: { type: Date, default: Date.now }
});

const userBackupSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  backupType: { 
    type: String, 
    enum: ['pre_deletion', 'periodic', 'manual'], 
    required: true 
  },
  userData: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  retainUntil: { type: Date, required: true },
  metadata: {
    reason: String,
    userAgent: String,
    ipAddress: String,
    initiatedBy: String
  }
});

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    type: String,
    sparse: true,
    unique: true,
    match: /^[\+]?[1-9][\d]{9,15}$/
  },

  // Authentication
  passwordHash: String,
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },

  // Email verification
  emailVerificationOTP: String,
  emailVerificationExpires: Date,

  // Password reset
  passwordResetToken: String,
  passwordResetExpires: Date,

  // FIXED: Account deletion with proper safeguards
  deletionToken: {
    type: String,
    default: undefined
  },
  deletionTokenExpires: {
    type: Date,
    default: undefined
  },
  deletionRequestedAt: {
    type: Date,
    default: undefined
  },
  deletionReason: {
    type: String,
    enum: ['user_request', 'inactivity', 'policy_violation', 'admin_action', 'other'],
    default: undefined
  },
  // CRITICAL: Add backup flag to prevent accidental deletion
  isBackedUp: { type: Boolean, default: false },
  backupCreatedAt: Date,

  // FIXED: Account security with proper failed attempt tracking
  failedLoginAttempts: { type: Number, default: 0 },
  lastFailedLogin: Date,
  accountLockedUntil: Date,
  lockReason: String,
  lastLogin: Date,
  lastLoginIP: String,
  loginCount: { type: Number, default: 0 },

  // FIXED: Two Factor Authentication with proper failed attempt tracking
  twoFactorAuth: {
    isEnabled: { type: Boolean, default: false },
    secret: String,
    backupCodes: [String],
    enabledAt: Date,
    lastUsed: Date,
    failedAttempts: { type: Number, default: 0 },
    lastFailedAttempt: Date,
    lockedUntil: Date,
    maxAttempts: { type: Number, default: 5 }
  },

  // User Profile
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: 'https://spotless-orange-flea.myfilebase.com/ipfs/QmSaqA9tpYReUdr4Xw3uyvsCts5xTeHKsfdiHDiDjTUN4W'
  },
  profilePicture: String,
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'], 
    default: 'prefer_not_to_say'
  },
  bio: String,
  website: String,



  // Account Status
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin', 'superadmin'],
    default: 'user'
  },
  permissions: [String],
  socialAccounts: [socialAccountSchema],
  sessions: [sessionSchema],
  trustedDevices: [deviceSchema],
  pendingDeviceVerifications: [pendingDeviceVerificationSchema],
  apiKeys: [apiKeySchema],
  auditLogs: [auditLogSchema],
  notifications: [notificationSchema],
  analytics: { type: analyticsSchema, default: () => ({}) },
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
    tempSession: {
      tempSessionId: String,
      deviceInfo: {
        deviceId: String,
        deviceName: String,
        userAgent: String,
        platform: String,
        browser: String,
        os: String,
        ipAddress: String,
        location: Object
      },
      ip: String,
      userAgent: String,
      rememberMe: { type: Boolean, default: false },
      expiresAt: Date,
      createdAt: Date
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'public'
      },
      locationSharing: { type: Boolean, default: false },
      dataCollection: {
        analytics: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
        personalization: { type: Boolean, default: true }
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create backup model
const UserBackup = mongoose.model('UserBackup', userBackupSchema);

// Indexes (same as before)
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ phone: 1 }, { sparse: true });

userSchema.index({ 'sessions.sessionId': 1 }, { sparse: true });
userSchema.index({ 'socialAccounts.provider': 1, 'socialAccounts.providerId': 1 });
userSchema.index({ deletionToken: 1 }, { sparse: true });
userSchema.index({ deletionTokenExpires: 1 }, { sparse: true });
userSchema.index({ isDeleted: 1, deletedAt: 1 });
userSchema.index({ 
  'pendingDeviceVerifications.token': 1,
  'pendingDeviceVerifications.expiresAt': 1 
}, { sparse: true });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || this.username;
});

// Virtual to check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.accountLockedUntil && this.accountLockedUntil > Date.now());
});

// Virtual to check if deletion token is valid
userSchema.virtual('hasPendingDeletion').get(function() {
  return !!(this.deletionToken && this.deletionTokenExpires && this.deletionTokenExpires > Date.now());
});

userSchema.methods.createBackup = async function(backupType = 'manual', metadata = {}) {
  try {
    // Clean sensitive data for backup
    const userData = this.toObject();
    
    // Keep audit trail but remove extremely sensitive data
    if (userData.twoFactorAuth && userData.twoFactorAuth.secret) {
      userData.twoFactorAuth.secret = '[REDACTED]';
    }
    if (userData.twoFactorAuth && userData.twoFactorAuth.backupCodes) {
      userData.twoFactorAuth.backupCodes = userData.twoFactorAuth.backupCodes.map(() => '[REDACTED]');
    }
    delete userData.passwordHash; // Never backup password hash
    delete userData.emailVerificationOTP;
    delete userData.passwordResetToken;
    
    const backup = new UserBackup({
      userId: this._id,
      backupType,
      userData,
      retainUntil: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // Retain for 1 year
      metadata
    });
    
    await backup.save();
    
    // Mark user as backed up
    this.isBackedUp = true;
    this.backupCreatedAt = new Date();
    
    return backup;
  } catch (error) {
    console.error('Failed to create user backup:', error);
    throw new Error('Backup creation failed');
  }
};

userSchema.methods.softDelete = async function(reason = 'user_request', req = null) {
  try {
    // CRITICAL: Create backup before deletion
    if (!this.isBackedUp || !this.backupCreatedAt || 
        (Date.now() - this.backupCreatedAt.getTime()) > (7 * 24 * 60 * 60 * 1000)) {
      await this.createBackup('pre_deletion', {
        reason,
        userAgent: req?.get?.('User-Agent'),
        ipAddress: req?.ip,
        initiatedBy: 'user_request'
      });
    }

    // Set deletion flags FIRST
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.isActive = false;
    this.deletionReason = reason;
    const shortId = this._id.toString().slice(-8);

    // Clear deletion token since deletion is complete
    this.deletionToken = undefined;
    this.deletionTokenExpires = undefined;
    
    // FIXED: Properly revoke all active sessions
    this.revokeAllSessions();
    
    // Store original data for audit
    const originalEmail = this.email;
    const originalUsername = this.username;

    // Anonymize data but keep for audit
    this.email = `deleted_${shortId}@deleted.local`;
    this.username = `deleted_user_${shortId}`;
    this.passwordHash = undefined;
    this.phone = undefined;
    
    // Clear personal information
    this.firstName = undefined;
    this.lastName = undefined;
    this.bio = undefined;
    this.website = undefined;
    this.dateOfBirth = undefined;
    
    // Clear authentication tokens
    this.emailVerificationOTP = undefined;
    this.emailVerificationExpires = undefined;
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
    
    // Clear 2FA data
    if (this.twoFactorAuth) {
      this.twoFactorAuth.secret = undefined;
      this.twoFactorAuth.backupCodes = [];
      this.twoFactorAuth.isEnabled = false;
    }
    
    // Clear social accounts
    this.socialAccounts = [];
    
    // Clear trusted devices
    this.trustedDevices = [];
    
    // Clear API keys
    this.apiKeys = [];
    
    // Clear pending device verifications
    this.pendingDeviceVerifications = [];
    
    // Clear temp sessions
    if (this.preferences?.tempSession) {
      this.preferences.tempSession = undefined;
    }
    
    // Add audit log entry
    this.addAuditLog('account_deleted', {
      reason,
      originalEmail,
      originalUsername,
      deletedAt: this.deletedAt,
      backupCreated: true
    }, req);
    
    console.log(`User ${originalEmail} successfully marked for deletion`);
    return this;
  } catch (error) {
    console.error('Soft delete failed:', error);
    throw new Error('Account deletion failed: ' + error.message);
  }
};

// Restore from soft delete
userSchema.methods.restore = function(req = null) {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.isActive = true;
  this.deletionReason = undefined;
  
  // Add audit log entry
  if (this.addAuditLog && typeof this.addAuditLog === 'function') {
    this.addAuditLog('account_restored', {
      restoredAt: new Date()
    }, req);
  }
  
  return this;
};

// Request account deletion method
userSchema.methods.requestDeletion = function(expiresInHours = 24, req = null) {
  const crypto = require('crypto');
  
  // Generate deletion token
  const deletionToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(deletionToken).digest('hex');
  
  // Store hashed token and expiration
  this.deletionToken = hashedToken;
  this.deletionTokenExpires = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  this.deletionRequestedAt = new Date();
  
  // Add audit log entry
  if (this.addAuditLog && typeof this.addAuditLog === 'function') {
    this.addAuditLog('account_deletion_requested', {
      requestedAt: this.deletionRequestedAt,
      expiresAt: this.deletionTokenExpires
    }, req);
  }
  
  // Return the plain token for email
  return deletionToken;
};

// Cancel deletion request method
userSchema.methods.cancelDeletion = function(req = null) {
  this.deletionToken = undefined;
  this.deletionTokenExpires = undefined;
  this.deletionRequestedAt = undefined;
  
  // Add audit log entry
  if (this.addAuditLog && typeof this.addAuditLog === 'function') {
    this.addAuditLog('account_deletion_cancelled', {
      cancelledAt: new Date()
    }, req);
  }
  
  return this;
};

// Static method to find by deletion token
userSchema.statics.findByDeletionToken = function(token) {
  const crypto = require('crypto');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  return this.findOne({
    deletionToken: hashedToken,
    deletionTokenExpires: { $gt: Date.now() },
    isDeleted: { $ne: true }
  });
};

// Static method to clean up expired deletion requests
userSchema.statics.cleanupExpiredDeletionRequests = function() {
  return this.updateMany(
    {
      deletionTokenExpires: { $lt: new Date() },
      deletionToken: { $exists: true }
    },
    {
      $unset: {
        deletionToken: 1,
        deletionTokenExpires: 1,
        deletionRequestedAt: 1
      }
    }
  );
};

// Query middleware to exclude soft-deleted users by default
userSchema.pre(/^find/, function(next) {
  if (!this.getQuery().includeDeleted) {
    this.find({ isDeleted: { $ne: true } });
  }
  next();
});

userSchema.pre('remove', async function(next) {
  try {
    // Always create backup before removal
    await this.createBackup('pre_deletion', {
      reason: 'document_removal',
      initiatedBy: 'system'
    });
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function (next) {
  // Prevent accidental deletion without backup
  if (this.isModified('isDeleted') && this.isDeleted && !this.isBackedUp) {
    return next(new Error('Cannot delete user without creating backup first'));
  }

  if (!this.preferences) {
    this.preferences = {};
  }

  // Initialize nested preferences
  if (!this.preferences.notifications) {
    this.preferences.notifications = {
      email: { enabled: true, security: true, marketing: false, updates: true },
      push: { enabled: true, security: true, marketing: false, updates: true },
      sms: { enabled: false, security: false, marketing: false }
    };
  }

  if (!this.preferences.privacy) {
    this.preferences.privacy = {
      profileVisibility: 'public',
      locationSharing: false,
      dataCollection: {
        analytics: true,
        marketing: false,
        personalization: true
      }
    };
  }

  // Initialize analytics if not exists
  if (!this.analytics) {
    this.analytics = {
      totalSessions: 0,
      totalLoginTime: 0,
      averageSessionDuration: 0,
      deviceCount: 0,
      featuresUsed: [],
      lastActiveDate: new Date()
    };
  }

  // Clean expired deletion tokens
  if (this.deletionTokenExpires && this.deletionTokenExpires < new Date()) {
    this.deletionToken = undefined;
    this.deletionTokenExpires = undefined;
    this.deletionRequestedAt = undefined;
  }

  this.cleanExpiredData();
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();

  if (this.passwordHash) {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.pre('save', async function (next) {
  // Only hash if password is modified AND not already hashed
  if (!this.isModified('passwordHash')) return next();

  if (this.passwordHash) {
    // Check if it's already a bcrypt hash
    if (this.passwordHash.startsWith('$2a$') || 
        this.passwordHash.startsWith('$2b$') || 
        this.passwordHash.startsWith('$2y$')) {
      console.log('Password already appears to be hashed, skipping hash operation');
      return next();
    }

    console.log('Hashing new password...');
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    console.log('Password hashed successfully');
  }
  next();
});

// Generate email verification OTP
userSchema.methods.generateEmailVerificationOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailVerificationOTP = crypto.createHash('sha256').update(otp).digest('hex');
  this.emailVerificationExpires = timeUtils.addTime(new Date(), 10, 'minutes');
  return otp;
};

// Verify email OTP
userSchema.methods.verifyEmailOTP = function (otp) {
  if (!this.emailVerificationOTP || !this.emailVerificationExpires) {
    return false;
  }

  if (this.emailVerificationExpires < new Date()) {
    return false;
  }

  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
  return hashedOTP === this.emailVerificationOTP;
};

userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = timeUtils.addTime(new Date(), 30, 'minutes');
  return resetToken;
};

userSchema.methods.incrementFailedLogin = function () {
  this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
  this.lastFailedLogin = new Date();

  // Lock account after 10 failed attempts
  if (this.failedLoginAttempts >= 10) {
    this.accountLockedUntil = timeUtils.addTime(new Date(), 30, 'minutes');
    this.lockReason = 'too_many_failed_attempts';
  }
  
  console.log(`Failed login attempts incremented to: ${this.failedLoginAttempts}`);
  this.markModified('failedLoginAttempts');
  this.markModified('lastFailedLogin');
};

userSchema.methods.resetFailedLogin = function () {
  if (this.failedLoginAttempts > 0) {
    this.failedLoginAttempts = 0;
    this.lastFailedLogin = undefined;
    this.accountLockedUntil = undefined;
    this.lockReason = undefined;
    this.markModified('failedLoginAttempts');
  }
};

userSchema.methods.updateLoginInfo = function (deviceInfo) {
  this.lastLogin = new Date();
  this.lastLoginIP = deviceInfo?.ipAddress;
  this.loginCount = (this.loginCount || 0) + 1;
  this.resetFailedLogin();
  this.resetFailed2FA(); // Also reset 2FA failures on successful login

  // Update analytics
  if (!this.analytics) {
    this.analytics = {
      totalSessions: 0,
      totalLoginTime: 0,
      averageSessionDuration: 0,
      deviceCount: 0,
      featuresUsed: [],
      lastActiveDate: new Date()
    };
  }

  this.analytics.totalSessions = (this.analytics.totalSessions || 0) + 1;
  this.analytics.lastSessionDate = new Date();
  this.analytics.lastActiveDate = new Date();
  
  this.markModified('analytics');
};

userSchema.methods.createTempSession = function (deviceInfo, ip, userAgent) {
  const tempSessionId = crypto.randomBytes(32).toString('hex');

  if (!this.preferences) {
    this.preferences = {};
  }

  this.preferences.tempSession = {
    tempSessionId,
    deviceInfo,
    ip,
    userAgent,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    createdAt: new Date()
  };

  return tempSessionId;
};

userSchema.methods.getTempSession = function (tempSessionId) {
  if (!this.preferences?.tempSession || this.preferences.tempSession.tempSessionId !== tempSessionId) {
    return null;
  }

  if (this.preferences.tempSession.expiresAt < new Date()) {
    this.preferences.tempSession = undefined;
    return null;
  }

  return this.preferences.tempSession;
};

userSchema.methods.clearTempSession = function (tempSessionId) {
  if (this.preferences?.tempSession && this.preferences.tempSession.tempSessionId === tempSessionId) {
    this.preferences.tempSession = undefined;
  }
};

userSchema.methods.cleanExpiredTempSessions = function () {
  if (this.preferences?.tempSession && this.preferences.tempSession.expiresAt < new Date()) {
    this.preferences.tempSession = undefined;
  }
};

userSchema.statics.findByTempSession = function (tempSessionId) {
  return this.findOne({
    'preferences.tempSession.tempSessionId': tempSessionId,
    'preferences.tempSession.expiresAt': { $gt: new Date() },
    isDeleted: false
  });
};


userSchema.methods.verify2FACode = async function (code) {
  if (!this.twoFactorAuth?.isEnabled || !this.twoFactorAuth?.secret) {
    return false;
  }

  // Check if 2FA is locked
  if (this.twoFactorAuth.lockedUntil && this.twoFactorAuth.lockedUntil > new Date()) {
    return false;
  }

  try {
    const speakeasy = require('speakeasy');
    let verified = false;

    // Check if it's a backup code
    if (code.length === 8 && this.twoFactorAuth.backupCodes) {
      const hashedCode = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
      const backupCodeIndex = this.twoFactorAuth.backupCodes.findIndex(
        backupCode => crypto.timingSafeEqual(
          Buffer.from(backupCode), 
          Buffer.from(hashedCode)
        )
      );

      if (backupCodeIndex !== -1) {
        // Remove used backup code
        this.twoFactorAuth.backupCodes.splice(backupCodeIndex, 1);
        this.twoFactorAuth.lastUsed = new Date();
        verified = true;
      }
    } else if (!isNaN(code) && code.length === 6) {
      // Verify TOTP code
      verified = speakeasy.totp.verify({
        secret: this.twoFactorAuth.secret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow 2 time steps tolerance
      });

      if (verified) {
        this.twoFactorAuth.lastUsed = new Date();
      }
    }

    if (verified) {
      // Reset failed attempts on success
      this.resetFailed2FA();
      this.markModified('twoFactorAuth');
      return true;
    } else {
      // Increment failed attempts on failure
      this.incrementFailed2FA();
      return false;
    }
  } catch (error) {
    console.error('2FA verification error:', error);
    this.incrementFailed2FA();
    return false;
  }
};

userSchema.methods.incrementFailed2FA = function () {
  if (!this.twoFactorAuth) {
    this.twoFactorAuth = {
      isEnabled: false,
      failedAttempts: 0,
      maxAttempts: 5
    };
  }
  
  this.twoFactorAuth.failedAttempts = (this.twoFactorAuth.failedAttempts || 0) + 1;
  this.twoFactorAuth.lastFailedAttempt = new Date();
  
  // Lock 2FA after max attempts
  if (this.twoFactorAuth.failedAttempts >= (this.twoFactorAuth.maxAttempts || 5)) {
    this.twoFactorAuth.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }
  
  console.log(`2FA failed attempts incremented to: ${this.twoFactorAuth.failedAttempts}`);
  this.markModified('twoFactorAuth');
};

userSchema.methods.resetFailed2FA = function () {
  if (this.twoFactorAuth && this.twoFactorAuth.failedAttempts > 0) {
    this.twoFactorAuth.failedAttempts = 0;
    this.twoFactorAuth.lastFailedAttempt = undefined;
    this.twoFactorAuth.lockedUntil = undefined;
    this.markModified('twoFactorAuth');
  }
};

userSchema.methods.createSession = function(deviceInfo, expiresIn = 7 * 24 * 60 * 60 * 1000) {
  // Generate a more unique sessionId using timestamp and random bytes
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const sessionId = `${timestamp}_${randomBytes}`;

  const expiresAt = new Date(Date.now() + expiresIn);

  // Ensure sessions array exists
  if (!this.sessions) {
    this.sessions = [];
  }

  const newSession = {
    sessionId,
    device: deviceInfo,
    expiresAt,
    isActive: true,
    createdAt: new Date(),
    lastActivity: new Date()
  };

  this.sessions.push(newSession);

  // Clean up old sessions (keep only last 5)
  this.sessions = this.sessions
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  console.log(`Created new session ${sessionId} for user ${this._id}`);
  this.markModified('sessions');
  
  return sessionId;
};

userSchema.methods.revokeSession = function (sessionId) {
  if (!this.sessions) return;

  const session = this.sessions.find(s => s.sessionId === sessionId);
  if (session) {
    session.isActive = false;
  }
};

userSchema.methods.revokeAllSessions = function() {
  console.log(`Revoking all sessions for user ${this._id}`);
  
  if (this.sessions && this.sessions.length > 0) {
    let revokedCount = 0;
    this.sessions.forEach(session => {
      if (session.isActive) {
        session.isActive = false;
        session.revokedAt = new Date();
        revokedCount++;
      }
    });
    console.log(`Revoked ${revokedCount} active sessions`);
  } else {
    console.log('No sessions found to revoke');
  }
  
  // Mark the field as modified to ensure it saves
  this.markModified('sessions');
};

userSchema.methods.addDevice = function (deviceInfo) {
  if (!this.trustedDevices) {
    this.trustedDevices = [];
  }

  const existingDevice = this.trustedDevices.find(d => d.deviceId === deviceInfo.deviceId);

  if (existingDevice) {
    existingDevice.lastUsed = new Date();
    existingDevice.ipAddress = deviceInfo.ipAddress;
    existingDevice.location = deviceInfo.location;
  } else {
    this.trustedDevices.push({
      ...deviceInfo,
      firstUsed: new Date(),
      lastUsed: new Date()
    });

    if (!this.analytics) {
      this.analytics = {
        totalSessions: 0,
        totalLoginTime: 0,
        averageSessionDuration: 0,
        deviceCount: 0,
        featuresUsed: [],
        lastActiveDate: new Date()
      };
    }
    this.analytics.deviceCount = this.trustedDevices.length;

    this.trustedDevices = this.trustedDevices
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, 10);
  }
};

userSchema.methods.generateDeviceVerificationToken = function(deviceInfo) {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // Ensure pendingDeviceVerifications array exists
  if (!this.pendingDeviceVerifications) {
    this.pendingDeviceVerifications = [];
  }
  
  // Remove any existing pending verification for this device
  this.pendingDeviceVerifications = this.pendingDeviceVerifications.filter(
    verification => verification.deviceId !== deviceInfo.deviceId
  );
  
  // Add new pending verification
  this.pendingDeviceVerifications.push({
    token: hashedToken,
    deviceId: deviceInfo.deviceId,
    deviceInfo: deviceInfo,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  });
  
  return token; // Return the plain token for email
};

// Clean expired device verification tokens
userSchema.methods.cleanExpiredDeviceVerifications = function() {
  if (this.pendingDeviceVerifications) {
    this.pendingDeviceVerifications = this.pendingDeviceVerifications.filter(
      verification => verification.expiresAt > new Date()
    );
  }
};

// Social account management
userSchema.methods.hasSocialProvider = function (provider) {
  return this.socialAccounts && this.socialAccounts.some(account => account.provider === provider);
};

userSchema.methods.isSocialUser = function () {
  return this.socialAccounts && this.socialAccounts.length > 0;
};

// Audit logging
userSchema.methods.addAuditLog = function (action, details = {}, req = {}) {
  // Ensure auditLogs array exists
  if (!this.auditLogs) {
    this.auditLogs = [];
  }

  this.auditLogs.push({
    action,
    details,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get?.('User-Agent')
  });

  // Keep only last 50 audit logs
  this.auditLogs = this.auditLogs
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);
};

// Notification management
userSchema.methods.addNotification = function (type, title, message, data = {}) {
  // Ensure notifications array exists
  if (!this.notifications) {
    this.notifications = [];
  }

  this.notifications.unshift({
    type,
    title,
    message,
    data
  });

  // Keep only last 20 notifications
  this.notifications = this.notifications.slice(0, 20);
};

userSchema.methods.markNotificationAsRead = function (notificationId) {
  if (!this.notifications) return;

  const notification = this.notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
  }
};

userSchema.methods.getUnreadNotificationsCount = function () {
  if (!this.notifications) return 0;
  return this.notifications.filter(n => !n.read).length;
};

// API Key management
userSchema.methods.generateApiKey = function (name, permissions = []) {
  const keyString = crypto.randomBytes(32).toString('hex');
  const hashedKey = crypto.createHash('sha256').update(`ak_${keyString}`).digest('hex');

  // Ensure apiKeys array exists
  if (!this.apiKeys) {
    this.apiKeys = [];
  }

  this.apiKeys.push({
    key: hashedKey,
    name,
    permissions
  });

  return `ak_${keyString}`;
};

userSchema.methods.revokeApiKey = function (keyId) {
  if (!this.apiKeys) return;

  const apiKey = this.apiKeys.id(keyId);
  if (apiKey) {
    apiKey.isActive = false;
  }
};

userSchema.methods.cleanExpiredData = function () {
  const now = new Date();

  if (this.sessions) {
    this.sessions = this.sessions.filter(session =>
      session.isActive && session.expiresAt > now
    );
  }

  if (this.emailVerificationExpires && this.emailVerificationExpires < now) {
    this.emailVerificationOTP = undefined;
    this.emailVerificationExpires = undefined;
  }

  if (this.passwordResetExpires && this.passwordResetExpires < now) {
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
  }

  if (this.accountLockedUntil && this.accountLockedUntil < now) {
    this.accountLockedUntil = undefined;
    this.failedLoginAttempts = 0;
  }

  this.cleanExpiredTempSessions();
  this.cleanExpiredDeviceVerifications();
};

// Export user data (GDPR compliance)
userSchema.methods.exportData = function () {
  const userData = this.toObject();

  // Remove sensitive information
  delete userData.passwordHash;
  if (userData.twoFactorAuth) {
    delete userData.twoFactorAuth.secret;
    delete userData.twoFactorAuth.backupCodes;
  }
  delete userData.emailVerificationOTP;
  delete userData.passwordResetToken;
  delete userData.apiKeys;

  return userData;
};

// Static methods
userSchema.statics.findByIdentifier = function (identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() }
    ],
    isDeleted: false
  });
};

userSchema.statics.findByEmail = function (email) {
  return this.findOne({
    email: email.toLowerCase(),
    isDeleted: false
  });
};

userSchema.statics.findByUsername = function (username) {
  return this.findOne({
    username: username.toLowerCase(),
    isDeleted: false
  });
};

userSchema.statics.findBySocialAccount = function (provider, providerId) {
  return this.findOne({
    'socialAccounts.provider': provider,
    'socialAccounts.providerId': providerId,
    isDeleted: false
  });
};

userSchema.statics.UserBackup = UserBackup;

// Export model
module.exports = mongoose.model('User', userSchema);