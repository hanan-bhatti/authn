# Authn Deployment Guide

Complete guide for deploying Authn authentication system to various platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Email Service Configuration](#email-service-configuration)
- [File Storage Setup](#file-storage-setup)
- [Docker Deployment](#docker-deployment)
- [Heroku Deployment](#heroku-deployment)
- [AWS Deployment](#aws-deployment)
- [DigitalOcean Deployment](#digitalocean-deployment)
- [VPS Deployment (Ubuntu)](#vps-deployment-ubuntu)
- [Production Checklist](#production-checklist)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB >= 5.0
- Git

### Optional but Recommended
- PM2 (Process Manager)
- Nginx (Reverse Proxy)
- Docker & Docker Compose
- SSL Certificate (Let's Encrypt)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/hanan-bhatti/authn.git
cd authn
```

### 2. Install Dependencies

```bash
npm install --production
```

### 3. Environment Variables

Create `.env` file from example:

```bash
cp .env.example .env
```

#### Required Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=production
BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Database
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/authn?retryWrites=true&w=majority

# JWT Configuration (CRITICAL - Use strong secret)
JWT_SECRET=generate-a-secure-random-string-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# Email Service (Gmail Example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=noreply@yourdomain.com
```

#### Optional Variables

```env
# Firebase (for Google OAuth)
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR-KEY-HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# File Storage (Filebase/S3)
FILEBASE_ACCESS_KEY_ID=your-access-key
FILEBASE_SECRET_ACCESS_KEY=your-secret-key
FILEBASE_BUCKET_NAME=your-bucket-name
IPFS_GATEWAY=https://ipfs.filebase.io

# Rate Limiting
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Backup Configuration
BACKUP_PATH=./backups
BACKUP_RETENTION_DAYS=365
```

### 4. Generate Secure Secrets

Generate strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Setup

### MongoDB Atlas (Recommended for Production)

1. **Create Account**: Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)

2. **Create Cluster**:
   - Choose M0 (Free) or paid tier
   - Select region closest to your app
   - Create cluster

3. **Configure Access**:
   ```
   Security > Database Access
   - Add database user
   - Create strong password
   - Grant readWrite role
   ```

4. **Whitelist IPs**:
   ```
   Security > Network Access
   - Add IP Address
   - Allow access from anywhere: 0.0.0.0/0 (or specific IPs)
   ```

5. **Get Connection String**:
   ```
   Databases > Connect > Connect your application
   Copy connection string
   Replace <password> with your password
   ```

### Self-Hosted MongoDB

```bash
# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database user
mongo
> use authn
> db.createUser({
    user: "authn_user",
    pwd: "strong_password_here",
    roles: [{ role: "readWrite", db: "authn" }]
  })
```

---

## Email Service Configuration

### Gmail Setup

1. **Enable 2-Step Verification**:
   - Go to Google Account > Security
   - Enable 2-Step Verification

2. **Generate App Password**:
   - Google Account > Security > App passwords
   - Select "Mail" and your device
   - Copy 16-character password

3. **Configure .env**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

### SendGrid Setup

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun Setup

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

---

## File Storage Setup

### Filebase (IPFS) Setup

1. **Create Account**: [filebase.com](https://filebase.com)

2. **Create Bucket**:
   - Go to Buckets > Create Bucket
   - Choose name and region
   - Note bucket name

3. **Generate Access Keys**:
   - Settings > Access Keys
   - Generate new access key
   - Save Access Key ID and Secret Access Key

4. **Configure .env**:
   ```env
   FILEBASE_ACCESS_KEY_ID=your-access-key-id
   FILEBASE_SECRET_ACCESS_KEY=your-secret-access-key
   FILEBASE_BUCKET_NAME=your-bucket-name
   IPFS_GATEWAY=https://ipfs.filebase.io
   ```

### AWS S3 Alternative

```env
FILEBASE_ENDPOINT=https://s3.amazonaws.com
FILEBASE_REGION=us-east-1
FILEBASE_ACCESS_KEY_ID=your-aws-access-key
FILEBASE_SECRET_ACCESS_KEY=your-aws-secret-key
FILEBASE_BUCKET_NAME=your-s3-bucket
```

---

## Docker Deployment

### 1. Create Dockerfile

```dockerfile
FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
```

### 2. Create .dockerignore

```
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
backups/
uploads/
```

### 3. Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mongo
    restart: unless-stopped
    networks:
      - authn-network

  mongo:
    image: mongo:5.0
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=secure_password
      - MONGO_INITDB_DATABASE=authn
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped
    networks:
      - authn-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - authn-network

volumes:
  mongo-data:

networks:
  authn-network:
    driver: bridge
```

### 4. Build and Run

```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

---

## Heroku Deployment

### 1. Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login
```

### 2. Create Heroku App

```bash
# Create app
heroku create your-app-name

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
heroku config:set SMTP_HOST=smtp.gmail.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=your-email@gmail.com
heroku config:set SMTP_PASS=your-app-password
heroku config:set EMAIL_FROM=noreply@yourdomain.com

# Get MongoDB URL (automatically set by addon)
heroku config:get MONGODB_URI
```

### 3. Create Procfile

```
web: npm start
```

### 4. Deploy

```bash
# Add Heroku remote
heroku git:remote -a your-app-name

# Push to Heroku
git push heroku main

# View logs
heroku logs --tail

# Open app
heroku open
```

---

## AWS Deployment

### EC2 Setup

1. **Launch EC2 Instance**:
   - Ubuntu Server 20.04 LTS
   - t2.micro (or larger)
   - Configure security group:
     - SSH (22)
     - HTTP (80)
     - HTTPS (443)
     - Custom TCP (5000) - temporary

2. **Connect to Instance**:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Dependencies**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install MongoDB
   wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
   sudo apt update
   sudo apt install -y mongodb-org

   # Install PM2
   sudo npm install -g pm2

   # Install Nginx
   sudo apt install -y nginx
   ```

4. **Deploy Application**:
   ```bash
   # Clone repository
   git clone https://github.com/hanan-bhatti/authn.git
   cd authn

   # Install dependencies
   npm install --production

   # Create .env file
   nano .env
   # (paste your environment variables)

   # Start with PM2
   pm2 start server.js --name authn
   pm2 save
   pm2 startup
   ```

### Elastic Beanstalk Alternative

1. **Install EB CLI**:
   ```bash
   pip install awsebcli
   ```

2. **Initialize**:
   ```bash
   eb init
   # Select region
   # Select Node.js platform
   # Configure SSH
   ```

3. **Create Environment**:
   ```bash
   eb create authn-production
   ```

4. **Set Environment Variables**:
   ```bash
   eb setenv NODE_ENV=production
   eb setenv JWT_SECRET=your-secret
   # ... set other variables
   ```

5. **Deploy**:
   ```bash
   eb deploy
   eb open
   ```

---

## DigitalOcean Deployment

### 1. Create Droplet

- Ubuntu 20.04 LTS
- $5/month plan (or larger)
- Add SSH key

### 2. Initial Setup

```bash
# Connect
ssh root@your-droplet-ip

# Create non-root user
adduser authn
usermod -aG sudo authn
su - authn

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
# (same as AWS EC2 instructions)

# Install PM2 and Nginx
sudo npm install -g pm2
sudo apt install -y nginx
```

### 3. Deploy Application

```bash
# Clone and setup
git clone https://github.com/hanan-bhatti/authn.git
cd authn
npm install --production

# Configure environment
nano .env

# Start application
pm2 start server.js --name authn
pm2 startup
pm2 save
```

---

## VPS Deployment (Ubuntu)

### Complete Production Setup

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 16
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# 4. Install PM2
sudo npm install -g pm2

# 5. Install Nginx
sudo apt install -y nginx

# 6. Install Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx

# 7. Configure firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable

# 8. Clone and setup application
cd /var/www
sudo git clone https://github.com/hanan-bhatti/authn.git
sudo chown -R $USER:$USER authn
cd authn
npm install --production

# 9. Create .env
nano .env
# (add your configuration)

# 10. Start with PM2
pm2 start server.js --name authn
pm2 startup
pm2 save
```

### Nginx Configuration

Create `/etc/nginx/sites-available/authn`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for long-running operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml;
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/authn /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL Certificate (Let's Encrypt)

```bash
# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Production Checklist

### Security

- [ ] Use strong JWT_SECRET (min 32 characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set secure cookies (httpOnly, secure, sameSite)
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Configure firewall (UFW/iptables)
- [ ] Regular security updates

### Performance

- [ ] Enable gzip compression
- [ ] Configure caching headers
- [ ] Use CDN for static assets
- [ ] Database indexes optimized
- [ ] Connection pooling configured
- [ ] Use PM2 cluster mode

### Monitoring

- [ ] Set up error logging
- [ ] Configure PM2 monitoring
- [ ] Database monitoring
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Log aggregation (optional)

### Backup

- [ ] Database backups (daily)
- [ ] Code repository backups
- [ ] Environment variables documented
- [ ] Backup user data (automated)

### Testing

- [ ] Health endpoint working
- [ ] Authentication flow tested
- [ ] Email delivery verified
- [ ] File upload working
- [ ] Social login tested
- [ ] 2FA verified

---

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# View status
pm2 status

# View logs
pm2 logs authn

# Monitor resources
pm2 monit

# Restart application
pm2 restart authn

# Stop application
pm2 stop authn
```

### Database Maintenance

```bash
# Backup MongoDB
mongodump --uri="mongodb://localhost:27017/authn" --out=/backups/$(date +%Y%m%d)

# Restore MongoDB
mongorestore --uri="mongodb://localhost:27017/authn" /backups/20250101

# Automated daily backups
crontab -e
# Add: 0 2 * * * mongodump --uri="mongodb://localhost:27017/authn" --out=/backups/$(date +%Y%m%d)
```

### Application Updates

```bash
# Pull latest code
cd /var/www/authn
git pull origin main

# Install dependencies
npm install --production

# Restart application
pm2 restart authn

# Clear PM2 logs
pm2 flush
```

### Log Rotation

Create `/etc/logrotate.d/authn`:

```
/var/www/authn/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs authn --lines 100

# Check environment variables
pm2 env 0

# Verify Node.js version
node --version  # Should be >= 16.0.0

# Check port availability
sudo lsof -i :5000
```

### Database Connection Issues

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string
echo $MONGO_URL

# Test connection
mongo "mongodb://localhost:27017/authn"

# Check firewall
sudo ufw status
```

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx configuration
sudo nginx -t

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### High Memory Usage

```bash
# Check memory
free -h

# Check PM2 processes
pm2 monit

# Restart application
pm2 restart authn

# Enable cluster mode
pm2 start server.js -i max --name authn
```

### Email Not Sending

1. Check SMTP credentials in .env
2. Verify SMTP server allows connections
3. Check firewall rules for port 587/465
4. Test with manual SMTP connection
5. Check application logs for errors

---

## Support & Resources

- **Documentation**: https://github.com/hanan-bhatti/authn/docs
- **Issues**: https://github.com/hanan-bhatti/authn/issues
- **Email**: hannanbhatti2006@gmail.com

---

**Last Updated**: January 6, 2025  
**Version**: 1.0.0