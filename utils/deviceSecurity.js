const crypto = require('crypto');
const config = require('./config');
const { sendEmail } = require('../services/email');

/**
 * Device Security Utilities
 * Handles device fingerprinting, verification, and notifications
 */

/**
 * Generate device fingerprint hash
 * @param {Object} deviceInfo - Device information object
 * @param {Array} components - Components to include in fingerprint
 * @returns {string} - Device fingerprint hash
 */
const generateDeviceFingerprint = (deviceInfo, components = null) => {
  const enabledComponents = components || config.DEVICE_FINGERPRINT_COMPONENTS;
  
  const fingerprintData = [];
  
  // Build fingerprint based on enabled components
  if (enabledComponents.includes('userAgent')) {
    fingerprintData.push(deviceInfo.userAgent || 'unknown');
  }
  
  if (enabledComponents.includes('platform')) {
    fingerprintData.push(deviceInfo.platform || 'unknown');
  }
  
  if (enabledComponents.includes('browser')) {
    fingerprintData.push(deviceInfo.browser || 'unknown');
    fingerprintData.push(deviceInfo.browserVersion || 'unknown');
  }
  
  if (enabledComponents.includes('os')) {
    fingerprintData.push(deviceInfo.os || 'unknown');
  }
  
  if (enabledComponents.includes('language')) {
    fingerprintData.push(deviceInfo.language || 'unknown');
  }
  
  if (enabledComponents.includes('screenResolution')) {
    fingerprintData.push(deviceInfo.screenResolution || 'unknown');
  }
  
  if (enabledComponents.includes('timezone')) {
    fingerprintData.push(deviceInfo.timezone || 'unknown');
  }
  
  if (enabledComponents.includes('ip') && config.GEOLOCATION_ENABLED) {
    fingerprintData.push(deviceInfo.ipAddress || 'unknown');
  }
  
  if (enabledComponents.includes('geolocation') && config.GEOLOCATION_ENABLED) {
    fingerprintData.push(deviceInfo.location || 'unknown');
  }
  
  // Generate hash
  const fingerprintString = fingerprintData.join('|');
  return crypto
    .createHash('sha256')
    .update(fingerprintString)
    .digest('hex')
    .substring(0, 32);
};

/**
 * Check if device is trusted
 * @param {Object} user - User document
 * @param {string} deviceId - Device fingerprint ID
 * @returns {boolean} - True if device is trusted
 */
const isDeviceTrusted = (user, deviceId) => {
  if (!user || !user.trustedDevices || !Array.isArray(user.trustedDevices)) {
    return false;
  }
  
  return user.trustedDevices.some(device => 
    device.deviceId === deviceId && device.trusted === true
  );
};

/**
 * Check if device verification should be bypassed
 * @param {Object} user - User document
 * @param {Object} deviceInfo - Device information
 * @returns {boolean} - True if verification should be bypassed
 */
const shouldBypassDeviceVerification = (user, deviceInfo) => {
  // Check global bypass flag (for development)
  if (config.BYPASS_DEVICE_VERIFICATION) {
    return true;
  }
  
  // Check if device fingerprinting is disabled
  if (!config.DEVICE_FINGERPRINTING_ENABLED) {
    return true;
  }
  
  // Check if this is localhost/development environment
  if (config.NODE_ENV === 'development' && 
      (deviceInfo.ipAddress === '127.0.0.1' || deviceInfo.ipAddress === '::1')) {
    return true;
  }
  
  return false;
};

/**
 * Send new device notification email
 * @param {Object} user - User document
 * @param {Object} deviceInfo - Device information
 * @returns {Promise<void>}
 */
const sendNewDeviceNotification = async (user, deviceInfo) => {
  if (!config.NEW_DEVICE_EMAIL_NOTIFICATION) {
    return;
  }
  
  if (!user.email) {
    console.warn('Cannot send new device notification: User has no email');
    return;
  }
  
  try {
    const loginTime = new Date().toLocaleString('en-US', {
      timeZone: deviceInfo.timezone !== 'Unknown' ? deviceInfo.timezone : 'UTC',
      dateStyle: 'full',
      timeStyle: 'long'
    });
    
    const subject = '🔐 New Device Login Detected';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 {
            color: #667eea;
            margin: 0;
            font-size: 24px;
          }
          .alert-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .device-info {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #dee2e6;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 600;
            color: #666;
          }
          .info-value {
            color: #333;
            text-align: right;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
          .button:hover {
            background-color: #5568d3;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .security-tip {
            background-color: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">🔐</div>
            <h1>New Device Login Detected</h1>
          </div>
          
          <div class="alert-box">
            <strong>Security Alert:</strong> A new device was used to access your ${config.APP_NAME || 'Authn'} account.
          </div>
          
          <p>Hello ${user.name || user.username},</p>
          
          <p>We detected a login to your account from a new device. If this was you, you can disregard this email. If you don't recognize this activity, please secure your account immediately.</p>
          
          <div class="device-info">
            <h3 style="margin-top: 0;">Device Information</h3>
            
            <div class="info-row">
              <span class="info-label">Device:</span>
              <span class="info-value">${deviceInfo.deviceName || 'Unknown Device'}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Browser:</span>
              <span class="info-value">${deviceInfo.browser || 'Unknown'} ${deviceInfo.browserVersion || ''}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Operating System:</span>
              <span class="info-value">${deviceInfo.os || 'Unknown'}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Platform:</span>
              <span class="info-value">${deviceInfo.platform || 'Unknown'}</span>
            </div>
            
            ${deviceInfo.location !== 'Unknown Location' ? `
            <div class="info-row">
              <span class="info-label">Location:</span>
              <span class="info-value">${deviceInfo.location}</span>
            </div>
            ` : ''}
            
            <div class="info-row">
              <span class="info-label">IP Address:</span>
              <span class="info-value">${deviceInfo.ipAddress || 'Unknown'}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Time:</span>
              <span class="info-value">${loginTime}</span>
            </div>
          </div>
          
          <div class="security-tip">
            <strong>🛡️ Security Tip:</strong> If you don't recognize this activity:
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>Change your password immediately</li>
              <li>Review your account security settings</li>
              <li>Enable two-factor authentication if not already enabled</li>
              <li>Check your recent account activity</li>
            </ul>
          </div>
          
          <center>
            <a href="${config.DASHBOARD_URL || config.FRONTEND_URL}/settings/security" class="button">
              Review Security Settings
            </a>
          </center>
          
          <div class="footer">
            <p>This is an automated security notification from ${config.APP_NAME || 'Authn'}.</p>
            <p>For support, contact us at ${config.APP_SUPPORT_EMAIL || 'support@example.com'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sendEmail({
      to: user.email,
      subject,
      html
    });
    
    console.log(`New device notification sent to ${user.email}`);
  } catch (error) {
    console.error('Failed to send new device notification:', error);
    // Don't throw - email failure shouldn't block login
  }
};

/**
 * Get device risk score
 * @param {Object} deviceInfo - Device information
 * @param {Object} user - User document
 * @returns {Object} - Risk assessment
 */
const getDeviceRiskScore = (deviceInfo, user) => {
  let score = 0;
  const risks = [];
  
  // Check if IP is from a different country than usual
  if (user.lastLoginLocation && deviceInfo.location !== 'Unknown Location') {
    if (user.lastLoginLocation !== deviceInfo.location) {
      score += 30;
      risks.push('Different location than usual');
    }
  }
  
  // Check for unknown/suspicious user agent
  if (!deviceInfo.browser || deviceInfo.browser === 'Unknown') {
    score += 20;
    risks.push('Unknown browser');
  }
  
  // Check for VPN/Proxy indicators (basic check)
  if (deviceInfo.ipAddress && deviceInfo.ipAddress !== '127.0.0.1') {
    // Add more sophisticated VPN detection here if needed
  }
  
  // Check device change frequency
  if (user.trustedDevices && user.trustedDevices.length > 10) {
    score += 10;
    risks.push('Many trusted devices');
  }
  
  // Determine risk level
  let level = 'low';
  if (score >= 50) {
    level = 'high';
  } else if (score >= 30) {
    level = 'medium';
  }
  
  return {
    score,
    level,
    risks,
    timestamp: new Date()
  };
};

/**
 * Log device access attempt
 * @param {Object} user - User document
 * @param {Object} deviceInfo - Device information
 * @param {string} action - Action type (login, register, verify, etc.)
 * @param {boolean} success - Whether action was successful
 * @returns {Object} - Log entry
 */
const logDeviceAccess = (user, deviceInfo, action, success) => {
  const logEntry = {
    userId: user._id,
    username: user.username,
    action,
    success,
    deviceInfo: {
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      platform: deviceInfo.platform,
      ipAddress: deviceInfo.ipAddress,
      location: deviceInfo.location,
      timezone: deviceInfo.timezone
    },
    timestamp: new Date()
  };
  
  // In production, you might want to store this in a separate audit log collection
  console.log('Device Access Log:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
};

module.exports = {
  generateDeviceFingerprint,
  isDeviceTrusted,
  shouldBypassDeviceVerification,
  sendNewDeviceNotification,
  getDeviceRiskScore,
  logDeviceAccess
};
