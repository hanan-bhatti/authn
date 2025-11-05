const express = require('express');
const crypto = require('crypto');
const UserPermission = require('../models/Userpermissions'); // Adjust path as needed
const { authorize } = require('../middleware/auth'); // Your auth middleware

const router = express.Router();

// Middleware to ensure user is authenticated
router.use(authorize);

/**
 * Generate device fingerprint hash
 * POST /api/permissions/device-fingerprint
 */
router.post('/device-fingerprint', async (req, res) => {
    try {
        const fingerprint = UserPermission.generateDeviceFingerprint(req);
        res.json({ fingerprint });
    } catch (error) {
        console.error('Device fingerprint generation error:', error);
        res.status(500).json({ error: 'Failed to generate device fingerprint' });
    }
});

/**
 * Get user's permission states for current device
 * GET /api/permissions/user-permissions
 */
router.get('/user-permissions', async (req, res) => {
    try {
        const userId = req.user.id;
        const username = req.user.username;

        let userPermissions = await UserPermission.findOne({ userId });
        
        if (!userPermissions) {
            userPermissions = await UserPermission.createOrUpdateUserPermissions(userId, username);
        }

        // Generate current device fingerprint
        const deviceFingerprint = UserPermission.generateDeviceFingerprint(req);
        
        // Filter permissions for current device
        const devicePermissions = userPermissions.permissions.filter(
            p => p.deviceFingerprint.hash === deviceFingerprint.hash
        );

        res.json({
            userId: userPermissions.userId,
            username: userPermissions.username,
            permissions: devicePermissions,
            globalSettings: userPermissions.globalSettings,
            analytics: userPermissions.analytics
        });
    } catch (error) {
        console.error('Get user permissions error:', error);
        res.status(500).json({ error: 'Failed to retrieve permissions' });
    }
});

/**
 * Check if should ask for permission
 * POST /api/permissions/should-ask-permission
 */
router.post('/should-ask-permission', async (req, res) => {
    try {
        const { permissionType, deviceHash } = req.body;
        const userId = req.user.id;

        if (!permissionType || !deviceHash) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const userPermissions = await UserPermission.findOne({ userId });
        
        if (!userPermissions) {
            return res.json({ 
                should: true, 
                strategy: 'contextual',
                benefits: userPermissions ? userPermissions.getRelevantBenefits(permissionType) : []
            });
        }

        const shouldAsk = userPermissions.shouldAskPermission(permissionType, deviceHash);
        res.json(shouldAsk);
    } catch (error) {
        console.error('Should ask permission check error:', error);
        res.status(500).json({ error: 'Failed to check permission requirements' });
    }
});

/**
 * Record permission response
 * POST /api/permissions/record-permission
 */
router.post('/record-permission', async (req, res) => {
    try {
        const { permissionType, response, deviceFingerprint } = req.body;
        const userId = req.user.id;
        const username = req.user.username;

        if (!permissionType || !response || !deviceFingerprint) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Valid responses
        const validResponses = ['granted', 'denied', 'prompt'];
        if (!validResponses.includes(response)) {
            return res.status(400).json({ error: 'Invalid permission response' });
        }

        let userPermissions = await UserPermission.findOne({ userId });
        
        if (!userPermissions) {
            userPermissions = await UserPermission.createOrUpdateUserPermissions(userId, username);
        }

        // Record the permission response
        await userPermissions.recordPermissionResponse(permissionType, deviceFingerprint, response);
        
        // Update analytics
        userPermissions.updateAnalytics(deviceFingerprint.hash);
        await userPermissions.save();

        res.json({ 
            success: true, 
            message: 'Permission response recorded',
            nextAskTime: userPermissions.getPermissionForDevice(permissionType, deviceFingerprint.hash)?.nextAskTime
        });
    } catch (error) {
        console.error('Record permission error:', error);
        res.status(500).json({ error: 'Failed to record permission response' });
    }
});

/**
 * Get permission analytics for user
 * GET /api/permissions/permission-analytics
 */
router.get('/permission-analytics', async (req, res) => {
    try {
        const userId = req.user.id;

        const userPermissions = await UserPermission.findOne({ userId });
        
        if (!userPermissions) {
            return res.json({
                totalPermissions: 0,
                grantedCount: 0,
                deniedCount: 0,
                devices: 0,
                permissions: []
            });
        }

        // Calculate analytics
        const deviceHashes = new Set();
        const permissionsByType = {};
        
        userPermissions.permissions.forEach(permission => {
            deviceHashes.add(permission.deviceFingerprint.hash);
            
            if (!permissionsByType[permission.type]) {
                permissionsByType[permission.type] = {
                    type: permission.type,
                    granted: 0,
                    denied: 0,
                    total: 0,
                    devices: new Set()
                };
            }
            
            permissionsByType[permission.type].total++;
            permissionsByType[permission.type].devices.add(permission.deviceFingerprint.hash);
            
            if (permission.status === 'granted') {
                permissionsByType[permission.type].granted++;
            } else if (permission.status === 'denied') {
                permissionsByType[permission.type].denied++;
            }
        });

        // Convert to array and clean up
        const permissionAnalytics = Object.values(permissionsByType).map(p => ({
            ...p,
            devices: p.devices.size
        }));

        res.json({
            totalPermissions: userPermissions.permissions.length,
            grantedCount: userPermissions.analytics.totalPermissionsGranted,
            deniedCount: userPermissions.analytics.totalPermissionsDenied,
            devices: deviceHashes.size,
            permissions: permissionAnalytics,
            averageTimeToGrant: userPermissions.analytics.averageTimeToGrant,
            lastActivity: userPermissions.analytics.lastActivity
        });
    } catch (error) {
        console.error('Permission analytics error:', error);
        res.status(500).json({ error: 'Failed to get permission analytics' });
    }
});

/**
 * Update global permission settings
 * PUT /api/permissions/permission-settings
 */
router.put('/permission-settings', async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            permissionPromptingEnabled,
            respectDoNotAsk,
            maxAskAttempts,
            cooldownPeriod
        } = req.body;

        const userPermissions = await UserPermission.findOne({ userId });
        
        if (!userPermissions) {
            return res.status(404).json({ error: 'User permissions not found' });
        }

        // Update settings
        if (typeof permissionPromptingEnabled === 'boolean') {
            userPermissions.globalSettings.permissionPromptingEnabled = permissionPromptingEnabled;
        }
        
        if (typeof respectDoNotAsk === 'boolean') {
            userPermissions.globalSettings.respectDoNotAsk = respectDoNotAsk;
        }
        
        if (typeof maxAskAttempts === 'number' && maxAskAttempts > 0 && maxAskAttempts <= 10) {
            userPermissions.globalSettings.maxAskAttempts = maxAskAttempts;
        }
        
        if (typeof cooldownPeriod === 'number' && cooldownPeriod >= 60000) { // Minimum 1 minute
            userPermissions.globalSettings.cooldownPeriod = cooldownPeriod;
        }

        await userPermissions.save();

        res.json({
            success: true,
            settings: userPermissions.globalSettings
        });
    } catch (error) {
        console.error('Update permission settings error:', error);
        res.status(500).json({ error: 'Failed to update permission settings' });
    }
});

/**
 * Revoke permission for current device
 * DELETE /api/permissions/revoke-permission/:type
 */
router.delete('/revoke-permission/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const userId = req.user.id;

        const deviceFingerprint = UserPermission.generateDeviceFingerprint(req);
        const userPermissions = await UserPermission.findOne({ userId });
        
        if (!userPermissions) {
            return res.status(404).json({ error: 'User permissions not found' });
        }

        // Find and update the specific permission
        const permission = userPermissions.getPermissionForDevice(type, deviceFingerprint.hash);
        
        if (!permission) {
            return res.status(404).json({ error: 'Permission not found for this device' });
        }

        permission.status = 'denied';
        permission.deniedAt = new Date();
        permission.nextAskTime = userPermissions.calculateNextAskTime(permission);

        await userPermissions.save();

        res.json({
            success: true,
            message: 'Permission revoked successfully'
        });
    } catch (error) {
        console.error('Revoke permission error:', error);
        res.status(500).json({ error: 'Failed to revoke permission' });
    }
});

/**
 * Get permissions that are due for asking
 * GET /api/permissions/pending-permissions
 */
router.get('/pending-permissions', async (req, res) => {
    try {
        const userId = req.user.id;
        const deviceFingerprint = UserPermission.generateDeviceFingerprint(req);

        const userPermissions = await UserPermission.findOne({ userId });
        
        if (!userPermissions) {
            return res.json({ pending: [] });
        }

        const now = new Date();
        const pending = [];

        ['location', 'notification'].forEach(type => {
            const shouldAsk = userPermissions.shouldAskPermission(type, deviceFingerprint.hash);
            
            if (shouldAsk.should) {
                pending.push({
                    type,
                    strategy: shouldAsk.strategy,
                    benefits: shouldAsk.benefits || userPermissions.getRelevantBenefits(type)
                });
            }
        });

        res.json({ pending });
    } catch (error) {
        console.error('Get pending permissions error:', error);
        res.status(500).json({ error: 'Failed to get pending permissions' });
    }
});

/**
 * Reset permission asking for a specific type (admin/debug endpoint)
 * POST /api/permissions/reset-permission-asking/:type
 */
router.post('/reset-permission-asking/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const userId = req.user.id;
        const deviceFingerprint = UserPermission.generateDeviceFingerprint(req);

        const userPermissions = await UserPermission.findOne({ userId });
        
        if (!userPermissions) {
            return res.status(404).json({ error: 'User permissions not found' });
        }

        const permission = userPermissions.getPermissionForDevice(type, deviceFingerprint.hash);
        
        if (permission) {
            permission.askCount = 0;
            permission.nextAskTime = null;
            permission.lastAskedAt = null;
            permission.status = 'never_asked';
            
            await userPermissions.save();
        }

        res.json({
            success: true,
            message: 'Permission asking reset successfully'
        });
    } catch (error) {
        console.error('Reset permission asking error:', error);
        res.status(500).json({ error: 'Failed to reset permission asking' });
    }
});

/**
 * Cleanup old permissions (maintenance endpoint)
 * POST /api/permissions/cleanup-permissions
 */
router.post('/cleanup-permissions', async (req, res) => {
    try {
        const { olderThan = 90 } = req.body; // Days
        const cutoffDate = new Date(Date.now() - (olderThan * 24 * 60 * 60 * 1000));

        const result = await UserPermission.updateMany(
            {},
            {
                $pull: {
                    permissions: {
                        lastAskedAt: { $lt: cutoffDate },
                        status: { $in: ['denied', 'never_asked'] }
                    }
                }
            }
        );

        res.json({
            success: true,
            message: `Cleaned up old permissions older than ${olderThan} days`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Cleanup permissions error:', error);
        res.status(500).json({ error: 'Failed to cleanup permissions' });
    }
});

module.exports = router;