import { Worker } from 'bullmq';
import { redis } from '@/config/redis';
import {
  materialsQueue,
  sectionQueue,
  quizzesQueue,
  generationProgressQueue,
} from '@/queues/queue';
import { MaterialService } from '@/modules/materials/material.service';
import quizzesService from '@/modules/quizzes/quizzes.service';
import logger from '@/utils/logger';
import { prisma } from '@/lib/prisma';
import { ComprehensiveNotesService } from '@/modules/noteGeneration/notes.service';
import { DatabaseService } from '@/modules/noteGeneration/dbService';
const materialService = new MaterialService();

const db = new DatabaseService();
/**
 * Material Generation Worker
 * Processes background jobs for generating study materials
 */
// export const materialGenerationWorker = new Worker(
//   'materials-generation',
//   async (job) => {
//     try {
//       const {
//         materialId,
//         userId,
//         studyBoardId,
//         topicTitle,
//         difficulty,
//         subject,
//         includeExamples,
//         maxDepth,
//       } = job.data;

//       logger.info(
//         `Starting material generation for job ${job.id}: ${topicTitle}`
//       );

//       // First, get the structure
//       const notesService = new ComprehensiveNotesService();
//       const structure = await notesService.analyzeTopicStructure(
//         topicTitle,
//         subject,
//         difficulty,
//         maxDepth
//       );

//       // Emit structure preview event
//       await job.updateProgress({
//         status: 'structure-analyzed',
//         structure,
//         totalSections: structure.sections.length,
//         totalNotes: structure.sections.reduce(
//           (sum, s) => sum + s.notes.length,
//           0
//         ),
//       });

//       // Store in progress cache
//       await redis.hset(
//         `generation:${materialId}`,
//         'structure',
//         JSON.stringify(structure)
//       );
//       const jobId = job.id!;
//       // Call the material service to perform the heavy lifting
//       const result = await materialService.addGeneratedMaterial({
//         userId,
//         studyBoardId,
//         topicTitle,
//         difficulty,
//         subject,
//         includeExamples,
//         maxDepth,
//         jobId,

//         onSectionProgress: async (sectionIndex, section, notesGenerated) => {
//           // Emit real-time progress
//           await job.updateProgress({
//             status: 'generating',
//             currentSection: sectionIndex + 1,
//             totalSections: structure.sections.length,
//             sectionTitle: section.title,
//             sectionDescription: section.description,
//             notesGenerated,
//             totalNotesInSection: section.notes.length,
//             percentComplete: Math.round(
//               ((sectionIndex + 1) / structure.sections.length) * 100
//             ),
//           });

//           // Store in cache for polling
//           await redis.hset(
//             `generation:${materialId}`,
//             'progress',
//             JSON.stringify({
//               currentSection: sectionIndex + 1,
//               totalSections: structure.sections.length,
//               sectionTitle: section.title,
//               notesGenerated,
//               percentComplete: Math.round(
//                 ((sectionIndex + 1) / structure.sections.length) * 100
//               ),
//               timestamp: new Date().toISOString(),
//             })
//           );
//         },
//       });

//       logger.info(
//         `Material generation completed successfully for job ${job.id}`
//       );

//       return {
//         success: true,
//         materialId,
//         result,
//       };
//     } catch (error) {
//       logger.error(`Material generation failed for job ${job.id}:`, error);
//       throw error;
//     }
//   },
//   {
//     connection: redis,
//     concurrency: 2, // Process 2 jobs concurrently
//   }
// );

export const structureWorker = new Worker(
  'materials-generation',
  async (job) => {
    const {
      materialId,
      userId,
      topicTitle,
      subject,
      difficulty,
      includeExamples,
      maxDepth,
    } = job.data;

    logger.info(`📐 Generating structure for: ${topicTitle}`);

    const notesService = new ComprehensiveNotesService();

    try {
      // 1. Analyze topic structure
      const structure = await notesService.analyzeTopicStructure(
        topicTitle,
        subject,
        difficulty,
        maxDepth
      );
      console.log('Structure after analysis', structure);
      // Convert difficulty to uppercase enum
      const difficultyEnum = difficulty.toUpperCase() as
        | 'BEGINNER'
        | 'INTERMEDIATE'
        | 'ADVANCED';

      // 2. Save structure to DB (optional but recommended)
      const topic = await db.createTopic({
        userId,
        title: topicTitle,
        difficulty: difficultyEnum,
        totalSections: structure.sections.length,
        status: 'GENERATING',
      });
      const topicId = topic.id;
      // await prisma.topic.create({
      //   data: {
      //     id: materialId,
      //     title: topicTitle,
      //     difficulty: difficultyEnum,
      //     totalSections: structure.sections.length,
      //     status: 'GENERATING',
      //   },
      // });

      // 3. Update material
      await prisma.material.update({
        where: { id: materialId },
        data: {
          generatedNoteId: topicId,
          content: `Structure ready (${structure.sections.length} sections)`,
        },
      });

      // 4. Cache structure for frontend preview
      await redis.hset(
        `generation:${materialId}`,
        'structure',
        JSON.stringify(structure)
      );

      // 5. Queue section jobs (🔥 PARALLEL MAGIC)
      await Promise.all(
        structure.sections.map((section, index) =>
          sectionQueue.add('generate-section', {
            materialId,
            topicId,
            topicTitle,
            sectionPlan: section,
            index,
            totalSections: structure.sections.length,
            difficulty,
            includeExamples,
          })
        )
      );

      // 6. Update progress
      await job.updateProgress({
        stage: 'sections-queued',
        totalSections: structure.sections.length,
      });

      logger.info(`✅ Structure complete. Sections queued.`);

      return { success: true };
    } catch (error) {
      logger.error('❌ Structure generation failed:', error);

      await prisma.material.update({
        where: { id: materialId },
        data: {
          status: 'FAILED',
          content: 'Structure generation failed',
        },
      });

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 3, // small (structure is heavy)
  }
);
export const sectionWorker = new Worker(
  'section-generation',
  async (job) => {
    const {
      materialId,
      topicId,
      sectionPlan,
      index,
      totalSections,
      difficulty,
      includeExamples,
    } = job.data;

    const notesService = new ComprehensiveNotesService();

    logger.info(`🧩 Generating section ${index + 1}: ${sectionPlan.title}`);
    try {
      // 2. Generate section content
      const section = await notesService.generateSection(
        topicId,
        sectionPlan,
        index,
        difficulty,
        includeExamples
      );
      logger.info(`✅ [Section ${index + 1}] Completed: ${sectionPlan.title}`);

      // 🔥 2. SAFE progress tracking (no race conditions)
      const completedSections = await prisma.section.count({
        where: {
          topicId,
          status: 'COMPLETED',
        },
      });

      const percentComplete = Math.round(
        (completedSections / totalSections) * 100
      );

      // 3. Store progress in Redis
      const progressKey = `generation:${materialId}`;

      await redis.hset(progressKey, {
        completedSections,
        totalSections,
        percentComplete,
        currentSection: sectionPlan.title,
        lastUpdated: new Date().toISOString(),
      });

      // 🔥 4. BullMQ progress update
      await job.updateProgress({
        stage: 'section-completed',
        sectionIndex: index + 1,
        totalSections,
        completedSections,
        percentComplete,
        sectionTitle: sectionPlan.title,
      });

      // 🔥 5. FINAL COMPLETION CHECK (DB-based, reliable)
      if (completedSections === totalSections) {
        logger.info(`🎉 All sections completed for material: ${materialId}`);

        await prisma.material.update({
          where: { id: materialId },
          data: {
            status: 'COMPLETED',
            content: 'All sections generated successfully',
          },
        });

        // Optional: clean cache
        await redis.del(progressKey);
      }

      return {
        success: true,
        sectionId: section.sectionId,
      };
    } catch (error) {
      logger.error(
        `❌ [Section ${index + 1}] Failed: ${sectionPlan.title}`,
        error
      );

      // 🔥 Mark section as failed (if it was created)
      try {
        await prisma.section.updateMany({
          where: {
            topicId,
            title: sectionPlan.title,
          },
          data: {
            status: 'FAILED',
          },
        });
      } catch (dbError) {
        logger.warn('Failed to mark section as FAILED', dbError);
      }

      // 🔥 Update material if too many failures (optional strategy)
      // You can add failure thresholds here later

      throw error; // BullMQ will retry
    }
  },
  {
    connection: redis,
    concurrency: 8, // 🔥 tune based on your server (start 5–10)
  }
);
// Event listeners for worker
structureWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

structureWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

structureWorker.on('error', (err) => {
  logger.error('Worker error:', err);
});

sectionWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

sectionWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

sectionWorker.on('error', (err) => {
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
