import Redis from 'ioredis';
import NodeCache from 'node-cache';

// In-memory fallback
const localCache = new NodeCache({ stdTTL: 3600 }); // 1 hour default

// Redis Client (optional - will fail gracefully if REDIS_URL is missing)
let redis: Redis | null = null;
const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 50, 2000);
      }
    });
    
    redis.on('error', (err) => {
      console.warn('Redis connection error, falling back to local cache:', err.message);
    });
  } catch (e) {
    console.warn('Could not initialize Redis:', e);
  }
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (redis && redis.status === 'ready') {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    }
    return localCache.get<T>(key) || null;
  },

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (redis && redis.status === 'ready') {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    }
    localCache.set(key, value, ttlSeconds);
  },

  async del(key: string): Promise<void> {
    if (redis && redis.status === 'ready') {
      await redis.del(key);
    }
    localCache.del(key);
  }
};
