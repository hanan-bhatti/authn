# Getting Started

This page walks you through the prerequisites, installation, and first-run steps for **Authn**.

---

## Prerequisites

| Requirement | Minimum Version | Notes |
|-------------|----------------|-------|
| Node.js | 16.0.0 | LTS recommended |
| npm | 8.0.0 | Bundled with Node.js |
| MongoDB | 5.0 | Atlas free tier works |
| Git | Any | For cloning |

**Optional (recommended for production)**
- PM2 — process manager
- Nginx — reverse proxy / SSL termination
- Docker & Docker Compose

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/hanan-bhatti/authn.git
cd authn
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values. See [Configuration](Configuration) for the full reference.

At minimum you must set:

```env
PORT=3000
MONGO_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/authn
JWT_SECRET=<long-random-string>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 4. Seed the database (optional)

```bash
npm run seed
```

This creates sample users and roles for development.

### 5. Start the server

**Development** (with auto-reload):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

The server starts on `http://localhost:3000` (or the `PORT` you configured).

---

## Verify the installation

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{ "status": "ok" }
```

---

## Next Steps

| Goal | Wiki Page |
|------|-----------|
| Understand all environment variables | [Configuration](Configuration) |
| Try the REST API | [API Reference](API-Reference) |
| Enable 2FA | [Two-Factor Authentication](Two-Factor-Authentication) |
| Go live | [Deployment](Deployment) |

---

## Troubleshooting

**`MongoServerError: Authentication failed`**  
Double-check your `MONGO_URL` including the username, password, and database name.

**`Error: JWT_SECRET is not set`**  
Make sure your `.env` file is present and the `JWT_SECRET` variable is defined.

**`SMTP connection refused`**  
Verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`. For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833).

**Port already in use**  
Change `PORT` in `.env` or stop the process already listening on that port.
