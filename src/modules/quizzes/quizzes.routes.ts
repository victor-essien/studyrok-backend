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

// @route   GET /api/quizzes/:quizId
// @desc    Get single quiz by ID
// @access  Private
router.get('/:quizId', validateUUID('quizId'), quizzesController.getQuizById);

// @route   GET /api/quizzes/:quizId/result
// @desc    Get quiz result with detailed breakdown
// @access  Private
router.get(
  '/:quizId/result',
  validateUUID('quizId'),
  quizzesController.getQuizResult
);

// @route   POST /api/sections/:sectionId/generate-quiz
// @desc    Generate quiz from generated note section
// @access  Private
router.post(
  '/sections/:sectionId/generate-quiz',
  validateUUID('sectionId'),
  checkAILimit,
  aiGenerationLimiter,
  validate(generateQuizSchema),
  quizzesController.generateQuizFromSection
);

// @route   DELETE /api/quizzes/:quizId
// @desc    Delete quiz
// @access  Private
router.delete('/:quizId', validateUUID('quizId'), quizzesController.deleteQuiz);

export default router;
