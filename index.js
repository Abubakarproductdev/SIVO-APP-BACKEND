require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/db');
const { initCache } = require('./config/cache');
const { requireAuth } = require('./middleware/auth');
const userRoutes = require('./routes/userRoutes');
const conversationRoutes = require('./routes/conversationRoutes');

const app = express();
const port = process.env.PORT || process.env.API_PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/users', requireAuth, userRoutes);
app.use('/api/conversations', requireAuth, conversationRoutes);

app.use((error, req, res, next) => {
  console.error(error);

  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid request id.' });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message });
  }

  res.status(500).json({ error: 'Server error. Please try again.' });
});

async function start() {
  await connectDatabase();
  await initCache();

  app.listen(port, '0.0.0.0', () => {
    console.log(`SIVO API listening on http://0.0.0.0:${port}`);
  });
}

start().catch((error) => {
  console.error('API failed to start:', error.message);
  process.exit(1);
});
