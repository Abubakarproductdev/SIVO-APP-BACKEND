const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: 30,
    },
    photoURL: {
      type: String,
      trim: true,
      default: '',
    },
    settings: {
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
