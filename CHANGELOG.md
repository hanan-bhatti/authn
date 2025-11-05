# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [1.0.0] - 2025-11-05

### Added
- **Initial Public Release** of Authn.
- Implemented user profile management endpoints (`/api/user/profile`).
- Added secure password reset functionality via email using `Nodemailer`.
- Implemented an email verification flow for new user registrations.
- Created comprehensive project documentation: `README.md`, `CONTRIBUTING.md`, `FEATURES.md`, `CHANGELOG.md`, and `SECURITY.md`.
- Set up initial static pages for UI interactions (`auth.html`, `dashboard.html`, etc.).

### Changed
- Refined API error responses for consistency and clarity.
- Migrated Google OAuth verification to use the Firebase Admin SDK for better security and management.
- Improved code structure by separating business logic into a `services` directory.

---

## [0.8.0] - 2025-10-20

### Added
- **Social Login:** Integrated Google OAuth 2.0 for user authentication.
- **Security Middleware:** Added `helmet` for securing HTTP headers and `express-rate-limit` to prevent brute-force attacks on auth routes.
- **CORS Support:** Implemented `cors` middleware for handling cross-origin requests.
- Added `Userpermissions` model for future role-based access control.

---

## [0.5.0] - 2025-09-15

### Added
- **JWT Authentication:** Implemented core authentication logic using JSON Web Tokens.
- **Password Hashing:** Integrated `bcryptjs` to securely hash and verify user passwords.
- **Protected Routes:** Created authentication middleware (`middleware/auth.js`) to protect sensitive API endpoints.
- Added `auth` and `user` route files to organize endpoints.

---

## [0.1.0] - 2025-08-30

### Added
- Initial project setup with Node.js and Express.js.
- Established basic server structure (`server.js`).
- Connected to MongoDB using Mongoose.
- Created the initial `User` model schema.
- Set up ESLint for code linting and `nodemon` for development workflow.