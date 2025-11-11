const mongoose = require('mongoose');
const config = require('../utils/config');
const logger = require('./logger');

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
const connectDatabase = async () => {
  try {
    // MongoDB connection options using environment variables
    const mongoOptions = {
      maxPoolSize: config.MONGO_MAX_POOL_SIZE, // From env: MONGO_MAX_POOL_SIZE (default: 500)
      minPoolSize: config.MONGO_MIN_POOL_SIZE, // From env: MONGO_MIN_POOL_SIZE (default: 50)
      maxIdleTimeMS: 30000, // Close idle connections faster (30s)
      waitQueueTimeoutMS: 5000, // Fail fast on pool exhaustion (5s)
      serverSelectionTimeoutMS: config.MONGO_TIMEOUT_MS, // From env: MONGO_TIMEOUT_MS (default: 10000)
      socketTimeoutMS: config.MONGO_SOCKET_TIMEOUT_MS, // From env: MONGO_SOCKET_TIMEOUT_MS (default: 60000)
      bufferCommands: false, // Fail immediately if not connected
      family: 4, // Use IPv4, skip IPv6 DNS lookups
      retryWrites: true,
      retryReads: true,
      connectTimeoutMS: config.MONGO_TIMEOUT_MS, // From env: MONGO_TIMEOUT_MS (default: 10000)
      // Performance optimizations
      compressors: 'zlib', // Enable compression to reduce bandwidth
      zlibCompressionLevel: 1, // Fast compression (less CPU)
      readPreference: 'primaryPreferred', // Read from primary for consistency
      // Memory optimization
      autoIndex: false, // Don't auto-create indexes (do it manually)
    };

    await mongoose.connect(config.MONGO_URL, mongoOptions);
    
    // Enable query result caching for better performance
    mongoose.set('debug', false); // Disable debug in production
    
    console.log('✅ MongoDB connected successfully');
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

/**
 * Gracefully close database connection
 * @returns {Promise<void>}
 */
const closeDatabase = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
    throw error;
  }
};

module.exports = { connectDatabase, closeDatabase };
