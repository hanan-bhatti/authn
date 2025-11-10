const config = require('../utils/config');
const { initializeEmailService } = require('../services/email');
const redisService = require('../services/redis');
const { 
  UserBackupService, 
  UserCleanupService, 
  UserMaintenanceScheduler 
} = require('../services/usersBackup');

/**
 * Initialize backup and cleanup services
 * @returns {Object} Services instances
 */
const initializeBackupServices = () => {
  if (!config.BACKUP_ENABLED) {
    console.log('ℹ️  Backup services are disabled');
    return { backupService: null, cleanupService: null, maintenanceScheduler: null };
  }

  try {
    const backupService = new UserBackupService({
      backupPath: config.BACKUP_PATH,
      compressionEnabled: config.BACKUP_COMPRESSION_ENABLED,
      encryptionEnabled: config.BACKUP_ENCRYPTION_ENABLED,
      encryptionKey: config.BACKUP_ENCRYPTION_KEY,
      retentionDays: config.BACKUP_RETENTION_DAYS
    });

    const cleanupService = new UserCleanupService(backupService);
    const maintenanceScheduler = new UserMaintenanceScheduler(
      backupService,
      cleanupService,
      config.BACKUP_CRON_SCHEDULE
    );

    console.log('✅ Backup services initialized');
    return { backupService, cleanupService, maintenanceScheduler };
  } catch (error) {
    console.error('❌ Failed to initialize backup services:', error.message);
    return { backupService: null, cleanupService: null, maintenanceScheduler: null };
  }
};

/**
 * Initialize all application services
 * @returns {Promise<Object>} Initialized services
 */
const initializeServices = async () => {
  try {
    console.log('🚀 Initializing services...');

    // Initialize Redis cache (if enabled)
    if (config.REDIS_ENABLED) {
      try {
        await redisService.connect();
        console.log('✅ Redis cache connected');
      } catch (error) {
        console.error('⚠️  Redis connection failed (continuing without cache):', error.message);
      }
    } else {
      console.log('ℹ️  Redis caching is disabled');
    }

    // Initialize email service
    await initializeEmailService();
    
    // Initialize backup services
    const backupServices = initializeBackupServices();

    console.log('✅ Services initialized successfully');
    return backupServices;
  } catch (error) {
    console.error('❌ Service initialization failed:', error.message);
    // Don't exit the process, some services may not be critical
    return { backupService: null, cleanupService: null, maintenanceScheduler: null };
  }
};

module.exports = { initializeServices, initializeBackupServices };
