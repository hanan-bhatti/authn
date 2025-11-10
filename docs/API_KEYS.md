# API Keys Documentation

## Overview

API keys allow users to programmatically access their account and perform actions without using their JWT authentication tokens. This feature can be enabled/disabled via the `FEATURE_API_KEYS_ENABLED` environment variable.

## Configuration

Add to your `.env` file:

```env
# Enable API key management
FEATURE_API_KEYS_ENABLED=true
```

## Endpoints

### 1. Generate API Key

Creates a new API key for the authenticated user.

**Endpoint:** `POST /api/users/api-keys`

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "name": "My App API Key",
  "permissions": ["read", "write"]  // Optional
}
```

**Validation:**
- `name`: Required, 3-50 characters
- `permissions`: Optional array of strings

**Success Response (201):**
```json
{
  "success": true,
  "message": "API key generated successfully",
  "data": {
    "apiKey": "ak_a1b2c3d4e5f6...",
    "keyId": "507f1f77bcf86cd799439011",
    "name": "My App API Key",
    "permissions": ["read", "write"],
    "createdAt": "2025-11-09T12:00:00.000Z",
    "warning": "Save this API key securely. You will not be able to see it again."
  }
}
```

**Important:** The full API key is only shown once during creation. Store it securely!

**Error Responses:**

- **400 Bad Request** - Validation failed
  ```json
  {
    "success": false,
    "error": "Validation failed",
    "code": "VALIDATION_ERROR"
  }
  ```

- **400 Bad Request** - Duplicate key name
  ```json
  {
    "success": false,
    "error": "An active API key with this name already exists",
    "code": "DUPLICATE_API_KEY_NAME"
  }
  ```

- **403 Forbidden** - Feature disabled
  ```json
  {
    "success": false,
    "error": "API key management is disabled",
    "code": "API_KEYS_DISABLED"
  }
  ```

---

### 2. List API Keys

Retrieves all API keys for the authenticated user (excluding actual key values).

**Endpoint:** `GET /api/users/api-keys`

**Authentication:** Required (JWT token)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "apiKeys": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "My App API Key",
        "permissions": ["read", "write"],
        "isActive": true,
        "createdAt": "2025-11-09T12:00:00.000Z",
        "lastUsed": "2025-11-09T14:30:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "name": "Mobile App Key",
        "permissions": [],
        "isActive": false,
        "createdAt": "2025-11-08T10:00:00.000Z",
        "lastUsed": null
      }
    ],
    "total": 2,
    "active": 1
  }
}
```

**Error Responses:**

- **403 Forbidden** - Feature disabled
  ```json
  {
    "success": false,
    "error": "API key management is disabled",
    "code": "API_KEYS_DISABLED"
  }
  ```

- **404 Not Found** - User not found
  ```json
  {
    "success": false,
    "error": "User not found"
  }
  ```

---

### 3. Revoke API Key

Revokes (deactivates) an API key. The key cannot be used after revocation.

**Endpoint:** `DELETE /api/users/api-keys/:keyId`

**Authentication:** Required (JWT token)

**URL Parameters:**
- `keyId` - MongoDB ObjectId of the API key

**Success Response (200):**
```json
{
  "success": true,
  "message": "API key revoked successfully",
  "data": {
    "keyId": "507f1f77bcf86cd799439011",
    "name": "My App API Key"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid key ID format
  ```json
  {
    "success": false,
    "error": "Validation failed",
    "code": "VALIDATION_ERROR"
  }
  ```

- **403 Forbidden** - Feature disabled
  ```json
  {
    "success": false,
    "error": "API key management is disabled",
    "code": "API_KEYS_DISABLED"
  }
  ```

- **404 Not Found** - Key not found
  ```json
  {
    "success": false,
    "error": "API key not found"
  }
  ```

---

## Security Features

### 1. Key Storage
- API keys are hashed using SHA-256 before storage
- The full key is only shown once during creation
- Format: `ak_[32-character hex string]`

### 2. Feature Flag
- All routes check `FEATURE_API_KEYS_ENABLED` before execution
- Returns 403 error when feature is disabled
- Defaults to `true` for backward compatibility

### 3. Audit Logging
- API key creation is logged (if `FEATURE_AUDIT_LOGS_ENABLED` is true)
- API key revocation is logged (if `FEATURE_AUDIT_LOGS_ENABLED` is true)
- Logs include key ID and name

### 4. Validation
- Prevents duplicate active key names
- Validates key ID format
- Ensures name length is between 3-50 characters

---

## User Model Methods

### `generateApiKey(name, permissions)`

Generates a new API key and adds it to the user's `apiKeys` array.

**Parameters:**
- `name` (String): Name for the API key
- `permissions` (Array): Optional array of permission strings

**Returns:** String - The unhashed API key (format: `ak_[hex]`)

**Example:**
```javascript
const apiKeyString = user.generateApiKey('My App', ['read', 'write']);
await user.save();
// apiKeyString = "ak_a1b2c3d4e5f6..."
```

---

### `revokeApiKey(keyId)`

Revokes an API key by setting its `isActive` field to `false`.

**Parameters:**
- `keyId` (String): MongoDB ObjectId of the API key

**Example:**
```javascript
user.revokeApiKey('507f1f77bcf86cd799439011');
await user.save();
```

---

## Schema

### API Key Schema

```javascript
{
  key: {
    type: String,
    required: true
    // Stores SHA-256 hash of the API key
  },
  name: {
    type: String,
    required: true
    // Human-readable name for the key
  },
  permissions: [{
    type: String
    // Array of permission strings
  }],
  isActive: {
    type: Boolean,
    default: true
    // Whether the key can be used
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date
    // Last time the key was used for authentication
  }
}
```

---

## Usage Example

### Creating an API Key

```javascript
// Client-side example using fetch
const response = await fetch('https://api.example.com/api/users/api-keys', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    name: 'My Integration',
    permissions: ['read', 'write']
  })
});

const { data } = await response.json();
console.log('API Key:', data.apiKey); // Save this securely!
console.log('Key ID:', data.keyId);
```

### Listing API Keys

```javascript
const response = await fetch('https://api.example.com/api/users/api-keys', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});

const { data } = await response.json();
console.log('Total keys:', data.total);
console.log('Active keys:', data.active);
```

### Revoking an API Key

```javascript
const keyId = '507f1f77bcf86cd799439011';
const response = await fetch(`https://api.example.com/api/users/api-keys/${keyId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});

const result = await response.json();
console.log(result.message); // "API key revoked successfully"
```

---

## Best Practices

1. **Unique Names**: Use descriptive, unique names for each API key
2. **Secure Storage**: Store API keys in environment variables or secure vaults
3. **Rotation**: Regularly rotate API keys (revoke old, create new)
4. **Minimal Permissions**: Only grant necessary permissions
5. **Monitor Usage**: Track `lastUsed` field to identify unused keys
6. **Revoke Unused**: Revoke API keys that are no longer needed

---

## Feature Flag Integration

The API key feature respects the `FEATURE_API_KEYS_ENABLED` flag:

```javascript
// utils/config.js
FEATURE_API_KEYS_ENABLED: getEnvBoolean('FEATURE_API_KEYS_ENABLED', true)
```

When disabled:
- All three endpoints return `403 Forbidden`
- Error code: `API_KEYS_DISABLED`
- Error message: "API key management is disabled"

---

## Future Enhancements

Potential improvements for the API key system:

1. **Rate Limiting**: Per-key rate limits
2. **Expiration**: Set expiration dates for keys
3. **IP Whitelisting**: Restrict key usage to specific IPs
4. **Usage Analytics**: Track API calls per key
5. **Scope Refinement**: More granular permission system
6. **Key Rotation**: Automatic key rotation policies
7. **Webhooks**: Notifications for key usage events
