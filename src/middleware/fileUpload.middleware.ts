import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '@utils/asyncHandler';
import fileProcessorService from '@services/storage/fileProcessor.service';
import r2StorageService from '@services/storage/r2.service';
import { AuthRequest } from '@/types/auth.types';
import { FileProcessingError } from '@utils/errors';
import { logger } from '@utils/logger';

/**
 * Process uploaded file middleware
 * Extracts text and uploads to R2 storage
 */
export const processUploadedFile = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const file = req.file;

    if (!file) {
      return next();
    }

    const userId = req.user!.id;

    logger.info(
      `Processing uploaded file: ${file.originalname} for user: ${userId}`
    );

    try {
      // Step 1: Extract text from file
      const extractionResult = await fileProcessorService.processFile(
        file,
        userId
      );

      // Step 2: Validate extracted text
      const cleanedText = fileProcessorService.cleanText(extractionResult.text);
      fileProcessorService.validateExtractedText(cleanedText, 100);

      // Step 3: Get text statistics
      const textStats = fileProcessorService.getTextStats(cleanedText);

      // Step 4: Upload to R2 storage
      const uploadResult = await r2StorageService.uploadFile(file, userId);

      // Step 5: Attach data to request for controller
      (req as any).extractedText = cleanedText;
      (req as any).textStats = textStats;
      (req as any).fileUrl = uploadResult.url;
      (req as any).fileKey = uploadResult.key;
      (req as any).pageCount = extractionResult.pageCount;

      logger.info(
        `File processing completed: ${file.originalname} - ${textStats.wordCount} words extracted`
      );

      next();
    } catch (error) {
      logger.error('File processing failed:', error);

      if (error instanceof FileProcessingError) {
        return next(error);
      }

      next(new FileProcessingError('Failed to process uploaded file'));
    }
  }
);

/**
 * Delete uploaded file from storage
 * Used when deleting a study board
 */
export const deleteStoredFile = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { fileKey } = req.body;
    const userId = req.user!.id;

    if (!fileKey) {
      return next();
    }

    try {
      await r2StorageService.deleteFile(fileKey, userId);
      logger.info(`File deleted from storage: ${fileKey}`);
      next();
    } catch (error) {
      logger.error('File deletion failed:', error);
      // Don't throw error, just log it
      next();
    }
  }
);
