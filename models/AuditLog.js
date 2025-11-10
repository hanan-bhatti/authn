const mongoose = require('mongoose');

/**
 * AuditLog Collection - Normalized from User.auditLogs array
 * 
 * WHY SEPARATE COLLECTION:
 * - Eliminates version conflicts when logging user actions
 * - Can grow to millions of logs without bloating User documents
 * - Fast time-series queries with proper indexes
 * - Auto-cleanup old logs with TTL index (90 days)
 * - Better for compliance and security auditing
 * 
 * INDEXES:
 * - userId + timestamp: for user audit history queries
 * - action + timestamp: for action-based analytics
 * - timestamp: TTL index for auto-cleanup after 90 days
 * 
 * PERFORMANCE:
 * - Writes: O(1) - no document locking conflicts
 * - Reads: O(log n) with indexes - millisecond queries
 * - Storage: ~500 bytes per log entry
 */

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true // Fast queries by user
  },
  action: {
    type: String,
    required: true,
    index: true, // Fast queries by action type
    enum: [
      // Authentication events
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGIN_BLOCKED',
      'LOGIN_BLOCKED_UNTRUSTED_DEVICE',
      'LOGIN_ERROR',
      'LOGOUT',
      'SESSION_EXPIRED',
      
      // Account events
      'REGISTRATION',
      'ACCOUNT_CREATED',
      'ACCOUNT_UPDATED',
      'ACCOUNT_DELETED',
      'ACCOUNT_DEACTIVATED',
      'ACCOUNT_REACTIVATED',
      
      // Security events
      'PASSWORD_CHANGED',
      'PASSWORD_RESET_REQUESTED',
      'PASSWORD_RESET_COMPLETED',
      'EMAIL_VERIFIED',
      'PHONE_VERIFIED',
      '2FA_ENABLED',
      '2FA_DISABLED',
      '2FA_VERIFIED',
      
      // Device events
      'DEVICE_TRUSTED',
      'DEVICE_UNTRUSTED',
      'DEVICE_VERIFICATION_SENT',
      'DEVICE_VERIFIED',
      
      // Profile events
      'PROFILE_UPDATED',
      'PREFERENCES_UPDATED',
      
      // API events
      'API_KEY_CREATED',
      'API_KEY_DELETED',
      'API_KEY_USED',
      
      // Social account events
      'SOCIAL_ACCOUNT_CONNECTED',
      'SOCIAL_ACCOUNT_DISCONNECTED',
      
      // Other
      'OTHER'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Flexible JSON data
    default: {}
  },
  ipAddress: {
    type: String,
    index: true // For IP-based security queries
  },
  userAgent: String,
  location: {
    city: String,
    region: String,
    country: String,
    timezone: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // For time-based queries
  },
  // Optional: Severity level for filtering
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
    index: true
  }
}, {
  timestamps: false, // We use timestamp manually
  collection: 'auditlogs'
});

// Compound index for user audit history (most common query)
auditLogSchema.index({ userId: 1, timestamp: -1 });

// Compound index for action-based analytics
auditLogSchema.index({ action: 1, timestamp: -1 });

// Compound index for security monitoring (IP tracking)
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });

// Compound index for severity-based filtering
auditLogSchema.index({ userId: 1, severity: 1, timestamp: -1 });

// TTL index - Auto-delete logs older than 90 days (configurable)
// Set to 0 to disable auto-cleanup, or adjust based on compliance needs
const AUDIT_LOG_RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90;
if (AUDIT_LOG_RETENTION_DAYS > 0) {
  auditLogSchema.index(
    { timestamp: 1 }, 
    { expireAfterSeconds: AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 }
  );
}

/**
 * Static method: Create audit log entry
 * @param {ObjectId} userId - User's ID
 * @param {String} action - Action type (from enum)
 * @param {Object} details - Additional details
 * @param {Object} req - Express request object (optional)
 * @returns {Promise<AuditLog>}
 */
auditLogSchema.statics.log = async function(userId, action, details = {}, req = null) {
  const logEntry = {
    userId,
    action,
    details,
    timestamp: new Date()
  };

  // Extract request metadata if available
  if (req) {
    logEntry.ipAddress = req.ip || req.connection?.remoteAddress;
    logEntry.userAgent = req.get?.('User-Agent');
    
    // Extract location from deviceInfo if available
    if (req.deviceInfo?.location) {
      logEntry.location = req.deviceInfo.location;
    }
  }

  // Determine severity based on action
  if (action.includes('ERROR') || action.includes('FAILED') || action.includes('BLOCKED')) {
    logEntry.severity = 'error';
  } else if (action.includes('DELETED') || action.includes('DISABLED')) {
    logEntry.severity = 'warning';
  } else {
    logEntry.severity = 'info';
  }

  return this.create(logEntry);
};

/**
 * Static method: Get user's audit history
 * @param {ObjectId} userId - User's ID
 * @param {Object} options - Query options { limit, skip, action, startDate, endDate }
 * @returns {Promise<AuditLog[]>}
 */
auditLogSchema.statics.getUserHistory = async function(userId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    action = null,
    startDate = null,
    endDate = null,
    severity = null
  } = options;

  const query = { userId };

  if (action) query.action = action;
  if (severity) query.severity = severity;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean(); // Use lean() for faster queries (plain objects)
};

/**
 * Static method: Get recent security events for user
 * @param {ObjectId} userId - User's ID
 * @param {Number} limit - Max results
 * @returns {Promise<AuditLog[]>}
 */
auditLogSchema.statics.getSecurityEvents = async function(userId, limit = 20) {
  const securityActions = [
    'LOGIN_FAILED',
    'LOGIN_BLOCKED',
    'PASSWORD_CHANGED',
    'PASSWORD_RESET_REQUESTED',
    '2FA_ENABLED',
    '2FA_DISABLED',
    'DEVICE_TRUSTED',
    'DEVICE_UNTRUSTED'
  ];

  return this.find({
    userId,
    action: { $in: securityActions }
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

/**
 * Static method: Get failed login attempts for user
 * @param {ObjectId} userId - User's ID
 * @param {Number} minutes - Time window in minutes
 * @returns {Promise<Number>}
 */
auditLogSchema.statics.getFailedLoginAttempts = async function(userId, minutes = 15) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  
  return this.countDocuments({
    userId,
    action: 'LOGIN_FAILED',
    timestamp: { $gte: since }
  });
};

/**
 * Static method: Get activity by IP address
 * @param {String} ipAddress - IP address
 * @param {Number} hours - Time window in hours
 * @returns {Promise<AuditLog[]>}
 */
auditLogSchema.statics.getActivityByIP = async function(ipAddress, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    ipAddress,
    timestamp: { $gte: since }
  })
    .sort({ timestamp: -1 })
    .limit(100)
    .lean();
};

/**
 * Static method: Get analytics for action type
 * @param {String} action - Action type
 * @param {Number} days - Time window in days
 * @returns {Promise<Object>} - Aggregated stats
 */
auditLogSchema.statics.getActionStats = async function(action, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const stats = await this.aggregate([
    {
      $match: {
        action,
        timestamp: { $gte: since }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return stats;
};

/**
 * Static method: Cleanup old logs (manual, TTL handles this automatically)
 * @param {Number} daysOld - Delete logs older than this many days
 * @returns {Promise<Number>} - Number of logs deleted
 */
auditLogSchema.statics.cleanupOldLogs = async function(daysOld = 90) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
  
  return result.deletedCount;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
