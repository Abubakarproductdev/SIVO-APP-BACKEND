const { verifyFirebaseIdToken } = require('../config/firebaseVerifier');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token.' });
    }

    const decodedToken = await verifyFirebaseIdToken(token);
    const email = decodedToken.email || req.body?.email;

    if (!email) {
      return res.status(401).json({ error: 'Authenticated user is missing an email address.' });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: decodedToken.uid },
      {
        $set: {
          email,
          photoURL: decodedToken.picture || '',
          lastLoginAt: new Date(),
        },
        $setOnInsert: {
          displayName: decodedToken.name || '',
          settings: { notificationsEnabled: true },
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    req.auth = {
      uid: decodedToken.uid,
      email,
      name: decodedToken.name || '',
    };
    req.userRecord = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authorization token.' });
  }
}

module.exports = { requireAuth };
