const mongoose = require('mongoose');

/**
 * Notification Collection - Normalized from User.notifications array
 * 
 * WHY SEPARATE COLLECTION:
 * - Eliminates version conflicts when creating notifications
 * - Can scale to millions of notifications
 * - Fast queries with proper indexes
 * - Auto-cleanup read notifications after 30 days (TTL index)
 * - Better for notification analytics and targeting
 * 
 * INDEXES:
 * - userId + read: for unread count queries
 * - userId + createdAt: for notification list queries
 * - createdAt + read: TTL index for auto-cleanup of read notifications
 * 
 * PERFORMANCE:
 * - Writes: O(1) - no document locking conflicts
 * - Reads: O(log n) with indexes - millisecond queries
 * - Storage: ~300 bytes per notification
 */

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true // Fast queries by user
  },
  type: {
    type: String,
    required: true,
    index: true,
    enum: [
      'info',          // General information
      'account',       // Account-related
      'security',      // Security alerts
      'system',        // System messages
      'welcome',       // Welcome messages
      'success',       // Success confirmations
      'warning',       // Warnings
      'error'          // Error notifications
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  read: {
    type: Boolean,
    default: false,
    index: true // Fast queries for unread count
  },
  readAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // For time-based queries
  },
  // Optional: Additional data for rich notifications
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Optional: Action button
  action: {
    label: String,
    url: String
  },
  // Optional: Icon or image
  icon: String,
  // Optional: Priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: false, // We use createdAt manually
  collection: 'notifications'
});

// Compound index for unread notifications query (most common)
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Compound index for notification list (sorted by date)
notificationSchema.index({ userId: 1, createdAt: -1 });

// Compound index for type-based filtering
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

// TTL index - Auto-delete READ notifications after 30 days
// Keeps unread notifications forever (or until manually deleted)
const NOTIFICATION_RETENTION_DAYS = parseInt(process.env.NOTIFICATION_RETENTION_DAYS) || 30;
if (NOTIFICATION_RETENTION_DAYS > 0) {
  notificationSchema.index(
    { readAt: 1 },
    {
      expireAfterSeconds: NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60,
      partialFilterExpression: { read: true, readAt: { $exists: true } }
    }
  );
}

/**
 * Static method: Create notification for user
 * @param {ObjectId} userId - User's ID
 * @param {String} type - Notification type
 * @param {String} title - Notification title
 * @param {String} message - Notification message
 * @param {Object} options - Additional options { data, action, icon, priority }
 * @returns {Promise<Notification>}
 */
notificationSchema.statics.createNotification = async function(userId, type, title, message, options = {}) {
  const { data = {}, action = null, icon = null, priority = 'normal' } = options;

  return this.create({
    userId,
    type,
    title,
    message,
    data,
    action,
    icon,
    priority,
    createdAt: new Date()
  });
};

/**
 * Static method: Get user's notifications
 * @param {ObjectId} userId - User's ID
 * @param {Object} options - Query options { limit, skip, unreadOnly, type }
 * @returns {Promise<Notification[]>}
 */
notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    limit = 20,
    skip = 0,
    unreadOnly = false,
    type = null
  } = options;

  const query = { userId };
  
  if (unreadOnly) query.read = false;
  if (type) query.type = type;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

/**
 * Static method: Get unread count for user
 * @param {ObjectId} userId - User's ID
 * @returns {Promise<Number>}
 */
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, read: false });
};

/**
 * Static method: Mark notification as read
 * @param {ObjectId} notificationId - Notification ID
 * @returns {Promise<Notification|null>}
 */
notificationSchema.statics.markAsRead = async function(notificationId) {
  return this.findByIdAndUpdate(
    notificationId,
    { read: true, readAt: new Date() },
    { new: true }
  );
};

/**
 * Static method: Mark all user notifications as read
 * @param {ObjectId} userId - User's ID
 * @returns {Promise<Number>} - Number of notifications marked as read
 */
notificationSchema.statics.markAllAsRead = async function(userId) {
  const result = await this.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
  return result.modifiedCount;
};

/**
 * Static method: Delete notification
 * @param {ObjectId} notificationId - Notification ID
 * @param {ObjectId} userId - User's ID (for security)
 * @returns {Promise<Boolean>}
 */
notificationSchema.statics.deleteNotification = async function(notificationId, userId) {
  const result = await this.deleteOne({ _id: notificationId, userId });
  return result.deletedCount > 0;
};

/**
 * Static method: Delete all user notifications
 * @param {ObjectId} userId - User's ID
 * @param {Boolean} readOnly - Delete only read notifications
 * @returns {Promise<Number>} - Number of notifications deleted
 */
notificationSchema.statics.deleteAllUserNotifications = async function(userId, readOnly = false) {
  const query = { userId };
  if (readOnly) query.read = true;

  const result = await this.deleteMany(query);
  return result.deletedCount;
};

/**
 * Static method: Get notification statistics for user
 * @param {ObjectId} userId - User's ID
 * @returns {Promise<Object>}
 */
notificationSchema.statics.getUserStats = async function(userId) {
  const [total, unread, byType] = await Promise.all([
    this.countDocuments({ userId }),
    this.countDocuments({ userId, read: false }),
    this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ])
  ]);

  return {
    total,
    unread,
    read: total - unread,
    byType: byType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

/**
 * Static method: Cleanup old read notifications (manual, TTL handles this automatically)
 * @param {Number} daysOld - Delete read notifications older than this many days
 * @returns {Promise<Number>} - Number of notifications deleted
 */
notificationSchema.statics.cleanupOldNotifications = async function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    read: true,
    readAt: { $lt: cutoffDate }
  });
  
  return result.deletedCount;
};

/**
 * Instance method: Mark this notification as read
 * @returns {Promise<Notification>}
 */
notificationSchema.methods.markRead = async function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
