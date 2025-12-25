// src/services/cache.service.ts
import NodeCache from 'node-cache';
import { NoteResult } from '@/modules/studyBoards/notes.services';
import logger from '@/utils/logger';

export class CacheService {
  private cache: NodeCache;

  constructor() {
    // Cache for 24 hours by default
    const ttl = parseInt(process.env.CACHE_TTL || '86400');

    this.cache = new NodeCache({
      stdTTL: ttl,
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false,
    });

    this.cache.on('expired', (key: string) => {
      logger.info(`Cache expired for key: ${key}`);
    });
  }

  async set(key: string, value: NoteResult): Promise<void> {
    try {
      this.cache.set(key, value);
      logger.info(`Cached notes for topic ID: ${key}`);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async get(key: string): Promise<NoteResult | null> {
    try {
      const value = this.cache.get<NoteResult>(key);
      return value || null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      this.cache.del(key);
      logger.info(`Deleted cache for topic ID: ${key}`);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async list(): Promise<
    Array<{
      topicId: string;
      topic: string;
      difficulty: string;
      generatedAt: string;
    }>
  > {
    try {
      const keys = this.cache.keys();
      const results: Array<{
        topicId: string;
        topic: string;
        difficulty: string;
        generatedAt: string;
      }> = [];

      for (const key of keys) {
        const value = this.cache.get<NoteResult>(key);
        if (value) {
          results.push({
            topicId: value.topicId,
            topic: value.topic,
            difficulty: value.difficulty,
            generatedAt: value.metadata.generatedAt,
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Cache list error:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      this.cache.flushAll();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  getStats() {
    return this.cache.getStats();
  }
}
