const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const MONGODB_URI = process.env.MONGO_URL;

async function clearDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Dropping users collection...');
    await mongoose.connection.db.dropCollection('users');
    console.log('✅ Users collection dropped');

    console.log('👋 Disconnecting...');
    await mongoose.connection.close();
    console.log('✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearDatabase();
