const express = require('express');
const User = require('../models/User');

const router = express.Router();

function serializeUser(user) {
  return {
    id: user._id.toString(),
    firebaseUid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName || '',
    phone: user.phone || '',
    photoURL: user.photoURL || '',
    settings: {
      notificationsEnabled: user.settings?.notificationsEnabled ?? true,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

router.post('/sync', async (req, res, next) => {
  try {
    const displayName = typeof req.body.displayName === 'string'
      ? req.body.displayName.trim().slice(0, 80)
      : undefined;

    const update = {
      email: req.auth.email,
      lastLoginAt: new Date(),
    };

    if (displayName) update.displayName = displayName;

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.auth.uid },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', async (req, res) => {
  res.json({ user: serializeUser(req.userRecord) });
});

router.patch('/me', async (req, res, next) => {
  try {
    const updates = {};

    if (typeof req.body.displayName === 'string') {
      updates.displayName = req.body.displayName.trim().slice(0, 80);
    }

    if (typeof req.body.phone === 'string') {
      updates.phone = req.body.phone.trim().slice(0, 30);
    }

    if (typeof req.body.notificationsEnabled === 'boolean') {
      updates['settings.notificationsEnabled'] = req.body.notificationsEnabled;
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.auth.uid },
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
