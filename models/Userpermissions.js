const mongoose = require('mongoose');

// Device fingerprint schema for unique device identification
const deviceFingerprintSchema = new mongoose.Schema({
    userAgent: String,
    screenResolution: String,
    timezone: String,
    language: String,
    platform: String,
    cookiesEnabled: Boolean,
    doNotTrack: String,
    deviceMemory: Number,
    hardwareConcurrency: Number,
    colorDepth: Number,
    pixelRatio: Number,
    hash: { type: String, unique: true } // Generated hash of above properties
}, { _id: false });

// Permission tracking schema
const permissionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['location', 'notification', 'camera', 'microphone', 'storage'],
        required: true
    },
    status: {
        type: String,
        enum: ['granted', 'denied', 'prompt', 'never_asked'],
        default: 'never_asked'
    },
    grantedAt: Date,
    deniedAt: Date,
    lastAskedAt: Date,
    askCount: { type: Number, default: 0 },
    deviceFingerprint: deviceFingerprintSchema,
    benefits: [{
        shown: Boolean,
        shownAt: Date,
        benefitType: String // 'weather_theme', 'location_services', etc.
    }],
    nextAskTime: Date, // When to ask again if denied
    strategy: {
        type: String,
        enum: ['immediate', 'delayed', 'contextual', 'benefit_driven'],
        default: 'contextual'
    }
}, { _id: false });

// Main user permissions schema
const userPermissionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true,
        index: true
    },
    permissions: [permissionSchema],
    globalSettings: {
        permissionPromptingEnabled: { type: Boolean, default: true },
        respectDoNotAsk: { type: Boolean, default: true },
        maxAskAttempts: { type: Number, default: 5 },
        cooldownPeriod: { type: Number, default: 24 * 60 * 60 * 1000 }, // 24 hours in ms
    },
    analytics: {
        totalPermissionsGranted: { type: Number, default: 0 },
        totalPermissionsDenied: { type: Number, default: 0 },
        averageTimeToGrant: Number, // in milliseconds
        mostActiveDevice: String,
        lastActivity: Date
    }
}, {
    timestamps: true,
    collection: 'user_permissions'
});

// Indexes for better performance
userPermissionSchema.index({ userId: 1, username: 1 });
userPermissionSchema.index({ 'permissions.type': 1, 'permissions.status': 1 });
userPermissionSchema.index({ 'permissions.deviceFingerprint.hash': 1 });
userPermissionSchema.index({ 'permissions.nextAskTime': 1 });

// Methods
userPermissionSchema.methods.getPermissionForDevice = function(permissionType, deviceHash) {
    return this.permissions.find(p => 
        p.type === permissionType && 
        p.deviceFingerprint.hash === deviceHash
    );
};

userPermissionSchema.methods.hasPermissionOnDevice = function(permissionType, deviceHash) {
    const permission = this.getPermissionForDevice(permissionType, deviceHash);
    return permission && permission.status === 'granted';
};

userPermissionSchema.methods.shouldAskPermission = function(permissionType, deviceHash) {
    const permission = this.getPermissionForDevice(permissionType, deviceHash);
    
    if (!permission || permission.status === 'never_asked') {
        return { should: true, strategy: 'contextual' };
    }
    
    if (permission.status === 'granted') {
        return { should: false, reason: 'already_granted' };
    }
    
    if (permission.askCount >= this.globalSettings.maxAskAttempts) {
        return { should: false, reason: 'max_attempts_reached' };
    }
    
    if (permission.nextAskTime && new Date() < permission.nextAskTime) {
        return { should: false, reason: 'cooldown_active' };
    }
    
    // Intelligent retry logic
    const timeSinceLastAsk = Date.now() - (permission.lastAskedAt?.getTime() || 0);
    const cooldownPassed = timeSinceLastAsk > this.globalSettings.cooldownPeriod;
    
    if (cooldownPassed) {
        return { 
            should: true, 
            strategy: this.getOptimalStrategy(permission),
            benefits: this.getRelevantBenefits(permissionType)
        };
    }
    
    return { should: false, reason: 'cooldown_active' };
};

userPermissionSchema.methods.getOptimalStrategy = function(permission) {
    // Determine the best approach based on user behavior
    if (permission.askCount === 0) return 'contextual';
    if (permission.askCount === 1) return 'benefit_driven';
    if (permission.askCount >= 2) return 'delayed';
    return 'contextual';
};

userPermissionSchema.methods.getRelevantBenefits = function(permissionType) {
    const benefits = {
        location: [
            '🎨 Get beautiful weather-based themes that match your local conditions',
            '🌤️ Enjoy automatic dark/light mode based on sunrise/sunset times',
            '📍 Receive location-relevant content and suggestions',
            '⚡ Faster weather updates without manual city selection'
        ],
        notification: [
            '🔔 Stay updated with important announcements',
            '📱 Get real-time notifications for theme updates',
            '⏰ Receive reminders for important events',
            '🎯 Get personalized alerts based on your activity'
        ]
    };
    
    return benefits[permissionType] || [];
};

userPermissionSchema.methods.recordPermissionResponse = function(permissionType, deviceFingerprint, response) {
    let permission = this.getPermissionForDevice(permissionType, deviceFingerprint.hash);
    
    if (!permission) {
        permission = {
            type: permissionType,
            status: response,
            askCount: 1,
            deviceFingerprint: deviceFingerprint,
            benefits: [],
            strategy: 'contextual'
        };
        this.permissions.push(permission);
    } else {
        permission.status = response;
        permission.askCount += 1;
    }
    
    const now = new Date();
    
    if (response === 'granted') {
        permission.grantedAt = now;
        this.analytics.totalPermissionsGranted += 1;
        
        // Calculate average time to grant
        if (permission.lastAskedAt) {
            const timeToGrant = now.getTime() - permission.lastAskedAt.getTime();
            this.analytics.averageTimeToGrant = this.analytics.averageTimeToGrant 
                ? (this.analytics.averageTimeToGrant + timeToGrant) / 2 
                : timeToGrant;
        }
    } else if (response === 'denied') {
        permission.deniedAt = now;
        permission.nextAskTime = this.calculateNextAskTime(permission);
        this.analytics.totalPermissionsDenied += 1;
    }
    
    permission.lastAskedAt = now;
    this.analytics.lastActivity = now;
    
    return this.save();
};

userPermissionSchema.methods.calculateNextAskTime = function(permission) {
    // Progressive delay: increase time between asks
    const baseDelay = this.globalSettings.cooldownPeriod; // 24 hours
    const multiplier = Math.min(permission.askCount, 5); // Cap at 5x
    const randomFactor = 0.5 + (Math.random() * 0.5); // 50%-100% of calculated time
    
    const delay = baseDelay * multiplier * randomFactor;
    return new Date(Date.now() + delay);
};

userPermissionSchema.methods.updateAnalytics = function(deviceHash) {
    // Track most active device
    const devicePermissions = this.permissions.filter(p => p.deviceFingerprint.hash === deviceHash);
    if (devicePermissions.length > 0) {
        this.analytics.mostActiveDevice = deviceHash;
    }
};

// Static methods for creating and managing permissions
userPermissionSchema.statics.createOrUpdateUserPermissions = async function(userId, username) {
    let userPermissions = await this.findOne({ userId });
    
    if (!userPermissions) {
        userPermissions = new this({
            userId,
            username,
            permissions: []
        });
    } else {
        userPermissions.username = username; // Update username if changed
    }
    
    return userPermissions.save();
};

userPermissionSchema.statics.generateDeviceFingerprint = function(req) {
    const userAgent = req.get('User-Agent') || '';
    const acceptLanguage = req.get('Accept-Language') || '';
    const acceptEncoding = req.get('Accept-Encoding') || '';
    
    // Get additional data from client-side (would be sent in request body)
    const clientData = req.body.deviceInfo || {};
    
    const fingerprintData = {
        userAgent,
        screenResolution: clientData.screenResolution || '',
        timezone: clientData.timezone || '',
        language: acceptLanguage,
        platform: clientData.platform || '',
        cookiesEnabled: clientData.cookiesEnabled || true,
        doNotTrack: req.get('DNT') || '',
        deviceMemory: clientData.deviceMemory || 0,
        hardwareConcurrency: clientData.hardwareConcurrency || 0,
        colorDepth: clientData.colorDepth || 0,
        pixelRatio: clientData.pixelRatio || 1
    };
    
    // Create hash from fingerprint data
    const crypto = require('crypto');
    const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(fingerprintData))
        .digest('hex');
    
    return {
        ...fingerprintData,
        hash
    };
};

module.exports = mongoose.model('UserPermission', userPermissionSchema);