# Comprehensive Benchmark Testing Guide

## Overview

The comprehensive benchmark test is a **production-grade load testing suite** designed to validate that your Authn server can handle **1,000 requests per second** with **<50ms average response time** on minimal hardware (1GB RAM, 8GB storage).

## Quick Start

```powershell
# Run the full comprehensive test (~11 minutes)
.\run-comprehensive-benchmark.ps1

# Quick validation test (~2 minutes)
.\run-comprehensive-benchmark.ps1 -Mode quick

# Custom load test
.\run-comprehensive-benchmark.ps1 -TargetRPS 1500 -EnableLogs
```

## Test Architecture

### Four Concurrent Test Scenarios

The comprehensive benchmark runs **4 parallel test scenarios** simultaneously to simulate real-world production load:

#### 1. Public Endpoint Stress Test (No Authentication)
- **Purpose**: Test public API endpoints that don't require authentication
- **Load Pattern**: 200 → 300 RPS ramping over 4 minutes
- **Endpoints Tested**:
  - `/api/info/health` (50% of traffic)
  - `/api/info/version` (30% of traffic)
  - `/health` (20% of traffic - HTML page)
- **Success Criteria**: <30ms avg, <50ms p(95)

#### 2. Authentication Load Test
- **Purpose**: Test login endpoint under sustained high load
- **Load Pattern**: 200 → 500 RPS ramping over 7 minutes
- **Flow**: Continuous login requests with 20 test users
- **Metrics Tracked**:
  - Login duration
  - Cache hit rate (user lookups)
  - Version error detection
- **Success Criteria**: <100ms avg, <200ms p(95), >90% cache hits

#### 3. Full User Journey Simulation
- **Purpose**: Test complete user workflows from login to profile operations
- **Load Pattern**: 10 → 200 VUs ramping over 11 minutes
- **Journey Steps**:
  1. Login (JWT generation)
  2. Session validation (profile fetch)
  3. Profile update (20% chance - write operation)
- **Success Criteria**: <50ms session validation, <150ms profile updates

#### 4. Cache Stress Test
- **Purpose**: Validate Redis cache performance under rapid consecutive requests
- **Load Pattern**: 50 VUs sustained for 5 minutes
- **Test Method**: 
  - Login once per VU
  - Make 10 consecutive profile fetch requests
  - Measure cache hit rate and response times
- **Success Criteria**: >95% cache hit rate, <20ms cached responses

## Performance Targets

### Primary Metrics

| Metric | Target | Critical? |
|--------|--------|-----------|
| Average Response Time | <50ms | ✅ Yes |
| P95 Response Time | <100ms | ✅ Yes |
| P99 Response Time | <200ms | ⚠️ Important |
| Error Rate | <1% | ✅ Yes |
| Cache Hit Rate | >90% | ✅ Yes |
| Throughput | 1000+ RPS | ✅ Yes |
| Version Errors | 0 | ✅ Yes |
| Memory Usage | <1GB | ✅ Yes |

### Scenario-Specific Targets

**Public Endpoints:**
- Avg: <30ms
- P95: <50ms
- Cache warmup: <20ms after first request

**Authentication:**
- Login avg: <100ms
- Login p95: <200ms
- User cache hit: >90%

**Session Validation:**
- Avg: <30ms
- P95: <50ms
- Redis session cache hit: >95%

**Profile Updates:**
- Avg: <150ms
- P95: <300ms
- Cache invalidation: <5ms

## Test Phases

### Phase 1: Warm-up (0-2 minutes)
- **Purpose**: Build Redis cache, establish connections
- **Load**: 10-50 VUs, 200-300 RPS
- **Expected**: High cache misses, slower responses
- **What's Happening**:
  - MongoDB connection pool warming up
  - Redis cache being populated
  - JWT tokens being generated and cached
  - User records being cached

### Phase 2: Ramp-up (2-5 minutes)
- **Purpose**: Gradually increase load to target
- **Load**: 50-100 VUs, 300-700 RPS
- **Expected**: Cache hits increasing, response times stabilizing
- **What's Happening**:
  - Cache hit rate climbing to 80-90%
  - Response times decreasing as cache warms
  - Connection pooling optimized

### Phase 3: Sustained Load (5-10 minutes)
- **Purpose**: Validate stability under target load
- **Load**: 100-150 VUs, 900-1100 RPS
- **Expected**: Stable performance, >90% cache hits
- **What's Happening**:
  - Peak performance achieved
  - All caches fully warm
  - Optimal connection reuse
  - **This is the validation phase**

### Phase 4: Spike Test (10-11 minutes)
- **Purpose**: Test behavior under sudden load increase
- **Load**: 150-200 VUs, 1500+ RPS burst
- **Expected**: Slight degradation acceptable, no crashes
- **What's Happening**:
  - Testing maximum capacity
  - Monitoring for resource exhaustion
  - Validating graceful degradation

### Phase 5: Recovery (11-12 minutes)
- **Purpose**: Validate recovery after spike
- **Load**: Back to 100-150 VUs, 1000 RPS
- **Expected**: Return to stable performance
- **What's Happening**:
  - Connection pool normalizing
  - Memory returning to baseline
  - Cache still warm and effective

## Custom Metrics Tracked

### Performance Metrics
- `request_duration_ms`: Overall request latency trend
- `login_duration_ms`: Login-specific latency
- `session_validation_ms`: Session validation latency (Redis cache test)
- `profile_update_ms`: Write operation latency
- `public_endpoint_ms`: Public API latency
- `auth_endpoint_ms`: Authentication endpoint latency
- `protected_endpoint_ms`: Protected endpoint latency

### Success/Error Tracking
- `error_rate`: Percentage of failed requests
- `login_success`: Login success rate
- `session_validation_success`: Session validation success rate
- `profile_update_success`: Profile update success rate
- `version_errors`: Count of version conflict errors (should be 0)

### Cache Performance
- `cache_hit_rate`: Percentage of requests served from cache
- `cache_hits`: Total cache hits counter
- `cache_misses`: Total cache misses counter

### Resource Tracking
- `active_connections`: Current active HTTP connections
- `estimated_memory_mb`: Estimated memory usage (approximate)

## Interpreting Results

### Success Indicators ✅

```
Average Response:     <50ms    →  45.23ms ✅
P95 Response:         <100ms   →  89.34ms ✅
P99 Response:         <200ms   →  178.56ms ✅
Error Rate:           <1%      →  0.12% ✅
Cache Hit Rate:       >90%     →  93.7% ✅
Version Errors:       0        →  0 ✅
Throughput:           1000 RPS →  1087 RPS ✅
```

**Interpretation**: System is production-ready! All targets met.

### Warning Signs ⚠️

```
Average Response:     <50ms    →  67.89ms ❌
P95 Response:         <100ms   →  145.23ms ❌
Cache Hit Rate:       >90%     →  78.4% ❌
```

**Possible Issues**:
- **High avg response**: Redis not connected or cache not warm
- **High P95**: Database queries not optimized, missing indexes
- **Low cache hit**: Redis not running, cache TTLs too short

### Critical Failures ❌

```
Error Rate:           <1%      →  5.67% ❌
Version Errors:       0        →  234 ❌
Throughput:           1000 RPS →  432 RPS ❌
```

**Immediate Actions Required**:
- **High error rate**: Check server logs, database connection
- **Version errors**: Review concurrent write logic, add locking
- **Low throughput**: Increase VUs, check CPU/memory limits

## Troubleshooting

### Issue: Test Fails to Start

**Error**: `Server not responding at http://localhost:3000`

**Solution**:
```powershell
# Start the server
npm start

# Or with PM2
pm2 start ecosystem.config.js

# Verify health
curl http://localhost:3000/api/info/health
```

### Issue: Low Cache Hit Rate (<90%)

**Error**: `Cache Hit Rate: >90% → 45.6% ❌`

**Solution**:
```powershell
# 1. Verify Redis is running
redis-cli ping
# Expected: PONG

# 2. Check Redis connection in logs
Get-Content logs/app.log -Tail 100 | Select-String "Redis"

# 3. Enable Redis in .env
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379

# 4. Restart server
npm restart
```

### Issue: High Response Times (>50ms avg)

**Error**: `Average Response: <50ms → 89.23ms ❌`

**Solutions**:
```powershell
# 1. Check MongoDB indexes
npm run seed  # Creates indexes

# 2. Verify MongoDB connection pool
# In .env:
MONGO_MAX_POOL_SIZE=50
MONGO_MIN_POOL_SIZE=5

# 3. Check for slow queries in logs
Get-Content logs/app.log -Tail 100 | Select-String "slow query"

# 4. Monitor system resources
Get-Process node | Select-Object CPU, Memory
```

### Issue: Version Errors Detected

**Error**: `Version Errors: 0 → 15 ❌`

**Solution**:
```powershell
# 1. This indicates concurrent write conflicts
# 2. Review models/User.js and models/Session.js
# 3. Ensure optimistic locking is working
# 4. Check for duplicate session creation

# 5. Run quick validation
npm test
```

### Issue: Memory Usage Exceeds 1GB

**Error**: Memory usage > 1024MB

**Solution**:
```powershell
# 1. Reduce MongoDB connection pool
# In .env:
MONGO_MAX_POOL_SIZE=30  # Reduce from 50

# 2. Reduce Node.js heap
$env:NODE_OPTIONS="--max-old-space-size=512"
npm start

# 3. Enable compression
# In middleware/common.js - already enabled

# 4. Monitor with PM2
pm2 start ecosystem.config.js --max-memory-restart 800M
```

## Best Practices

### Before Running Tests

1. **Ensure server is healthy**:
   ```powershell
   curl http://localhost:3000/api/info/health
   ```

2. **Verify Redis is running**:
   ```powershell
   redis-cli ping
   ```

3. **Clear old test data** (optional):
   ```powershell
   npm run clear-db
   npm run seed
   ```

4. **Check disk space**:
   ```powershell
   Get-PSDrive C | Select-Object Used, Free
   # Need: 8GB+ free
   ```

### During Tests

1. **Monitor logs in real-time**:
   ```powershell
   Get-Content logs/app.log -Wait
   ```

2. **Watch memory usage**:
   ```powershell
   while ($true) {
       Get-Process node | Select-Object CPU, @{N='MemoryMB';E={$_.WorkingSet64/1MB}}
       Start-Sleep -Seconds 5
   }
   ```

3. **Monitor MongoDB**:
   ```powershell
   mongo --eval "db.serverStatus().connections"
   ```

### After Tests

1. **Review results file**:
   ```powershell
   $latest = Get-ChildItem benchmarks/results/comprehensive-*.json | 
             Sort-Object LastWriteTime -Descending | 
             Select-Object -First 1
   Get-Content $latest | ConvertFrom-Json | Select-Object -ExpandProperty metrics
   ```

2. **Check for errors in logs**:
   ```powershell
   Get-Content logs/app.log | Select-String "ERROR"
   ```

3. **Compare with previous runs**:
   ```powershell
   # Save baseline
   Copy-Item benchmarks/results/comprehensive-*.json baseline-results.json
   
   # Compare later
   # Manually compare metrics
   ```

## Advanced Usage

### Custom Test Duration

Modify `benchmarks/comprehensive-benchmark.js`:

```javascript
// Quick test (2 minutes)
stages: [
  { duration: '30s', target: 50 },
  { duration: '1m', target: 100 },
  { duration: '30s', target: 0 },
]

// Extended test (30 minutes)
stages: [
  { duration: '5m', target: 100 },
  { duration: '20m', target: 200 },
  { duration: '5m', target: 0 },
]
```

### Custom Endpoints

Add your own endpoints to test:

```javascript
export function customEndpointTest(data) {
  const res = http.get(`${BASE_URL}/api/your/endpoint`);
  // Add metrics tracking
}

// Add to scenarios in options
scenarios: {
  custom_test: {
    executor: 'constant-vus',
    vus: 10,
    duration: '5m',
    exec: 'customEndpointTest',
  }
}
```

### Environment Variables

```powershell
# Custom base URL
$env:BASE_URL = "http://your-server.com"

# Higher target RPS
$env:TARGET_RPS = "2000"

# Enable detailed logs
$env:ENABLE_LOGS = "true"

# Run test
.\run-comprehensive-benchmark.ps1
```

## Results Analysis

### Export to CSV for Charting

```powershell
# Convert JSON results to CSV
$results = Get-Content benchmarks/results/comprehensive-*.json | ConvertFrom-Json
$metrics = $results.metrics.http_req_duration.values

$csv = @()
$csv += [PSCustomObject]@{
    Metric = "Average"
    Value = $metrics.avg
    Unit = "ms"
}
$csv += [PSCustomObject]@{
    Metric = "P95"
    Value = $metrics.'p(95)'
    Unit = "ms"
}

$csv | Export-Csv -Path results-summary.csv -NoTypeInformation
```

### Generate HTML Report

Use k6's built-in HTML reporter:

```powershell
k6 run --out json=results.json benchmarks/comprehensive-benchmark.js
# Then use k6-reporter to generate HTML
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Performance Tests
on: [push, pull_request]
jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Start services
        run: |
          docker-compose up -d mongodb redis
          npm start &
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Run benchmark
        run: k6 run benchmarks/comprehensive-benchmark.js
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: benchmarks/results/
```

## References

- **Performance Optimization Guide**: `docs/PERFORMANCE_OPTIMIZATION.md`
- **Redis Implementation**: `docs/REDIS_IMPLEMENTATION.md`
- **Optimization Results**: `OPTIMIZATION_RESULTS.md`
- **k6 Documentation**: https://k6.io/docs/
- **Architecture Overview**: `docs/ARCHITECTURE.md`

## Support

For issues or questions:
1. Check logs: `logs/app.log`
2. Review troubleshooting section above
3. Open an issue on GitHub
4. Consult documentation in `docs/` directory

---

**Last Updated**: November 10, 2025  
**Version**: 1.0.0  
**Benchmark File**: `benchmarks/comprehensive-benchmark.js`
