import { Worker } from 'bullmq';
import { redis } from '@/config/redis';
import { materialsQueue } from '@/queues/queue';
import { MaterialService } from '@/modules/materials/material.service';
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
