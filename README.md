# Authn: Universal Authentication System

<p align="center">
  <img src="https://raw.githubusercontent.com/hanan-bhatti/authn/main/public/favicon.ico" alt="Authn Logo" width="120">
</p>

<p align="center">
  <strong>A robust, secure, and easy-to-integrate backend for modern authentication.</strong>
</p>

<p align="center">
  <!-- Badges Section -->
  <img src="https://img.shields.io/badge/node-v16.x-green" alt="Node.js Version">
  <img src="https://img.shields.io/badge/npm-v8.x-blue" alt="NPM Version">
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
  <img src="https://img.shields.io/github/stars/hanan-bhatti/authn?style=social" alt="GitHub Stars">
</p>

---

**Authn** is a complete, open-source authentication server designed to provide a secure and scalable foundation for your web applications. Built with Node.js, Express, and MongoDB, it offers a comprehensive set of features out-of-the-box, allowing you to implement complex authentication logic in minutes, not weeks.

## ✨ Key Features

- **Secure by Default:** Implements best practices with `bcrypt` for password hashing, `helmet` for HTTP header security, and rate limiting to prevent brute-force attacks.
- **Token-Based Authentication:** Uses JSON Web Tokens (JWT) for stateless, secure API communication.
- **Multiple Auth Strategies:**
  - Classic email and password registration.
  - Seamless social login with Google (via Firebase).
- **Full Account Management:**
  - Email verification for new users.
  - Secure password reset flow.
  - User profile management endpoints.
- **Permission System:** Built-in support for role-based access control (RBAC) to manage user permissions.
- **Developer Friendly:** Clean, RESTful API, centralized error handling, and extensive documentation.

For a detailed list of all features and the future roadmap, please see [FEATURES.md](FEATURES.md).

## 🚀 Tech Stack

| Category       | Technology                                       |
| -------------- | ------------------------------------------------ |
| **Backend**    | Node.js, Express.js                              |
| **Database**   | MongoDB with Mongoose ODM                        |
| **Auth**       | JSON Web Tokens (JWT), `bcryptjs`, Google OAuth  |
| **Security**   | Helmet, CORS, `express-rate-limit`               |
| **Email**      | Nodemailer                                       |
| **Dev Tools**  | ESLint, Nodemon                                  |

## ⚙️ How It Works

Authn provides a set of RESTful API endpoints to handle all aspects of user authentication and management.

1.  **Register:** A new user signs up. Their password is automatically salted and hashed before being stored in the database. An email verification link is sent.
2.  **Login:** The user logs in with their credentials. The server verifies them and, if successful, issues a short-lived JWT access token.
3.  **Authenticated Requests:** The client application includes the JWT in the `Authorization: Bearer <token>` header for all requests to protected API routes.
4.  **Verification:** A server-side middleware intercepts and validates the JWT on each protected request, ensuring the user is authenticated and has the necessary permissions.

## 📦 Installation & Setup

### Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0
- A running MongoDB instance

### Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/hanan-bhatti/authn.git
    cd authn
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the project root (you can copy `.env.example`) and add your configuration details.

    ```env
    # Server Configuration
    PORT=3000

    # Database
    MONGO_URI=your_mongodb_connection_string

    # JWT
    JWT_SECRET=your_super_secret_key
    JWT_EXPIRES_IN=1d

    # Email Service (using Nodemailer)
    EMAIL_HOST=your_smtp_host
    EMAIL_PORT=587
    EMAIL_USER=your_email_username
    EMAIL_PASS=your_email_password
    EMAIL_FROM=noreply@yourapp.com

    # Firebase Admin SDK (for Google Auth)
    # Add your Firebase service account key JSON here
    FIREBASE_SERVICE_ACCOUNT='''{...}'''
    ```

4.  **Run the server:**
    - For development (with auto-reload):
      ```bash
      npm run dev
      ```
    - For production:
      ```bash
      npm start
      ```

The API will be available at `http://localhost:3000`.

## <caption> API Usage Example

Here’s a quick example of how to interact with the Authn API from a JavaScript frontend.

```javascript
const API_BASE_URL = 'http://localhost:3000/api';

// 1. Register a new user
async function register(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

// 2. Log in and get a token
async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('authToken', data.token);
  }
  return data;
}

// 3. Access a protected route
async function getMyProfile() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No auth token found.');
  }

  const res = await fetch(`${API_BASE_URL}/user/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return res.json();
}
```

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for details.

---
_Authn - Built with ❤️ by [hanan-bhatti](https://github.com/hanan-bhatti)_