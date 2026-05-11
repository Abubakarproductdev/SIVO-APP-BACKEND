const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      trim: true,
      default: '',
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    direction: {
      type: String,
      enum: ['sign-to-speech', 'speech-to-sign'],
      required: true,
    },
    source: {
      type: String,
      enum: ['sign', 'speech'],
      required: true,
    },
    timestamp: {
      type: String,
      default: '',
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    firebaseUid: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      default: 'Live Conversation',
      maxlength: 120,
    },
    type: {
      type: String,
      default: 'Live Conversation',
      trim: true,
    },
    previewText: {
      type: String,
      trim: true,
      default: '',
      maxlength: 240,
    },
    messages: {
      type: [messageSchema],
      validate: {
        validator(messages) {
          return Array.isArray(messages) && messages.length > 0;
        },
        message: 'Conversation must contain at least one message.',
      },
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ firebaseUid: 1, endedAt: -1 });
conversationSchema.index({ _id: 1, firebaseUid: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
