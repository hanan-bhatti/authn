# Device Management

Authn tracks every device used to log in and lets users designate devices as **trusted**. Unrecognized devices trigger an email verification step before access is granted.

---

## Device Fingerprinting

When a user logs in, Authn collects the following signals to build a unique device fingerprint:

| Signal | Description |
|--------|-------------|
| User agent | Browser name and version |
| Operating system | OS name and version |
| IP address | Remote IP (+ geolocation) |
| Screen resolution | Width × height |
| Color depth | Bits per pixel |
| Pixel ratio | Device pixel ratio |
| Timezone | IANA timezone string |
| Language | Browser language preference |
| Hardware memory | Available RAM (GB) |
| CPU cores | Logical processor count |

A **SHA-256 hash** of these signals produces a unique device ID.

---

## New Device Verification

When a login is detected from an **unrecognized device**:

1. Login is blocked with `403 DEVICE_NOT_TRUSTED`.
2. A verification email is sent containing a signed link (valid **24 hours**).
3. Clicking the link adds the device to the trusted list.
4. Subsequent logins from this device proceed without re-verification.

---

## Trusted Devices

| Limit | Value |
|-------|-------|
| Maximum trusted devices per user | 10 |
| Verification token expiry | 24 hours |
| Inactive device auto-removal | 90 days |

### List trusted devices

```http
GET /api/users/devices
Authorization: Bearer <token>
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "_id": "device-id",
        "deviceId": "sha256-fingerprint",
        "browser": "Chrome 120",
        "os": "Windows 11",
        "ipAddress": "192.168.1.1",
        "location": "Lahore, Pakistan",
        "isTrusted": true,
        "lastUsed": "2025-01-01T12:00:00.000Z",
        "addedAt": "2024-12-01T08:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### Remove a trusted device

```http
DELETE /api/users/devices/:deviceId
Authorization: Bearer <token>
```

Removing a trusted device logs out any active sessions on that device and forces re-verification on next login.

---

## Email Notifications

The following events send a security email to the account owner:

| Event | Email sent |
|-------|-----------|
| First login from a new device | ✅ Device verification link |
| New device successfully verified | ✅ Confirmation |
| Trusted device removed | ✅ Security alert |

---

## Maintenance

Authn runs a scheduled cleanup that automatically removes device records that have been **inactive for more than 90 days**. This is handled by the `node-cron` maintenance scheduler.
