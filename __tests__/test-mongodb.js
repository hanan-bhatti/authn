const mongoose = require('mongoose');

const MONGO_URL = 'mongodb+srv://hannanbhatti:oYtBNezkhB4P7I6B@users.24vgauc.mongodb.net/?retryWrites=true&w=majority&appName=Users';

console.log('🔌 Testing MongoDB connection...');
console.log('Connection string:', MONGO_URL.replace(/:[^:@]+@/, ':****@')); // Hide password
console.log('');

mongoose.connect(MONGO_URL, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
})
.then(() => {
  console.log('✅ MongoDB connected successfully!');
  console.log('📊 Database:', mongoose.connection.db.databaseName);
  console.log('🌐 Host:', mongoose.connection.host);
  console.log('🔌 Port:', mongoose.connection.port);
  console.log('✨ Connection state:', mongoose.connection.readyState);
  console.log('');
  console.log('Your MongoDB connection is working! 🎉');
  process.exit(0);
})
.catch((err) => {
  console.error('❌ MongoDB connection failed!');
  console.error('');
  console.error('Error Details:');
  console.error('  Name:', err.name);
  console.error('  Message:', err.message);
  if (err.reason) {
    console.error('  Reason:', err.reason);
  }
  console.error('');
  console.error('💡 Common fixes:');
  console.error('  1. Whitelist your IP in MongoDB Atlas → Network Access');
  console.error('  2. Check database user credentials are correct');
  console.error('  3. Ensure MongoDB cluster is running (not paused)');
  console.error('  4. Try connecting from MongoDB Compass first');
  console.error('');
  console.error('📖 See MONGODB_TROUBLESHOOTING.md for detailed steps');
  process.exit(1);
});
