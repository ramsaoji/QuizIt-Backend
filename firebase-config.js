const admin = require("firebase-admin");

// Check if Firebase is already initialized to avoid re-initialization
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // other configuration options
  });
}

module.exports = admin;
