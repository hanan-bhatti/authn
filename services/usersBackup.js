const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const cron = require('node-cron');
const User = require('../models/User');

class UserBackupService {
  constructor(options = {}) {
    this.backupPath = options.backupPath || './backups';
    this.compressionEnabled = options.compressionEnabled !== false;
    this.encryptionEnabled = options.encryptionEnabled === true;
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || options.encryptionKey;
    this.retentionDays = options.retentionDays || 365;

    if (this.encryptionEnabled && !this.encryptionKey) {
      throw new Error('Encryption is enabled, but no encryption key was provided.');
    }

    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }
  }

  async createUserBackup(user, backupType = 'manual', metadata = {}) {
    if (process.env.BACKUP_ENABLED !== 'true') {
      return;
    }
    try {
      const userData = user.toObject();
      delete userData.passwordHash;

      const backupData = {
        userId: user._id,
        backupType,
        userData,
        createdAt: new Date(),
        retainUntil: new Date(Date.now() + this.retentionDays * 24 * 60 * 60 * 1000),
        metadata
      };

      let backupContent = JSON.stringify(backupData, null, 2);

      if (this.compressionEnabled) {
        backupContent = zlib.gzipSync(backupContent);
      }

      if (this.encryptionEnabled) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
        let encrypted = cipher.update(backupContent);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        backupContent = iv.toString('hex') + ':' + encrypted.toString('hex');
      }

      const backupFileName = `${user._id}_${new Date().toISOString().replace(/:/g, '-')}.backup`;
      const backupFilePath = path.join(this.backupPath, backupFileName);

      fs.writeFileSync(backupFilePath, backupContent);

      user.isBackedUp = true;
      user.backupCreatedAt = new Date();
      await user.save();

      return { backupId: backupFileName, ...backupData };
    } catch (error) {
      console.error('Failed to create user backup:', error);
      throw new Error('Backup creation failed');
    }
  }

  async cleanupExpiredBackups() {
    if (process.env.BACKUP_ENABLED !== 'true') {
      return;
    }
    try {
      const files = fs.readdirSync(this.backupPath);
      const now = new Date();
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.backupPath, file);
        const stats = fs.statSync(filePath);
        const retainUntil = new Date(stats.birthtime.getTime() + this.retentionDays * 24 * 60 * 60 * 1000);

        if (now > retainUntil) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired backups.`);
      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup expired backups:', error);
      throw new Error('Backup cleanup failed');
    }
  }
}

class UserCleanupService {
  constructor(backupService) {
    this.backupService = backupService;
    this.lastCleanupTime = null;
  }

  async cleanupExpiredUserData() {
    // Implement logic to clean up expired user data
    return 0;
  }

  async processExpiredDeletionRequests() {
    // Implement logic to process expired deletion requests
    return 0;
  }
}

class UserMaintenanceScheduler {
  constructor(backupService, cleanupService) {
    this.backupService = backupService;
    this.cleanupService = cleanupService;
    this.isRunning = false;
  }

  start() {
    if (process.env.BACKUP_ENABLED !== 'true') {
      console.log('Backup is disabled. Maintenance scheduler will not start.');
      return;
    }
    // Schedule cleanup to run daily at midnight
    cron.schedule(process.env.BACKUP_CRON_SCHEDULE || '0 0 * * *', async () => {
      console.log('Running daily maintenance tasks...');
      await this.backupService.cleanupExpiredBackups();
      await this.cleanupService.cleanupExpiredUserData();
      await this.cleanupService.processExpiredDeletionRequests();
      this.cleanupService.lastCleanupTime = new Date();
    });

    this.isRunning = true;
    console.log('User maintenance scheduler started.');
  }
}

module.exports = { UserBackupService, UserCleanupService, UserMaintenanceScheduler };