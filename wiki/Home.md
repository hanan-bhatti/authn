# Authn Wiki

<p align="center">
  <img src="https://spotless-orange-flea.myfilebase.com/ipfs/QmTxYFh6onsouXAS3Jw3kBMJkvbdAuf9LYQ7FnTT5f6mnZ" alt="Authn Logo" width="120">
</p>

<p align="center">
  <strong>Enterprise-Grade Authentication Platform</strong><br>
  Production-grade authentication system with 19 integrated security features
</p>

---

Welcome to the **Authn** wiki! This wiki is your complete reference for installing, configuring, and using Authn in your projects.

## 📖 Wiki Pages

| Page | Description |
|------|-------------|
| [Getting Started](Getting-Started) | Installation, prerequisites, and quick-start guide |
| [Configuration](Configuration) | Environment variables and configuration options |
| [Authentication Flows](Authentication-Flows) | Register, login, logout, password reset, and more |
| [API Reference](API-Reference) | Complete REST API endpoint documentation |
| [Two-Factor Authentication](Two-Factor-Authentication) | Setting up and using TOTP-based 2FA |
| [Device Management](Device-Management) | Trusted devices and fingerprinting |
| [Session Management](Session-Management) | Managing user sessions |
| [Security](Security) | Security features, headers, and best practices |
| [Deployment](Deployment) | Deploy to Docker, Heroku, AWS, DigitalOcean, VPS |
| [FAQ](FAQ) | Frequently asked questions |
| [Contributing](Contributing) | How to contribute to Authn |

---

## 🚀 Quick Overview

**Authn** is a comprehensive, self-hosted authentication platform built with **Node.js**, **Express**, and **MongoDB**. It provides enterprise-grade security without vendor lock-in.

### Key Features

- 🔐 **Email/Password Authentication** — bcrypt hashing, strong-password validation
- 🛡️ **Two-Factor Authentication (2FA)** — TOTP with backup codes
- 🌐 **Google OAuth 2.0** — Firebase Admin SDK integration
- 📱 **Device Management** — fingerprinting, trusted devices, new-device emails
- 🗂️ **Session Management** — up to 5 concurrent sessions, per-session revocation
- ⚡ **Rate Limiting** — multi-layer DDoS protection
- 📊 **Audit Logging** — every security event is recorded
- 🔑 **RBAC** — user, moderator, admin, superadmin roles
- 📧 **Transactional Emails** — verification, password reset, security alerts
- 📦 **Automated Backups** — pre-deletion backups with AES-256 encryption

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js ≥ 16 |
| Framework | Express 4 |
| Database | MongoDB (Mongoose 7) |
| Authentication | JWT (jsonwebtoken), bcryptjs |
| 2FA | speakeasy (TOTP / RFC 6238) |
| Social Login | Firebase Admin SDK |
| Email | Nodemailer (SMTP) |
| Image Processing | Sharp |
| File Storage | AWS S3 / IPFS (Filebase) |
| Security Headers | Helmet |
| Scheduling | node-cron |

---

## 📋 Project Status

| Category | Score |
|----------|-------|
| 🔒 Security | 9/10 |
| 📚 Documentation | 9/10 |
| 🏗️ Architecture | 8/10 |
| 👨‍💻 Developer Experience | 8/10 |
| 🔌 Scalability | 6.5/10 |
| ⚡ Performance | 6/10 |
| 📊 Monitoring | 4/10 |
| 🧪 Testing | 3/10 |

**Overall Production Readiness: 72%** | **Version: 1.0.0**

---

## 🔗 Links

- [GitHub Repository](https://github.com/hanan-bhatti/authn)
- [Issue Tracker](https://github.com/hanan-bhatti/authn/issues)
- [Changelog](https://github.com/hanan-bhatti/authn/blob/main/CHANGELOG.md)
- [License (MIT)](https://github.com/hanan-bhatti/authn/blob/main/LICENSE)
