# MongoDB Connection Troubleshooting Guide

## 🚨 Error: querySrv ETIMEOUT

**Error Message:**
```
MongoDB connection failed: querySrv ETIMEOUT _mongodb._tcp.users.24vgauc.mongodb.net
```

---

## 🔧 **Quick Fixes (Try These First)**

### 1. ✅ **Whitelist Your IP Address in MongoDB Atlas**

**This is the #1 cause of connection timeouts!**

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Navigate to **Network Access** (in the sidebar)
3. Click **"+ ADD IP ADDRESS"**
4. Choose one of these options:
   - **Option A:** Click **"ADD CURRENT IP ADDRESS"** (for your current IP)
   - **Option B:** Click **"ALLOW ACCESS FROM ANYWHERE"** and use `0.0.0.0/0` (⚠️ only for development!)
5. Click **"Confirm"**
6. Wait 2-3 minutes for the changes to propagate
7. Try connecting again

**Screenshot location:** Security → Network Access → IP Access List

---

### 2. ✅ **Check Database User Credentials**

Your connection string has these credentials:
- **Username:** `hannanbhatti`
- **Password:** `oYtBNezkhB4P7I6B`

Verify in MongoDB Atlas:
1. Go to **Database Access** (in the sidebar)
2. Make sure user `hannanbhatti` exists
3. Check that the password is correct
4. Ensure the user has **Read and Write** permissions

**If password is wrong:**
1. Click the pencil icon next to the user
2. Click **"Edit Password"**
3. Update your `.env` file with the new password

---

### 3. ✅ **Check MongoDB Atlas Cluster Status**

1. Go to **Database** (in the sidebar)
2. Check if your cluster status shows:
   - ✅ **"Running"** = Good!
   - ⚠️ **"Paused"** = Click "Resume" to start it
   - ❌ **"Stopped"** = Cluster needs to be started

**Note:** Free tier clusters (M0) auto-pause after 60 days of inactivity.

---

### 4. ✅ **Test Your Internet Connection**

```powershell
# Test DNS resolution
nslookup users.24vgauc.mongodb.net

# Test MongoDB Atlas connectivity
Test-NetConnection -ComputerName users.24vgauc.mongodb.net -Port 27017
```

**Expected output:**
- DNS should resolve to multiple IP addresses
- Port 27017 should be reachable

---

### 5. ✅ **Try Alternative Connection String**

Sometimes the SRV connection string has issues. Try the standard format:

**Current (SRV format):**
```
mongodb+srv://hannanbhatti:oYtBNezkhB4P7I6B@users.24vgauc.mongodb.net/
```

**Alternative (Standard format):**
1. Go to MongoDB Atlas → Database → Connect
2. Choose **"Connect your application"**
3. Select **"Standard connection string"** (not SRV)
4. Copy the connection string
5. Update your `.env` file with the new format

---

### 6. ✅ **Check Firewall/Antivirus**

Your firewall might be blocking MongoDB connections:

**Windows Firewall:**
```powershell
# Check if port 27017 is blocked
Test-NetConnection -ComputerName users.24vgauc.mongodb.net -Port 27017

# If blocked, allow outbound connections to MongoDB
# Windows Defender Firewall → Advanced Settings → Outbound Rules
```

**Corporate Networks:**
- If you're on a corporate/school network, MongoDB ports might be blocked
- Try using a personal network or mobile hotspot to test

---

## 🔍 **Diagnostic Commands**

Run these commands to gather more information:

### Test DNS Resolution:
```powershell
nslookup _mongodb._tcp.users.24vgauc.mongodb.net
```

### Test MongoDB Connection:
```powershell
# Test basic connectivity
Test-NetConnection -ComputerName users.24vgauc.mongodb.net -Port 27017

# More detailed test
telnet users.24vgauc.mongodb.net 27017
```

### Test with MongoDB Compass:
1. Download [MongoDB Compass](https://www.mongodb.com/try/download/compass)
2. Paste your connection string
3. Click "Connect"
4. If Compass can connect, the issue is with your Node.js app

---

## ⚙️ **Configuration Improvements**

Update your `.env` file with better timeout settings:

```env
# Current settings
MONGO_TIMEOUT_MS=5000
MONGO_SOCKET_TIMEOUT_MS=45000

# Recommended settings (more lenient for troubleshooting)
MONGO_TIMEOUT_MS=30000          # 30 seconds (was 5 seconds)
MONGO_SOCKET_TIMEOUT_MS=60000   # 60 seconds (was 45 seconds)
MONGO_MAX_POOL_SIZE=10          # Keep as is
```

---

## 🧪 **Test Connection with Code**

Create a test file to isolate the issue:

**File:** `test-mongodb.js`
```javascript
const mongoose = require('mongoose');

const MONGO_URL = 'mongodb+srv://hannanbhatti:oYtBNezkhB4P7I6B@users.24vgauc.mongodb.net/?retryWrites=true&w=majority&appName=Users';

console.log('🔌 Testing MongoDB connection...');
console.log('Connection string:', MONGO_URL.replace(/:[^:@]+@/, ':****@')); // Hide password

mongoose.connect(MONGO_URL, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
})
.then(() => {
  console.log('✅ MongoDB connected successfully!');
  console.log('Database:', mongoose.connection.db.databaseName);
  console.log('Host:', mongoose.connection.host);
  process.exit(0);
})
.catch((err) => {
  console.error('❌ MongoDB connection failed!');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  if (err.reason) {
    console.error('Reason:', err.reason);
  }
  process.exit(1);
});
```

**Run the test:**
```powershell
node test-mongodb.js
```

---

## 📋 **Checklist**

Work through this checklist in order:

- [ ] **Step 1:** IP address whitelisted in MongoDB Atlas Network Access
- [ ] **Step 2:** Database user credentials are correct
- [ ] **Step 3:** MongoDB cluster is running (not paused/stopped)
- [ ] **Step 4:** DNS resolves correctly (`nslookup users.24vgauc.mongodb.net`)
- [ ] **Step 5:** Port 27017 is reachable (`Test-NetConnection`)
- [ ] **Step 6:** No firewall/antivirus blocking MongoDB
- [ ] **Step 7:** Try MongoDB Compass with same connection string
- [ ] **Step 8:** Update timeout settings in `.env`
- [ ] **Step 9:** Try standard connection string (not SRV)
- [ ] **Step 10:** Test on different network (mobile hotspot)

---

## 🎯 **Most Likely Solution**

**In 90% of cases, this error is fixed by whitelisting your IP address in MongoDB Atlas!**

1. Go to MongoDB Atlas → Network Access
2. Add your current IP or use `0.0.0.0/0` for testing
3. Wait 2-3 minutes
4. Try again

---

## 📞 **Still Having Issues?**

If none of these solutions work:

1. **Check MongoDB Atlas Status:** https://status.mongodb.com/
2. **Contact MongoDB Support:** https://support.mongodb.com/
3. **Check logs:** Look at `logs/app.log` for more details
4. **Run diagnostic test:** `node test-mongodb.js`

---

## ✅ **After Fixing**

Once connected, you should see:
```
✅ Connected to MongoDB: users.24vgauc.mongodb.net
📊 Database: test (or your database name)
🔓 Backup service initialized
```

Your app will continue to run normally!
