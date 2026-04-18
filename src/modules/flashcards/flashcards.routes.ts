import express from 'express';
import * as flashcardsController from './flashcards.controller';
import { validate, validateUUID } from '@/middleware/validation.middleware';
import {
  protect,
  checkAILimit,
  requireOnboarding,
} from '@/middleware/auth.middleware';
import { aiGenerationLimiter } from '@/middleware/rateLimiter.middleware';
import {
  generateFlashcardSetSchema,
  updateFlashcardSchema,
  createManualFlashcardSchema,
  reviewFlashcardSchema,
  updateFlashcardSetSchema,
} from './flashcards.validation';

const router = express.Router();

// All routes require authentication and onboarding

router.use(protect);
router.use(requireOnboarding);

/**
 * Generate Flashcard Set
 */

// @route   POST /api/sections/:sectionId/generate-flashcard
// @desc    Generate flashcard set from study board using AI
// @access  Private
router.post(
  '/sections/:sectionId/generate-flashcard',
  checkAILimit,
  aiGenerationLimiter,
  validate(generateFlashcardSetSchema),
  flashcardsController.generateFlashcardFromSection
);

/**
 * Flashcard Sets
 */

// @route   GET /api/flashcards/studyboard/:studyboardId
// @desc    Get all flashcard sets for a study board
// @access  Private
router.get(
  '/flashcards/studyboard/:studyboardId',
  validateUUID('studyboardId'),
  flashcardsController.getFlashcardSetsForBoard
);

// @route   GET /api/flashcards/sets/:setId
// @desc    Get flashcard set with all cards
// @access  Private
router.get(
  '/flashcards/:flashcardId',
  validateUUID('flashcardId'),
  flashcardsController.getFlashcardSet
);



// @route   GET /api/flashcards/:flashcardId/status
// @desc    Get quiz status
// @access  Private
router.get(
  '/:flashcardId/status',
  validateUUID('flashcardId'),
  flashcardsController.getFlashcardStatus
);

// @route   DELETE /api/flashcards/:flashcardId
// @desc    Delete flashcard set
// @access  Private
router.delete(
  '/flashcards/:flashcardId',
  validateUUID('flashcardId'),
  flashcardsController.deleteFlashcardSet
);




export default router;
