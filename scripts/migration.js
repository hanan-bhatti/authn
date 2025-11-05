const mongoose = require('mongoose');
const User = require('../models/User');

const fixSessionsIndex = async () => {
  try {
    await User.collection.dropIndex('sessions.sessionId_1');
    console.log('Dropped old sessions index.');
  } catch (error) {
    if (error.codeName !== 'IndexNotFound') {
      console.error('Error dropping old sessions index:', error.message);
    }
  }

  try {
    await User.collection.createIndex({ 'sessions.sessionId': 1 }, { sparse: true });
    console.log('Created new sparse sessions index.');
  } catch (error) {
    console.error('Error creating new sparse sessions index:', error.message);
  }
};

module.exports = { fixSessionsIndex };