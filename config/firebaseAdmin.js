const admin = require('firebase-admin');

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'sivoapp1',
    });
  }

  return admin;
}

module.exports = { getFirebaseAdmin };
