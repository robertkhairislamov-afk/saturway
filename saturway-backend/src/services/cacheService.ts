// Redis Cache Service
import Redis from 'ioredis';
import { config } from '../config/index.js';

export class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: config.redis.maxRetries,
      retryStrategy: config.redis.retryStrategy,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Redis connected successfully');
    });

    this.redis.on('error', (err) => {
      this.isConnected = false;
      console.error('❌ Redis error:', err);
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      console.log('⚠️  Redis connection closed');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      // Non-fatal - app can work without cache
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete all keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Cache deletePattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string, ttl?: number): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const value = await this.redis.incr(key);
      if (ttl && value === 1) {
        // Set TTL only on first increment
        await this.redis.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    usedMemory?: string;
    totalKeys?: number;
  }> {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const info = await this.redis.info('memory');
      const dbSize = await this.redis.dbsize();

      // Parse used_memory from info string
      const match = info.match(/used_memory_human:([^\r\n]+)/);
      const usedMemory = match ? match[1] : 'unknown';

      return {
        connected: true,
        usedMemory,
        totalKeys: dbSize,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { connected: this.isConnected };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }

  /**
   * Helper: Create cache key
   */
  createKey(...parts: string[]): string {
    return parts.join(':');
  }

  /**
   * Helper: Cache with getter function
   */
  async getOrSet<T>(
    key: string,
    getter: () => Promise<T>,
    ttl: number = config.ai.cacheTTL
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Get fresh data
    const data = await getter();

    // Cache it
    await this.set(key, data, ttl);

    return data;
  }
}

export const cacheService = new CacheService();
