import { Redis } from 'ioredis';

export const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  console.log('🟢 Redis connected (TCP connection established)');
});

redis.on('ready', () => {
  console.log('✅ Redis ready to accept commands');
});

redis.on('error', (err) => {
  console.error('🔴 Redis connection error:', err);
});

redis.on('close', () => {
  console.warn('🟠 Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('♻️ Redis reconnecting...');
});
