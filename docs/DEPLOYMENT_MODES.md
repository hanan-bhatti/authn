# Deployment Modes Guide

This document explains the three deployment modes supported by Authn and how to configure them.

## Overview

Authn supports three deployment modes that determine how frontend and backend are hosted:

1. **same-port** - Frontend and backend on the same port
2. **different-ports** - Frontend and backend on different ports
3. **separate-domains** - Frontend and backend on completely different domains

## Deployment Modes Explained

### 1. Same Port Mode (`same-port`)

**Use Case**: Monolithic deployment where Express serves both API and static frontend files.

**Port Configuration**:
- Frontend: PORT (e.g., 5000)
- Backend: PORT (e.g., 5000)

**Example URLs**:
```
Development:
- Frontend: http://localhost:5000
- Backend: http://localhost:5000
- Dashboard: http://localhost:5000/dashboard

Production:
- Frontend: https://yourdomain.com
- Backend: https://yourdomain.com
- Dashboard: https://yourdomain.com/dashboard
```

**Configuration (.env)**:
```bash
DEPLOYMENT_MODE=same-port
PORT=5000

# Optional: Leave these empty for auto-configuration
# FRONTEND_URL=
# BASE_URL=
# DASHBOARD_URL=
```

**CORS**: Less critical since everything is on the same origin.

---

### 2. Different Ports Mode (`different-ports`)

**Use Case**: Development setup with separate frontend dev server (e.g., Vite, React, Vue CLI).

**Port Configuration**:
- Frontend: PORT (e.g., 5000)
- Backend: PORT + 1 (e.g., 5001)

**Example URLs**:
```
Development:
- Frontend: http://localhost:5000
- Backend: http://localhost:5001
- Dashboard: http://localhost:5000/dashboard

Production:
- Frontend: https://yourdomain.com:5000
- Backend: https://yourdomain.com:5001
- Dashboard: https://yourdomain.com:5000/dashboard
```

**Configuration (.env)**:
```bash
DEPLOYMENT_MODE=different-ports
PORT=5000

# Optional: Leave these empty for auto-configuration
# FRONTEND_URL=
# BASE_URL=
# DASHBOARD_URL=

# IMPORTANT: CORS must include both URLs
CORS_ALLOWED_ORIGINS=http://localhost:5000,http://localhost:5001
```

**CORS**: **CRITICAL** - Must include both frontend and backend URLs.

**Important Notes**:
- Backend automatically runs on PORT + 1
- Frontend should be configured to make API calls to the backend URL
- In production, you might use a reverse proxy instead

---

### 3. Separate Domains Mode (`separate-domains`)

**Use Case**: Production deployment with completely different domains or subdomains.

**Port Configuration**:
- Uses explicitly configured URLs
- Ports are determined by the URLs or reverse proxy

**Example URLs**:
```
Development:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Dashboard: http://localhost:3000/dashboard

Production:
- Frontend: https://app.yourdomain.com
- Backend: https://api.yourdomain.com
- Dashboard: https://app.yourdomain.com/dashboard
```

**Configuration (.env)**:
```bash
DEPLOYMENT_MODE=separate-domains
PORT=5000

# REQUIRED: Explicitly set URLs
FRONTEND_URL=http://localhost:3000
BASE_URL=http://localhost:5000
DASHBOARD_URL=http://localhost:3000/dashboard

# Production URLs
PROD_FRONTEND_URL=https://app.yourdomain.com
PROD_BASE_URL=https://api.yourdomain.com
PROD_DASHBOARD_URL=https://app.yourdomain.com/dashboard

# IMPORTANT: CORS must include frontend domain
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.yourdomain.com
```

**CORS**: **CRITICAL** - Must include the frontend domain.

**Important Notes**:
- This is the recommended mode for production with microservices
- Requires proper CORS configuration
- Often used with CDN for frontend static files
- Backend typically behind a reverse proxy (Nginx, Apache)

---

## Auto-Configuration vs Manual Configuration

### Auto-Configuration (Recommended)

The system automatically calculates URLs and ports based on `DEPLOYMENT_MODE`:

**Benefits**:
- Less error-prone
- Consistent configuration
- Easy to switch between modes

**How to use**:
1. Set `DEPLOYMENT_MODE` in .env
2. Set `PORT` in .env
3. **Leave `FRONTEND_URL`, `BASE_URL`, and `DASHBOARD_URL` empty** or comment them out
4. System will calculate URLs automatically

### Manual Configuration

Override auto-configuration by explicitly setting URLs:

**When to use**:
- Custom port requirements
- Complex reverse proxy setups
- Non-standard URL schemes

**How to use**:
1. Set `DEPLOYMENT_MODE` in .env
2. Explicitly set `FRONTEND_URL`, `BASE_URL`, and `DASHBOARD_URL`
3. System will use your values instead of auto-calculation

---

## Quick Start Examples

### Example 1: Simple Development (same-port)

**.env**:
```bash
DEPLOYMENT_MODE=same-port
PORT=5000
NODE_ENV=development
```

Result: Everything runs on `http://localhost:5000`

---

### Example 2: Development with React/Vite (different-ports)

**.env**:
```bash
DEPLOYMENT_MODE=different-ports
PORT=3000
NODE_ENV=development
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

Result:
- React/Vite dev server: `http://localhost:3000`
- Backend API: `http://localhost:3001`

**Vite config** (vite.config.js):
```javascript
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
}
```

---

### Example 3: Production (separate-domains)

**.env**:
```bash
DEPLOYMENT_MODE=separate-domains
NODE_ENV=production
PORT=5000

FRONTEND_URL=https://app.example.com
BASE_URL=https://api.example.com
DASHBOARD_URL=https://app.example.com/dashboard

PROD_FRONTEND_URL=https://app.example.com
PROD_BASE_URL=https://api.example.com
PROD_DASHBOARD_URL=https://app.example.com/dashboard

CORS_ALLOWED_ORIGINS=https://app.example.com
CORS_ALLOW_CREDENTIALS=true
COOKIE_SECURE=true
```

---

## Testing Your Configuration

### Method 1: Check Startup Banner

When you start the server, check the startup banner:

```
⚙️  Configuration:
   • Deployment Mode: SAME-PORT
   • Port Strategy: Frontend & Backend on port 5000
```

### Method 2: Check Health Endpoint

Visit `http://localhost:PORT/health` and check the response:

```json
{
  "status": "healthy",
  "frontend_url": "http://localhost:5000",
  "backend_url": "http://localhost:5000"
}
```

### Method 3: Run Test Script

```bash
node test-deployment-modes.js
```

---

## Troubleshooting

### Issue: CORS Errors

**Symptom**: Browser console shows CORS errors

**Solution**:
1. Check `CORS_ALLOWED_ORIGINS` includes your frontend URL
2. Verify `CORS_ALLOW_CREDENTIALS=true` if using cookies
3. Ensure frontend makes requests to correct backend URL

### Issue: Wrong URLs in Startup Banner

**Symptom**: URLs don't match your expectations

**Solution**:
1. Check if `.env` has explicit URL values overriding auto-config
2. Comment out `FRONTEND_URL`, `BASE_URL`, and `DASHBOARD_URL` to use auto-config
3. Restart the server

### Issue: Port Already in Use

**Symptom**: `EADDRINUSE` error

**Solution**:
1. Change `PORT` in .env
2. In different-ports mode, remember backend uses PORT + 1
3. Check for other services using those ports

### Issue: Social Login Callbacks Fail

**Symptom**: OAuth redirects fail or go to wrong URL

**Solution**:
- Social login callback URLs are auto-configured based on `BASE_URL`
- Update OAuth provider settings to match the callback URLs
- Check startup banner for actual callback URLs

---

## Best Practices

1. **Development**: Use `same-port` for simplest setup, or `different-ports` if using a frontend dev server

2. **Production**: Use `separate-domains` for better scalability and security

3. **CORS**: Always configure CORS properly for different-ports and separate-domains modes

4. **Environment Variables**: Use auto-configuration by leaving URL variables empty

5. **Social Login**: Update OAuth provider callback URLs when changing deployment mode

6. **Testing**: Always test after changing deployment mode

7. **Documentation**: Document your deployment mode choice in your project README

---

## Advanced: Custom Configurations

### Custom Ports (Override Auto-Config)

```bash
DEPLOYMENT_MODE=different-ports
PORT=8000

# Override auto-config
FRONTEND_URL=http://localhost:8000
BASE_URL=http://localhost:9000  # Not 8001!
```

### Multiple Frontends

```bash
DEPLOYMENT_MODE=separate-domains
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com,https://mobile.example.com
```

### Behind Reverse Proxy

```bash
DEPLOYMENT_MODE=same-port
PORT=3000

# Nginx/Apache proxies to this backend
# Public URL might be different
PROD_BASE_URL=https://yourdomain.com
PROD_FRONTEND_URL=https://yourdomain.com
```

---

## Migration Guide

### From same-port to different-ports:

1. Update .env: `DEPLOYMENT_MODE=different-ports`
2. Start frontend dev server on PORT
3. Backend will run on PORT + 1
4. Update frontend API base URL to `http://localhost:PORT+1`
5. Update CORS_ALLOWED_ORIGINS
6. Restart both servers

### From different-ports to separate-domains:

1. Update .env: `DEPLOYMENT_MODE=separate-domains`
2. Set explicit FRONTEND_URL and BASE_URL
3. Update CORS_ALLOWED_ORIGINS
4. Update frontend API base URL
5. Update OAuth callback URLs
6. Deploy and test

---

## Support

For issues or questions:
- Check server startup banner for actual configuration
- Review logs for CORS or connection errors
- Test with `curl` or Postman to isolate frontend/backend issues
- See `docs/DEPLOYMENT.md` for detailed deployment instructions

---

**Last Updated**: November 2025
**Version**: 1.0.0
