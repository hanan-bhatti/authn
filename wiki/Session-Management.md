# Session Management

Authn uses **JWT-based stateless sessions** backed by session records in MongoDB. Each login creates a session that can be individually revoked.

---

## Session Limits

| Parameter | Value |
|-----------|-------|
| Maximum concurrent sessions per user | 5 |
| Default session duration | 7 days |
| Session duration with `rememberMe` | 30 days |
| Automatic cleanup | Daily at midnight (expired sessions) |

When a user exceeds 5 concurrent sessions, the **oldest inactive session** is automatically revoked.

---

## Session Information

Each session record stores:

| Field | Description |
|-------|-------------|
| Session ID | Unique identifier embedded in the JWT |
| Device fingerprint | SHA-256 device ID |
| IP address | Remote IP at login time |
| User agent | Browser / client identifier |
| Location | Geolocation from IP |
| Created at | Session creation timestamp |
| Last active | Last request timestamp |
| Expires at | Token expiry time |

---

## Viewing Active Sessions

```http
GET /api/users/sessions
Authorization: Bearer <token>
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "_id": "session-id",
        "deviceInfo": {
          "browser": "Chrome 120",
          "os": "Windows 11",
          "deviceId": "sha256-fingerprint"
        },
        "ipAddress": "192.168.1.1",
        "location": "Lahore, Pakistan",
        "createdAt": "2025-01-01T08:00:00.000Z",
        "lastActivity": "2025-01-01T12:00:00.000Z",
        "expiresAt": "2025-01-08T08:00:00.000Z",
        "isCurrent": true
      }
    ],
    "total": 2
  }
}
```

---

## Revoking a Session

```http
DELETE /api/users/sessions/:sessionId
Authorization: Bearer <token>
```

The session is deleted and the associated JWT is blacklisted. The user on that device will be logged out on their next request.

---

## Logout

### Current session only

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### All sessions (all devices)

```http
POST /api/auth/logout-all
Authorization: Bearer <token>
```

---

## Automatic Session Termination

Sessions are automatically terminated when:

- The JWT expires
- The user changes their password (all **other** sessions are revoked)
- The user explicitly revokes a session
- The account is deleted

---

## Session Security

- The session ID is embedded in the JWT payload and validated on every authenticated request.
- Token blacklisting prevents reuse of revoked tokens until their natural expiry.
- The `lastActivity` field is updated on each request to support session analytics.
