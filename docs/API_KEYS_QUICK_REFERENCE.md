# API Keys Quick Reference

## Endpoints

### 1. Generate API Key
```
POST /api/users/api-keys
Authorization: Bearer {JWT_TOKEN}

Body:
{
  "name": "My API Key",
  "permissions": ["read", "write"]  // optional
}

Response 201:
{
  "success": true,
  "message": "API key generated successfully",
  "data": {
    "apiKey": "ak_a1b2c3...",  // ⚠️ Only shown once!
    "keyId": "507f1f77bcf86cd799439011",
    "name": "My API Key",
    "permissions": ["read", "write"],
    "createdAt": "2025-11-09T12:00:00.000Z",
    "warning": "Save this API key securely. You will not be able to see it again."
  }
}
```

### 2. List API Keys
```
GET /api/users/api-keys
Authorization: Bearer {JWT_TOKEN}

Response 200:
{
  "success": true,
  "data": {
    "apiKeys": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "My API Key",
        "permissions": ["read", "write"],
        "isActive": true,
        "createdAt": "2025-11-09T12:00:00.000Z",
        "lastUsed": "2025-11-09T14:30:00.000Z"
      }
    ],
    "total": 1,
    "active": 1
  }
}
```

### 3. Revoke API Key
```
DELETE /api/users/api-keys/{keyId}
Authorization: Bearer {JWT_TOKEN}

Response 200:
{
  "success": true,
  "message": "API key revoked successfully",
  "data": {
    "keyId": "507f1f77bcf86cd799439011",
    "name": "My API Key"
  }
}
```

## Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid input data |
| 400 | `DUPLICATE_API_KEY_NAME` | Key name already exists |
| 403 | `API_KEYS_DISABLED` | Feature is disabled |
| 404 | N/A | User or key not found |

## Environment Variable

```env
FEATURE_API_KEYS_ENABLED=true
```

## cURL Examples

### Generate
```bash
curl -X POST https://api.example.com/api/users/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "permissions": ["read", "write"]
  }'
```

### List
```bash
curl https://api.example.com/api/users/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Revoke
```bash
curl -X DELETE https://api.example.com/api/users/api-keys/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security Notes

- ⚠️ API keys are **only shown once** at creation
- Keys are hashed with SHA-256 before storage
- Format: `ak_[32-character hex string]`
- Revoked keys cannot be reused
- Each key name must be unique per user

## Full Documentation

See `docs/API_KEYS.md` for complete documentation.
