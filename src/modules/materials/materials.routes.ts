import { Router } from 'express';
import multer from 'multer';
import { MaterialController } from './material.controller';
import { protect, requireOnboarding } from '@/middleware/auth.middleware';
import rateLimiterMiddleware from '@/middleware/rateLimiter.middleware';

const router = Router();
const controller = new MaterialController();

// Configure multer for file uploads
// Store in memory (buffer) for processing before R2 upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/webm',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// All routes require authentication
router.use(protect);
router.use(requireOnboarding);

/**
 * POST /api/study-boards/:studyBoardId/materials/generate
 * Generate AI notes and add to study board
 *
 * Body:
 * {
 *   "topicTitle": "Object Oriented Programming",
 *   "difficulty": "INTERMEDIATE",
 *   "subject": "Computer Science",
 *   "includeExamples": true,
 *   "maxDepth": 3
 * }
 */
router.post(
  '/study-boards/:studyBoardId/materials/generate',
  //   rateLimiter,
  controller.addGeneratedMaterial.bind(controller)
);

/**
 * POST /api/study-boards/:studyBoardId/materials/upload
 * Upload file and add to study board
 *
 * Form data:
 * - file: The file to upload
 * - title: Optional custom title
 */
router.post(
  '/study-boards/:studyBoardId/materials/upload',
  upload.single('file'), // Field name must be 'file'
  controller.uploadNoteMaterial.bind(controller)
);

/**
 * GET /api/study-boards/:studyBoardId/materials
 * List all materials in study board
 */
router.get(
  '/study-boards/:studyBoardId/materials',
  controller.listMaterials.bind(controller)
);

/**
 * GET /api/study-boards/:studyBoardId/materials/search?q=query
 * Search materials by content
 */
router.get(
  '/study-boards/:studyBoardId/materials/search',
  controller.searchMaterials.bind(controller)
);

/**
 * GET /api/materials/:materialId
 * Get single material with access details
 * For uploaded files, returns signed URL
 */
router.get('/materials/:materialId', controller.getMaterial.bind(controller));

/**
 * DELETE /api/materials/:materialId
 * Delete material (and R2 file if uploaded)
 */
router.delete(
  '/materials/:materialId',
  controller.deleteMaterial.bind(controller)
);

/**
 * PUT /api/study-boards/:studyBoardId/materials/reorder
 * Reorder materials in study board
 *
 * Body:
 * {
 *   "materialIds": ["id1", "id2", "id3"]
 * }
 */
router.put(
  '/study-boards/:studyBoardId/materials/reorder',
  controller.reorderMaterials.bind(controller)
);

export default router;
