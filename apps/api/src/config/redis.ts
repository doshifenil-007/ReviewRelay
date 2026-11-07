import Redis from 'ioredis';
import { config } from './env';

class RedisManager {
  private client: Redis | null = null;
  private isConnected = false;
  // Fallback in-memory map for when local Redis is not running
  private inMemoryStore = new Map<string, { value: string; expiresAt: number }>();

  public getClient(): Redis | null {
    return this.client;
  }

  public async connect(): Promise<void> {
    try {
      this.client = new Redis(config.redis.url, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('[Redis] Connection failed.');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 1000);
        },
        lazyConnect: true,
      });

      this.client.on('error', () => {
        this.isConnected = false;
      });
      this.client.on('ready', () => {
        this.isConnected = true;
      });
      this.client.on('close', () => {
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
      console.log('[Redis] Connected successfully.');
    } catch {
      this.isConnected = false;
      if (config.env === 'production') {
        throw new Error('Redis is required in production; check the configured cache endpoint and credentials');
      }
      console.warn('[Redis] Not reachable, enabling local memory fallback store');
    }
  }

  public async setNxEx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (config.env === 'production' && (!this.isConnected || !this.client)) {
      throw new Error('Redis is unavailable; refusing to use the in-memory fallback in production');
    }
    if (this.isConnected && this.client) {
      try {
        const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch {
        if (config.env === 'production') throw new Error('Redis operation failed in production');
        console.warn('[Redis] Command error, using fallback');
      }
    }

    // Fallback store with TTL
    const now = Date.now();
    const existing = this.inMemoryStore.get(key);
    if (existing && existing.expiresAt > now) {
      return false; // Key exists, not set
    }

    this.inMemoryStore.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
    });
    return true; // Set successfully
  }

  public async incrWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    if (config.env === 'production' && (!this.isConnected || !this.client)) {
      throw new Error('Redis is unavailable; refusing to use the in-memory fallback in production');
    }
    if (this.isConnected && this.client) {
      try {
        const multi = this.client.multi();
        multi.incr(key);
        multi.expire(key, ttlSeconds);
        const results = await multi.exec();
        if (results && results[0] && !results[0][0]) {
          return results[0][1] as number;
        }
      } catch {
        if (config.env === 'production') throw new Error('Redis operation failed in production');
        console.warn('[Redis] Rate limiter error, using fallback');
      }
    }

    // Memory fallback
    const now = Date.now();
    const existing = this.inMemoryStore.get(key);
    if (!existing || existing.expiresAt <= now) {
      this.inMemoryStore.set(key, { value: '1', expiresAt: now + ttlSeconds * 1000 });
      return 1;
    }

    const currentCount = parseInt(existing.value, 10) + 1;
    this.inMemoryStore.set(key, { value: currentCount.toString(), expiresAt: existing.expiresAt });
    return currentCount;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}

export const redisService = new RedisManager();
