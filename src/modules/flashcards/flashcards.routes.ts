import express from 'express';
import * as flashcardsController from './flashcards.controller';
import { validate, validateUUID } from '@/middleware/validation.middleware';
import { protect, checkAILimit, requireOnboarding } from '@/middleware/auth.middleware';
import { aiGenerationLimiter } from '@/middleware/rateLimiter.middleware';
import { generateFlashcardSetSchema, updateFlashcardSchema, createManualFlashcardSchema, reviewFlashcardSchema, updateFlashcardSetSchema } from './flashcards.validation';

const router = express.Router();

// All routes require authentication and onboarding

router.use(protect);
router.use(requireOnboarding)


/**
 * Generate Flashcard Set
 */

// @route   POST /api/flashcards/generate
// @desc    Generate flashcard set from study board using AI
// @access  Private
router.post(
  '/generate',
  checkAILimit,
  aiGenerationLimiter,
  validate(generateFlashcardSetSchema),
  flashcardsController.generateFlashcardSet
);


/**
 * Flashcard Sets
 */

// @route   GET /api/flashcards/boards/:boardId/sets
// @desc    Get all flashcard sets for a board
// @access  Private
router.get(
  '/boards/:boardId/sets',
  validateUUID('boardId'),
  flashcardsController.getFlashcardSetsForBoard
);

// @route   GET /api/flashcards/sets/:setId
// @desc    Get flashcard set with all cards
// @access  Private
router.get(
  '/sets/:setId',
  validateUUID('setId'),
  flashcardsController.getFlashcardSet
);

// @route   PATCH /api/flashcards/sets/:setId
// @desc    Update flashcard set
// @access  Private
router.patch(
  '/sets/:setId',
  validateUUID('setId'),
  validate(updateFlashcardSetSchema),
  flashcardsController.updateFlashcardSet
);

// @route   DELETE /api/flashcards/sets/:setId
// @desc    Delete flashcard set
// @access  Private
router.delete(
  '/sets/:setId',
  validateUUID('setId'),
  flashcardsController.deleteFlashcardSet
);

/**
 * Study & Review
 */

// @route   GET /api/flashcards/sets/:setId/due
// @desc    Get due flashcards for review
// @access  Private
router.get(
  '/sets/:setId/due',
  validateUUID('setId'),
  flashcardsController.getDueFlashcards
);

// @route   POST /api/flashcards/cards/:cardId/review
// @desc    Review flashcard (submit answer)
// @access  Private
router.post(
  '/cards/:cardId/review',
  validateUUID('cardId'),
  validate(reviewFlashcardSchema),
  flashcardsController.reviewFlashcard
);

// @route   GET /api/flashcards/sets/:setId/stats
// @desc    Get flashcard set statistics
// @access  Private
router.get(
  '/sets/:setId/stats',
  validateUUID('setId'),
  flashcardsController.getFlashcardStats
);

// @route   GET /api/flashcards/sets/:setId/session-summary
// @desc    Get study session summary
// @access  Private
router.get(
  '/sets/:setId/session-summary',
  validateUUID('setId'),
  flashcardsController.getStudySessionSummary
);

/**
 * Manual Flashcard Management
 */

// @route   POST /api/flashcards/sets/:setId/cards
// @desc    Create manual flashcard
// @access  Private
router.post(
  '/sets/:setId/cards',
  validateUUID('setId'),
  validate(createManualFlashcardSchema),
  flashcardsController.createManualFlashcard
);

// @route   PATCH /api/flashcards/cards/:cardId
// @desc    Update flashcard
// @access  Private
router.patch(
  '/cards/:cardId',
  validateUUID('cardId'),
  validate(updateFlashcardSchema),
  flashcardsController.updateFlashcard
);

// @route   DELETE /api/flashcards/cards/:cardId
// @desc    Delete flashcard
// @access  Private
router.delete(
  '/cards/:cardId',
  validateUUID('cardId'),
  flashcardsController.deleteFlashcard
);

// @route   POST /api/flashcards/cards/:cardId/reset
// @desc    Reset flashcard progress
// @access  Private
router.post(
  '/cards/:cardId/reset',
  validateUUID('cardId'),
  flashcardsController.resetFlashcardProgress
);

export default router;
