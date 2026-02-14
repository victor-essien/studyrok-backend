import { Queue } from 'bullmq';
import { redis } from '@/config/redis';

export const notesQueue = new Queue('notes-generation', {
  connection: redis,
});

export const materialsQueue = new Queue('materials-generation', {
  connection: redis,
});


export const quizzesQueue = new Queue('quizzes-generation', {
  connection: redis,
});