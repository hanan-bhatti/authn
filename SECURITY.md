# Security Policy

## 🛡️ Security Philosophy

The Authn team takes security seriously. We appreciate your efforts to responsibly disclose your findings, and we will make every effort to acknowledge your contributions.

### Our Commitment

- **Security by Design**: Security is built into every feature from the ground up
- **Defense in Depth**: Multiple layers of security controls protect user data
- **Principle of Least Privilege**: Users and services get only the permissions they need
- **Transparency**: We believe in being open about our security practices
- **Continuous Improvement**: We regularly update and enhance security measures

---

## 🔒 Supported Versions

We release security updates for the following versions:

| Version | Supported          | End of Support |
| ------- | ------------------ | -------------- |
| 1.0.x   | ✅ Yes            | TBD            |
| 0.9.x   | ⚠️ Limited Support | 2025-12-31    |
| 0.8.x   | ❌ No             | 2025-11-06    |
| < 0.8   | ❌ No             | 2025-09-30    |

**Note**: We strongly recommend using the latest stable version (1.0.x) for the best security.

---

## 🐛 Reporting a Vulnerability

### Where to Report

If you believe you've found a security vulnerability in Authn, please **do not** disclose it publicly by opening a GitHub issue or posting in discussions.

**Instead, please report it privately to:**

📧 **Email**: [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com)  
🔐 **Subject**: [SECURITY] Brief description of the vulnerability

### What to Include

A good security report should contain:

1. **Vulnerability Description**
   - Type of vulnerability (e.g., XSS, SQL Injection, Authentication Bypass)
   - Affected component(s)
   - Impact assessment (Confidentiality, Integrity, Availability)

2. **Steps to Reproduce**
   - Detailed step-by-step instructions
   - Required preconditions
   - Environment details (OS, Node.js version, etc.)

3. **Proof of Concept**
   - Code snippets demonstrating the issue
   - Screenshots or videos (if applicable)
   - curl commands or request examples
   - **Note**: Please test against your own instance, not production systems

4. **Impact Assessment**
   - Who is affected?
   - What data could be compromised?
   - What actions could an attacker take?
   - Severity rating (if known)

5. **Suggested Fix** (Optional)
   - Potential mitigation strategies
   - Code patches or suggestions

### Example Report Template

```markdown
Subject: [SECURITY] Authentication Bypass in Password Reset

**Vulnerability Type**: Authentication Bypass
**Affected Component**: Password Reset Flow
**Severity**: High

**Description**:
A vulnerability exists in the password reset mechanism that allows an attacker to...

**Steps to Reproduce**:
1. Navigate to /forgot-password
2. Enter target email address
3. Intercept the reset token request
4. Modify the token parameter to...
5. Submit the manipulated request

**Proof of Concept**:
```bash
curl -X POST https://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token": "manipulated_token", "password": "newpass123"}'
```

**Impact**:
An attacker could reset any user's password without access to their email.

**Suggested Fix**:
Implement additional validation checks on the reset token...

**Environment**:
- Authn Version: 1.0.0
- Node.js: 16.14.0
- MongoDB: 5.0.5
```

---

## 📅 Response Timeline

We aim to respond to security reports within the following timeframes:

| Stage | Timeline |
|-------|----------|
| **Initial Response** | Within 24 hours |
| **Acknowledgement & Validation** | Within 3 business days |
| **Impact Assessment** | Within 5 business days |
| **Fix Development** | Depends on severity (see below) |
| **Public Disclosure** | Coordinated with reporter |

### Fix Development Timeline by Severity

- **Critical** (CVSS 9.0-10.0): Immediate (24-48 hours)
- **High** (CVSS 7.0-8.9): Within 7 days
- **Medium** (CVSS 4.0-6.9): Within 30 days
- **Low** (CVSS 0.1-3.9): Within 90 days

---

## 🔐 Security Best Practices

### For Deployment

#### Essential Security Measures

1. **Environment Variables**
   ```bash
   # CRITICAL: Use strong, unique secrets
   JWT_SECRET=<64-character-random-string>
   SESSION_SECRET=<64-character-random-string>
   
   # Enable HTTPS in production
   NODE_ENV=production
   ```

2. **Database Security**
   - Use MongoDB authentication
   - Enable SSL/TLS for database connections
   - Implement IP whitelisting
   - Regular backups
   ```javascript
   MONGO_URL=mongodb://username:password@host:port/database?ssl=true
   ```

3. **HTTPS/TLS**
   - Use TLS 1.2 or higher
   - Implement HSTS headers
   - Use valid SSL certificates
   - Redirect HTTP to HTTPS

4. **Rate Limiting**
   - Configure appropriate limits for your use case
   - Monitor rate limit hits
   - Adjust as needed
   ```env
   AUTH_RATE_LIMIT_MAX_REQUESTS=5
   AUTH_RATE_LIMIT_WINDOW_MS=900000
   ```

5. **CORS Configuration**
   ```env
   # Only allow trusted origins
   FRONTEND_URL=https://yourdomain.com
   ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   ```

### For Users

1. **Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, and symbols
   - Avoid common passwords
   - Use a password manager

2. **Enable Two-Factor Authentication**
   - Use authenticator apps (not SMS when possible)
   - Keep backup codes secure
   - Consider hardware tokens

3. **Regular Security Checks**
   - Review active sessions regularly
   - Check trusted devices
   - Monitor account activity
   - Update contact information

4. **Email Security**
   - Use a unique password for your email
   - Enable email 2FA
   - Don't click suspicious links

### For Developers

1. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm audit fix
   npm update
   ```

2. **Input Validation**
   - Never trust user input
   - Use express-validator
   - Sanitize data before processing
   - Validate on both client and server

3. **Error Handling**
   - Don't expose sensitive information in errors
   - Log errors securely
   - Use generic error messages for users

4. **Code Review**
   - Review security implications of changes
   - Check for common vulnerabilities (OWASP Top 10)
   - Test authentication and authorization

---

## 🔍 Security Features

### Implemented Security Measures

#### Authentication & Authorization

- **Password Hashing**: bcryptjs with 12 salt rounds
- **JWT Tokens**: HS256 algorithm, configurable expiration
- **Session Management**: Secure session handling with activity tracking
- **2FA**: TOTP-based with backup codes
- **Social Auth**: Firebase Admin SDK for Google OAuth

#### Protection Mechanisms

- **Rate Limiting**: 
  - Authentication endpoints: 5 attempts per 15 minutes
  - General API: 1000 requests per 15 minutes
  - Configurable per-endpoint limits

- **Account Lockout**:
  - Progressive delays after failed attempts
  - 30-minute lockout after 10 failed attempts
  - Email notifications for suspicious activity

- **Device Fingerprinting**:
  - Browser and OS detection
  - IP address tracking with geolocation
  - New device verification via email

#### Data Protection

- **Input Validation**: express-validator for all inputs
- **Output Encoding**: Automatic sanitization
- **SQL Injection**: Mongoose parameterized queries
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: Same-site cookies, origin validation

#### Network Security

- **HTTPS**: Required in production
- **HSTS**: Strict-Transport-Security headers
- **CORS**: Whitelist-based origin control
- **Helmet**: Comprehensive HTTP security headers

#### Monitoring & Logging

- **Audit Logs**: All security events logged
- **Activity Tracking**: Session and device monitoring
- **Anomaly Detection**: Unusual behavior flagging
- **Email Notifications**: Security alerts

---

## 📊 Vulnerability Severity Ratings

We use the Common Vulnerability Scoring System (CVSS) v3.1 to rate vulnerabilities:

### Critical (9.0-10.0)
- Remote code execution
- Authentication bypass
- Complete data breach
- Privilege escalation to admin

**Examples**:
- SQL injection allowing database access
- Authentication token forgery
- Remote code execution vulnerability

### High (7.0-8.9)
- Sensitive data exposure
- Privilege escalation
- Account takeover
- Partial authentication bypass

**Examples**:
- XSS allowing session theft
- Insecure direct object references
- Password reset token predictability

### Medium (4.0-6.9)
- Unauthorized access to limited data
- Denial of service
- Information disclosure
- CSRF on non-critical operations

**Examples**:
- Rate limit bypass
- Information leakage in error messages
- Weak password policy

### Low (0.1-3.9)
- Minor information disclosure
- UI bugs with security implications
- Configuration issues
- Best practice violations

**Examples**:
- Missing security headers
- Verbose error messages
- Weak default configuration

---

## 🎯 Out of Scope

The following are generally considered out of scope for security reports:

### Not Security Issues

- **Denial of Service** requiring unrealistic traffic volumes
- **Social Engineering** attacks against users or developers
- **Physical Security** attacks
- **Third-Party Services** (report to the respective service)

### Expected Behavior

- **Rate Limiting**: Being rate-limited is working as intended
- **Password Requirements**: Strong password requirements are by design
- **Account Lockout**: Temporary lockouts after failed attempts
- **Email Delays**: SMTP delays are expected
- **Session Expiration**: Sessions expire as configured

### Low-Impact Issues

- **Missing Security Headers** without demonstrable impact
- **Self-XSS** (requires user to execute malicious code)
- **Reports on Outdated Software** (please check latest version first)
- **Clickjacking** on non-sensitive pages
- **Open Redirects** to trusted domains

### Invalid Reports

- **Scanner Output** without validation or proof of concept
- **Theoretical Vulnerabilities** without reproduction steps
- **Issues Requiring User Compromise** (compromised password, etc.)
- **Previously Reported Issues** (check existing CVEs)

---

## 🏆 Responsible Disclosure

### Coordinated Disclosure Process

1. **Private Reporting**: Report vulnerabilities privately first
2. **Validation**: We validate and reproduce the issue
3. **Fix Development**: We develop and test a fix
4. **Security Advisory**: We prepare a security advisory
5. **Coordinated Release**: We coordinate disclosure timing with you
6. **Public Disclosure**: We publish the advisory and give credit

### Public Disclosure Timeline

- **Critical/High**: 30 days after fix release
- **Medium**: 60 days after fix release
- **Low**: 90 days after fix release

We may request an extended timeline for complex vulnerabilities.

### Researcher Recognition

We believe in recognizing security researchers:

- **Security Advisory**: Credit in the advisory (if desired)
- **Hall of Fame**: Listed in our Security Hall of Fame
- **Thank You**: Public acknowledgment (with permission)

**Note**: We currently don't offer monetary bug bounties, but we deeply appreciate responsible disclosure.

---

## 📜 Security Advisories

Published security advisories are available at:
- GitHub Security Advisories: https://github.com/hanan-bhatti/authn/security/advisories
- Project Website: (Coming soon)

Subscribe to security updates:
- Watch the repository for security advisories
- Star the repository for release notifications

---

## 🔄 Security Updates

### How We Release Security Fixes

1. **Patch Development**: Fix is developed in a private branch
2. **Testing**: Comprehensive testing on all supported versions
3. **Advisory Creation**: Security advisory is prepared
4. **Release**: New version is released with fix
5. **Notification**: Users are notified via:
   - GitHub Security Advisory
   - Release notes
   - README updates
   - Email (for critical issues)

### Applying Security Updates

```bash
# Check current version
npm list authn

# Update to latest version
npm update authn

# Or install specific version
npm install authn@latest

# Verify update
npm list authn
```

---

## 📞 Security Contacts

### Primary Contact

**Abdul Hannan Bhatti**  
📧 Email: [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com)  
🐙 GitHub: [@hanan-bhatti](https://github.com/hanan-bhatti)

### Emergency Contact

For **critical vulnerabilities** (CVSS 9.0+) requiring immediate attention:
- Email: [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com)
- Subject: `[CRITICAL SECURITY] Brief description`
- We aim to respond within 12 hours

---

## 🙏 Thanks to Security Researchers

We would like to thank the following security researchers for their responsible disclosure:

(List will be updated as vulnerabilities are reported and fixed)

**Want to be listed here?** Report vulnerabilities responsibly!

---

## 📚 Additional Resources

### Security References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [CVSS Calculator](https://www.first.org/cvss/calculator/3.1)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

### Related Documentation

- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Features & Roadmap](FEATURES.md)
- [Changelog](CHANGELOG.md)

---

## ❓ Questions?

If you have questions about this security policy or need clarification, please contact:

📧 **Email**: [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com)

---

**Last Updated**: November 6, 2025  
**Version**: 1.0  
**Maintained by**: Abdul Hannan Bhatti  
**Contact**: hannanbhatti2006@gmail.com  
**PGP Key**: (Coming soon)