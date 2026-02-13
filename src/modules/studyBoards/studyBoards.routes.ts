import express from 'express';
import * as studyBoardsController from './studyBoards.controller';
import { validate, validateUUID } from '@/middleware/validation.middleware';
import {
  protect,
  checkAILimit,
  requireOnboarding,
} from '@/middleware/auth.middleware';
import {
  uploadSingleFile,
  handleUploadError,
  validateUploadedFile,
} from '@/middleware/upload.middleware';
import {
  uploadLimiter,
  aiGenerationLimiter,
} from '@/middleware/rateLimiter.middleware';
import {
  createStudyBoardSchema,
  addTopicMaterialSchema,
  updateStudyBoardSchema,
  studyBoardFiltersSchema,
} from './studyBoards.validation';

const router = express.Router();

// All routes require authentication and onboarding

router.use(protect);
router.use(requireOnboarding);

//  Create Study board
router.post(
  '/studyboards',
  validate(createStudyBoardSchema),
  studyBoardsController.createBoard
);

// Get Study Boards

router.get(
  '/studyboards',
  validate(studyBoardFiltersSchema),
  studyBoardsController.getAllBoards
);

router.get('/studyboards/recent', studyBoardsController.getRecentBoards);

router.get(
  '/studyboards/:studyboardId/stats',
  studyBoardsController.getBoardStats
);

router.get(
  '/studyboards/:studyboardId',
  validateUUID('boardId'),
  studyBoardsController.getBoardById
);

//  Update Study Boards

router.patch(
  '/studyboards/:studyboardId',
  validateUUID('boardId'),
  validate(updateStudyBoardSchema),
  studyBoardsController.updateBoard
);

router.patch(
  '/studyboards/:studyboardId/archive',
  validateUUID('boardId'),
  studyBoardsController.toggleArchive
);

router.patch(
  '/studyboards/:studyboardId/favorite',
  validateUUID('studyboardId'),
  studyBoardsController.toggleFavorite
);

// @access  Private
router.patch(
  '/studyboards/:studyboardId/studytime',
  validateUUID('boardId'),
  studyBoardsController.updateStudyTime
);

router.delete(
  '/studyboards/:studyboardId',
  validateUUID('boardId'),
  studyBoardsController.deleteBoard
);

export default router;
