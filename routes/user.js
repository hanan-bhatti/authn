const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, param, query, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const axios = require('axios');

const User = require('../models/User');
const {
  authenticateToken,
  authorize,
  requireEmailVerification,
} = require('../middleware/auth');
const {
  ApiResponse,
  ApiError,
  asyncHandler,
  validateRequest,
  sanitizeUser,
  logActivity
} = require('../utils/helpers');
const { sendEmail } = require('../services/email');
const { uploadToS3, deleteFromS3, generateSignedUrl } = require('../services/storage');

const router = express.Router();

// Apply security middleware
router.use(helmet());

// Rate limiting configurations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: { error: 'Too many upload attempts, please try again later' },
});

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new ApiError('Only image files (JPEG, PNG, WebP) are allowed', 400));
    }
  }
});



const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters long')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters long')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('website')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Website must be a valid URL'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();

      if (age < 13 || age > 120) {
        throw new Error('Invalid birth date');
      }
      return true;
    }),
  body('phone').optional().isMobilePhone(),
];

// =============================================================================
// AUTHENTICATION ROUTES
// =============================================================================

/**
 * @route   POST /api/users/logout
 * @desc    Logout user and invalidate session
 * @access  Private
 */
router.post('/logout',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);

    if (user && req.user.sessionId && user.revokeSession) {
      user.revokeSession(req.user.sessionId);
      if (user.addAuditLog) {
        user.addAuditLog('logout', {}, req);
      }
      await user.save();
    }

    res.clearCookie('token');

    res.json(new ApiResponse({
      message: 'Logged out successfully'
    }));
  })
);

/**
 * @route   POST /api/users/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);

    if (user && user.revokeAllSessions) {
      user.revokeAllSessions(req.user.sessionId);
      if (user.addAuditLog) {
        user.addAuditLog('logout_all_devices', {}, req);
      }
      await user.save();
    }

    res.clearCookie('token');

    res.json(new ApiResponse({
      message: 'Logged out from all devices successfully'
    }));
  })
);

 /**
 * @route   PUT /api/users/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.put('/change-password',
  authenticateToken,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      throw new ApiError('Current password is incorrect', 400);
    }

    // Set new password
    user.passwordHash = newPassword;
    if (user.addAuditLog) {
      user.addAuditLog('password_change', {}, req);
    }
    if (user.addNotification) {
      user.addNotification('security', 'Password Changed', 'Your password has been successfully changed.');
    }

    await user.save();

    res.json(new ApiResponse({
      message: 'Password changed successfully'
    }));
  })
);

// =============================================================================
// TWO-FACTOR AUTHENTICATION ROUTES - FIXED
// =============================================================================

/**
 * @route   POST /api/users/2fa/setup
 * @desc    Setup 2FA for user account - FIXED
 * @access  Private
 */
router.post('/2fa/setup',
  authenticateToken,
  requireEmailVerification,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (user.twoFactorAuth?.isEnabled) {
      throw new ApiError('2FA is already enabled', 400);
    }

    // Initialize twoFactorAuth if it doesn't exist
    if (!user.twoFactorAuth) {
      user.twoFactorAuth = {
        isEnabled: false,
        secret: null,
        backupCodes: [],
        lastUsed: null
      };
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Authn (${user.email})`,
      issuer: 'Authn',
      length: 32
    });

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      backupCodes.push({ code, hashedCode });
    }

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (not enabled yet)
    user.twoFactorAuth.secret = secret.base32;
    user.twoFactorAuth.backupCodes = backupCodes.map(bc => bc.hashedCode);

    await user.save();

    res.json(new ApiResponse({
      message: '2FA setup initiated. Please scan the QR code with your authenticator app.',
      data: {
        qrCodeUrl,
        secret: secret.base32,
        backupCodes: backupCodes.map(bc => bc.code)
      }
    }));
  })
);

/**
 * @route   POST /api/users/2fa/verify-setup
 * @desc    Verify and enable 2FA
 * @access  Private
 */
router.post('/2fa/verify-setup',
  authenticateToken,
  [
    body('token')
      .isLength({ min: 6, max: 6 })
      .withMessage('2FA token must be 6 digits')
      .isNumeric()
      .withMessage('2FA token must contain only numbers')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (user.twoFactorAuth?.isEnabled) {
      throw new ApiError('2FA is already enabled', 400);
    }

    if (!user.twoFactorAuth?.secret) {
      throw new ApiError('2FA setup not initiated', 400);
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorAuth.secret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      throw new ApiError('Invalid verification code', 400);
    }

    user.twoFactorAuth.isEnabled = true;
    if (user.addAuditLog) {
      user.addAuditLog('2 factor authentication enabled', {}, req);
    }
    if (user.addNotification) {
      user.addNotification('security', '2FA Enabled', 'Two-factor authentication has been enabled for your account.');
    }

    await user.save();

    res.json(new ApiResponse({
      message: '2FA has been successfully enabled',
      data: {
        user: sanitizeUser(user)
      }
    }));
  })
);

/**
 * @route   POST /api/users/2fa/verify
 * @desc    Verify 2FA
 * @access  Private
 */
router.post('/2fa/verify',
  authenticateToken,
  [
    body('token')
      .notEmpty()
      .withMessage('2FA token is required')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (!user.twoFactorAuth?.isEnabled) {
      throw new ApiError('2FA is not enabled', 400);
    }

    let isValid = false;

    // Check if it's a regular TOTP token
    if (token.length === 6 && /^\d+$/.test(token)) {
      isValid = speakeasy.totp.verify({
        secret: user.twoFactorAuth.secret,
        encoding: 'base32',
        token,
        window: 2
      });
    }
    // Check if it's a backup code
    else if (token.length === 8) {
      const hashedToken = crypto.createHash('sha256').update(token.toUpperCase()).digest('hex');
      const backupIndex = user.twoFactorAuth.backupCodes.findIndex(code => code === hashedToken);

      if (backupIndex !== -1) {
        // Remove used backup code
        user.twoFactorAuth.backupCodes.splice(backupIndex, 1);
        isValid = true;
      }
    }

    if (!isValid) {
      throw new ApiError('Invalid 2FA token', 400);
    }

    user.twoFactorAuth.lastUsed = new Date();
    await user.save();

    res.json(new ApiResponse({
      message: '2FA verification successful'
    }));
  })
);

/**
 * @route   DELETE /api/users/2fa/disable
 * @desc    Disable 2FA - FIXED
 * @access  Private
 */
router.delete('/2fa/disable',
  authenticateToken,
  [
    body('password')
      .notEmpty()
      .withMessage('Password is required to disable 2FA')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (!user.twoFactorAuth?.isEnabled) {
      throw new ApiError('2FA is not enabled', 400);
    }

    // Verify password
    if (!(await user.comparePassword(password))) {
      throw new ApiError('Incorrect password', 400);
    }

    user.twoFactorAuth.isEnabled = false;
    user.twoFactorAuth.secret = undefined;
    user.twoFactorAuth.backupCodes = [];
    user.twoFactorAuth.lastUsed = undefined;

    if (user.addAuditLog) {
      user.addAuditLog('2fa_disabled', {}, req);
    }
    if (user.addNotification) {
      user.addNotification('security', '2FA Disabled', 'Two-factor authentication has been disabled for your account.');
    }

    await user.save();

    res.json(new ApiResponse({
      message: '2FA has been disabled successfully'
    }));
  })
);

/**
 * @route   GET /api/users/2fa/setup/backup-codes
 * @desc    Get backup codes during initial 2FA setup
 * @access  Private (no 2FA required)
 */
router.get('/2fa/setup/backup-codes',
  authenticateToken,
  requireEmailVerification,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Allow access if 2FA is not enabled yet OR if it's enabled but we're in setup mode
    if (!user.twoFactorAuth.isEnabled && !user.twoFactorAuth.tempSecret) {
      throw new ApiError('2FA setup not initiated', 400);
    }

    // Generate backup codes for setup
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store hashed backup codes
    user.twoFactorAuth.backupCodes = backupCodes.map(code =>
      crypto.createHash('sha256').update(code).digest('hex')
    );

    // @ts-ignore
    user.addAuditLog('backup_codes_generated_setup', {}, req);
    await user.save();

    res.json(new ApiResponse({
      message: 'Backup codes generated for 2FA setup',
      data: {
        backupCodes
      }
    }));
  })
);

/**
 * @route   GET /api/users/2fa/backup-codes
 * @desc    View existing backup codes status (requires 2FA)
 * @access  Private (2FA required)
 */
router.get('/2fa/backup-codes',
  authenticateToken,
  requireEmailVerification,
  asyncHandler(async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        throw new ApiError('User not found', 404);
      }

      if (!user.twoFactorAuth.isEnabled) {
        throw new ApiError('2FA is not enabled', 400);
      }

      // Don't return the actual codes for security - just confirm they exist
      const hasBackupCodes = user.twoFactorAuth.backupCodes && user.twoFactorAuth.backupCodes.length > 0;

      res.json(new ApiResponse({
        message: 'Backup codes status retrieved',
        data: {
          hasBackupCodes,
          codeCount: hasBackupCodes ? user.twoFactorAuth.backupCodes.length : 0,
          message: hasBackupCodes ?
            'Backup codes are available. Use regenerate to get new ones.' :
            'No backup codes available. Generate new ones.'
        }
      }));
    } catch (error) {
      console.error('Error in GET /2fa/backup-codes:', error);

      // Re-throw ApiErrors as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle unexpected errors
      throw new ApiError('Failed to retrieve backup codes status', 500);
    }
  })
);

/**
 * @route   POST /api/users/2fa/backup-codes/regenerate
 * @desc    Regenerate backup codes (requires 2FA)
 * @access  Private (2FA required)
 */
router.post('/2fa/backup-codes/regenerate',
  authenticateToken,
  requireEmailVerification,
  asyncHandler(async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        throw new ApiError('User not found', 404);
      }

      if (!user.twoFactorAuth.isEnabled) {
        throw new ApiError('2FA is not enabled', 400);
      }

      // Generate new backup codes (8 codes, 8 characters each)
      const backupCodes = Array.from({ length: 8 }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Hash and store the backup codes
      user.twoFactorAuth.backupCodes = backupCodes.map(code =>
        crypto.createHash('sha256').update(code).digest('hex')
      );

      // Add audit log
      // @ts-ignore
      user.addAuditLog('backup_codes_regenerated', {
        timestamp: new Date(),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      }, req);

      await user.save();

      // Return the plain text codes (only time they're visible)
      res.json(new ApiResponse({
        message: 'New backup codes generated successfully',
        data: {
          backupCodes,
          count: backupCodes.length,
          warning: 'These codes will not be shown again. Save them securely.'
        }
      }));
    } catch (error) {
      console.error('Error in POST /2fa/backup-codes/regenerate:', error);

      // Re-throw ApiErrors as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle unexpected errors
      throw new ApiError('Failed to generate backup codes', 500);
    }
  })
);

// =============================================================================
// PROFILE MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile',
  generalLimiter,
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId).select('-passwordHash -twoFactorAuth.secret -twoFactorAuth.backupCodes -emailVerificationOTP -passwordResetToken');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Add phone carrier info if available
    let phoneInfo = null;
    if (user.phone) {
      try {
        const phoneValidation = await validatePhoneNumber(user.phone);
        phoneInfo = {
          carrier: phoneValidation.carrier,
          phoneType: phoneValidation.phoneType,
          localNumber: phoneValidation.localNumber
        };
      } catch (error) {
        console.warn('Phone validation failed:', error && error.message ? error.message : error);
        phoneInfo = null;
      }
    }

    const userData = sanitizeUser(user);
    if (phoneInfo) {
      userData.phoneInfo = phoneInfo;
    }

    // Handle profile picture with signed URL for private bucket
    if (user.profilePicture || user.avatar) {
      const imageUrl = user.profilePicture || user.avatar;
      try {
        // Generate signed URL for private S3 bucket
        userData.profilePicture = await generateSignedUrl(imageUrl);
        userData.avatar = userData.profilePicture;
      } catch (error) {
        console.warn('Failed to generate signed URL for profile picture:', error.message);
        userData.profilePicture = imageUrl;
        userData.avatar = imageUrl;
      }
    }

    res.json(new ApiResponse({
      data: {
        user: userData
      }
    }));
  })
);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile - FIXED with Gender Support
 * @access  Private
 */
router.put('/profile',
  authenticateToken,
  updateProfileValidation,
  validateRequest,
  asyncHandler(async (req, res) => {
    const updates = req.body;

    // Use findByIdAndUpdate with proper options to avoid schema conflicts
    const updateFields = {};

    // Update allowed fields - now includes gender
    const allowedFields = ['firstName', 'lastName', 'bio', 'website', 'dateOfBirth', 'gender'];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'dateOfBirth' && updates[field]) {
          updateFields[field] = new Date(updates[field]);
        } else if (field === 'gender') {
          // Validate gender enum values
          const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
          if (updates[field] === null || updates[field] === '') {
            // Allow clearing gender field
            updateFields.$unset = updateFields.$unset || {};
            updateFields.$unset.gender = "";
          } else if (validGenders.includes(updates[field])) {
            updateFields[field] = updates[field];
          } else {
            throw new ApiError(`Invalid gender value. Must be one of: ${validGenders.join(', ')}`, 400);
          }
        } else {
          updateFields[field] = updates[field];
        }
      }
    });

    // Handle phone number update
    if (updates.phone !== undefined) {
      if (updates.phone && req.validatedPhone) {
        updateFields.phone = req.validatedPhone.e164;
      } else if (updates.phone === null || updates.phone === '') {
        updateFields.$unset = updateFields.$unset || {};
        updateFields.$unset.phone = "";
      }
    }

    // Use findByIdAndUpdate to avoid schema conflicts
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateFields,
      {
        new: true,
        runValidators: true,
        select: '-passwordHash -twoFactorAuth.secret -twoFactorAuth.backupCodes -emailVerificationOTP -passwordResetToken'
      }
    );

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Add audit log if method exists
    if (user.addAuditLog) {
      try {
        user.addAuditLog('profile_update', updates, req);
        await user.save();
      } catch (auditError) {
        console.warn('Failed to add audit log:', auditError.message);
      }
    }

    res.json(new ApiResponse({
      message: 'Profile updated successfully',
      data: {
        user: sanitizeUser(user)
      }
    }));
  })
);

/**
 * @route   POST /api/users/profile/avatar
 * @desc    Upload profile picture - FIXED FOR PRIVATE BUCKET
 * @access  Private
 */
router.post('/profile/avatar',
  uploadLimiter,
  authenticateToken,
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError('No image file provided', 400);
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    try {
      console.log('Processing image upload for user:', user._id);

      // Process image with Sharp
      const processedImage = await sharp(req.file.buffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Upload to S3 with proper filename
      const filename = `avatars/${user._id}-${Date.now()}.jpg`;
      console.log('Uploading file to Filebase:', filename);

      const imageUrl = await uploadToS3(processedImage, filename, 'image/jpeg');
      console.log('File uploaded successfully:', imageUrl);

      // Delete old avatar if exists
      if (user.profilePicture || user.avatar) {
        try {
          const oldImageUrl = user.profilePicture || user.avatar;
          await deleteFromS3(oldImageUrl);
          console.log('Old avatar deleted successfully');
        } catch (deleteError) {
          console.warn('Failed to delete old avatar:', deleteError.message);
        }
      }

      // Use findByIdAndUpdate to avoid schema conflicts
      const updatedUser = await User.findByIdAndUpdate(
        req.user.userId,
        {
          profilePicture: imageUrl,
          avatar: imageUrl
        },
        {
          new: true,
          runValidators: true
        }
      );

      // Add audit log separately to avoid conflicts
      if (updatedUser.addAuditLog) {
        try {
          updatedUser.addAuditLog('profile_picture_update', { imageUrl }, req);
          await updatedUser.save();
        } catch (auditError) {
          console.warn('Failed to add audit log:', auditError.message);
        }
      }

      // Generate signed URL for response (since bucket is private)
      let signedUrl = imageUrl;
      try {
        signedUrl = await generateSignedUrl(imageUrl);
      } catch (signedUrlError) {
        console.warn('Failed to generate signed URL:', signedUrlError.message);
      }

      res.json(new ApiResponse({
        message: 'Profile picture updated successfully',
        data: {
          profilePicture: signedUrl,
          avatar: signedUrl
        }
      }));

    } catch (error) {
      console.error('Image processing error:', error);
      throw new ApiError('Failed to process image', 500);
    }
  })
);

/**
 * @route   DELETE /api/users/profile/avatar
 * @desc    Remove profile picture - FIXED
 * @access  Private
 */
router.delete('/profile/avatar',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    const avatarUrl = user.profilePicture || user.avatar;
    if (!avatarUrl) {
      throw new ApiError('No profile picture to remove', 400);
    }

    try {
      // Delete from storage
      await deleteFromS3(avatarUrl);
    } catch (deleteError) {
      console.warn('Failed to delete avatar from storage:', deleteError.message);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $unset: {
          profilePicture: "",
          avatar: ""
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    // Add audit log separately to avoid conflicts
    if (updatedUser && updatedUser.addAuditLog) {
      try {
        updatedUser.addAuditLog('profile_picture_removed', {}, req);
        await updatedUser.save();
      } catch (auditError) {
        console.warn('Failed to add audit log:', auditError.message);
      }
    }

    res.json(new ApiResponse({
      message: 'Profile picture removed successfully'
    }));
  })
);

/**
 * @route   GET /api/users/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId)
      .select('-passwordHash -twoFactorAuth.secret -twoFactorAuth.backupCodes -emailVerificationOTP -passwordResetToken');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    res.json(new ApiResponse({
      message: 'User profile retrieved',
      data: {
        user: sanitizeUser(user),
        unreadNotifications: user.getUnreadNotificationsCount(),
        activeSessions: user.sessions.filter(s => s.isActive && s.expiresAt > new Date()).length
      }
    }));
  })
);



// =============================================================================
// SETTINGS ROUTES - FIXED
// =============================================================================

/**
 * @route   GET /api/users/settings
 * @desc    Get user settings
 * @access  Private
 */
router.get('/settings',
  authenticateToken,
  asyncHandler(async (req, res) => {
    let user = await User.findById(req.user.userId).select('preferences');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // If preferences don't exist, initialize them atomically
    if (!user.preferences) {
      const defaultPreferences = {
        language: 'en',
        timezone: 'UTC',
        theme: 'auto',
        notifications: {
          email: {
            enabled: true,
            security: true,
            marketing: false,
            updates: true
          },
          push: {
            enabled: true,
            security: true,
            marketing: false,
            updates: true
          },
          sms: {
            enabled: false,
            security: false,
            marketing: false
          }
        },
        privacy: {
          profileVisibility: 'public',
          locationSharing: false,
          dataCollection: {
            analytics: true,
            marketing: false,
            personalization: true
          }
        }
      };

      // Use findByIdAndUpdate to avoid version conflicts
      user = await User.findByIdAndUpdate(
        req.user.userId,
        { $set: { preferences: defaultPreferences } },
        { new: true, select: 'preferences' }
      );
    }

    res.json(new ApiResponse({
      data: {
        settings: user.preferences
      }
    }));
  })
);

/**
 * @route   PUT /api/users/settings
 * @desc    Update user settings - FIXED VERSION CONFLICTS
 * @access  Private
 */
router.put('/settings',
  authenticateToken,
  [
    body('language')
      .optional()
      .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'])
      .withMessage('Invalid language code'),
    body('timezone')
      .optional()
      .isString()
      .withMessage('Timezone must be a string'),
    body('theme')
      .optional()
      .isIn(['light', 'dark', 'auto'])
      .withMessage('Invalid theme option'),
    body('notifications')
      .optional()
      .isObject()
      .withMessage('Notifications must be an object'),
    body('privacy')
      .optional()
      .isObject()
      .withMessage('Privacy must be an object')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const updates = req.body;
    const userId = req.user.userId;

    // Build the update object dynamically
    const updateObj = { $set: {} };
    const auditLog = {
      action: 'settings_update',
      timestamp: new Date(),
      details: updates,
      userId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    // First, ensure the user exists and get current preferences
    const existingUser = await User.findById(userId).select('preferences');
    if (!existingUser) {
      throw new ApiError('User not found', 404);
    }

    // Initialize default preferences if they don't exist
    const defaultPreferences = {
      language: 'en',
      timezone: 'UTC',
      theme: 'light',
      notifications: {
        email: { enabled: true, security: true, marketing: false, updates: true },
        push: { enabled: true, security: true, marketing: false, updates: true },
        sms: { enabled: false, security: false, marketing: false }
      },
      privacy: {
        profileVisibility: 'public',
        locationSharing: false,
        dataCollection: {
          analytics: true,
          marketing: false,
          personalization: true
        }
      }
    };

    // Merge current preferences with defaults
    const currentPreferences = existingUser.preferences || {};
    const mergedPreferences = {
      ...defaultPreferences,
      ...currentPreferences,
      notifications: {
        ...defaultPreferences.notifications,
        ...currentPreferences.notifications,
        email: { ...defaultPreferences.notifications.email, ...currentPreferences.notifications?.email },
        push: { ...defaultPreferences.notifications.push, ...currentPreferences.notifications?.push },
        sms: { ...defaultPreferences.notifications.sms, ...currentPreferences.notifications?.sms }
      },
      privacy: {
        ...defaultPreferences.privacy,
        ...currentPreferences.privacy,
        dataCollection: {
          ...defaultPreferences.privacy.dataCollection,
          ...currentPreferences.privacy?.dataCollection
        }
      }
    };

    // Update simple fields
    ['language', 'timezone', 'theme'].forEach(field => {
      if (updates[field] !== undefined) {
        updateObj.$set[`preferences.${field}`] = updates[field];
      }
    });

    // Handle notifications updates
    if (updates.notifications) {
      if (updates.notifications.email) {
        Object.keys(updates.notifications.email).forEach(key => {
          updateObj.$set[`preferences.notifications.email.${key}`] = updates.notifications.email[key];
        });
      }

      if (updates.notifications.push) {
        Object.keys(updates.notifications.push).forEach(key => {
          updateObj.$set[`preferences.notifications.push.${key}`] = updates.notifications.push[key];
        });
      }

      if (updates.notifications.sms) {
        Object.keys(updates.notifications.sms).forEach(key => {
          updateObj.$set[`preferences.notifications.sms.${key}`] = updates.notifications.sms[key];
        });
      }
    }

    // Handle privacy updates
    if (updates.privacy) {
      Object.keys(updates.privacy).forEach(key => {
        if (key === 'dataCollection' && typeof updates.privacy[key] === 'object') {
          // Handle nested dataCollection object
          Object.keys(updates.privacy.dataCollection).forEach(dataKey => {
            updateObj.$set[`preferences.privacy.dataCollection.${dataKey}`] = updates.privacy.dataCollection[dataKey];
          });
        } else {
          // Handle simple privacy fields (profileVisibility, locationSharing, etc.)
          const value = updates.privacy[key];

          // Ensure we're not accidentally passing objects for string fields
          if (typeof value === 'object' && value !== null) {
            console.warn(`Warning: Received object for privacy.${key}, expected primitive value:`, value);
            // Skip this update to prevent cast errors
            return;
          }

          updateObj.$set[`preferences.privacy.${key}`] = value;
        }
      });
    }

    // Add audit log
    updateObj.$push = {
      auditLogs: auditLog
    };

    // Perform atomic update with retry logic
    const maxRetries = 3;
    let updatedUser = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        updatedUser = await User.findByIdAndUpdate(
          userId,
          updateObj,
          {
            new: true,
            runValidators: true,
            select: 'preferences'
          }
        );

        if (!updatedUser) {
          throw new ApiError('User not found during update', 404);
        }

        break; // Success, exit retry loop
      } catch (error) {
        if (error.name === 'VersionError' && attempt < maxRetries - 1) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
          continue;
        }
        throw error; // Re-throw if it's not a version error or max retries exceeded
      }
    }

    if (!updatedUser) {
      throw new ApiError('Failed to update settings after multiple attempts', 500);
    }

    res.json(new ApiResponse({
      message: 'Settings updated successfully',
      data: {
        settings: updatedUser.preferences
      }
    }));
  })
);



// =============================================================================
// SOCIAL ACCOUNT ROUTES
// =============================================================================

/**
 * @route   GET /api/auth/oauth/:provider
 * @desc    Initiate OAuth flow for linking social account
 * @access  Private (user must be logged in to link)
 */
router.get('/oauth/:provider',
  authenticateToken,
  [
    param('provider')
      .isIn(['google', 'facebook', 'apple', 'github', 'twitter', 'linkedin'])
      .withMessage('Invalid social provider')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { provider } = req.params;
    const userId = req.user.userId;

    // Store user ID in session/temporary storage for callback
    const state = jwt.sign({ userId, action: 'link' }, process.env.JWT_SECRET, { expiresIn: '10m' });

    const oauthConfig = {
      google: {
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
        params: {
          client_id: process.env.GOOGLE_CLIENT_ID,
          redirect_uri: `${process.env.BASE_URL}/api/auth/oauth/callback/google`,
          response_type: 'code',
          scope: 'openid email profile',
          state
        }
      },
      facebook: {
        url: 'https://www.facebook.com/v18.0/dialog/oauth',
        params: {
          client_id: process.env.FACEBOOK_CLIENT_ID,
          redirect_uri: `${process.env.BASE_URL}/api/auth/oauth/callback/facebook`,
          response_type: 'code',
          scope: 'email,public_profile',
          state
        }
      },
      github: {
        url: 'https://github.com/login/oauth/authorize',
        params: {
          client_id: process.env.GITHUB_CLIENT_ID,
          redirect_uri: `${process.env.BASE_URL}/api/auth/oauth/callback/github`,
          response_type: 'code',
          scope: 'user:email',
          state
        }
      }
      // Add other providers as needed
    };

    const config = oauthConfig[provider];
    if (!config) {
      throw new ApiError('Provider not configured', 400);
    }

    const authUrl = `${config.url}?${new URLSearchParams(config.params)}`;
    res.json(new ApiResponse({
      data: { authUrl }
    }));
  })
);

/**
 * @route   GET /api/auth/oauth/callback/:provider
 * @desc    Handle OAuth callback and link account
 * @access  Public (but validates state token)
 */
router.get('/oauth/callback/:provider',
  [
    param('provider')
      .isIn(['google', 'facebook', 'apple', 'github', 'twitter', 'linkedin'])
      .withMessage('Invalid social provider'),
    query('code')
      .notEmpty()
      .withMessage('Authorization code is required'),
    query('state')
      .notEmpty()
      .withMessage('State parameter is required')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { provider } = req.params;
    const { code, state } = req.query;

    try {
      // Verify state token
      const decoded = jwt.verify(state, process.env.JWT_SECRET);
      const { userId, action } = decoded;

      if (action !== 'link') {
        throw new ApiError('Invalid state action', 400);
      }

      // Exchange authorization code for access token
      const tokenData = await exchangeCodeForToken(provider, code);

      // Get user info from social provider
      const socialUserInfo = await getSocialUserInfo(provider, tokenData.access_token);

      // Find the user who initiated the linking
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError('User not found', 404);
      }

      // Check if this social account is already linked to any user
      const existingUser = await User.findOne({
        'socialAccounts.provider': provider,
        'socialAccounts.socialId': socialUserInfo.id,
        'socialAccounts.isLinked': true
      });

      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.redirect(`${process.env.FRONTEND_URL}/settings/accounts?error=account_already_linked`);
      }

      // Check if user already has this provider linked
      const existingAccountIndex = user.socialAccounts.findIndex(
        account => account.provider === provider && account.isLinked
      );

      if (existingAccountIndex !== -1) {
        return res.redirect(`${process.env.FRONTEND_URL}/settings/accounts?error=provider_already_linked`);
      }

      // Find existing unlinked account or create new one
      let accountIndex = user.socialAccounts.findIndex(
        account => account.provider === provider && account.socialId === socialUserInfo.id
      );

      const accountData = {
        provider,
        socialId: socialUserInfo.id,
        email: socialUserInfo.email || null,
        displayName: socialUserInfo.name || socialUserInfo.displayName || null,
        profilePicture: socialUserInfo.picture || socialUserInfo.avatar_url || null,
        isLinked: true,
        linkedAt: new Date(),
        accessToken: tokenData.access_token, // Encrypt this in production
        refreshToken: tokenData.refresh_token || null,
        lastSync: new Date()
      };

      if (accountIndex !== -1) {
        // Update existing account
        user.socialAccounts[accountIndex] = {
          ...user.socialAccounts[accountIndex].toObject(),
          ...accountData
        };
      } else {
        // Add new account
        user.socialAccounts.push(accountData);
      }

      // Add audit log
      if (user.addAuditLog) {
        user.addAuditLog('social_account_linked', {
          provider,
          email: socialUserInfo.email || 'not provided',
          displayName: socialUserInfo.name || 'not provided'
        }, req);
      }

      // Add notification
      if (user.addNotification) {
        user.addNotification(
          'account',
          'Social Account Linked',
          `Your ${provider} account has been successfully linked.`
        );
      }

      await user.save();

      // Redirect to frontend with success
      res.redirect(`${process.env.FRONTEND_URL}/settings/accounts?success=account_linked&provider=${provider}`);

    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/settings/accounts?error=linking_failed`);
    }
  })
);

/**
 * @route   GET /api/users/social-accounts
 * @desc    Get linked social accounts
 * @access  Private
 */
router.get('/social-accounts',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId).select('socialAccounts');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Remove sensitive data
    const sanitizedAccounts = (user.socialAccounts || []).map(account => ({
      provider: account.provider,
      email: account.email,
      displayName: account.displayName,
      profilePicture: account.profilePicture,
      isLinked: account.isLinked,
      linkedAt: account.linkedAt
    }));

    res.json(new ApiResponse({
      data: {
        socialAccounts: sanitizedAccounts
      }
    }));
  })
);

/**
 * @route   DELETE /api/users/social-accounts/:provider
 * @desc    Unlink social account
 * @access  Private
 */
router.delete('/social-accounts/:provider',
  authenticateToken,
  [
    param('provider')
      .isIn(['google', 'facebook', 'apple', 'github', 'twitter', 'linkedin'])
      .withMessage('Invalid social provider')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { provider } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    const accountIndex = user.socialAccounts.findIndex(
      account => account.provider === provider && account.isLinked
    );

    if (accountIndex === -1) {
      throw new ApiError('Social account not found or already unlinked', 404);
    }

    // Check if user has password or other social accounts
    const hasPassword = !!user.passwordHash;
    const otherLinkedAccounts = user.socialAccounts.filter(
      (account, index) => index !== accountIndex && account.isLinked
    );

    if (!hasPassword && otherLinkedAccounts.length === 0) {
      throw new ApiError('Cannot unlink the only authentication method. Please set a password first.', 400);
    }

    user.socialAccounts[accountIndex].isLinked = false;
    if (user.addAuditLog) {
      user.addAuditLog('social_account_unlinked', { provider }, req);
    }
    if (user.addNotification) {
      user.addNotification('account', 'Social Account Unlinked', `Your ${provider} account has been unlinked.`);
    }

    await user.save();

    res.json(new ApiResponse({
      message: `${provider} account unlinked successfully`
    }));
  })
);

// Helper functions for OAuth processing
async function exchangeCodeForToken(provider, code) {
  const tokenConfigs = {
    google: {
      url: 'https://oauth2.googleapis.com/token',
      params: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.BASE_URL}/api/auth/oauth/callback/google`
      }
    },
    facebook: {
      url: 'https://graph.facebook.com/v18.0/oauth/access_token',
      params: {
        client_id: process.env.FACEBOOK_CLIENT_ID,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.BASE_URL}/api/auth/oauth/callback/facebook`
      }
    },
    github: {
      url: 'https://github.com/login/oauth/access_token',
      params: {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      }
    }
  };

  const config = tokenConfigs[provider];
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(config.params)
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.statusText}`);
  }

  return await response.json();
}

async function getSocialUserInfo(provider, accessToken) {
  const apiConfigs = {
    google: {
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    },
    facebook: {
      url: `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`,
      headers: {}
    },
    github: {
      url: 'https://api.github.com/user',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'YourApp'
      }
    }
  };

  const config = apiConfigs[provider];
  const response = await fetch(config.url, {
    headers: config.headers
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.statusText}`);
  }

  const userData = await response.json();

  // Normalize the response across providers
  return {
    id: userData.id,
    email: userData.email,
    name: userData.name || userData.login,
    picture: userData.picture?.data?.url || userData.picture || userData.avatar_url
  };
}

// =============================================================================
// DEVICE MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/users/devices
 * @desc    Get user's trusted devices
 * @access  Private
 */
router.get('/devices',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId).select('trustedDevices');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    res.json(new ApiResponse({
      data: {
        devices: user.trustedDevices || []
      }
    }));
  })
);

/**
 * @route   PATCH /api/users/devices/:deviceId/trust
 * @desc    Mark device as trusted
 * @access  Private
 */
router.patch('/devices/:deviceId/trust',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) throw new ApiError('User not found', 404);

    const device = user.trustedDevices.find(d => d.deviceId === deviceId);
    if (!device) throw new ApiError('Device not found', 404);

    device.isTrusted = true;

    if (user.addAuditLog) {
      user.addAuditLog('device_trusted', { deviceId }, req);
    }

    await user.save();

    res.json(new ApiResponse({ message: 'Device marked as trusted' }));
  })
);

/**
 * @route   DELETE /api/users/devices/:deviceId
 * @desc    Remove trusted device
 * @access  Private
 */
router.delete('/devices/:deviceId',
  authenticateToken,
  [
    param('deviceId')
      .notEmpty()
      .withMessage('Device ID is required')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (!user.trustedDevices) {
      throw new ApiError('No trusted devices found', 404);
    }

    const deviceIndex = user.trustedDevices.findIndex(device => device.deviceId === deviceId);

    if (deviceIndex === -1) {
      throw new ApiError('Device not found', 404);
    }

    const removedDevice = user.trustedDevices[deviceIndex];
    user.trustedDevices.splice(deviceIndex, 1);

    // Also revoke any active sessions for this device
    if (user.sessions) {
      user.sessions.forEach(session => {
        if (session.device && session.device.deviceId === deviceId) {
          session.isActive = false;
        }
      });
    }

    if (user.addAuditLog) {
      user.addAuditLog('device_removed', { deviceId, deviceName: removedDevice.deviceName }, req);
    }
    if (user.addNotification) {
      user.addNotification('security', 'Device Removed', `Device "${removedDevice.deviceName}" has been removed from your trusted devices.`);
    }

    await user.save();

    res.json(new ApiResponse({
      message: 'Device removed successfully'
    }));
  })
);

// =============================================================================
// SESSION MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/users/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get('/sessions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId).select('sessions');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Filter active sessions and add current session indicator
    const activeSessions = (user.sessions || [])
      .filter(session => session.isActive && session.expiresAt > new Date())
      .map(session => ({
        ...session.toObject(),
        isCurrent: session.sessionId === req.user.sessionId
      }));

    res.json(new ApiResponse({
      data: {
        sessions: activeSessions
      }
    }));
  })
);

/**
 * @route   DELETE /api/users/sessions/:sessionId
 * @desc    Revoke specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId',
  authenticateToken,
  [
    param('sessionId')
      .notEmpty()
      .withMessage('Session ID is required')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (sessionId === req.user.sessionId) {
      throw new ApiError('Cannot revoke current session. Use logout instead.', 400);
    }

    if (user.revokeSession) {
      user.revokeSession(sessionId);
    }

    if (user.addAuditLog) {
      user.addAuditLog('session_revoked', { sessionId }, req);
    }

    await user.save();

    res.json(new ApiResponse({
      message: 'Session revoked successfully'
    }));
  })
);

// =============================================================================
// NOTIFICATION ROUTES - FIXED
// =============================================================================

/**
 * @route   GET /api/users/notifications
 * @desc    Get user notifications - FIXED VERSION
 * @access  Private
 */
router.get('/notifications',
  authenticateToken,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
      .toInt(),
    query('type')
      .optional()
      .isIn(['security', 'account', 'system', 'marketing', 'feature'])
      .withMessage('Invalid notification type'),
    query('unread')
      .optional()
      .isBoolean()
      .withMessage('Unread must be a boolean')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type, unread } = req.query;
    const user = await User.findById(req.user.userId).select('notifications');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Initialize notifications array if it doesn't exist
    if (!user.notifications) {
      user.notifications = [];
    }

    let notifications = [...user.notifications];

    // Apply filters
    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }

    if (unread !== undefined) {
      notifications = notifications.filter(n => n.read !== unread);
    }

    // Sort by creation date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = notifications.slice(startIndex, endIndex);

    res.json(new ApiResponse({
      data: {
        notifications: paginatedNotifications,
        pagination: {
          page,
          limit,
          total: notifications.length,
          pages: Math.ceil(notifications.length / limit)
        }
      }
    }));
  })
);

/**
 * @route   PUT /api/users/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/notifications/:notificationId/read',
  authenticateToken,
  [
    param('notificationId')
      .notEmpty()
      .withMessage('Invalid notification ID')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Initialize notifications if they don't exist
    if (!user.notifications) {
      user.notifications = [];
    }

    // Find notification by id field (not MongoDB _id)
    const notification = user.notifications.find(n => n.id === notificationId);

    if (!notification) {
      throw new ApiError('Notification not found', 404);
    }

    notification.read = true;
    await user.save();

    res.json(new ApiResponse({
      message: 'Notification marked as read'
    }));
  })
);

/**
 * @route   PUT /api/users/notifications/read-all
 * @desc    Mark all notifications as read - FIXED VERSION
 * @access  Private
 */
router.put('/notifications/read-all',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Initialize notifications if they don't exist
    if (!user.notifications) {
      user.notifications = [];
    }

    user.notifications.forEach(notification => {
      notification.read = true;
    });

    await user.save();

    res.json(new ApiResponse({
      message: 'All notifications marked as read'
    }));
  })
);

/**
 * @route   DELETE /api/users/notifications/:notificationId
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/notifications/:notificationId',
  authenticateToken,
  [
    param('notificationId')
      .notEmpty()
      .withMessage('Invalid notification ID')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    // Use atomic operation to avoid version conflicts
    const result = await User.findOneAndUpdate(
      {
        _id: req.user.userId,
        'notifications.id': notificationId
      },
      {
        $pull: {
          notifications: { id: notificationId }
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!result) {
      // Check if user exists to provide better error message
      const userExists = await User.findById(req.user.userId);
      if (!userExists) {
        throw new ApiError('User not found', 404);
      }
      throw new ApiError('Notification not found', 404);
    }

    res.json(new ApiResponse({
      message: 'Notification deleted successfully'
    }));
  })
);

/**
 * @route   DELETE /api/users/notifications/clear-all
 * @desc    Delete all notifications for the user
 * @access  Private
 */
router.delete('/notifications/clear-all',
  authenticateToken,
  asyncHandler(async (req, res) => {
    console.log('Clear all notifications request received for user:', req.user.userId);

    try {
      const result = await User.findOneAndUpdate(
        { _id: req.user.userId },
        {
          $set: { notifications: [] }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!result) {
        console.warn('User not found when attempting to clear notifications:', req.user.userId);
        throw new ApiError('User not found', 404);
      }

      console.log('All notifications cleared successfully for user:', req.user.userId);

      // Add audit log for this action
      result.addAuditLog('notifications_cleared_all', {
        action: 'clear_all_notifications',
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 100) || 'Unknown'
      }, req);

      await result.save();

      res.json(new ApiResponse({
        success: true,
        message: 'All notifications have been cleared successfully',
        data: {
          clearedAt: new Date().toISOString(),
          remainingNotifications: 0
        }
      }));

    } catch (error) {
      console.error('Error clearing all notifications:', {
        error: error.message,
        stack: error.stack,
        userId: req.user.userId,
        ip: req.ip
      });

      if (error instanceof ApiError) {
        throw error;
      } else {
        throw new ApiError('Failed to clear notifications. Please try again.', 500);
      }
    }
  })
);

// =============================================================================
// AUDIT LOG ROUTES - FIXED
// =============================================================================

/**
 * @route   GET /api/users/audit-logs
 * @desc    Get user audit logs - FIXED VERSION
 * @access  Private
 */
router.get('/audit-logs',
  authenticateToken,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
      .toInt(),
    query('action')
      .optional()
      .isString()
      .withMessage('Action must be a string'),
    query('from')
      .optional()
      .isISO8601()
      .withMessage('From date must be in ISO8601 format'),
    query('to')
      .optional()
      .isISO8601()
      .withMessage('To date must be in ISO8601 format')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, action, from, to } = req.query;
    const user = await User.findById(req.user.userId).select('auditLogs');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Initialize audit logs if they don't exist
    if (!user.auditLogs) {
      user.auditLogs = [];
    }

    let auditLogs = [...user.auditLogs];

    // Apply filters
    if (action) {
      auditLogs = auditLogs.filter(log => log.action === action);
    }

    if (from || to) {
      auditLogs = auditLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        if (from && logDate < new Date(from)) return false;
        if (to && logDate > new Date(to)) return false;
        return true;
      });
    }

    // Sort by timestamp (newest first)
    auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = auditLogs.slice(startIndex, endIndex);

    res.json(new ApiResponse({
      data: {
        auditLogs: paginatedLogs,
        pagination: {
          page,
          limit,
          total: auditLogs.length,
          pages: Math.ceil(auditLogs.length / limit)
        }
      }
    }));
  })
);

// =============================================================================
// ANALYTICS ROUTES
// =============================================================================

/**
 * @route   GET /api/users/analytics
 * @desc    Get user analytics data
 * @access  Private
 */
router.get('/analytics',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId).select('analytics loginCount createdAt lastLogin trustedDevices');

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Initialize analytics if they don't exist
    if (!user.analytics) {
      user.analytics = {
        totalSessions: user.loginCount || 0,
        lastSessionDate: user.lastLogin,
        totalLoginTime: 0,
        averageSessionDuration: 0,
        deviceCount: user.trustedDevices ? user.trustedDevices.length : 0,
        featuresUsed: [],
        lastActiveDate: new Date(),
        uniqueLocations: [] // Add this field to track unique locations
      };
      await user.save();
    }

    // Calculate additional metrics
    const now = new Date();
    const createdAt = new Date(user.createdAt);
    const accountAge = Math.max(1, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24))); // At least 1 day

    // Get actual session data or fallback to login count
    const totalSessions = user.analytics.totalSessions || user.loginCount || 0;
    const totalLogins = user.loginCount || 0;

    // Calculate average sessions per day (use totalSessions, not totalLogins)
    const avgSessionsPerDay = accountAge > 0 ? (totalSessions / accountAge).toFixed(2) : 0;

    // Get unique device count
    const uniqueDevices = user.trustedDevices ? user.trustedDevices.length : 0;

    // Get unique locations count (if you track locations)
    const uniqueLocations = user.analytics.uniqueLocations ? user.analytics.uniqueLocations.length : 0;

    // Create analytics response with consistent naming
    const analyticsData = {
      totalSessions,
      lastSessionDate: user.analytics.lastSessionDate || user.lastLogin,
      totalLoginTime: user.analytics.totalLoginTime || 0,
      averageSessionDuration: user.analytics.averageSessionDuration || 0,
      deviceCount: uniqueDevices,
      uniqueDevices,
      uniqueLocations,
      featuresUsed: user.analytics.featuresUsed || [],
      lastActiveDate: user.analytics.lastActiveDate || new Date(),
      accountAge,
      avgSessionsPerDay: parseFloat(avgSessionsPerDay),
      totalLogins,
      lastLoginDate: user.lastLogin
    };

    res.json(new ApiResponse({
      data: {
        analytics: analyticsData
      }
    }));
  })
);

// =============================================================================
// DATA EXPORT/IMPORT ROUTES
// =============================================================================

/**
 * @route   GET /api/users/export
 * @desc    Export user data (GDPR compliance)
 * @access  Private
 */
router.get('/export',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    let exportData;
    if (user.exportData && typeof user.exportData === 'function') {
      exportData = user.exportData();
    } else {
      // Fallback export data if method doesn't exist
      exportData = {
        profile: {
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          bio: user.bio,
          website: user.website,
          dateOfBirth: user.dateOfBirth,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        },
        preferences: user.preferences || {},
        homeLocation: user.homeLocation,
        analytics: user.analytics || {}
      };
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${user.username}-${Date.now()}.json"`);

    res.json({
      exportDate: new Date().toISOString(),
      userData: exportData
    });
  })
);

// =============================================================================
// ACCOUNT DELETION ROUTES
// =============================================================================

/**
 * @route   GET /api/users/confirm-deletion
 * @desc    Render account deletion confirmation page
 * @access  Public (uses token from URL)
 */
router.get('/confirm-deletion',
  [
    query('token')
      .notEmpty()
      .withMessage('Deletion token is required')
      .isLength({ min: 32, max: 64 })
      .withMessage('Invalid token format')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { token } = req.query;

    // Use the static method from the schema
    const user = await User.findByDeletionToken(token);

    if (!user) {
      return res.status(400).send(generateErrorPage(
        'Invalid Deletion Link',
        'This deletion link is invalid or has expired.',
        true
      ));
    }

    // Generate and send the deletion confirmation page
    const html = generateDeletionConfirmationPage({
      userEmail: user.email,
      userName: user.fullName || user.username,
      deletionToken: token,
      errorMessage: null
    });

    res.send(html);
  })
);

/**
 * @route   POST /api/users/confirm-deletion
 * @desc    Process account deletion confirmation
 * @access  Public (uses token from body)
 */
router.post('/confirm-deletion',
  [
    body('token')
      .notEmpty()
      .withMessage('Deletion token is required'),
    body('confirmText')
      .equals('DELETE MY ACCOUNT')
      .withMessage('Please type "DELETE MY ACCOUNT" to confirm'),
    body('password')
      .optional()
      .isString()
      .withMessage('Password must be a string')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    try {
      // Find user by deletion token using the static method
      const user = await User.findByDeletionToken(token);

      if (!user) {
        return res.status(400).send(generateErrorPage(
          'Invalid Deletion Link',
          'This deletion link is invalid or has expired.',
          true
        ));
      }

      // Verify password if user has one (social users might not have passwords)
      if (user.passwordHash) {
        if (!password) {
          const html = generateDeletionConfirmationPage({
            userEmail: user.email,
            userName: user.fullName || user.username,
            deletionToken: token,
            errorMessage: 'Password is required to confirm deletion.'
          });
          return res.status(400).send(html);
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
          const html = generateDeletionConfirmationPage({
            userEmail: user.email,
            userName: user.fullName || user.username,
            deletionToken: token,
            errorMessage: 'Incorrect password. Please try again.'
          });
          return res.status(400).send(html);
        }
      }

      // Store original data before deletion for email
      const originalEmail = user.email;
      const originalName = user.fullName || user.username;
      const originalAvatar = user.avatar;

      // Execute soft delete - this should set isDeleted: true and revoke sessions
      await user.softDelete('user_request', req);
      
      // CRITICAL: Save the user after soft delete
      const savedUser = await user.save();
      
      // Verify deletion was successful
      if (!savedUser.isDeleted) {
        throw new Error('User deletion flag was not set correctly');
      }

      console.log('User successfully soft deleted:', {
        userId: savedUser._id,
        isDeleted: savedUser.isDeleted,
        deletedAt: savedUser.deletedAt,
        isActive: savedUser.isActive
      });

      // Send goodbye email using original data (before anonymization)
      try {
        await sendEmail({
          to: originalEmail,
          subject: 'Account Deleted Successfully',
          template: 'account-deleted',
          data: {
            name: originalName,
            email: originalEmail,
            profilePic: `https://spotless-orange-flea.myfilebase.com/ipfs/${originalAvatar}`,
            deletionDate: new Date().toLocaleString()
          }
        });
        console.log('Goodbye email sent successfully to:', originalEmail);
      } catch (emailError) {
        // Don't fail deletion if email fails
        console.error('Failed to send goodbye email:', emailError);
      }

      // Clear any session cookies
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      // Additional cleanup - clear any other potential cookies
      res.clearCookie('sessionId');
      res.clearCookie('tempSession');

      // Send success page
      const html = generateDeletionSuccessPage(originalEmail);
      res.send(html);

    } catch (error) {
      console.error('Account deletion error:', error);
      
      // Log the specific error for debugging
      if (error.message === 'Cannot delete user without creating backup first') {
        console.error('Backup creation failed during deletion');
      }
      
      const html = generateErrorPage(
        'Deletion Error',
        'An error occurred while deleting your account. Please try again or contact support.',
        true
      );
      res.status(500).send(html);
    }
  })
);

/**
 * @route   POST /api/users/cancel-deletion
 * @desc    Cancel pending account deletion request
 * @access  Private
 */
router.post('/cancel-deletion',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user.hasPendingDeletion) {
      return res.status(400).json({
        success: false,
        message: 'No pending deletion request found'
      });
    }

    try {
      // Use the schema method to cancel deletion
      user.cancelDeletion(req);
      await user.save();

      res.json({
        success: true,
        message: 'Account deletion request cancelled successfully'
      });

    } catch (error) {
      console.error('Cancel deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel deletion request'
      });
    }
  })
);

/**
 * @route   GET /api/users/deletion-status
 * @desc    Get current user's deletion status
 * @access  Private
 */
router.get('/deletion-status',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = req.user;

    res.json({
      success: true,
      data: {
        hasPendingDeletion: user.hasPendingDeletion,
        deletionRequestedAt: user.deletionRequestedAt,
        deletionTokenExpires: user.deletionTokenExpires,
        isDeleted: user.isDeleted,
        deletedAt: user.deletedAt,
        deletionReason: user.deletionReason
      }
    });
  })
);

function generateDeletionConfirmationPage({ userEmail, userName, deletionToken, errorMessage }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Account Deletion</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .auth-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .auth-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: linear-gradient(90deg, #667eea, #764ba2);
        }
        .icon { font-size: 4rem; margin-bottom: 20px; color: #e74c3c; }
        h1 { color: #2c3e50; margin-bottom: 15px; font-size: 2rem; font-weight: 600; }
        .subtitle { color: #7f8c8d; margin-bottom: 30px; font-size: 1.1rem; line-height: 1.5; }
        .user-info {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
        }
        .user-info strong { color: #2c3e50; }
        .form-group { margin-bottom: 20px; text-align: left; }
        label { display: block; margin-bottom: 5px; color: #2c3e50; font-weight: 500; }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #e0e6ed;
            border-radius: 10px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        input[type="text"]:focus, input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .confirmation-text {
            background: #fff5f5;
            border: 2px solid #fed7d7 !important;
            color: #c53030;
            font-family: monospace;
            letter-spacing: 1px;
        }
        .danger-zone {
            background: #fff5f5;
            border: 2px solid #feb2b2;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .danger-zone h3 {
            color: #c53030;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content: center;
        }
        .warning-list { text-align: left; margin: 15px 0; }
        .warning-list li { color: #742a2a; margin-bottom: 8px; padding-left: 10px; }
        .btn {
            display: inline-block;
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 10px;
            min-width: 120px;
        }
        .btn-danger { background: #e74c3c; color: white; }
        .btn-danger:hover { background: #c0392b; transform: translateY(-2px); }
        .btn-danger:disabled { background: #cccccc; cursor: not-allowed; transform: none; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-secondary:hover { background: #5a6268; transform: translateY(-2px); }
        .error-message {
            background: #fff5f5;
            color: #c53030;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 4px solid #e53e3e;
        }
        .loading {
            display: none;
            align-items: center;
            gap: 10px;
            margin: 20px 0;
            justify-content: center;
        }
        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @media (max-width: 600px) {
            .auth-container { padding: 30px 20px; margin: 10px; }
            .icon { font-size: 3rem; }
            h1 { font-size: 1.5rem; }
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="icon">
            <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h1>Confirm Account Deletion</h1>
        <p class="subtitle">You're about to permanently delete your account. This action cannot be undone.</p>
        
        <div class="user-info">
            <p><strong>Account:</strong> ${userEmail}</p>
            <p><strong>Name:</strong> ${userName}</p>
        </div>

        <div class="danger-zone">
            <h3><i class="fas fa-skull-crossbones"></i> Warning</h3>
            <ul class="warning-list">
                <li>All your data will be permanently deleted</li>
                <li>Your profile and content will be removed</li>
                <li>This action cannot be reversed</li>
                <li>You will lose access to all services</li>
            </ul>
        </div>

        ${errorMessage ? `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${errorMessage}</div>` : ''}

        <form action="/api/users/confirm-deletion" method="POST" id="deletionForm">
            <input type="hidden" name="token" value="${deletionToken}">

            <div class="form-group">
                <label for="confirmText">Type "DELETE MY ACCOUNT" to confirm:</label>
                <input type="text" id="confirmText" name="confirmText" 
                       class="confirmation-text" 
                       placeholder="DELETE MY ACCOUNT" 
                       autocomplete="off"
                       required>
            </div>

            <div class="form-group">
                <label for="password">Enter your password to confirm:</label>
                <input type="password" id="password" name="password" 
                       placeholder="Enter your password"
                       autocomplete="current-password">
            </div>

            <div class="loading" id="loading">
                <div class="spinner"></div>
                <span>Deleting account...</span>
            </div>

            <div>
                <button type="submit" class="btn btn-danger" id="deleteBtn" disabled>
                    <i class="fas fa-trash"></i> Delete My Account
                </button>
                <a href="/" class="btn btn-secondary">
                    <i class="fas fa-arrow-left"></i> Cancel
                </a>
            </div>
        </form>
    </div>

    <script src="/js/account-deletion.js"></script>
</body>
</html>`;
}

function generateDeletionSuccessPage(userEmail) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deleted Successfully</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .auth-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .auth-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: linear-gradient(90deg, #27ae60, #2ecc71);
        }
        .icon { font-size: 4rem; margin-bottom: 20px; color: #27ae60; }
        h1 { color: #2c3e50; margin-bottom: 15px; font-size: 2rem; font-weight: 600; }
        .subtitle { color: #7f8c8d; margin-bottom: 30px; font-size: 1.1rem; line-height: 1.5; }
        .success-message {
            background: #f0fff4;
            color: #276749;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 4px solid #48bb78;
        }
        .btn {
            display: inline-block;
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 10px;
            min-width: 120px;
        }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover { background: #5a67d8; transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="icon">
            <i class="fas fa-check-circle"></i>
        </div>
        <h1>Account Deleted Successfully</h1>
        <p class="subtitle">Your account has been permanently deleted.</p>
        
        <div class="success-message">
            <p><strong>Account ${userEmail} has been deleted.</strong></p>
            <p>All your data has been removed from our systems.</p>
            <p>Thank you for using our service.</p>
        </div>

        <div>
            <a href="/register" class="btn btn-primary">
                <i class="fas fa-home"></i> Back to Register
            </a>
        </div>
    </div>
</body>
</html>`;
}

function generateErrorPage(title, message, showBackToLogin = false) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .auth-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .auth-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: linear-gradient(90deg, #e74c3c, #c0392b);
        }
        .icon { font-size: 4rem; margin-bottom: 20px; color: #e74c3c; }
        h1 { color: #2c3e50; margin-bottom: 15px; font-size: 2rem; font-weight: 600; }
        .subtitle { color: #7f8c8d; margin-bottom: 30px; font-size: 1.1rem; line-height: 1.5; }
        .error-message {
            background: #fff5f5;
            color: #c53030;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 4px solid #e53e3e;
        }
        .btn {
            display: inline-block;
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 10px;
            min-width: 120px;
        }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover { background: #5a67d8; transform: translateY(-2px); }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-secondary:hover { background: #5a6268; transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="icon">
            <i class="fas fa-exclamation-circle"></i>
        </div>
        <h1>${title}</h1>
        <p class="subtitle">Something went wrong with your request.</p>
        
        <div class="error-message">
            ${message}
        </div>

        <div>
            ${showBackToLogin ? `
                <a href="/login" class="btn btn-primary">
                    <i class="fas fa-sign-in-alt"></i> Back to Login
                </a>
                <a href="/" class="btn btn-secondary">
                    <i class="fas fa-home"></i> Home
                </a>
            ` : `
                <a href="/" class="btn btn-primary">
                    <i class="fas fa-home"></i> Back to Home
                </a>
            `}
        </div>
    </div>
</body>
</html>`;
}

/**
 * @route   POST /api/users/delete-request
 * @desc    Request account deletion
 * @access  Private
 */
router.post('/delete-request',
  authenticateToken,
  [
    body('password')
      .optional()
      .isString()
      .withMessage('Password must be a string')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Verify password for users who have set a password
    if (user.passwordHash && password && !(await user.comparePassword(password))) {
      throw new ApiError('Incorrect password', 400);
    }

    // Generate deletion token for confirmation
    const deletionToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(deletionToken).digest('hex');

    // Store deletion token in user record (expires in 24 hours)
    user.deletionToken = hashedToken;
    user.deletionTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    if (user.addNotification) {
      user.addNotification('account', 'Account Deletion Requested', 'Your account deletion has been requested. Check your email for confirmation.');
    }
    if (user.addAuditLog) {
      user.addAuditLog('account_deletion_requested', {}, req);
    }

    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Confirm Account Deletion',
      template: 'account-deletion-confirmation',
      data: {
        name: user.fullName || user.username,
        email: user.email,
        profilePic: 'https://spotless-orange-flea.myfilebase.com/ipfs/' + user.avatar,
        confirmationUrl: `${process.env.FRONTEND_URL}/api/users/confirm-deletion?token=${deletionToken}`,
        expiresIn: '24 hours'
      }
    });

    res.json(new ApiResponse({
      message: 'Account deletion requested. Please check your email for confirmation instructions.'
    }));
  })
);

/**
 * @route   DELETE /api/users/account
 * @desc    Permanently delete user account
 * @access  Private
 */
router.delete('/account',
  authenticateToken,
  [
    body('confirmText').equals('DELETE MY ACCOUNT').withMessage('Please type "DELETE MY ACCOUNT" to confirm'),
    body('password').optional().isString()
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Verify password if user has one
    if (user.passwordHash && password) {
      if (!(await user.comparePassword(password))) {
        throw new ApiError('Incorrect password', 400);
      }
    }

    try {
      // CRITICAL: Create backup before deletion
      const backup = await user.createBackup('pre_deletion', {
        reason,
        feedback,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        initiatedBy: 'user_request'
      });

      // Perform soft delete
      await user.softDelete(reason, req);
      await user.save();

      // Clear authentication cookie
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/'
      });
    } catch (deletionError) {
      console.error('Account deletion error:', deletionError);

      user.addAuditLog('ACCOUNT_DELETION_FAILED', {
        reason: 'Deletion process failed',
        error: deletionError.message,
        deviceInfo: req.deviceInfo
      }, req);

      return res.status(500).json(new ApiResponse({
        success: false,
        error: 'Unable to delete account',
        message: 'An error occurred while deleting your account. Please try again or contact support',
        code: 'DELETION_FAILED',
        data: {
          error: deletionError.message,
          timestamp: new Date()
        }
      }));
    }

    if (user.addAuditLog) {
      user.addAuditLog('account_deleted', {}, req);
    }

    await user.save();

    // Send goodbye email
    await sendEmail({
      to: user.email,
      subject: 'Account Deleted Successfully',
      template: 'account-deleted',
      data: {
        name: user.fullName || user.username,
        email: user.email,
        profilePic: 'https://spotless-orange-flea.myfilebase.com/ipfs/' + user.avatar,
        deletionDate: new Date().toISOString()
      }
    });

    res.json(new ApiResponse({
      message: 'Account has been successfully deleted'
    }));
  })
);

// =============================================================================
// ADMIN ROUTES (for user management)
// =============================================================================

/**
 * @route   GET /api/users/admin/users
 * @desc    Get all users (admin only)
 * @access  Private - Admin
 */
router.get('/admin/users',
  authenticateToken,
  authorize(['admin', 'superadmin']),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString(),
    query('role').optional().isIn(['user', 'moderator', 'admin', 'superadmin']),
    query('status').optional().isIn(['active', 'inactive', 'deleted']),
    query('sortBy').optional().isIn(['createdAt', 'lastLogin', 'username', 'email']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 50,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (status) {
      switch (status) {
        case 'active':
          query.isActive = true;
          query.isDeleted = false;
          break;
        case 'inactive':
          query.isActive = false;
          query.isDeleted = false;
          break;
        case 'deleted':
          query.isDeleted = true;
          break;
      }
    } else {
      // Default: exclude deleted users
      query.isDeleted = false;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const users = await User.find(query)
      .select('-passwordHash -twoFactorAuth.secret -twoFactorAuth.backupCodes -emailVerificationOTP -passwordResetToken')
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json(new ApiResponse({
      data: {
        users: users.map(user => sanitizeUser(user)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    }));
  })
);

/**
 * @route   PUT /api/users/admin/users/:userId/role
 * @desc    Update user role (admin only)
 * @access  Private - Admin
 */
router.put('/admin/users/:userId/role',
  authenticateToken,
  authorize(['admin', 'superadmin']),
  [
    param('userId').isMongoId(),
    body('role').isIn(['user', 'moderator', 'admin', 'superadmin'])
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    // Prevent self-role changes for safety
    if (userId === req.user.userId) {
      throw new ApiError('Cannot change your own role', 400);
    }

    // Only superadmin can assign superadmin role
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      throw new ApiError('Insufficient permissions to assign superadmin role', 403);
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    const oldRole = user.role;
    user.role = role;
    if (user.addAuditLog) {
      user.addAuditLog('role_changed', { oldRole, newRole: role, changedBy: req.user.userId }, req);
    }

    await user.save();

    res.json(new ApiResponse({
      message: `User role updated to ${role}`,
      data: {
        user: sanitizeUser(user)
      }
    }));
  })
);

/**
 * @route   PUT /api/users/admin/users/:userId/status
 * @desc    Update user status (admin only)
 * @access  Private - Admin
 */
router.put('/admin/users/:userId/status',
  authenticateToken,
  authorize(['admin', 'superadmin']),
  [
    param('userId').isMongoId(),
    body('status').isIn(['active', 'inactive']),
    body('reason').optional().isString()
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status, reason } = req.body;

    // Prevent self-status changes
    if (userId === req.user.userId) {
      throw new ApiError('Cannot change your own status', 400);
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    const oldStatus = user.isActive ? 'active' : 'inactive';
    user.isActive = status === 'active';

    // Revoke all sessions if deactivating
    if (status === 'inactive' && user.revokeAllSessions) {
      user.revokeAllSessions();
    }

    if (user.addAuditLog) {
      user.addAuditLog('status_changed', {
        oldStatus,
        newStatus: status,
        reason,
        changedBy: req.user.userId
      }, req);
    }

    if (user.addNotification) {
      user.addNotification('account',
        status === 'active' ? 'Account Activated' : 'Account Deactivated',
        status === 'active' ? 'Your account has been activated by admin.' : 'Your account has been deactivated by admin.'
      );
    }

    await user.save();

    res.json(new ApiResponse({
      message: `User account ${status === 'active' ? 'activated' : 'deactivated'}`,
      data: {
        user: sanitizeUser(user)
      }
    }));
  })
);

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }

  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'One or more validation errors occurred',
      details: messages
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: `${field} already exists`
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: error.message
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      message: error.message
    });
  }

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size too large. Maximum size is 5MB.',
      message: error.message
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field',
      message: error.message
    });
  }

  // Default error
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && {
      message: error.message,
      stack: error.stack
    })
  });
});

/**
 * @route   POST /api/users/restore/:userId
 * @desc    Restore a soft-deleted user account (Admin only)
 * @access  Private (Admin)
 */
router.post('/restore/:userId',
  authenticateToken,
  authorize(['admin', 'superadmin']),
  [
    param('userId').isMongoId(),
    body('status').isIn(['active', 'inactive']),
    body('reason').optional().isString()
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Find the deleted user (include deleted users in query)
    const user = await User.findOne({
      _id: userId,
      isDeleted: true,
      includeDeleted: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Deleted user not found'
      });
    }

    try {
      // Use the schema method to restore the user
      user.restore(req);
      await user.save();

      // Send restoration notification email if possible
      if (user.email && !user.email.includes('deleted_')) {
        try {
          await sendEmail({
            to: user.email,
            subject: 'Account Restored',
            template: 'account-restored',
            data: {
              name: user.fullName || user.username,
              restoredBy: req.user.username,
              restoredAt: new Date().toLocaleString()
            }
          });
        } catch (emailError) {
          console.error('Failed to send restoration email:', emailError);
        }
      }

      res.json({
        success: true,
        message: 'User account restored successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isDeleted: user.isDeleted,
          restoredAt: new Date()
        }
      });

    } catch (error) {
      console.error('Account restoration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore user account'
      });
    }
  })
);
/**
 * @route   POST /api/admin/cleanup-expired-deletions
 * @desc    Clean up expired deletion requests (Admin task)
 * @access  Private (Admin)
 */
router.post('/admin/cleanup-expired-deletions',
  authenticateToken,
  authorize(['admin', 'superadmin']),
  [
    param('userId').isMongoId(),
    body('status').isIn(['active', 'inactive']),
    body('reason').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    try {
      // Use the static method from the schema
      const result = await User.cleanupExpiredDeletionRequests();

      res.json({
        success: true,
        message: 'Expired deletion requests cleaned up',
        modifiedCount: result.modifiedCount
      });

    } catch (error) {
      console.error('Cleanup expired deletions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup expired deletion requests'
      });
    }
  })
);

module.exports = router;
