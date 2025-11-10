const nodemailer = require('nodemailer');
const { promisify } = require('util');

// Email templates
const emailTemplates = {
  'email-verification': {
    subject: 'One more step to sign up',
    template: (data) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1c1e21; 
            margin: 0; 
            padding: 20px; 
            background-color: #f0f2f5; 
        }
        .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background-color: #ffffff; 
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header { 
            background-color: #ffffff;
            padding: 30px 30px 20px 30px; 
            border-bottom: 1px solid #e4e6ea;
            position: relative;
        }
        .logo {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: block;
        }
        .user-profile {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            float: right;
            margin-top: -5px;
        }
        .content { 
            padding: 20px 30px 30px 30px; 
        }
        .greeting {
            font-size: 16px;
            color: #1c1e21;
            margin-bottom: 20px;
        }
        .main-text {
            font-size: 16px;
            color: #1c1e21;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .code-container {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 6px;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
        }
        .verification-code {
            font-size: 24px;
            font-weight: 600;
            color: #1c1e21;
            letter-spacing: 3px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
        }
        .code-note {
            font-size: 14px;
            color: #65676b;
            margin-top: 10px;
        }
        .warning-section {
            margin: 25px 0;
        }
        .warning-title {
            font-weight: 600;
            color: #1c1e21;
            margin-bottom: 8px;
        }
        .warning-text {
            color: #1c1e21;
            font-size: 16px;
            line-height: 1.5;
        }
        .signature {
            margin-top: 25px;
            color: #1c1e21;
        }
        .help-section {
            background-color: #f7f8fa;
            padding: 20px;
            font-size: 14px;
            color: #65676b;
            text-align: center;
        }
        .help-link {
            color: #2563eb;
            text-decoration: none;
        }
        .help-link:hover {
            text-decoration: underline;
        }
        .footer {
            background-color: #ffffff;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #e4e6ea;
        }
        .company-logo {
            font-weight: bold;
            color: ${process.env.EMAIL_PRIMARY_COLOR || '#1877f2'};
            font-size: 18px;
            margin-bottom: 10px;
        }
        .company-info {
            font-size: 12px;
            color: #8a8d91;
            line-height: 1.4;
        }
        .email-sent-to {
            margin-top: 15px;
            font-size: 12px;
            color: #8a8d91;
        }
        .privacy-note {
            margin-top: 10px;
            font-size: 12px;
            color: #8a8d91;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${process.env.EMAIL_LOGO_URL || 'https://spotless-orange-flea.myfilebase.com/ipfs/QmZ7KzNrnnFMb7omqMpZvJXxdRddHT7XuJgSd9PUUCJ3yj'}" alt="${process.env.APP_NAME || 'Authn'} Logo" class="logo">
            <img src="https://spotless-orange-flea.myfilebase.com/ipfs/QmSaqA9tpYReUdr4Xw3uyvsCts5xTeHKsfdiHDiDjTUN4W" alt="User Profile" class="user-profile">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1c1e21;">One more step to sign up to ${process.env.APP_NAME || 'Authn'}</h1>
        </div>
        
        <div class="content">
            <div class="greeting">Hi ${data.name},</div>
            
            <div class="main-text">
                We got your request to create an account. Here's your confirmation code:
            </div>
            
            <div class="code-container">
                <div class="verification-code">T-${data.otp}</div>
                <div class="code-note">Don't share this code with anyone.</div>
                <div class="code-note">This code will expires in ${data.expirationTime}.</div>            
            </div>
            
            <div class="warning-section">
                <div class="warning-title">If someone asks for this code</div>
                <div class="warning-text">
                    Don't share this code with anyone, especially if they tell you that they work for ${process.env.APP_NAME || 'Authn'}.
                </div>
            </div>
            
            <div class="signature">
                Thanks,<br>
                ${process.env.APP_NAME || 'Authn'} Security
            </div>
        </div>
        
        <div class="help-section">
            <div>Wondering if this email is really from us? Visit the Help Centre to confirm: 
                <a href="${data.helpUrl || process.env.FRONTEND_URL || 'authn.com'}/help/check-email" class="help-link">Help Center</a>
            </div>
        </div>
        
        <div class="footer">
            <div class="company-logo" style="color: ${process.env.EMAIL_PRIMARY_COLOR || '#1877f2'};">${process.env.EMAIL_COMPANY_NAME || process.env.APP_NAME || 'Authn'}</div>
            <div class="company-info">
                ${process.env.EMAIL_COMPANY_ADDRESS || 'Authn Inc., Attention: Community Support, 123 Authn Street, Your City, State 12345'}
            </div>
            <div class="email-sent-to">
                This message was sent to <strong>${data.email}</strong>.
            </div>
            <div class="privacy-note">
                To help keep your account secure, please don't forward this email. 
                <a href="${data.privacyUrl || process.env.APP_PRIVACY_URL || '#'}" class="help-link">Privacy Policy</a> | <a href="${data.termsUrl || process.env.APP_TERMS_URL || '#'}" class="help-link">Terms of Service</a>
            </div>
        </div>
    </div>
</body>
</html>
    `
  },

  'password-reset': {
    subject: 'Reset your password',
    template: (data) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1c1e21; 
            margin: 0; 
            padding: 20px; 
            background-color: #f0f2f5; 
        }
        .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background-color: #ffffff; 
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header { 
            background-color: #ffffff;
            padding: 30px 30px 20px 30px; 
            border-bottom: 1px solid #e4e6ea;
            position: relative;
        }
        .logo {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: block;
        }
        .user-profile {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            float: right;
            margin-top: -5px;
        }
        .content { 
            padding: 20px 30px 30px 30px; 
        }
        .greeting {
            font-size: 16px;
            color: #1c1e21;
            margin-bottom: 20px;
        }
        .main-text {
            font-size: 16px;
            color: #1c1e21;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .button-container {
            text-align: center;
            margin: 25px 0;
        }
            background-color: ${process.env.EMAIL_PRIMARY_COLOR || '#2563eb'};
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
        }
        .reset-button:hover {
            background-color: #1d4ed8;
        }
        .expiry-note {
            font-size: 14px;
            color: #65676b;
            text-align: center;
            margin-top: 15px;
        }
        .warning-section {
            background-color: #fef3cd;
            border: 1px solid #fadb5f;
            border-radius: 6px;
            padding: 15px;
            margin: 25px 0;
        }
        .warning-title {
            font-weight: 600;
            color: #1c1e21;
            margin-bottom: 8px;
        }
        .warning-text {
            color: #1c1e21;
            font-size: 16px;
            line-height: 1.5;
        }
        .signature {
            margin-top: 25px;
            color: #1c1e21;
        }
        .help-section {
            background-color: #f7f8fa;
            padding: 20px;
            font-size: 14px;
            color: #65676b;
            text-align: center;
        }
        .help-link {
            color: #2563eb;
            text-decoration: none;
        }
        .help-link:hover {
            text-decoration: underline;
        }
        .footer {
            background-color: #ffffff;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #e4e6ea;
        }
        .company-logo {
            font-weight: bold;
            color: ${process.env.EMAIL_PRIMARY_COLOR || '#2563eb'};
            font-size: 18px;
            margin-bottom: 10px;
        }
        .company-info {
            font-size: 12px;
            color: #8a8d91;
            line-height: 1.4;
        }
        .email-sent-to {
            margin-top: 15px;
            font-size: 12px;
            color: #8a8d91;
        }
        .privacy-note {
            margin-top: 10px;
            font-size: 12px;
            color: #8a8d91;
        }
        .fallback-url {
            margin-top: 15px;
            padding: 15px;
            background-color: #f7f8fa;
            border-radius: 6px;
            font-size: 12px;
            color: #65676b;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${process.env.EMAIL_LOGO_URL || 'https://spotless-orange-flea.myfilebase.com/ipfs/QmZ7KzNrnnFMb7omqMpZvJXxdRddHT7XuJgSd9PUUCJ3yj'}" alt="${process.env.APP_NAME || 'Authn'} Logo" class="logo">
            <img src="https://spotless-orange-flea.myfilebase.com/ipfs/QmSaqA9tpYReUdr4Xw3uyvsCts5xTeHKsfdiHDiDjTUN4W" alt="User Profile" class="user-profile">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1c1e21;">Reset your password</h1>
        </div>
        
        <div class="content">
            <div class="greeting">Hi ${data.name},</div>
            
            <div class="main-text">
                We received a request to reset your password for your ${process.env.APP_NAME || 'Authn'} account. Click the button below to create a new password:
            </div>
            
            <div class="button-container">
                <a href="${data.resetUrl}" class="reset-button">Reset Password</a>
            </div>
            
            <div class="expiry-note">
                <strong>This link expires in ${data.expiresIn || '1 hour'}.</strong>
            </div>
            
            <div class="warning-section">
                <div class="warning-title">Security Notice</div>
                <div class="warning-text">
                    If you didn't request this password reset, please ignore this email and consider changing your password as a precaution.
                </div>
            </div>
            
            <div class="signature">
                Thanks,<br>
                The ${process.env.APP_NAME || 'Authn'} Team
            </div>
        </div>
        
        <div class="help-section">
            <div>Having trouble with the button? Copy and paste this URL into your browser:</div>
            <div class="fallback-url">${data.resetUrl}</div>
        </div>
        
        <div class="footer">
            <div class="company-logo">${process.env.EMAIL_COMPANY_NAME || process.env.APP_NAME || 'Authn'}</div>
            <div class="company-info">
                ${process.env.EMAIL_COMPANY_ADDRESS || 'Authn Inc., Attention: Community Support, 123 Authn Street, Your City, State 12345'}
            </div>
            <div class="email-sent-to">
                This message was sent to <strong>${data.email}</strong>.
            </div>
            <div class="privacy-note">
                To help keep your account secure, please don't forward this email. 
                <a href="${data.privacyUrl || process.env.APP_PRIVACY_URL || '#'}" class="help-link">Privacy Policy</a> | <a href="${data.termsUrl || process.env.APP_TERMS_URL || '#'}" class="help-link">Terms of Service</a>
            </div>
        </div>
    </div>
</body>
</html>
    `
  },

  'welcome': {
    subject: 'Welcome to TransitFlow - Let\'s Get Started!',
    template: (data) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to TransitFlow</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                line-height: 1.6; 
                color: #1c1e21; 
                margin: 0; 
                padding: 20px; 
                background-color: #f0f2f5; 
            }
            .container { 
                max-width: 500px; 
                margin: 0 auto; 
                background-color: #ffffff; 
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header { 
                background-color: #ffffff;
                padding: 30px 30px 20px 30px; 
                border-bottom: 1px solid #e4e6ea;
                position: relative;
            }
            .logo {
                width: 40px;
                height: 40px;
                border-radius: 8px;
                margin-bottom: 20px;
                display: block;
            }
            .user-profile {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                float: right;
                margin-top: -5px;
            }
            .content { 
                padding: 20px 30px 30px 30px; 
            }
            .greeting {
                font-size: 16px;
                color: #1c1e21;
                margin-bottom: 20px;
            }
            .main-text {
                font-size: 16px;
                color: #1c1e21;
                margin-bottom: 20px;
                line-height: 1.5;
            }
            .stats-container {
                background-color: #f7f8fa;
                border-radius: 6px;
                padding: 20px;
                margin: 25px 0;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 20px;
                text-align: center;
            }
            .stat-item {
                padding: 10px;
            }
            .stat-number {
                font-size: 24px;
                font-weight: bold;
                color: ${process.env.EMAIL_PRIMARY_COLOR || '#2563eb'};
                margin-bottom: 5px;
            }
            .stat-label {
                font-size: 12px;
                color: #65676b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .next-steps {
                margin: 25px 0;
            }
            .steps-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #1c1e21;
                    margin-bottom: 20px;
                }
                .step-item {
                    background-color: #f7f8fa;
                    border-radius: 6px;
                    padding: 15px;
                    margin-bottom: 12px;
                    border-left: 3px solid ${process.env.EMAIL_PRIMARY_COLOR || '#2563eb'};
                }
                .step-title {
                    font-weight: 600;
                    color: #1c1e21;
                    margin-bottom: 5px;
                }
                .step-description {
                    color: #65676b;
                    font-size: 14px;
                }
                .button-container {
                    text-align: center;
                    margin: 25px 0;
                }
                .get-started-button {
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: ${process.env.EMAIL_PRIMARY_COLOR || '#2563eb'};
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 16px;
                }
                .get-started-button:hover {
                    background-color: #1d4ed8;
                }
                .help-section {
                    background-color: #e7f3ff;
                    border: 1px solid #b3d9ff;
                    border-radius: 6px;
                    padding: 20px;
                    margin: 25px 0;
                }
                .help-title {
                    font-weight: 600;
                    color: #1c1e21;
                    margin-bottom: 10px;
                }
                .help-text {
                    color: #1c1e21;
                    font-size: 16px;
                    line-height: 1.5;
                    margin: 0;
                }
                .signature {
                    margin-top: 25px;
                    color: #1c1e21;
                }
                .footer {
                    background-color: #f7f8fa;
                    padding: 20px;
                    text-align: center;
                    font-size: 14px;
                    color: #65676b;
                }
                .company-logo {
                    font-weight: bold;
                    color: ${process.env.EMAIL_PRIMARY_COLOR || '#2563eb'};
                    font-size: 18px;
                    margin-bottom: 10px;
                }
                .company-info {
                    font-size: 12px;
                    color: #8a8d91;
                    line-height: 1.4;
                }
                .email-sent-to {
                    margin-top: 15px;
                    font-size: 12px;
                    color: #8a8d91;
                }
                .privacy-note {
                    margin-top: 10px;
                    font-size: 12px;
                    color: #8a8d91;
                }
                .help-link {
                    color: ${process.env.EMAIL_PRIMARY_COLOR || '#2563eb'};
                    text-decoration: none;
                }
                .help-link:hover {
                    text-decoration: underline;
                }
            </style></head>
<body>
    <div class="container">
        <div class="header">
            <img src="${process.env.EMAIL_LOGO_URL || 'https://spotless-orange-flea.myfilebase.com/ipfs/QmZ7KzNrnnFMb7omqMpZvJXxdRddHT7XuJgSd9PUUCJ3yj'}" alt="${process.env.APP_NAME || 'Authn'} Logo" class="logo">
            <img src="https://spotless-orange-flea.myfilebase.com/ipfs/QmSaqA9tpYReUdr4Xw3uyvsCts5xTeHKsfdiHDiDjTUN4W" alt="User Profile" class="user-profile">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1c1e21;">Welcome to ${process.env.APP_NAME || 'Authn'}</h1>
        </div>
        
        <div class="content">
            <div class="greeting">Hi ${data.name},</div>
            
            <div class="main-text">
                Welcome to ${process.env.APP_NAME || 'Authn'}! We're excited to have you join our community of professionals. ${data.loginMethod ? `Your account has been successfully created using ${data.loginMethod}.` : 'Your account has been successfully created.'}
            </div>
            
            <div class="stats-container">
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">10K+</div>
                        <div class="stat-label">Active Users</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">99.9%</div>
                        <div class="stat-label">Uptime</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">24/7</div>
                        <div class="stat-label">Support</div>
                    </div>
                </div>
            </div>
            
            <div class="next-steps">
                <div class="steps-title">Your Next Steps</div>
                
                <div class="step-item">
                    <div class="step-title">Secure Your Account</div>
                    <div class="step-description">Enable two-factor authentication and review your security settings to keep your account protected.</div>
                </div>
                
                <div class="step-item">
                    <div class="step-title">Complete Your Profile</div>
                    <div class="step-description">Add your professional information, profile picture, and preferences to personalize your experience.</div>
                </div>
                
                <div class="step-item">
                    <div class="step-title">Set Your Goals</div>
                    <div class="step-description">Define your objectives and let ${process.env.APP_NAME || 'Authn'} help you achieve them with tailored recommendations.</div>
                </div>
                
                <div class="step-item">
                    <div class="step-title">Connect & Network</div>
                    <div class="step-description">Discover and connect with like-minded professionals in your industry and interests.</div>
                </div>
            </div>
            
            <div class="button-container">
                <a href="${data.dashboardUrl || (process.env.NODE_ENV === 'production' ? process.env.PROD_DASHBOARD_URL : process.env.DASHBOARD_URL) || '#'}" class="get-started-button">Get Started Now</a>
            </div>
            
            <div class="help-section">
                <div class="help-title">Need Help?</div>
                <div class="help-text">Our dedicated support team is here to assist you 24/7. Don't hesitate to reach out if you have any questions or need guidance getting started. You can contact us at <a href="mailto:${process.env.APP_SUPPORT_EMAIL || 'support@yourdomain.com'}" class="help-link">${process.env.APP_SUPPORT_EMAIL || 'support@yourdomain.com'}</a>.</div>
            </div>
            
            <div class="main-text">
                We're committed to providing you with the best possible experience. Thank you for choosing ${process.env.APP_NAME || 'Authn'} as your trusted partner.
            </div>
            
            <div class="signature">
                Best regards,<br>
                The ${process.env.APP_NAME || 'Authn'} Team
            </div>
        </div>
        
        <div class="footer">
            <div class="company-logo">${process.env.EMAIL_COMPANY_NAME || process.env.APP_NAME || 'Authn'}</div>
            <div class="company-info">
                ${process.env.EMAIL_COMPANY_ADDRESS || 'Authn Inc., Attention: Community Support, 123 Authn Street, Your City, State 12345'}
            </div>
            <div class="email-sent-to">
                This message was sent to <strong>${data.email}</strong>.
            </div>
            <div class="privacy-note">
                This is an automated message. For questions, visit our <a href="${data.helpUrl || '#'}" class="help-link">Help Center</a> or contact support.
                <a href="${data.privacyUrl || process.env.APP_PRIVACY_URL || '#'}" class="help-link">Privacy Policy</a> | <a href="${data.termsUrl || process.env.APP_TERMS_URL || '#'}" class="help-link">Terms of Service</a>
            </div>
        </div>
    </div>
</body>
</html>
    `
  },

  'device-verification': {
    subject: 'New Device Login - Verification Required',
    template: (data) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Device Verification</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1c1e21; 
            margin: 0; 
            padding: 20px; 
            background-color: #f0f2f5; 
        }
        .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background-color: #ffffff; 
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header { 
            background-color: #ffffff;
            padding: 30px 30px 20px 30px; 
            border-bottom: 1px solid #e4e6ea;
            position: relative;
        }
        .logo {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: block;
        }
        .user-profile {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            float: right;
            margin-top: -5px;
        }
        .content { 
            padding: 20px 30px 30px 30px; 
        }
        .greeting {
            font-size: 16px;
            color: #1c1e21;
            margin-bottom: 20px;
        }
        .main-text {
            font-size: 16px;
            color: #1c1e21;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .device-info-container {
            background-color: #f7f8fa;
            border-radius: 6px;
            padding: 20px;
            margin: 25px 0;
        }
        .device-info-title {
            font-weight: 600;
            color: #1c1e21;
            margin-bottom: 15px;
            font-size: 16px;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e4e6ea;
        }
        .info-item:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 500;
            color: #65676b;
        }
        .info-value {
            color: #1c1e21;
            text-align: right;
            word-break: break-word;
            max-width: 60%;
        }
        .actions-container {
            text-align: center;
            margin: 25px 0;
        }
        .verify-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #42b883;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 5px 10px;
        }
        .verify-button:hover {
            background-color: #369870;
        }
        .deny-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #e74c3c;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 5px 10px;
        }
        .deny-button:hover {
            background-color: #c0392b;
        }
        .expiry-note {
            font-size: 14px;
            color: #65676b;
            text-align: center;
            margin-top: 15px;
        }
        .security-section {
            background-color: #fef3cd;
            border: 1px solid #fadb5f;
            border-radius: 6px;
            padding: 20px;
            margin: 25px 0;
        }
        .security-title {
            font-weight: 600;
            color: #1c1e21;
            margin-bottom: 10px;
        }
        .security-list {
            color: #1c1e21;
            font-size: 14px;
            line-height: 1.5;
            margin: 0;
            padding-left: 0;
            list-style: none;
        }
        .security-list li {
            margin-bottom: 5px;
            padding-left: 15px;
            position: relative;
        }
        .security-list li:before {
            content: "•";
            color: ${process.env.EMAIL_PRIMARY_COLOR || '#2563eb'};
            position: absolute;
            left: 0;
        }
        .fallback-url {
            margin-top: 15px;
            padding: 15px;
            background-color: #f7f8fa;
            border-radius: 6px;
            font-size: 12px;
            color: #65676b;
            word-break: break-all;
        }
        .signature {
            margin-top: 25px;
            color: #1c1e21;
        }
        .footer {
            background-color: #f7f8fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #65676b;
        }
        .company-logo {
            font-weight: bold;
            color: #2563eb;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .company-info {
            font-size: 12px;
            color: #8a8d91;
            line-height: 1.4;
        }
        .email-sent-to {
            margin-top: 15px;
            font-size: 12px;
            color: #8a8d91;
        }
        .privacy-note {
            margin-top: 10px;
            font-size: 12px;
            color: #8a8d91;
        }
        .help-link {
            color: ${process.env.EMAIL_PRIMARY_COLOR || '#2563eb'};
            text-decoration: none;
        }
        .help-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://spotless-orange-flea.myfilebase.com/ipfs/QmZ7KzNrnnFMb7omqMpZvJXxdRddHT7XuJgSd9PUUCJ3yj" alt="${process.env.APP_NAME || 'Authn'} Logo" class="logo">
            <img src="${data.userProfilePic || 'https://spotless-orange-flea.myfilebase.com/ipfs/QmSaqA9tpYReUdr4Xw3uyvsCts5xTeHKsfdiHDiDjTUN4W'}" alt="User Profile" class="user-profile">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1c1e21;">New Device Login Detected</h1>
        </div>
        
        <div class="content">
            <div class="greeting">Hi ${data.name},</div>
            
            <div class="main-text">
                We detected a login attempt from a new device. For your account security, please verify that this was you.
            </div>
            
            <div class="device-info-container">
                <div class="device-info-title">Login Details</div>
                <div class="info-item">
                    <span class="info-label">Device:</span>
                    <span class="info-value">${data.deviceName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Location:</span>
                    <span class="info-value">${data.location}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">IP Address:</span>
                    <span class="info-value">${data.ipAddress}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Time:</span>
                    <span class="info-value">${data.timestamp || new Date().toLocaleString()}</span>
                </div>
            </div>
            
            <div class="actions-container">
                <a href="${data.verificationUrl}" class="verify-button">Yes, This Was Me</a>
                <a href="${data.verificationUrl}&action=deny" class="deny-button">No, Secure My Account</a>
            </div>
            
            <div class="expiry-note">
                This verification link expires in <strong>${data.expiresIn || '24 hours'}</strong>.
            </div>
            
            <div class="security-section">
                <div class="security-title">Security Reminder</div>
                <ul class="security-list">
                    <li>If this wasn't you, click "Secure My Account" immediately</li>
                    <li>We recommend using strong, unique passwords</li>
                    <li>Enable two-factor authentication for added security</li>
                    <li>Never share your login credentials with anyone</li>
                </ul>
            </div>
            
            <div class="main-text">
                If you're having trouble with the buttons above, you can copy and paste this URL into your browser:
            </div>
            
            <div class="fallback-url">${data.verificationUrl}</div>
            
            <div class="signature">
                Stay secure,<br>
                The ${process.env.APP_NAME || 'Authn'} Security Team
            </div>
        </div>
        
        <div class="footer">
            <div class="company-logo">${process.env.EMAIL_COMPANY_NAME || process.env.APP_NAME || 'Authn'}</div>
            <div class="company-info">
                ${process.env.EMAIL_COMPANY_ADDRESS || 'Authn Inc., Attention: Community Support, 123 Authn Street, Your City, State 12345'}
            </div>
            <div class="email-sent-to">
                This message was sent to <strong>${data.email}</strong>.
            </div>
            <div class="privacy-note">
                This is an automated security message. For urgent concerns, contact our <a href="${data.supportUrl || `mailto:${process.env.APP_SUPPORT_EMAIL || 'support@yourdomain.com'}`}" class="help-link">support team</a> immediately.
                <a href="${data.privacyUrl || process.env.APP_PRIVACY_URL || '#'}" class="help-link">Privacy Policy</a> | <a href="${data.termsUrl || process.env.APP_TERMS_URL || '#'}" class="help-link">Terms of Service</a>
            </div>
        </div>
    </div>
</body>
</html>
    `
  },

  'account-deleted': {
    subject: 'Account Successfully Deleted',
    template: (data) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deleted</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1c1e21; 
            margin: 0; 
            padding: 20px; 
            background-color: #f0f2f5; 
        }
        .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background-color: #ffffff; 
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header { 
            background-color: #ffffff;
            padding: 30px 30px 20px 30px; 
            border-bottom: 1px solid #e4e6ea;
            position: relative;
        }
        .logo {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: block;
        }
        .user-profile {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            float: right;
            margin-top: -5px;
        }
        .content { 
            padding: 20px 30px 30px 30px; 
        }
        .greeting {
            font-size: 16px;
            color: #1c1e21;
            margin-bottom: 20px;
        }
        .main-text {
            font-size: 16px;
            color: #1c1e21;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .info-section {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 6px;
            padding: 20px;
            margin: 25px 0;
        }
        .info-title {
            font-weight: 600;
            color: #1c1e21;
            margin-bottom: 10px;
        }
        .info-list {
            color: #1c1e21;
            font-size: 14px;
            line-height: 1.5;
            margin: 0;
            padding-left: 0;
            list-style: none;
        }
        .info-list li {
            margin-bottom: 5px;
            padding-left: 15px;
            position: relative;
        }
        .info-list li:before {
            content: "•";
            color: ${process.env.EMAIL_PRIMARY_COLOR || '#2563eb'};
            position: absolute;
            left: 0;
        }
        .signature {
            margin-top: 25px;
            color: #1c1e21;
        }
        .footer {
            background-color: #f7f8fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #65676b;
        }
        .company-logo {
            font-weight: bold;
            color: ${process.env.EMAIL_PRIMARY_COLOR || '#2563eb'};
            font-size: 18px;
            margin-bottom: 10px;
        }
        .company-info {
            font-size: 12px;
            color: #8a8d91;
            line-height: 1.4;
        }
        .email-sent-to {
            margin-top: 15px;
            font-size: 12px;
            color: #8a8d91;
        }
        .privacy-note {
            margin-top: 10px;
            font-size: 12px;
            color: #8a8d91;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${process.env.EMAIL_LOGO_URL || 'https://spotless-orange-flea.myfilebase.com/ipfs/QmZ7KzNrnnFMb7omqMpZvJXxdRddHT7XuJgSd9PUUCJ3yj'}" alt="${process.env.APP_NAME || 'Authn'} Logo" class="logo">
            <img src="${data.userProfilePic || 'https://spotless-orange-flea.myfilebase.com/ipfs/QmSaqA9tpYReUdr4Xw3uyvsCts5xTeHKsfdiHDiDjTUN4W'}" alt="User Profile" class="user-profile">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1c1e21;">Account Successfully Deleted</h1>
        </div>
        
        <div class="content">
            <div class="greeting">Hi ${data.name},</div>
            
            <div class="main-text">
                This confirms that your account was successfully deleted on ${data.deletionDate ? new Date(data.deletionDate).toLocaleDateString() : new Date().toLocaleDateString()}.
            </div>
            
            <div class="info-section">
                <div class="info-title">What happens next</div>
                <ul class="info-list">
                    <li>All your personal data has been removed from our systems</li>
                    <li>You will no longer receive emails from us</li>
                    <li>Your username may become available for new registrations after 30 days</li>
                </ul>
            </div>
            
            <div class="main-text">
                We're sorry to see you go, but we understand that ${process.env.APP_NAME || 'Authn'} may not be for everyone.
            </div>
            
            <div class="main-text">
                If you change your mind, you're always welcome to create a new account.
            </div>
            
            <div class="main-text">
                Thank you for being part of our community.
            </div>
            
            <div class="signature">
                Best regards,<br>
                The ${process.env.APP_NAME || 'Authn'} Team
            </div>
        </div>
        
        <div class="footer">
            <div class="company-logo">${process.env.EMAIL_COMPANY_NAME || process.env.APP_NAME || 'Authn'}</div>
            <div class="company-info">
                ${process.env.EMAIL_COMPANY_ADDRESS || 'Authn Inc., Attention: Community Support, 123 Authn Street, Your City, State 12345'}
            </div>
            <div class="email-sent-to">
                This message was sent to <strong>${data.email}</strong>.
            </div>
            <div class="privacy-note">
                This is an automated message, please do not reply to this email.
                <a href="${data.privacyUrl || process.env.APP_PRIVACY_URL || '#'}" class="help-link">Privacy Policy</a> | <a href="${data.termsUrl || process.env.APP_TERMS_URL || '#'}" class="help-link">Terms of Service</a>
            </div>
        </div>
    </div>
</body>
</html>
    `
  },

  'account-deletion-confirmation': {
    subject: 'Confirm Account Deletion',
    template: (data) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Account Deletion</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1c1e21; 
            margin: 0; 
            padding: 20px; 
            background-color: #f0f2f5; 
        }
        .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background-color: #ffffff; 
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header { 
            background-color: #ffffff;
            padding: 30px 30px 20px 30px; 
            border-bottom: 1px solid #e4e6ea;
            position: relative;
        }
        .logo {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: block;
        }
        .user-profile {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            float: right;
            margin-top: -5px;
        }
        .content { 
            padding: 20px 30px 30px 30px; 
        }
        .greeting {
            font-size: 16px;
            color: #1c1e21;
            margin-bottom: 20px;
        }
        .main-text {
            font-size: 16px;
            color: #1c1e21;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .warning-section {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 20px;
            margin: 25px 0;
        }
        .warning-title {
            font-weight: 600;
            color: #dc2626;
            margin-bottom: 10px;
        }
        .warning-list {
            color: #dc2626;
            font-size: 14px;
            line-height: 1.5;
            margin: 0;
            padding-left: 0;
            list-style: none;
        }
        .warning-list li {
            margin-bottom: 5px;
            padding-left: 15px;
            position: relative;
        }
        .warning-list li:before {
            content: "•";
            color: #dc2626;
            position: absolute;
            left: 0;
        }
        .button-container {
            text-align: center;
            margin: 25px 0;
        }
        .delete-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #dc2626;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
        }
        .delete-button:hover {
            background-color: #b91c1c;
        }
        .expiry-note {
            font-size: 14px;
            color: #65676b;
            text-align: center;
            margin-top: 15px;
        }
        .signature {
            margin-top: 25px;
            color: #1c1e21;
        }
        .footer {
            background-color: #f7f8fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #65676b;
        }
        .company-logo {
            font-weight: bold;
            color: ${process.env.EMAIL_PRIMARY_COLOR || '#2563eb'};
            font-size: 18px;
            margin-bottom: 10px;
        }
        .company-info {
            font-size: 12px;
            color: #8a8d91;
            line-height: 1.4;
        }
        .email-sent-to {
            margin-top: 15px;
            font-size: 12px;
            color: #8a8d91;
        }
        .privacy-note {
            margin-top: 10px;
            font-size: 12px;
            color: #8a8d91;
        }
        .fallback-url {
            margin-top: 15px;
            padding: 15px;
            background-color: #f7f8fa;
            border-radius: 6px;
            font-size: 12px;
            color: #65676b;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${process.env.EMAIL_LOGO_URL || 'https://spotless-orange-flea.myfilebase.com/ipfs/QmZ7KzNrnnFMb7omqMpZvJXxdRddHT7XuJgSd9PUUCJ3yj'}" alt="${process.env.APP_NAME || 'Authn'} Logo" class="logo">
            <img src="${data.userProfilePic || 'https://spotless-orange-flea.myfilebase.com/ipfs/QmSaqA9tpYReUdr4Xw3uyvsCts5xTeHKsfdiHDiDjTUN4W'}" alt="User Profile" class="user-profile">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1c1e21;">Account Deletion Request</h1>
        </div>
        
        <div class="content">
            <div class="greeting">Hi ${data.name},</div>
            
            <div class="main-text">
                We received a request to delete your account. This action is <strong>permanent and cannot be undone</strong>.
            </div>
            
            <div class="warning-section">
                <div class="warning-title">What will be deleted</div>
                <ul class="warning-list">
                    <li>Your profile and personal information</li>
                    <li>All your posts and activity</li>
                    <li>Your connections and messages</li>
                    <li>All associated data</li>
                </ul>
            </div>
            
            <div class="main-text">
                If you're sure you want to proceed, click the button below to confirm:
            </div>
            
            <div class="button-container">
                <a href="${data.confirmationUrl}" class="delete-button">Yes, Delete My Account</a>
            </div>
            
            <div class="expiry-note">
                This confirmation link expires in <strong>${data.expiresIn || '24 hours'}</strong>.
            </div>
            
            <div class="main-text">
                If you didn't request this deletion or have changed your mind, simply ignore this email and your account will remain active.
            </div>
            
            <div class="main-text">
                If you're having trouble with the button above, you can copy and paste this URL into your browser:
            </div>
            
            <div class="fallback-url">${data.confirmationUrl}</div>
            
            <div class="signature">
                Best regards,<br>
                The ${process.env.APP_NAME || 'Authn'} Team
            </div>
        </div>
        
        <div class="footer">
            <div class="company-logo">${process.env.EMAIL_COMPANY_NAME || process.env.APP_NAME || 'Authn'}</div>
            <div class="company-info">
                ${process.env.EMAIL_COMPANY_ADDRESS || 'Authn Inc., Attention: Community Support, 123 Authn Street, Your City, State 12345'}
            </div>
            <div class="email-sent-to">
                This message was sent to <strong>${data.email}</strong>.
            </div>
            <div class="privacy-note">
                This is an automated message, please do not reply to this email.
                <a href="${data.privacyUrl || process.env.APP_PRIVACY_URL || '#'}" class="help-link">Privacy Policy</a> | <a href="${data.termsUrl || process.env.APP_TERMS_URL || '#'}" class="help-link">Terms of Service</a>
            </div>
        </div>
    </div>
</body>
</html>
    `
  }
};

// Create email transporter
let transporter = null;

const createTransporter = () => {
  // Custom SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // Use 'true' string for boolean check
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Initialize email service
 */
const initializeEmailService = async () => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️  Email credentials not found. Email service will be disabled.');
      return false;
    }

    transporter = createTransporter();

    // Verify connection
    await transporter.verify();
    console.log('✅ Email service initialized successfully');
    return true;

  } catch (error) {
    console.error('❌ Email service initialization failed:', error.message);
    return false;
  }
};

/**
 * Send email using template
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Email result
 */
const sendEmail = async (options) => {
  try {
    if (process.env.EMAIL_ENABLED === 'false') {
      console.log('📧 Email sending is disabled. Logging email instead:');
      console.log('Email Details:', {
        to: options.to,
        subject: options.subject || emailTemplates[options.template]?.subject,
        template: options.template,
        data: options.data
      });
      return { success: true, messageId: 'disabled-email', method: 'console-disabled' };
    }

    if (!transporter) {
      console.warn('Email service not initialized. Logging email instead:');
      console.log('Email Details:', {
        to: options.to,
        subject: options.subject || emailTemplates[options.template]?.subject,
        template: options.template,
        data: options.data
      });
      return { success: true, messageId: 'mock-id', method: 'console' };
    }

    const { to, subject, template, data, html, text, attachments } = options;

    let emailSubject = subject;
    let emailHtml = html;
    let emailText = text;

    // Use template if provided
    if (template && emailTemplates[template]) {
      emailSubject = emailSubject || emailTemplates[template].subject;
      emailHtml = emailTemplates[template].template(data || {});

      // Generate plain text version from HTML
      if (!emailText) {
        emailText = emailHtml
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      }
    }

    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Your App',
        address: process.env.EMAIL_FROM || process.env.SMTP_USER
      },
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      attachments: attachments || []
    };

    const result = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      messageId: result.messageId
    });

    return {
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected
    };

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send bulk emails
 * @param {Array} recipients - Array of recipient objects
 * @param {Object} emailOptions - Common email options
 * @returns {Promise<Array>} - Array of results
 */
const sendBulkEmail = async (recipients, emailOptions) => {
  try {
    const results = [];
    const batchSize = 10; // Process in batches to avoid overwhelming the service

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchPromises = batch.map(async (recipient) => {
        try {
          const personalizedData = {
            ...emailOptions.data,
            ...recipient.data
          };

          const result = await sendEmail({
            ...emailOptions,
            to: recipient.email,
            data: personalizedData
          });

          return {
            email: recipient.email,
            success: true,
            result
          };
        } catch (error) {
          return {
            email: recipient.email,
            success: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.value || r.reason));

      // Add small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;

  } catch (error) {
    console.error('Bulk email sending failed:', error);
    throw error;
  }
};

/**
 * Send notification email
 * @param {string} to - Recipient email
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data
 * @returns {Promise<Object>} - Email result
 */
const sendNotificationEmail = async (to, type, title, message, data = {}) => {
  const template = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notification</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: ${process.env.EMAIL_PRIMARY_COLOR || '#6f42c1'}; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #6c757d; }
        .notification-box { background-color: #f8f9fa; border-left: 4px solid ${process.env.EMAIL_PRIMARY_COLOR || '#007bff'}; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📢 ${title}</h2>
        </div>
        <div class="content">
            <div class="notification-box">
                <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>
                <p>${message}</p>
            </div>
            
            <p>Best regards,<br>The ${process.env.APP_NAME || 'Authn'} Team</p>
        </div>
        <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
  `;

  return await sendEmail({
    to,
    subject: title,
    html: template,
    data
  });
};

/**
 * Queue email for later sending (basic implementation)
 * In production, you'd use a proper queue system like Bull or Agenda
 */
const emailQueue = [];
let isProcessingQueue = false;

const queueEmail = (emailOptions) => {
  emailQueue.push({
    ...emailOptions,
    queuedAt: new Date(),
    attempts: 0
  });

  if (!isProcessingQueue) {
    processEmailQueue();
  }
};

const processEmailQueue = async () => {
  if (isProcessingQueue || emailQueue.length === 0) return;

  isProcessingQueue = true;

  while (emailQueue.length > 0) {
    const emailOptions = emailQueue.shift();

    try {
      await sendEmail(emailOptions);
      console.log('✅ Queued email sent successfully');
    } catch (error) {
      emailOptions.attempts++;

      if (emailOptions.attempts < 3) {
        // Retry up to 3 times
        emailQueue.push(emailOptions);
        console.log(`⚠️ Email failed, retrying (attempt ${emailOptions.attempts + 1})`);
      } else {
        console.error('❌ Email failed after 3 attempts:', error.message);
      }
    }

    // Add delay between emails
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  isProcessingQueue = false;
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} - Is valid email
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Get email template preview (for testing)
 * @param {string} templateName - Template name
 * @param {Object} data - Sample data
 * @returns {string} - Rendered HTML
 */
const getTemplatePreview = (templateName, data = {}) => {
  if (!emailTemplates[templateName]) {
    throw new Error(`Template '${templateName}' not found`);
  }

  const sampleData = {
    name: 'John Doe',
    otp: '123456',
    expiresIn: '10 minutes',
    resetUrl: 'https://example.com/reset-password?token=sample-token',
    confirmationUrl: 'https://example.com/confirm-deletion?token=sample-token',
    deletionDate: new Date().toISOString(),
    loginMethod: 'Google',
    deviceName: 'iPhone 13 Pro',
    location: 'New York, NY, USA',
    ipAddress: '192.168.1.100',
    verificationUrl: 'https://example.com/verify-device?token=sample-token',
    ...data
  };

  return emailTemplates[templateName].template(sampleData);
};

/**
 * Send test email
 * @param {string} testRecipient - Test recipient
 * @returns {Promise<Object>} - Email result
 */
const sendTestEmail = async (testRecipient) => {
  return await sendEmail({
    to: testRecipient || 'hannanbhatti2006@gmail.com',
    subject: '🧪 Test Email - Email Service Working',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>✅ Email Service Test</h2>
        <p>This is a test email to verify that the email service is working correctly.</p>
        <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        <hr>
        <small>This is an automated test message.</small>
      </div>
    `,
    text: 'Email service test - This email service is working correctly!'
  });
};

// Initialize email service on module load
let emailServiceReady = false;
initializeEmailService().then(success => {
  emailServiceReady = success;
});

module.exports = {
  sendEmail,
  sendBulkEmail,
  sendNotificationEmail,
  queueEmail,
  validateEmail,
  getTemplatePreview,
  sendTestEmail,
  initializeEmailService,

  // Getters
  get isReady() { return emailServiceReady; },
  get templates() { return Object.keys(emailTemplates); },
  get queueLength() { return emailQueue.length; }
};