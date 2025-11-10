# Redis Setup and Performance Guide

## 🚀 Quick Start

### Windows Installation

#### Option 1: WSL2 (Recommended)
```powershell
# Enable WSL2
wsl --install

# Install Redis in WSL
wsl
sudo apt update
sudo apt install redis-server -y

# Start Redis
sudo service redis-server start

# Test connection
redis-cli ping
# Should return: PONG
```

#### Option 2: Memurai (Native Windows)
```powershell
# Download and install Memurai from: https://www.memurai.com/get-memurai
# Or use winget:
winget install Memurai.Memurai

# Memurai runs automatically as a Windows service
```

#### Option 3: Docker (Cross-platform)
```bash
# Pull Redis image
docker pull redis:latest

# Run Redis container
docker run --name redis-cache -p 6379:6379 -d redis:latest

# Test connection
docker exec -it redis-cache redis-cli ping
```

### Linux/Mac Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server

# macOS (Homebrew)
brew install redis
brew services start redis

# Test connection
redis-cli ping
```

## ⚙️ Configuration

### 1. Enable Redis in .env
```env
# Enable Redis caching
REDIS_ENABLED=true

# Redis connection URL
REDIS_URL=redis://localhost:6379

# Optional: Redis password
# REDIS_PASSWORD=your-secure-password

# Connection timeout
REDIS_CONNECT_TIMEOUT=5000

# Cache TTL settings
REDIS_SESSION_TTL=604800  # 7 days
REDIS_USER_TTL=3600       # 1 hour
```

### 2. Verify Connection
```bash
# Start your server
npm start

# You should see:
# ✅ Redis: Connected and ready
```

## 📊 Performance Benefits

### Before Redis (MongoDB Only)
- Session validation: **50-200ms**
- User lookup: **30-100ms**
- Login: **500-3000ms**
- Cache hit rate: **0%**

### After Redis (With Caching)
- Session validation: **1-5ms** (95-99% faster)
- User lookup: **1-3ms** (95-97% faster)
- Login: **20-100ms** (80-96% faster)
- Cache hit rate: **90-95%** after warmup

### Expected Improvements
| Metric | MongoDB Only | With Redis | Improvement |
|--------|-------------|------------|-------------|
| Session validation | 100ms | 2ms | **98% faster** |
| User lookup | 50ms | 2ms | **96% faster** |
| Login (cached) | 2000ms | 100ms | **95% faster** |
| Concurrent users | 50 | 500+ | **10x capacity** |

## 🔍 Monitoring Redis

### Basic Commands
```bash
# Connect to Redis CLI
redis-cli

# Check if server is running
PING

# Get all keys
KEYS *

# Get session count
KEYS session:* | wc -l

# Get user cache count
KEYS user:* | wc -l

# Monitor commands in real-time
MONITOR

# Get server info
INFO

# Get memory usage
INFO memory
```

### Check Cache Hit Rate
```bash
redis-cli

# Get stats
INFO stats

# Look for:
# - keyspace_hits
# - keyspace_misses
# Calculate hit rate: hits / (hits + misses) * 100
```

## 🧪 Testing Redis Performance

### Run Smoke Test
```bash
# With Redis enabled
npm start
& 'C:\Program Files\k6\k6.exe' run benchmarks/smoke-test.js --quiet

# Expected results:
# ✅ Login Success Rate: 100%
# ✅ Version Error Rate: 0%
# ⏱️ Average Latency: <100ms
# ⏱️ p(95) Latency: <50ms
```

### Run Redis Performance Test
```bash
& 'C:\Program Files\k6\k6.exe' run benchmarks/redis-performance-test.js

# Expected metrics:
# - cache_hits: 5000+ (90-95% hit rate)
# - session_validation_ms: p(95) < 50ms
# - login_with_cache_ms: p(95) < 100ms
# - version_errors: 0
```

## 🔧 Advanced Configuration

### Production Redis Settings

#### redis.conf (Linux/Mac)
```conf
# Bind to all interfaces (use with caution, add firewall rules)
bind 0.0.0.0

# Set password
requirepass your-secure-password-here

# Max memory (adjust based on your server)
maxmemory 256mb

# Eviction policy (remove least recently used keys when full)
maxmemory-policy allkeys-lru

# Enable AOF persistence
appendonly yes
appendfsync everysec

# Snapshotting
save 900 1
save 300 10
save 60 10000
```

#### Update .env for production
```env
REDIS_ENABLED=true
REDIS_URL=redis://your-redis-server:6379
REDIS_PASSWORD=your-secure-password
REDIS_CONNECT_TIMEOUT=10000
REDIS_SESSION_TTL=604800
REDIS_USER_TTL=3600
```

### Redis as a Service

#### Docker Compose
```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    container_name: authn-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --requirepass ${REDIS_PASSWORD}
    
volumes:
  redis-data:
```

#### Systemd Service (Linux)
```ini
# /etc/systemd/system/redis.service
[Unit]
Description=Redis In-Memory Data Store
After=network.target

[Service]
Type=forking
ExecStart=/usr/bin/redis-server /etc/redis/redis.conf
ExecStop=/usr/bin/redis-cli shutdown
Restart=always

[Install]
WantedBy=multi-user.target
```

## 🐛 Troubleshooting

### Redis Not Connecting
```bash
# Check if Redis is running
redis-cli ping

# If not running (WSL):
sudo service redis-server start

# If not running (systemd):
sudo systemctl start redis-server

# Check logs
sudo tail -f /var/log/redis/redis-server.log
```

### Server Starts But Redis Disabled
```
⚠️  Redis connection failed (continuing without cache): ...
```

**Solution:**
1. Verify Redis is running: `redis-cli ping`
2. Check REDIS_URL in .env: `redis://localhost:6379`
3. Check firewall allows port 6379
4. Try `REDIS_ENABLED=false` to disable (fallback mode)

### Performance Not Improved
```
Cache hit rate < 50%
```

**Possible causes:**
1. TTL too short (increase REDIS_SESSION_TTL/REDIS_USER_TTL)
2. Redis memory full (check with `redis-cli INFO memory`)
3. Need warmup period (run test for 2+ minutes)

### Memory Issues
```
OOM command not allowed when used memory > 'maxmemory'
```

**Solution:**
1. Increase maxmemory: `redis-cli CONFIG SET maxmemory 512mb`
2. Set eviction policy: `redis-cli CONFIG SET maxmemory-policy allkeys-lru`
3. Clear old data: `redis-cli FLUSHDB` (use with caution!)

## 🔐 Security Best Practices

### 1. Enable Authentication
```bash
# Set password in redis.conf
requirepass your-strong-password-here

# Update .env
REDIS_PASSWORD=your-strong-password-here
```

### 2. Bind to Localhost Only (Development)
```conf
# redis.conf
bind 127.0.0.1 ::1
```

### 3. Use TLS (Production)
```bash
# Generate certificates
openssl req -x509 -nodes -newkey rsa:4096 -keyout redis.key -out redis.crt -days 365

# Update redis.conf
tls-port 6380
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key

# Update .env
REDIS_URL=rediss://your-server:6380
```

### 4. Firewall Rules
```bash
# Allow only your app server
sudo ufw allow from YOUR_APP_SERVER_IP to any port 6379
sudo ufw deny 6379
```

## 📈 Scaling Redis

### 1. Redis Sentinel (High Availability)
- Automatic failover
- Master-slave replication
- Health monitoring

### 2. Redis Cluster (Horizontal Scaling)
- Data sharding
- Multiple nodes
- Linear scalability

### 3. Managed Redis Services
- **AWS ElastiCache**: Fully managed, auto-scaling
- **Azure Cache for Redis**: Enterprise-grade
- **Redis Cloud**: Official managed service
- **DigitalOcean Managed Redis**: Simple setup

## 🎯 Optimization Tips

### 1. Optimize Cache Keys
```javascript
// Current pattern:
session:{sessionId}           // Good: unique per session
user:{userId}                 // Good: unique per user
ratelimit:{action}:{ip}       // Good: scoped by action

// Avoid:
user_data                     // Bad: collision-prone
session                       // Bad: overwrites data
```

### 2. Set Appropriate TTLs
```javascript
// Sessions: Match JWT expiry
REDIS_SESSION_TTL=604800  // 7 days

// User data: Short TTL (frequently updated)
REDIS_USER_TTL=3600  // 1 hour

// Rate limiting: Match window
REDIS_RATELIMIT_TTL=900  // 15 minutes
```

### 3. Use Pipelining for Bulk Operations
```javascript
// services/redis.js already optimized
// But for custom bulk operations:
const pipeline = client.pipeline();
pipeline.get('key1');
pipeline.get('key2');
pipeline.get('key3');
const results = await pipeline.exec();
```

### 4. Monitor Memory Usage
```bash
# Set up alerts for:
# - Memory usage > 80%
# - Evictions > 100/sec
# - Connection errors

redis-cli INFO memory | grep used_memory_human
redis-cli INFO stats | grep evicted_keys
```

## 🚨 Production Checklist

- [ ] Redis installed and running
- [ ] Password authentication enabled
- [ ] Firewall rules configured
- [ ] Persistence enabled (AOF + RDB)
- [ ] Memory limit set with eviction policy
- [ ] Monitoring/alerts configured
- [ ] Backup strategy in place
- [ ] Connection pool optimized
- [ ] Load tested under production load
- [ ] Failover plan documented

## 📚 Additional Resources

- [Redis Official Documentation](https://redis.io/docs/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Redis Security Guide](https://redis.io/docs/manual/security/)
- [Redis Performance Guide](https://redis.io/docs/manual/optimization/)
- [Redis Cluster Tutorial](https://redis.io/docs/manual/scaling/)

## 🆘 Support

If you encounter issues:
1. Check server logs: `logs/app.log`
2. Check Redis logs: `/var/log/redis/redis-server.log`
3. Test Redis directly: `redis-cli ping`
4. Run diagnostics: `redis-cli INFO all`
5. Check GitHub Issues or open a new one
