const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

// Import your User model
const User = require('../models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017/your_db_name';

const seedUsers = [
  // 1. Regular active user with verified email
  {
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    email: 'john.doe@example.com',
    passwordHash: 'Password123!',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    phone: '+923001234567',
    isPhoneVerified: true,
    dateOfBirth: new Date('1990-05-15'),
    gender: 'male',
    bio: 'Software developer and tech enthusiast',
    website: 'https://johndoe.dev',
    loginCount: 45,
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    sessions: [
      {
        sessionId: `${Date.now()}_${crypto.randomBytes(16).toString('hex')}`,
        device: {
          deviceId: 'device_001',
          deviceName: 'Chrome on Windows',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
          platform: 'Windows',
          browser: 'Chrome',
          os: 'Windows 10',
          ipAddress: '192.168.1.100',
          firstUsed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lastUsed: new Date(),
          isTrusted: true
        },
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastActivity: new Date()
      }
    ],
    trustedDevices: [
      {
        deviceId: 'device_001',
        deviceName: 'Chrome on Windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
        platform: 'Windows',
        browser: 'Chrome',
        os: 'Windows 10',
        ipAddress: '192.168.1.100',
        firstUsed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastUsed: new Date(),
        isTrusted: true
      }
    ],
    analytics: {
      totalSessions: 45,
      lastSessionDate: new Date(),
      totalLoginTime: 2340, // minutes
      averageSessionDuration: 52,
      deviceCount: 1,
      featuresUsed: ['profile', 'settings', 'dashboard'],
      lastActiveDate: new Date()
    },
    notifications: [
      {
        type: 'welcome',
        title: 'Welcome to the platform!',
        message: 'Thanks for joining us. Complete your profile to get started.',
        read: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'security',
        title: 'New device detected',
        message: 'We noticed a login from Chrome on Windows.',
        read: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ]
  },

  // 2. Admin user with 2FA enabled
  {
    firstName: 'Sarah',
    lastName: 'Admin',
    username: 'sarah_admin',
    email: 'sarah.admin@example.com',
    passwordHash: 'AdminPass123!',
    isEmailVerified: true,
    isActive: true,
    role: 'admin',
    permissions: ['manage_users', 'view_analytics', 'manage_content', 'system_settings'],
    twoFactorAuth: {
      isEnabled: true,
      secret: 'JBSWY3DPEHPK3PXP', // Example TOTP secret
      backupCodes: [
        crypto.createHash('sha256').update('BACKUP01').digest('hex'),
        crypto.createHash('sha256').update('BACKUP02').digest('hex'),
        crypto.createHash('sha256').update('BACKUP03').digest('hex')
      ],
      enabledAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      failedAttempts: 0,
      maxAttempts: 5
    },
    loginCount: 120,
    lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000),
    auditLogs: [
      {
        action: 'user_created',
        details: { userId: 'new_user_123' },
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        action: 'settings_updated',
        details: { setting: 'notifications' },
        ipAddress: '192.168.1.50',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ]
  },

  // 3. User with unverified email
  {
    firstName: 'Alice',
    lastName: 'Pending',
    username: 'alice_pending',
    email: 'alice.pending@example.com',
    passwordHash: 'Password123!',
    isEmailVerified: false,
    isActive: true,
    role: 'user',
    emailVerificationOTP: crypto.createHash('sha256').update('123456').digest('hex'),
    emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    loginCount: 1,
    notifications: [
      {
        type: 'account',
        title: 'Verify your email',
        message: 'Please check your email and enter the verification code.',
        read: false,
        createdAt: new Date()
      }
    ]
  },

  // 4. Locked account due to failed login attempts
  {
    firstName: 'Bob',
    lastName: 'Locked',
    username: 'bob_locked',
    email: 'bob.locked@example.com',
    passwordHash: 'Password123!',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    failedLoginAttempts: 10,
    lastFailedLogin: new Date(Date.now() - 5 * 60 * 1000),
    accountLockedUntil: new Date(Date.now() + 25 * 60 * 1000), // Locked for 25 more minutes
    lockReason: 'too_many_failed_attempts',
    auditLogs: [
      {
        action: 'account_locked',
        details: { reason: 'too_many_failed_attempts', attempts: 10 },
        ipAddress: '192.168.1.75',
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      }
    ]
  },

  // 5. User with pending password reset
  {
    firstName: 'Charlie',
    lastName: 'Reset',
    username: 'charlie_reset',
    email: 'charlie.reset@example.com',
    passwordHash: 'Password123!',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    passwordResetToken: crypto.createHash('sha256').update('reset_token_xyz').digest('hex'),
    passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    auditLogs: [
      {
        action: 'password_reset_requested',
        details: { requestedAt: new Date() },
        ipAddress: '192.168.1.80',
        timestamp: new Date()
      }
    ]
  },

  // 6. User with social accounts (Google & Facebook)
  {
    firstName: 'Diana',
    lastName: 'Social',
    username: 'diana_social',
    email: 'diana.social@example.com',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    socialAccounts: [
      {
        provider: 'google',
        providerId: 'google_12345',
        email: 'diana.social@gmail.com',
        displayName: 'Diana Social',
        profilePicture: 'https://example.com/avatar1.jpg',
        connectedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      },
      {
        provider: 'facebook',
        providerId: 'fb_67890',
        email: 'diana.social@example.com',
        displayName: 'Diana Social',
        profilePicture: 'https://example.com/avatar2.jpg',
        connectedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      }
    ],
    loginCount: 35
  },

  // 7. User with pending device verification
  {
    firstName: 'Edward',
    lastName: 'Device',
    username: 'edward_device',
    email: 'edward.device@example.com',
    passwordHash: 'Password123!',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    trustedDevices: [
      {
        deviceId: 'device_known_001',
        deviceName: 'iPhone 13',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
        platform: 'iOS',
        browser: 'Safari',
        os: 'iOS 15',
        ipAddress: '192.168.1.110',
        firstUsed: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        isTrusted: true
      }
    ],
    pendingDeviceVerifications: [
      {
        token: crypto.createHash('sha256').update('device_token_abc').digest('hex'),
        deviceId: 'device_new_002',
        deviceInfo: {
          deviceId: 'device_new_002',
          deviceName: 'Chrome on Linux',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0',
          platform: 'Linux',
          browser: 'Chrome',
          os: 'Ubuntu 22.04',
          ipAddress: '192.168.1.111'
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    ]
  },

  // 8. User with API keys
  {
    firstName: 'Fiona',
    lastName: 'Developer',
    username: 'fiona_dev',
    email: 'fiona.dev@example.com',
    passwordHash: 'Password123!',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    apiKeys: [
      {
        key: crypto.createHash('sha256').update('ak_active_key_123').digest('hex'),
        name: 'Production API',
        permissions: ['read', 'write'],
        isActive: true,
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        key: crypto.createHash('sha256').update('ak_inactive_key_456').digest('hex'),
        name: 'Testing API',
        permissions: ['read'],
        isActive: false,
        lastUsed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      }
    ]
  },

  // 9. User with pending deletion request
  {
    firstName: 'George',
    lastName: 'Deleting',
    username: 'george_deleting',
    email: 'george.deleting@example.com',
    passwordHash: 'Password123!',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    deletionToken: crypto.createHash('sha256').update('deletion_token_xyz').digest('hex'),
    deletionTokenExpires: new Date(Date.now() + 23 * 60 * 60 * 1000), // 23 hours from now
    deletionRequestedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    deletionReason: 'user_request',
    isBackedUp: true,
    backupCreatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    auditLogs: [
      {
        action: 'account_deletion_requested',
        details: {
          requestedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000)
        },
        ipAddress: '192.168.1.130',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
      }
    ]
  },

  // 10. Soft-deleted user (anonymized)
  {
    firstName: undefined,
    lastName: undefined,
    username: 'deleted_user_abc12345',
    email: 'deleted_abc12345@deleted.local',
    isEmailVerified: false,
    isActive: false,
    isDeleted: true,
    deletedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    deletionReason: 'user_request',
    role: 'user',
    sessions: [],
    trustedDevices: [],
    socialAccounts: [],
    isBackedUp: true,
    backupCreatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    auditLogs: [
      {
        action: 'account_deleted',
        details: {
          reason: 'user_request',
          originalEmail: 'original.user@example.com',
          originalUsername: 'original_user',
          deletedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          backupCreated: true
        },
        ipAddress: '192.168.1.140',
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      }
    ]
  },

  // 11. User with multiple active sessions
  {
    firstName: 'Hannah',
    lastName: 'Multi',
    username: 'hannah_multi',
    email: 'hannah.multi@example.com',
    passwordHash: 'Password123!',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    loginCount: 78,
    sessions: [
      {
        sessionId: `${Date.now()}_${crypto.randomBytes(16).toString('hex')}`,
        device: {
          deviceId: 'device_desktop',
          deviceName: 'Chrome on macOS',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          platform: 'macOS',
          browser: 'Chrome',
          os: 'macOS',
          ipAddress: '192.168.1.150',
          firstUsed: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          lastUsed: new Date(),
          isTrusted: true
        },
        isActive: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        lastActivity: new Date()
      },
      {
        sessionId: `${Date.now() + 1}_${crypto.randomBytes(16).toString('hex')}`,
        device: {
          deviceId: 'device_mobile',
          deviceName: 'Safari on iPhone',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
          platform: 'iOS',
          browser: 'Safari',
          os: 'iOS 16',
          ipAddress: '192.168.1.151',
          firstUsed: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
          isTrusted: true
        },
        isActive: true,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        sessionId: `${Date.now() + 2}_${crypto.randomBytes(16).toString('hex')}`,
        device: {
          deviceId: 'device_tablet',
          deviceName: 'Chrome on iPad',
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0)',
          platform: 'iOS',
          browser: 'Chrome',
          os: 'iPadOS 16',
          ipAddress: '192.168.1.152',
          firstUsed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          lastUsed: new Date(Date.now() - 5 * 60 * 60 * 1000),
          isTrusted: true
        },
        isActive: true,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 5 * 60 * 60 * 1000)
      }
    ],
    trustedDevices: [
      {
        deviceId: 'device_desktop',
        deviceName: 'Chrome on macOS',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'macOS',
        browser: 'Chrome',
        os: 'macOS',
        ipAddress: '192.168.1.150',
        firstUsed: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        lastUsed: new Date(),
        isTrusted: true
      },
      {
        deviceId: 'device_mobile',
        deviceName: 'Safari on iPhone',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
        platform: 'iOS',
        browser: 'Safari',
        os: 'iOS 16',
        ipAddress: '192.168.1.151',
        firstUsed: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isTrusted: true
      },
      {
        deviceId: 'device_tablet',
        deviceName: 'Chrome on iPad',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0)',
        platform: 'iOS',
        browser: 'Chrome',
        os: 'iPadOS 16',
        ipAddress: '192.168.1.152',
        firstUsed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        lastUsed: new Date(Date.now() - 5 * 60 * 60 * 1000),
        isTrusted: true
      }
    ]
  },

  // 12. User with 2FA locked due to failed attempts
  {
    firstName: 'Ian',
    lastName: 'TwoFA',
    username: 'ian_2fa',
    email: 'ian.2fa@example.com',
    passwordHash: 'Password123!',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    twoFactorAuth: {
      isEnabled: true,
      secret: 'KBSWY3DPEHPK3PXP',
      backupCodes: [
        crypto.createHash('sha256').update('BACKUP10').digest('hex'),
        crypto.createHash('sha256').update('BACKUP11').digest('hex')
      ],
      enabledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      failedAttempts: 5,
      lastFailedAttempt: new Date(Date.now() - 5 * 60 * 1000),
      lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // Locked for 10 more minutes
      maxAttempts: 5
    },
    auditLogs: [
      {
        action: '2fa_locked',
        details: { reason: 'too_many_failed_attempts', attempts: 5 },
        ipAddress: '192.168.1.160',
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      }
    ]
  },

  // 13. User with temp session (remember me flow)
  {
    firstName: 'Julia',
    lastName: 'Temp',
    username: 'julia_temp',
    email: 'julia.temp@example.com',
    passwordHash: 'Password123!',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    preferences: {
      tempSession: {
        tempSessionId: crypto.randomBytes(32).toString('hex'),
        deviceInfo: {
          deviceId: 'device_temp_001',
          deviceName: 'Firefox on Windows',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0)',
          platform: 'Windows',
          browser: 'Firefox',
          os: 'Windows 11',
          ipAddress: '192.168.1.170'
        },
        ip: '192.168.1.170',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0)',
        rememberMe: true,
        expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes from now
        createdAt: new Date(Date.now() - 2 * 60 * 1000)
      },
      language: 'en',
      timezone: 'America/New_York',
      theme: 'dark',
      notifications: {
        email: {
          enabled: true,
          security: true,
          marketing: true,
          updates: true
        },
        push: {
          enabled: true,
          security: true,
          marketing: false,
          updates: true
        },
        sms: {
          enabled: true,
          security: true,
          marketing: false
        }
      },
      privacy: {
        profileVisibility: 'friends',
        locationSharing: true,
        dataCollection: {
          analytics: true,
          marketing: false,
          personalization: true
        }
      }
    }
  },

  // 14. Superadmin user with full permissions
  {
    firstName: 'Super',
    lastName: 'Admin',
    username: 'superadmin',
    email: 'superadmin@example.com',
    passwordHash: 'SuperAdmin123!',
    isEmailVerified: true,
    isActive: true,
    role: 'superadmin',
    permissions: [
      'manage_users',
      'manage_admins',
      'view_analytics',
      'manage_content',
      'system_settings',
      'manage_permissions',
      'view_audit_logs',
      'manage_api_keys',
      'backup_restore'
    ],
    twoFactorAuth: {
      isEnabled: true,
      secret: 'LBSWY3DPEHPK3PXP',
      backupCodes: [
        crypto.createHash('sha256').update('SUPER01').digest('hex'),
        crypto.createHash('sha256').update('SUPER02').digest('hex'),
        crypto.createHash('sha256').update('SUPER03').digest('hex'),
        crypto.createHash('sha256').update('SUPER04').digest('hex')
      ],
      enabledAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(),
      failedAttempts: 0,
      maxAttempts: 5
    },
    loginCount: 500,
    lastLogin: new Date(),
    analytics: {
      totalSessions: 500,
      lastSessionDate: new Date(),
      totalLoginTime: 15000,
      averageSessionDuration: 30,
      deviceCount: 2,
      featuresUsed: ['admin_panel', 'user_management', 'analytics', 'settings'],
      lastActiveDate: new Date()
    }
  },

  // 15. User with custom privacy settings and full profile
  {
    firstName: 'Karen',
    lastName: 'Privacy',
    username: 'karen_privacy',
    email: 'karen.privacy@example.com',
    passwordHash: 'Password123!',
    phone: '+923009876543',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    role: 'user',
    dateOfBirth: new Date('1988-11-20'),
    gender: 'female',
    bio: 'Privacy advocate and data protection enthusiast',
    website: 'https://privacy-matters.org',
    profilePicture: 'https://example.com/karen-avatar.jpg',
    preferences: {
      language: 'en',
      timezone: 'Europe/London',
      theme: 'auto',
      notifications: {
        email: {
          enabled: true,
          security: true,
          marketing: false,
          updates: false
        },
        push: {
          enabled: false,
          security: true,
          marketing: false,
          updates: false
        },
        sms: {
          enabled: false,
          security: false,
          marketing: false
        }
      },
      privacy: {
        profileVisibility: 'private',
        locationSharing: false,
        dataCollection: {
          analytics: false,
          marketing: false,
          personalization: false
        }
      }
    },
    notifications: [
      {
        type: 'security',
        title: 'Privacy settings updated',
        message: 'Your privacy preferences have been saved.',
        read: true,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    ]
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional - comment out if you want to keep existing data)
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Insert seed users
    const createdUsers = [];
    for (const userData of seedUsers) {
      try {
        const user = new User(userData);
        await user.save();
        createdUsers.push(user);
        console.log(`✅ Created user: ${user.username} (${user.email})`);
      } catch (error) {
        console.error(`❌ Failed to create user ${userData.username}:`, error.message);
      }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`Total users created: ${createdUsers.length}`);
    console.log(`Users with 2FA: ${createdUsers.filter(u => u.twoFactorAuth?.isEnabled).length}`);
    console.log(`Admin users: ${createdUsers.filter(u => u.role === 'admin' || u.role === 'superadmin').length}`);
    console.log(`Locked accounts: ${createdUsers.filter(u => u.isLocked).length}`);
    console.log(`Soft-deleted users: ${createdUsers.filter(u => u.isDeleted).length}`);
    console.log(`Users with pending deletion: ${createdUsers.filter(u => u.hasPendingDeletion).length}`);
    console.log(`Users with social accounts: ${createdUsers.filter(u => u.socialAccounts?.length > 0).length}`);

    console.log('\n🎉 Database seeded successfully!');
    
    // Print credentials for testing
    console.log('\n🔑 Test Credentials:');
    console.log('─'.repeat(80));
    console.log('Regular User:');
    console.log('  Email: john.doe@example.com | Password: Password123!');
    console.log('\nAdmin User (with 2FA):');
    console.log('  Email: sarah.admin@example.com | Password: AdminPass123!');
    console.log('  2FA Secret: JBSWY3DPEHPK3PXP (use with authenticator app)');
    console.log('\nSuperadmin User (with 2FA):');
    console.log('  Email: superadmin@example.com | Password: SuperAdmin123!');
    console.log('  2FA Secret: LBSWY3DPEHPK3PXP');
    console.log('\nUnverified Email User:');
    console.log('  Email: alice.pending@example.com | Password: Password123!');
    console.log('  Verification OTP: 123456');
    console.log('\nLocked Account:');
    console.log('  Email: bob.locked@example.com | Password: Password123!');
    console.log('  Status: Locked due to failed attempts');
    console.log('\nPassword Reset User:');
    console.log('  Email: charlie.reset@example.com | Password: Password123!');
    console.log('  Reset Token: reset_token_xyz');
    console.log('\nSocial Auth User:');
    console.log('  Email: diana.social@example.com');
    console.log('  Providers: Google, Facebook');
    console.log('\nPending Device Verification:');
    console.log('  Email: edward.device@example.com | Password: Password123!');
    console.log('  Device Token: device_token_abc');
    console.log('\nAPI Keys User:');
    console.log('  Email: fiona.dev@example.com | Password: Password123!');
    console.log('  Active API Key: ak_active_key_123');
    console.log('\nPending Deletion User:');
    console.log('  Email: george.deleting@example.com | Password: Password123!');
    console.log('  Deletion Token: deletion_token_xyz');
    console.log('\nMultiple Sessions User:');
    console.log('  Email: hannah.multi@example.com | Password: Password123!');
    console.log('  Active Sessions: 3 (Desktop, Mobile, Tablet)');
    console.log('\n2FA Locked User:');
    console.log('  Email: ian.2fa@example.com | Password: Password123!');
    console.log('  Status: 2FA locked for 10 minutes');
    console.log('\nTemp Session User:');
    console.log('  Email: julia.temp@example.com | Password: Password123!');
    console.log('  Has active temp session with remember me');
    console.log('\nPrivacy-Focused User:');
    console.log('  Email: karen.privacy@example.com | Password: Password123!');
    console.log('  Privacy: All data collection disabled');
    console.log('─'.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();