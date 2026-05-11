const express = require('express');
const Conversation = require('../models/Conversation');
const { getCache, setCache, deleteCache } = require('../config/cache');

const router = express.Router();
const HISTORY_TTL_SECONDS = Number(process.env.HISTORY_CACHE_TTL_SECONDS || 60);

function cacheKey(firebaseUid) {
  return `history:${firebaseUid}`;
}

function serializeConversation(conversation) {
  return {
    id: conversation._id.toString(),
    type: conversation.type,
    title: conversation.title,
    previewText: conversation.previewText,
    messages: conversation.messages.map((message) => ({
      id: message.clientId || `${conversation._id}-${message.createdAt?.getTime?.() || ''}`,
      text: message.text,
      direction: message.direction,
      source: message.source,
      timestamp: message.timestamp,
      createdAt: message.createdAt,
    })),
    date: conversation.endedAt,
    startedAt: conversation.startedAt,
    endedAt: conversation.endedAt,
    createdAt: conversation.createdAt,
  };
}

function normalizeMessage(message) {
  const direction = message.direction === 'speech-to-sign' ? 'speech-to-sign' : 'sign-to-speech';
  const text = typeof message.text === 'string' ? message.text.trim() : '';

  if (!text) return null;

  return {
    clientId: typeof message.id === 'string' ? message.id.slice(0, 80) : '',
    text: text.slice(0, 2000),
    direction,
    source: direction === 'speech-to-sign' ? 'speech' : 'sign',
    timestamp: typeof message.timestamp === 'string' ? message.timestamp.slice(0, 40) : '',
    createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
  };
}

router.get('/', async (req, res, next) => {
  try {
    const key = cacheKey(req.auth.uid);
    const cached = await getCache(key);

    if (cached) {
      return res.json({ conversations: cached, cached: true });
    }

    const conversations = await Conversation.find({ firebaseUid: req.auth.uid })
      .sort({ endedAt: -1, createdAt: -1 })
      .limit(100)
      .lean(false);

    const serialized = conversations.map(serializeConversation);
    await setCache(key, serialized, HISTORY_TTL_SECONDS);

    res.json({ conversations: serialized, cached: false });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      firebaseUid: req.auth.uid,
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    res.json({ conversation: serializeConversation(conversation) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const messages = Array.isArray(req.body.messages)
      ? req.body.messages.map(normalizeMessage).filter(Boolean)
      : [];

    if (messages.length === 0) {
      return res.status(400).json({ error: 'At least one valid message is required.' });
    }

    const firstMessage = messages[0];
    const conversation = await Conversation.create({
      user: req.userRecord._id,
      firebaseUid: req.auth.uid,
      title: 'Live Conversation',
      type: 'Live Conversation',
      previewText: firstMessage.text.slice(0, 240),
      messages,
      startedAt: req.body.startedAt ? new Date(req.body.startedAt) : messages[0].createdAt,
      endedAt: req.body.endedAt ? new Date(req.body.endedAt) : new Date(),
    });

    await deleteCache(cacheKey(req.auth.uid));

    res.status(201).json({ conversation: serializeConversation(conversation) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
