import NodeCache from 'node-cache';

// In-memory cache
const localCache = new NodeCache({ stdTTL: 3600 }); // 1 hour default

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    return localCache.get<T>(key) || null;
  },

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    localCache.set(key, value, ttlSeconds);
  },

  async del(key: string): Promise<void> {
    localCache.del(key);
  }
};
