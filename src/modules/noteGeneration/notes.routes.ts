import { Router } from 'express';
import { ComprehensiveNotesController } from './notes.controller';
import rateLimiterMiddleware from '@/middleware/rateLimiter.middleware';

const router = Router();
const controller = new ComprehensiveNotesController();

// ==================== GENERATION ENDPOINTS ====================

/**
 * POST /api/v2/generate-comprehensive
 * Generate comprehensive study materials
 *
 * Body:
 * {
 *   "title": "Object Oriented Programming",
 *   "userId": "uuid-optional",
 *   "difficulty": "intermediate",
 *   "includeExamples": true,
 *   "maxDepth": 3
 * }
 */
router.post(
  '/generate-comprehensive',
  //   rateLimiterMiddleware,
  controller.generateComprehensive.bind(controller)
);

/**
 * POST /api/v2/notes/:noteId/regenerate
 * Regenerate a specific note
 */
router.post(
  '/notes/:noteId/regenerate',
  //   rateLimiter,
  controller.regenerateNote.bind(controller)
);

// ==================== RETRIEVAL ENDPOINTS ====================

/**
 * GET /api/v2/topics
 * List all topics
 * Query params: userId, limit, offset
 */
router.get('/topics', controller.listTopics.bind(controller));

/**
 * GET /api/v2/topics/:topicId
 * Get complete topic with all sections and notes
 */
router.get('/topics/:topicId', controller.getTopic.bind(controller));

/**
 * GET /api/v2/topics/:topicId/status
 * Check generation status
 */
router.get(
  '/topics/:topicId/status',
  controller.getTopicStatus.bind(controller)
);

/**
 * GET /api/v2/topics/:topicId/sections/:sectionId
 * Get a specific section with notes
 */
router.get(
  '/topics/:topicId/sections/:sectionId',
  controller.getSection.bind(controller)
);

/**
 * GET /api/v2/notes/:noteId
 * Get a specific note with content and concepts
 */
router.get('/notes/:noteId', controller.getNote.bind(controller));

/**
 * GET /api/v2/topics/:topicId/concepts
 * Get all key concepts from a topic
 */
router.get(
  '/topics/:topicId/concepts',
  controller.getTopicConcepts.bind(controller)
);

// ==================== EXPORT ENDPOINTS ====================

/**
 * GET /api/v2/topics/:topicId/export
 * Export entire topic as markdown file
 */
router.get('/topics/:topicId/export', controller.exportTopic.bind(controller));

// ==================== PROGRESS TRACKING ====================

/**
 * POST /api/v2/progress
 * Track user progress on a note
 *
 * Body:
 * {
 *   "userId": "uuid",
 *   "noteId": "uuid",
 *   "status": "completed",
 *   "progressPercentage": 100,
 *   "timeSpent": 300
 * }
 */
router.post('/progress', controller.trackProgress.bind(controller));

/**
 * GET /api/v2/users/:userId/progress/:topicId
 * Get user's progress for a topic
 */
router.get(
  '/users/:userId/progress/:topicId',
  controller.getUserProgress.bind(controller)
);

export default router;
