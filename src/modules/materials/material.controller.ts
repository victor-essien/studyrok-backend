import { Request, Response, NextFunction } from 'express';
import { MaterialService } from './material.service';
import logger from '@/utils/logger';
import { AppError, AuthenticationError } from '@/utils/errors';
import { notesQueue, materialsQueue } from '@/queues/queue';
import { redis } from '@/config/redis';
import { sendSuccess, sendError } from '@/utils/apiResponse';
import { prisma } from '@/lib/prisma';
export class MaterialController {
  private materialService: MaterialService;

  constructor() {
    this.materialService = new MaterialService();
  }

  /**
   * POST /api/study-boards/:studyboardId/materials/generate
   * Add generated material (AI notes)
   */
async addGeneratedMaterial(req: Request, res: Response, next: NextFunction) {
try {
   const {studyboardId} = req.params;
   const { topicTitle, difficulty, subject, includeExamples, maxDepth } = req.body
   const userId = req.user?.id;

   if (!userId) {
    throw new AuthenticationError("Authentication Required");
   }
   if (!studyboardId) {
    throw new AppError('Studyboard required', 400);
   }

    if (!topicTitle) {
        throw new AppError('Topic title is required', 400);
      }

    const result = await this.materialService.addGeneratedMaterial({
      userId,
      studyBoardId: studyboardId,
      topicTitle,
      difficulty,
      subject,
      includeExamples,
      maxDepth
    })

  res.status(202).json({
        success: true,
        message: 'Material generation processing',
        result
      });
} catch (error) {
   next(error);
}
}
  async aaddGeneratedMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      const { studyboardId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AuthenticationError('Authentication Required');
      }

      if (!studyboardId) {
        throw new AppError('Studyboard required', 400);
      }

      const { topicTitle, difficulty, subject, includeExamples, maxDepth } =
        req.body;

      if (!topicTitle) {
        throw new AppError('Topic title is required', 400);
      }

      logger.info(`Adding generated material: ${topicTitle}`);
      const studyBoardId = studyboardId;

      // Create initial material placeholder
      const material = await this.materialService.createMaterialPlaceholder(
        userId,
        studyBoardId,
        topicTitle,
        difficulty
      );

      // Queue heavy processing work to Redis for background processing
      await materialsQueue.add(
        'generate-material',
        {
          materialId: material.id,
          userId,
          studyBoardId,
          topicTitle,
          difficulty,
          subject,
          includeExamples,
          maxDepth,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        }
      );

      res.status(202).json({
        success: true,
        message: 'Material generation started',
        data: material,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/study-boards/:studyboardId/materials/upload
   * Upload note material (file)
   */
  async uploadNoteMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      const { studyboardId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const file = req.file; // Multer middleware provides this

      if (!file) {
        throw new AppError('File is required', 400);
      }
      if (!studyboardId) {
        throw new AppError('Studyboard required', 400);
      }

      const { title } = req.body;

      logger.info(`Uploading material: ${file.originalname}`);
      const studyBoardId = studyboardId;

      const material = await this.materialService.uploadNoteMaterial({
        userId,
        studyBoardId,
        file,
        title,
      });

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: material,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/study-boards/:studyboardId/materials
   * List all materials in studyboard
   */
  async listMaterials(req: Request, res: Response, next: NextFunction) {
    try {
      const { studyboardId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }
      if (!studyboardId) {
        throw new AppError('Studyboard required', 400);
      }
      const materials = await this.materialService.listMaterials(
        userId,
        studyboardId
      );

      res.json({
        success: true,
        data: materials,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/materials/:materialId
   * Get single material with access URL
   */
  async getMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      const { materialId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }
      if (!materialId) {
        throw new AppError('Material required', 400);
      }

      const material = await this.materialService.getMaterialWithAccess(
        userId,
        materialId
      );

      res.json({
        success: true,
        data: material,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/materials/:materialId
   * Delete material
   */
  async deleteMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      const { materialId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }
      if (!materialId) {
        throw new AppError('Studyboard required', 400);
      }

      await this.materialService.deleteMaterial(userId, materialId);

      res.json({
        success: true,
        message: 'Material deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/study-boards/:studyboardId/materials/search
   * Search materials
   */
  async searchMaterials(req: Request, res: Response, next: NextFunction) {
    try {
      const { studyboardId } = req.params;
      const { q } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }
      if (!studyboardId) {
        throw new AppError('Studyboard required', 400);
      }

      if (!q || typeof q !== 'string') {
        throw new AppError('Search query is required', 400);
      }

      const materials = await this.materialService.searchMaterials(
        userId,
        studyboardId,
        q
      );

      res.json({
        success: true,
        data: materials,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/study-boards/:studyboardId/materials/reorder
   * Reorder materials
   */
  async reorderMaterials(req: Request, res: Response, next: NextFunction) {
    try {
      const { studyboardId } = req.params;
      const { materialIds } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }
      if (!studyboardId) {
        throw new AppError('Studyboard required', 400);
      }

      if (!Array.isArray(materialIds)) {
        throw new AppError('materialIds must be an array', 400);
      }

      await this.materialService.reorderMaterials(
        userId,
        studyboardId,
        materialIds
      );

      res.json({
        success: true,
        message: 'Materials reordered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/generated-notes/:topicId
   * Get a generated note by ID with full details including sections and notes
   */
  async getGeneratedNoteById(req: Request, res: Response, next: NextFunction) {
    try {
      const { topicId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }
      if (!topicId) {
        throw new AppError('Topic ID is required', 400);
      }

      const generatedNote = await this.materialService.getGeneratedNoteById(
        userId,
        topicId
      );

      res.json({
        success: true,
        data: generatedNote,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/generated-notes/:topicId/sections
   * Get all sections of a generated note
   */
  async getGeneratedNoteSections(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { topicId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }
      if (!topicId) {
        throw new AppError('Topic ID is required', 400);
      }

      const sections = await this.materialService.getGeneratedNoteSections(
        userId,
        topicId
      );

      res.json({
        success: true,
        data: sections,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/generated-notes/:topicId/concepts
   * Get all concepts of a generated note
   */
  async getGeneratedNoteConcepts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { topicId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }
      if (!topicId) {
        throw new AppError('Topic ID is required', 400);
      }

      const concepts = await this.materialService.getGeneratedNoteConcepts(
        userId,
        topicId
      );

      res.json({
        success: true,
        data: concepts,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sections/:sectionId/notes
   * Get all individual notes in a section
   */
  async getNotesInSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { sectionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Authentication required', 401);
      }
      if (!sectionId) {
        throw new AppError('Section ID is required', 400);
      }

      const notesData = await this.materialService.getNotesInSection(
        userId,
        sectionId
      );

      res.json({
        success: true,
        data: notesData,
      });
    } catch (error) {
      next(error);
    }
  }


  /**
 * GET /api/materials/:materialId/generation-progress
 * Get real-time generation progress for a material
 */
async getMaterialGenerationProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const { materialId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }
    if (!materialId) {
      throw new AppError('Material ID is required', 400);
    }

    // Verify user owns this material
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: { studyBoard: true },
    });

    if (!material) {
      throw new AppError('Material not found', 404);
    }

    if (material.userId !== userId && material.studyBoard.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Get progress from Redis cache
    const progressData = await redis.hgetall(`generation:${materialId}`);

    if (!progressData || Object.keys(progressData).length === 0) {
      return res.json({
        success: true,
        data: {
          materialId,
          status: 'not-started',
          message: 'No generation in progress',
        },
      });
    }

    // Parse stored data
    const structure = progressData.structure ? JSON.parse(progressData.structure) : null;
    const progress = progressData.progress ? JSON.parse(progressData.progress) : null;

    res.json({
      success: true,
      data: {
        materialId,
        structure: structure ? {
          sections: structure.sections,
          totalSections: structure.sections?.length || 0,
          totalNotes: structure.sections?.reduce((sum: number, s: any) => sum + s.notes.length, 0) || 0,
        } : null,
        currentProgress: progress || {},
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/matjobs/:jobId
 * @desc    Cancel material generation job
 * @access  Private
 */
async cancelJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return sendError(res, 400, 'jobId is required');
    }

    const result = await this.materialService.cancelJob(jobId);

    sendSuccess(res, 200, 'Job cancelled successfully', result);
  } catch (error) {
    next(error)
  }
}


}
