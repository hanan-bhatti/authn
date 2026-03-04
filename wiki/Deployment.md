# Deployment

This page covers how to deploy Authn to production using Docker, Heroku, AWS, DigitalOcean, or a bare VPS.

---

## Prerequisites

| Requirement | Minimum |
|-------------|---------|
| Node.js | 16.0.0 |
| npm | 8.0.0 |
| MongoDB | 5.0 |
| (Optional) Docker | Latest |
| (Optional) PM2 | Latest |
| (Optional) Nginx | Latest |

---

## Environment Preparation

### 1. Clone the repository

```bash
git clone https://github.com/hanan-bhatti/authn.git
cd authn
```

### 2. Install production dependencies

```bash
npm install --production
```

### 3. Configure environment variables

```bash
cp .env.example .env
nano .env
```

Minimum required values for production:

```env
NODE_ENV=production
PORT=3000
BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/authn

JWT_SECRET=<64-character-random-string>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

CORS_ALLOWED_ORIGINS=https://yourdomain.com
COOKIE_SECURE=true
```

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

See [Configuration](Configuration) for the complete reference.

---

## Docker Deployment (Recommended)

### Dockerfile

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/api/health',(r)=>{process.exit(r.statusCode===200?0:1)})"
CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:5.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secure_password
      MONGO_INITDB_DATABASE: authn
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

volumes:
  mongo-data:
```

### Commands

```bash
docker-compose build
docker-compose up -d
docker-compose logs -f app
docker-compose down
```

---

## Heroku Deployment

```bash
# Install Heroku CLI, then:
heroku create your-app-name
heroku addons:create mongolab:sandbox
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
heroku config:set SMTP_HOST=smtp.gmail.com SMTP_PORT=587 \
  SMTP_USER=your@email.com SMTP_PASS=app-password

# Create Procfile
echo "web: npm start" > Procfile

git push heroku main
heroku logs --tail
```

---

## AWS EC2 / VPS Deployment

```bash
# On the server — install Node.js 16
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Clone and configure
git clone https://github.com/hanan-bhatti/authn.git
cd authn
npm install --production
cp .env.example .env
# edit .env with production values

# Start with PM2
pm2 start server.js --name authn
pm2 save
pm2 startup   # follow the printed command to enable auto-start
```

---

## Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Obtain a free SSL certificate with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## Production Checklist

- [ ] `NODE_ENV=production`
- [ ] `COOKIE_SECURE=true` (requires HTTPS)
- [ ] Strong `JWT_SECRET` (≥ 64 characters)
- [ ] `CORS_ALLOWED_ORIGINS` set to your actual domain(s)
- [ ] MongoDB secured with authentication
- [ ] SMTP credentials configured and tested
- [ ] SSL/TLS certificate installed
- [ ] Firewall: only ports 80, 443, and 22 exposed
- [ ] PM2 or equivalent process manager configured
- [ ] Log rotation configured
- [ ] Backup storage configured (see `BACKUP_PATH`, `BACKUP_RETENTION_DAYS`)

---

## Monitoring

### PM2 Metrics

```bash
pm2 status
pm2 monit
pm2 logs authn
```

### Health Check Endpoint

```bash
curl https://api.yourdomain.com/api/health
```

---

## Troubleshooting

**App crashes on startup**  
Run `pm2 logs authn` and check for missing environment variables or MongoDB connection errors.

**`ECONNREFUSED` on MongoDB**  
Ensure MongoDB is running (`sudo systemctl status mongod`) and the `MONGO_URL` is correct.

**Emails not sending**  
Verify SMTP credentials and confirm that port 587 is not blocked by your cloud provider.
