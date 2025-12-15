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
import { processUploadedFile } from '@/middleware/fileUpload.middleware';
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
  '/',
  validate(createStudyBoardSchema),
  studyBoardsController.createBoard
);

// Add material
router.post(
  '/:boardId/material/topic',
  validateUUID('boardId'),
  checkAILimit,
  aiGenerationLimiter,
  validate(addTopicMaterialSchema),
  studyBoardsController.addTopicMaterial
);

router.post(
  '/:boardId/material/upload',
  validateUUID('boardId'),
  uploadLimiter,
  uploadSingleFile,
  handleUploadError,
  validateUploadedFile,
  processUploadedFile,
  studyBoardsController.addUploadMaterial
);

router.delete(
  '/:boardId/material',
  validateUUID('boardId'),
  studyBoardsController.removeMaterial
);

// Get Study Boards

router.get(
  '/',
  validate(studyBoardFiltersSchema),
  studyBoardsController.getAllBoards
);

router.get('/recent', studyBoardsController.getRecentBoards);

router.get('/favorites', studyBoardsController.getFavoriteBoards);

router.get('/stats', studyBoardsController.getBoardStats);

router.get(
  '/:boardId',
  validateUUID('boardId'),
  studyBoardsController.getBoardById
);

//  Update Study Boards

router.patch(
  '/:boardId',
  validateUUID('boardId'),
  validate(updateStudyBoardSchema),
  studyBoardsController.updateBoard
);

router.patch(
  '/:boardId/archive',
  validateUUID('boardId'),
  studyBoardsController.toggleArchive
);

router.patch(
  '/:boardId/favorite',
  validateUUID('boardId'),
  studyBoardsController.toggleFavorite
);

// @access  Private
router.patch(
  '/:boardId/study-time',
  validateUUID('boardId'),
  studyBoardsController.updateStudyTime
);

router.post(
  '/:boardId/duplicate',
  validateUUID('boardId'),
  studyBoardsController.duplicateBoard
);

router.delete(
  '/:boardId',
  validateUUID('boardId'),
  studyBoardsController.deleteBoard
);

export default router;
