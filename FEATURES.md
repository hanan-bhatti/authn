# Authn: Features & Roadmap

Authn is designed to be a comprehensive and secure authentication solution. This document outlines its current capabilities and our plans for the future.

---

## ✅ Current Features (Version 1.0.0)

### 🔐 Core Authentication & Security

*   **Secure Registration & Login:** Standard email and password authentication, secured with `bcryptjs` for password hashing to protect against rainbow table and brute-force attacks.
*   **JSON Web Tokens (JWT):** Stateless authentication using signed JWTs. Tokens are configured with an expiration time to enhance security.
*   **Password Reset Flow:** A complete, secure flow for users to request a password reset via email. Uses single-use, time-sensitive tokens.
*   **Email Verification:** Ensures users sign up with a valid email address by sending a unique verification link.
*   **HTTP Security Headers:** Utilizes `helmet` to set crucial security headers (like `X-Content-Type-Options`, `Strict-Transport-Security`, etc.) to protect against common web vulnerabilities like XSS and clickjacking.
*   **CORS Configuration:** Robust Cross-Origin Resource Sharing (CORS) middleware to control which domains can access the API.
*   **Rate Limiting:** Protects authentication endpoints (`/login`, `/register`, `/forgot-password`) from brute-force and denial-of-service attacks using `express-rate-limit`.

### 👤 User & Account Management

*   **User Profile API:** Endpoints for users to fetch and update their own profile information.
*   **Account Deletion:** A dedicated endpoint for users to permanently delete their account and associated data, supporting data privacy compliance.
*   **Social Account Linking:** (Foundation) The user model is designed to link multiple social providers to a single user account.

### 🌐 Social & Federated Login

*   **Google OAuth 2.0:** Seamless "Sign in with Google" functionality, integrated via the Firebase Admin SDK for secure token verification.

### 🛠️ Developer Experience

*   **RESTful API Design:** A clean, intuitive, and well-structured API.
*   **Centralized Error Handling:** A single middleware handles all application errors, providing consistent and predictable error responses.
- **Environment-Based Configuration:** Uses `.env` files for easy configuration across different environments (development, staging, production).
- **Service-Oriented Architecture:** Business logic is separated into services (`email`, `firebase`, etc.) for better maintainability and testing.

---

## 🗺️ Future Roadmap

We have an exciting roadmap ahead! Below are some of the features we are planning. Feature requests and contributions are highly welcome!

### 🚀 Version 1.5 (Mid-term)

*   **Multi-Factor Authentication (MFA):**
    *   Implement TOTP (Time-based One-Time Password) using authenticator apps (Google Authenticator, Authy).
    *   Add support for email-based one-time codes.
*   **Magic Link Authentication:**
    *   Enable passwordless login by sending a secure, single-use link to the user's email.
*   **Expanded Social Logins:**
    *   Integrate more OAuth providers like GitHub, Facebook, and Twitter.
*   **Advanced Role-Based Access Control (RBAC):**
    *   Introduce a dedicated API for creating, managing, and assigning roles and permissions to users.
*   **Audit Trail:**
    *   Log critical security-related events (e.g., login attempts, password changes, permission changes) for security analysis and compliance.

### 🌟 Version 2.0 (Long-term)

*   **Admin Dashboard UI:**
    *   A simple, secure web interface for administrators to manage users, view statistics, and configure application settings.
*   **SAML 2.0 & SSO:**
    *   Add support for SAML-based Single Sign-On to allow integration with enterprise identity providers like Okta or Azure AD.
*   **Biometric Authentication (WebAuthn):**
    *   Implement the WebAuthn standard to allow passwordless login using device biometrics (e.g., Touch ID, Face ID, Windows Hello).
*   **Official Client SDKs:**
    *   Develop and publish official JavaScript/TypeScript SDKs to simplify integration with popular frontend frameworks (React, Vue, Angular).
*   **Organization & Team Support:**
    *   Introduce a multi-tenancy model where users can belong to organizations or teams, each with its own set of users and roles.