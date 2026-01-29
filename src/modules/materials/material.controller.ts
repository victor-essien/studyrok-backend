import { Request, Response, NextFunction } from 'express';
import { MaterialService } from './material.service';
import logger from '@/utils/logger';
import { AppError, AuthenticationError } from '@/utils/errors';

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
      const studyBoardId = studyboardId
      const material = await this.materialService.addGeneratedMaterial({
        userId,
        studyBoardId,
        topicTitle,
        difficulty,
        subject,
        includeExamples,
        maxDepth,
      });

      res.status(201).json({
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
      const studyBoardId = studyboardId

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
}
