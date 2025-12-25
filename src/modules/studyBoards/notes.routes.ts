import { Router } from 'express';
import { validate, validateUUID } from '@/middleware/validation.middleware';
import {
  protect,
  checkAILimit,
  requireOnboarding,
} from '@/middleware/auth.middleware';
import { NotesController } from './notes.controller';

const router = Router()
const notesController = new NotesController();




// Generate notes endpoint
router.post(
  '/generate-notes',
  protect,
//   validateNoteRequest,
  notesController.generateNotes.bind(notesController)
);

// Get cached note
router.get(
  '/notes/:topicId',
  notesController.getCachedNote.bind(notesController)
);

// Export note as file
router.get(
  '/notes/:topicId/export',
  notesController.exportNote.bind(notesController)
);

// List all cached notes
router.get(
  '/notes',
  notesController.listNotes.bind(notesController)
);

export default router;