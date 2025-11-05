const admin = require('firebase-admin');

let firebaseInitialized = false;

const initializeFirebase = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      console.log('✅ Firebase initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase:', error.message);
    }
  }
};

const validateFirebaseConfig = () => {
  return firebaseInitialized;
};

module.exports = { initializeFirebase, validateFirebaseConfig };