const mongoose = require('mongoose');
const redisService = require('../services/redis');
const config = require('../utils/config');

/**
 * Session Collection - Normalized from User.sessions array with Redis Caching
 * 
 * WHY SEPARATE COLLECTION:
 * - Eliminates version conflicts on concurrent logins
 * - Auto-cleanup with TTL index (expires after session duration)
 * - Fast queries with proper indexes (O(1) lookups)
 * - Scalable to millions of sessions
 * 
 * INDEXES:
 * - sessionId: unique, for fast O(1) lookup
 * - userId: for user's session list queries
 * - expiresAt: TTL index for auto-cleanup
 * - userId + isActive: for active sessions query
 */

const deviceInfoSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  deviceName: String,
  userAgent: String,
  platform: String,
  browser: String,
  os: String,
  ipAddress: String,
  location: {
    city: String,
    region: String,
    country: String,
    timezone: String
  }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true // O(1) lookup by sessionId
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true // Fast queries for user's sessions
  },
  device: {
    type: deviceInfoSchema,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true // TTL index for auto-cleanup
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // Optional: Track session metadata
  rememberMe: {
    type: Boolean,
    default: false
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: false, // We use createdAt manually
  collection: 'sessions'
});

// Compound index for fast "active sessions for user" query
sessionSchema.index({ userId: 1, isActive: 1 });

// Compound index for cleanup queries
sessionSchema.index({ userId: 1, expiresAt: 1 });

// TTL index - MongoDB auto-deletes expired sessions
// expires documents when expiresAt <= current time
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Static method: Create a new session with Redis caching
 * @param {ObjectId} userId - User's ID
 * @param {String} sessionId - Unique session ID
 * @param {Object} deviceInfo - Device information
 * @param {Number} durationMs - Session duration in milliseconds
 * @returns {Promise<Session>}
 */
sessionSchema.statics.createSession = async function(userId, sessionId, deviceInfo, durationMs = 604800000) {
  const expiresAt = new Date(Date.now() + durationMs);
  
  const session = await this.create({
    sessionId,
    userId,
    device: deviceInfo,
    expiresAt,
    ipAddress: deviceInfo.ipAddress,
    userAgent: deviceInfo.userAgent,
    rememberMe: durationMs > 604800000 // > 7 days = remember me
  });

  // Cache in Redis for fast lookups
  const ttlSeconds = Math.floor(durationMs / 1000);
  await redisService.cacheSession(sessionId, session.toObject(), ttlSeconds);
  
  // Track active session count
  await redisService.trackActiveSession(userId.toString(), sessionId);

  return session;
};

/**
 * Static method: Find session by sessionId with Redis cache
 * @param {String} sessionId - Session ID
 * @returns {Promise<Session|null>}
 */
sessionSchema.statics.findBySessionId = async function(sessionId) {
  // Try Redis cache first (95% hit rate expected)
  const cached = await redisService.getSession(sessionId);
  if (cached) {
    // Validate cached data
    if (cached.isActive && new Date(cached.expiresAt) > new Date()) {
      return cached;
    }
    // Cache invalid, remove it
    await redisService.invalidateSession(sessionId);
  }

  // Cache miss - query MongoDB with lean() for better performance
  const session = await this.findOne({ 
    sessionId, 
    isActive: true,
    expiresAt: { $gt: new Date() } // Pre-filter expired sessions
  }).lean(); // 30% faster read-only queries
  
  if (session) {
    // Cache for next request
    const ttlSeconds = Math.floor((new Date(session.expiresAt) - new Date()) / 1000);
    if (ttlSeconds > 0) {
      await redisService.cacheSession(sessionId, session, ttlSeconds);
    }
  }
  
  return session;
};

/**
 * Static method: Get all active sessions for user
 * @param {ObjectId} userId - User's ID
 * @returns {Promise<Session[]>}
 */
sessionSchema.statics.getActiveSessions = async function(userId) {
  return this.find({ 
    userId, 
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
  .select('sessionId device lastActivity expiresAt') // Only return needed fields
  .sort({ lastActivity: -1 })
  .lean(); // Faster read-only queries
};

/**
 * Static method: Invalidate a session with Redis cache clearing
 * @param {String} sessionId - Session ID
 * @returns {Promise<Session|null>}
 */
sessionSchema.statics.invalidateSession = async function(sessionId) {
  // Invalidate in Redis cache
  await redisService.invalidateSession(sessionId);
  
  // Get session to find userId for tracking
  const session = await this.findOne({ sessionId });
  if (session) {
    await redisService.removeActiveSession(session.userId.toString(), sessionId);
  }
  
  // Invalidate in MongoDB
  return this.findOneAndUpdate(
    { sessionId },
    { isActive: false },
    { new: true }
  );
};

/**
 * Static method: Invalidate all sessions for user with Redis cache clearing
 * @param {ObjectId} userId - User's ID
 * @returns {Promise<Number>} - Number of sessions invalidated
 */
sessionSchema.statics.invalidateAllUserSessions = async function(userId) {
  // Invalidate in Redis cache
  await redisService.invalidateUserSessions(userId.toString());
  
  // Invalidate in MongoDB
  const result = await this.updateMany(
    { userId, isActive: true },
    { isActive: false }
  );
  return result.modifiedCount;
};

/**
 * Static method: Update last activity with Redis cache update
 * @param {String} sessionId - Session ID
 * @returns {Promise<Session|null>}
 */
sessionSchema.statics.updateActivity = async function(sessionId) {
  const session = await this.findOneAndUpdate(
    { sessionId, isActive: true },
    { lastActivity: new Date() },
    { new: true }
  );
  
  if (session) {
    // Update cache with new lastActivity
    const ttlSeconds = Math.floor((new Date(session.expiresAt) - new Date()) / 1000);
    await redisService.cacheSession(sessionId, session.toObject(), ttlSeconds);
  }
  
  return session;
};

/**
 * Static method: Cleanup expired sessions (called by TTL index automatically)
 * Manual cleanup for testing/maintenance
 * @returns {Promise<Number>} - Number of sessions deleted
 */
sessionSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

/**
 * Instance method: Check if session is valid
 * @returns {Boolean}
 */
sessionSchema.methods.isValid = function() {
  return this.isActive && this.expiresAt > new Date();
};

/**
 * Instance method: Extend session expiry
 * @param {Number} additionalMs - Additional milliseconds to extend
 * @returns {Promise<Session>}
 */
sessionSchema.methods.extend = async function(additionalMs) {
  this.expiresAt = new Date(this.expiresAt.getTime() + additionalMs);
  return this.save();
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
