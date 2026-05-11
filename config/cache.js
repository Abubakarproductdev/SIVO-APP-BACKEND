const Redis = require('ioredis');

const memoryCache = new Map();
let redisClient = null;
let redisReady = false;

async function initCache() {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  redisClient.on('ready', () => {
    redisReady = true;
    console.log('Redis cache connected');
  });

  redisClient.on('end', () => {
    redisReady = false;
  });

  redisClient.on('error', () => {
    redisReady = false;
  });

  try {
    await redisClient.connect();
  } catch {
    redisReady = false;
    redisClient.disconnect();
    console.log('Redis unavailable; using in-memory cache fallback');
  }
}

async function getCache(key) {
  if (redisReady && redisClient) {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return cached.value;
}

async function setCache(key, value, ttlSeconds = 60) {
  if (redisReady && redisClient) {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return;
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

async function deleteCache(key) {
  if (redisReady && redisClient) {
    await redisClient.del(key);
    return;
  }

  memoryCache.delete(key);
}

module.exports = {
  initCache,
  getCache,
  setCache,
  deleteCache,
};
