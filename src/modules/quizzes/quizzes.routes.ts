import express from 'express';
import * as quizzesController from './quizzes.controller';
import { validate, validateUUID } from '@/middleware/validation.middleware';
import {
  protect,
  checkAILimit,
  requireOnboarding,
} from '@/middleware/auth.middleware';
import {
  aiGenerationLimiter,
  quizAttemptLimiter,
} from '@/middleware/rateLimiter.middleware';
import {
  generateQuizSchema,
  updateQuizSchema,
  submitQuizSchema,
  quizFiltersSchema,
} from './quizzes.validation';

const router = express.Router();

//  All routes require authentication and onboarding

router.use(protect);
router.use(requireOnboarding);

// Generate Quiz
// @route   POST /api/quizzes/generate/:boardId
// @desc    Generate quiz from study board material
// @access  Private
router.post(
  '/generate/:boardId',
  validateUUID('boardId'),
  checkAILimit,
  aiGenerationLimiter,
  validate(generateQuizSchema),
  quizzesController.generateQuiz
);

//  Get Quizzes
// @route   GET /api/quizzes/stats
// @desc    Get user quiz statistics
// @access  Private
router.get('/stats', quizzesController.getQuizStats);

// @route   GET /api/quizzes/board/:boardId
// @desc    Get all quizzes for a study board
// @access  Private
router.get(
  '/board/:boardId',
  validateUUID('boardId'),
  validate(quizFiltersSchema),
  quizzesController.getQuizzesByBoard
);

// @route   GET /api/quizzes/board/:boardId/leaderboard
// @desc    Get quiz leaderboard for a board
// @access  Private
router.get(
  '/board/:boardId/leaderboard',
  validateUUID('boardId'),
  quizzesController.getQuizLeaderboard
);

// @route   GET /api/quizzes/:quizId
// @desc    Get single quiz by ID
// @access  Private
router.get('/:quizId', validateUUID('quizId'), quizzesController.getQuizById);

// @route   POST /api/quizzes/:quizId/start
// @desc    Start quiz
// @access  Private
router.post(
  '/:quizId/start',
  validateUUID('quizId'),
  quizzesController.startQuiz
);

// @route   POST /api/quizzes/:quizId/submit
// @desc    Submit quiz answers
// @access  Private
router.post(
  '/:quizId/submit',
  validateUUID('quizId'),
  quizAttemptLimiter,
  validate(submitQuizSchema),
  quizzesController.submitQuiz
);

// @route   POST /api/quizzes/:quizId/retry
// @desc    Retry quiz (create new attempt)
// @access  Private
router.post(
  '/:quizId/retry',
  validateUUID('quizId'),
  quizzesController.retryQuiz
);

/**
 * Update & Delete
 */

// @route   PATCH /api/quizzes/:quizId
// @desc    Update quiz
// @access  Private
router.patch(
  '/:quizId',
  validateUUID('quizId'),
  validate(updateQuizSchema),
  quizzesController.updateQuiz
);

// @route   DELETE /api/quizzes/:quizId
// @desc    Delete quiz
// @access  Private
router.delete('/:quizId', validateUUID('quizId'), quizzesController.deleteQuiz);

export default router;
