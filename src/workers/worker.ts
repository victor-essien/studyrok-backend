import { Worker } from 'bullmq';
import { redis } from '@/config/redis';
import { materialsQueue, quizzesQueue } from '@/queues/queue';
import { MaterialService } from '@/modules/materials/material.service';
import quizzesService from '@/modules/quizzes/quizzes.service';
import logger from '@/utils/logger';

const materialService = new MaterialService();

/**
 * Material Generation Worker
 * Processes background jobs for generating study materials
 */
export const materialGenerationWorker = new Worker(
  'materials-generation',
  async (job) => {
    try {
      const {
        materialId,
        userId,
        studyBoardId,
        topicTitle,
        difficulty,
        subject,
        includeExamples,
        maxDepth,
      } = job.data;

      logger.info(
        `Starting material generation for job ${job.id}: ${topicTitle}`
      );

      // Call the material service to perform the heavy lifting
      const result = await materialService.addGeneratedMaterial({
        userId,
        studyBoardId,
        topicTitle,
        difficulty,
        subject,
        includeExamples,
        maxDepth,
      });

      logger.info(
        `Material generation completed successfully for job ${job.id}`
      );

      return {
        success: true,
        materialId,
        result,
      };
    } catch (error) {
      logger.error(`Material generation failed for job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 2, // Process 2 jobs concurrently
  }
);

// Event listeners for worker
materialGenerationWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

materialGenerationWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

materialGenerationWorker.on('error', (err) => {
  logger.error('Worker error:', err);
});

/**
 * Quiz Generation Worker
 * Processes background jobs for generating quizzes from sections
 */
const quizGenerationWorker = new Worker(
  'quizzes-generation',
  async (job) => {
    try {
      const { userId, sectionId, payload } = job.data as any;

      logger.info(
        `Starting quiz generation for job ${job.id}: section ${sectionId}`
      );

      const result = await quizzesService.generateQuizFromSection(
        userId,
        sectionId,
        payload
      );

      logger.info(`Quiz generation completed for job ${job.id}`);

      return { success: true, quizId: result?.id };
    } catch (error) {
      logger.error(`Quiz generation failed for job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 2,
  }
);

quizGenerationWorker.on('completed', (job) => {
  logger.info(`Quiz job ${job.id} completed`);
});

quizGenerationWorker.on('failed', (job, err) => {
  logger.error(`Quiz job ${job?.id} failed:`, err);
});

quizGenerationWorker.on('error', (err) => {
  logger.error('Quiz worker error:', err);
});
