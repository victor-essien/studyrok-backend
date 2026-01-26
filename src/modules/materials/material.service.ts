import { prisma } from '@/lib/prisma';
import { ComprehensiveNotesService } from '../noteGeneration/notes.service';
import { R2Service } from '@/services/storage/r2.service';
import logger from '@/utils/logger';
import { AppError, AuthorizationError, NotFoundError } from '@/utils/errors';
import { TextExtractionService } from '@/services/textExtraction.service';

interface AddGeneratedMaterialRequest {
  userId: string;
  studyBoardId: string;
  topicTitle: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  subject?: string;
  includeExamples?: boolean;
  maxDepth?: number;
}

interface UploadNoteMaterialRequest {
  userId: string;
  studyBoardId: string;
  file: Express.Multer.File; // File from multer
  title?: string; // Optional custom title
}
interface MaterialResponse {
  id: string;
  studyBoardId: string;
  title: string;
  type: 'GENERATED_NOTE' | 'UPLOADED_NOTE';
  content?: string;
  url?: string;
  status: 'GENERATING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  metadata?: any;
}

export class MaterialService {
  private notesService: ComprehensiveNotesService;
  private r2Service: R2Service;
  private textExtraction: TextExtractionService;

  constructor() {
    this.notesService = new ComprehensiveNotesService();
    this.r2Service = new R2Service();
    this.textExtraction = new TextExtractionService();
  }

  // Add Generated Material

  async addGeneratedMaterial(
    request: AddGeneratedMaterialRequest
  ): Promise<MaterialResponse> {
    const {
      userId,
      studyBoardId,
      topicTitle,
      difficulty = 'INTERMEDIATE',
      subject,
      includeExamples = true,
      maxDepth = 3,
    } = request;

    logger.info(`Adding generated material to study board: ${studyBoardId}`);

    // Verify studyboard ownership
    const studyBoard = await this.verifyStudyBoardAccess(userId, studyBoardId);

    // Get next order position for this studyboard
    const nextOrder = await this.getNextMaterialOrder(studyBoardId);

    // Create Material placeholder
    const material = await prisma.material.create({
      data: {
        userId,
        studyBoardId,
        title: topicTitle,
        type: 'GENERATED_TOPIC',
        order: nextOrder,
      },
    });

    try {
      // Start Comprehensive note generation
      const topicResult = await this.notesService.generateComprehensiveTopic({
        title: topicTitle,
        userId,
        
        difficulty: difficulty.toLowerCase() as
          | 'beginner'
          | 'intermediate'
          | 'advanced',
        includeExamples,
        maxDepth,
      });

      await prisma.material.update({
        where: { id: material.id },
        data: {
          generatedNoteId: topicResult.topicId,
          // Store metadata for quick access
          content: `Generated ${topicResult.totalNotes} notes across ${topicResult.sections.length} sections`,
        },
      });
      // Update study board statistics
      await prisma.studyBoard.update({
        where: { id: studyBoardId },
        data: {
          aiGenerations: { increment: 1 },
          tokensUsed: {
            increment: this.estimateTokensUsed(topicResult.totalNotes),
          },
        },
      });
      logger.info(`Generated material created successfully: ${material.id}`);

      return {
        id: material.id,
        studyBoardId,
        title: topicTitle,
        type: 'GENERATED_NOTE',
        content: `${topicResult.totalNotes} notes in ${topicResult.sections.length} sections`,
        status: 'COMPLETED',
        metadata: {
          topicId: topicResult.topicId,
          totalSections: topicResult.sections.length,
          totalNotes: topicResult.totalNotes,
          estimatedReadTime: topicResult.estimatedTime,
          difficulty,
        },
      };
    } catch (error) {
      // If generation fails, mark material as failed
      await prisma.material.update({
        where: { id: material.id },
        data: {
          content: 'Generation failed',
        },
      });

      logger.error('Failed to generate material:', error);
      throw new AppError('Failed to generate notes', 500);
    }
  }

  // Upload NOTE material

  async uploadNoteMaterial(
    request: UploadNoteMaterialRequest
  ): Promise<MaterialResponse> {
    const { userId, studyBoardId, file, title } = request;
    logger.info(`Uploading note material to study board: ${studyBoardId}`);

    // Verify studyboard ownership
    const studyBoard = await this.verifyStudyBoardAccess(userId, studyBoardId);

    // Validate file
    this.validateUploadedFile(file);

    // Generate unique R2 key
    const fileExtension = this.getFileExtension(file.originalname);
    const uniqueId = this.generateUniqueId();
    const r2Key = `studyboards/${studyBoardId}/uploads/${uniqueId}/${file.originalname}`;

    try {
      // Upload to R2
      logger.info(`Uploading file to R2: ${r2Key}`);
      const r2Result = await this.r2Service.uploadFile({
        key: r2Key,
        file: file.buffer,
        contentType: file.mimetype,
        metadata: {
          studyBoardId,
          userId,
          originalName: file.originalname,
        },
      });

      // Create UploadedNote record
      const uploadedNote = await prisma.uploadedNote.create({
        data: {
          studyBoardId,
          userId,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size.toString(),
          r2Key: r2Key,
          r2Url: r2Result.publicUrl || '',
          processingStatus: 'PROCESSING',
        },
      });
      // Get next order position
      const nextOrder = await this.getNextMaterialOrder(studyBoardId);

      const material = await prisma.material.create({
        data: {
          userId,
          studyBoardId,
          title: title || file.originalname,
          type: 'UPLOADED_NOTE',
          uploadedNoteId: uploadedNote.id,
          url: r2Result.publicUrl ?? '',
        },
      });

      // Extract text in background
      this.extractTextInBackground(uploadedNote.id, file, r2Key);

      // Update study board count
      await prisma.studyBoard.update({
        where: { id: studyBoardId },
        data: {
          // Increment appropriate counter based on file type
          ...(this.isVideo(file.mimetype) && { videosCount: { increment: 1 } }),
        },
      });

      logger.info(`Uploaded material created successfully: ${material.id}`);

      return {
        id: material.id,
        studyBoardId,
        title: title || file.originalname,
        type: 'UPLOADED_NOTE',
        url: r2Result.publicUrl || '',
        status: 'PROCESSING',
        metadata: {
          uploadedNoteId: uploadedNote.id,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          r2Key,
        },
      };
    } catch (error) {
      logger.error('Failed to upload note material:', error);
      throw new AppError('Failed to upload note material', 500);
    }
  }

  //   Get Material with Access Url

  async getMaterialWithAccess(
    userId: string,
    materialId: string
  ): Promise<any> {
    // Get material
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        generatedNote: {
          include: {
            sections: {
              include: {
                notes: true,
              },
            },
          },
        },
        uploadedNote: true,
        studyBoard: true,
      },
    });

    if (!material) {
      throw new NotFoundError('Material not found');
    }
    // Verify access
    if (material.userId !== userId && material.studyBoard.userId !== userId) {
      throw new AuthorizationError('Access denied');
    }
    // If uploaded note, generate signed URL
    if (material.type === 'UPLOADED_NOTE' && material.uploadedNote) {
      const signedUrl = await this.r2Service.getSignedUrl(
        material.uploadedNote.r2Key,
        3600 // Valid for 1 hour
      );
      return {
        ...material,
        uploadedNote: {
          ...material.uploadedNote,
          accessUrl: signedUrl,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      };
    }

    return material;
  }

  /**
   * List Materials in Study Board
   */

  async listMaterials(userId: string, studyBoardId: string): Promise<any[]> {
    // Verify access
    await this.verifyStudyBoardAccess(userId, studyBoardId);

    const materials = await prisma.material.findMany({
      where: { studyBoardId },
      orderBy: { order: 'asc' },
      include: {
        generatedNote: {
          select: {
            id: true,
            title: true,
            status: true,
            totalNotes: true,
            totalSections: true,
            estimatedReadTime: true,
          },
        },
        uploadedNote: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            processingStatus: true,
          },
        },
      },
    });

    return materials;
  }

  /**
   * Delete Material
   */

  async deleteMaterial(userId: string, materialId: string): Promise<void> {
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        uploadedNote: true,
        studyBoard: true,
      },
    });

    if (!material) {
      throw new AppError('Material not found', 404);
    }

    // Verify ownership
    if (material.userId !== userId && material.studyBoard.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    // If uploaded note, delete from R2
    if (material.uploadedNote) {
      try {
        await this.r2Service.deleteFile(material.uploadedNote.r2Key);
        logger.info(`Deleted R2 file: ${material.uploadedNote.r2Key}`);
      } catch (error) {
        logger.error('Failed to delete R2 file:', error);
        // Continue anyway - DB cleanup is more important
      }
    }

    // Delete material (cascade will handle relations)
    await prisma.material.delete({
      where: { id: materialId },
    });

    logger.info(`Material deleted: ${materialId}`);
  }

  /**
   * Helper Functions
   */

  private async verifyStudyBoardAccess(
    userId: string,
    studyBoardId: string
  ): Promise<any> {
    const studyBoard = await prisma.studyBoard.findUnique({
      where: { id: studyBoardId },
    });

    if (!studyBoard) {
      throw new NotFoundError('Study board not found');
    }

    if (studyBoard.userId !== userId) {
      throw new AuthorizationError('Access denied');
    }

    return studyBoard;
  }

  private async getNextMaterialOrder(studyBoardId: string): Promise<number> {
    const lastMaterial = await prisma.material.findFirst({
      where: { studyBoardId },
      orderBy: { order: 'desc' },
    });
    return (lastMaterial?.order ?? -1) + 1;
  }

  private validateUploadedFile(file: Express.Multer.File): void {
    // Check file exists
    if (!file) {
      throw new AppError('No file provided', 400);
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new AppError('File too large. Maximum size is 50MB', 400);
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/webm',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new AppError('File type not supported', 400);
    }
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private generateUniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private isVideo(mimetype: string): boolean {
    return mimetype.startsWith('video/');
  }

  private estimateTokensUsed(totalNotes: number): number {
    // Rough estimate: each note ~800 words, ~4 chars per token
    return Math.ceil((totalNotes * 800 * 4) / 4);
  }

  //   Extract text from uploaded file in the background

  private async extractTextInBackground(
    uploadedNoteId: string,
    file: Express.Multer.File,
    r2Key: string
  ): Promise<void> {
    // Run in background - don't block response
    setImmediate(async () => {
      try {
        logger.info(`Starting text extraction for: ${uploadedNoteId}`);

        let extractedText: string | null = null;

        // Extract based on file type
        if (file.mimetype === 'application/pdf') {
          extractedText = await this.textExtraction.extractFromPDF(file.buffer);
        } else if (file.mimetype.includes('wordprocessingml')) {
          extractedText = await this.textExtraction.extractFromDOCX(
            file.buffer
          );
        } else if (file.mimetype === 'text/plain') {
          extractedText = file.buffer.toString('utf-8');
        } else if (file.mimetype.startsWith('image/')) {
          extractedText = await this.textExtraction.extractFromImage(
            file.buffer
          );
        }

        // Update uploaded note with extracted text
        await prisma.uploadedNote.update({
          where: { id: uploadedNoteId },
          data: {
            extractedText: extractedText ?? null,
            processingStatus: 'COMPLETED',
          },
        });

        logger.info(`Text extraction completed for: ${uploadedNoteId}`);
      } catch (error) {
        logger.error('Text extraction failed:', error);

        // Mark as failed
        await prisma.uploadedNote.update({
          where: { id: uploadedNoteId },
          data: {
            processingStatus: 'FAILED',
          },
        });
      }
    });
  }

  /**
   * Searcj Materials
   */
  async searchMaterials(
    userId: string,
    studyBoardId: string,
    query: string
  ): Promise<any[]> {
    await this.verifyStudyBoardAccess(userId, studyBoardId);

    const materials = await prisma.material.findMany({
      where: {
        studyBoardId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          {
            uploadedNote: {
              extractedText: { contains: query, mode: 'insensitive' },
            },
          },
          {
            generatedNote: {
              notes: {
                some: {
                  content: { contains: query, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      },
      include: {
        generatedNote: true,
        uploadedNote: true,
      },
    });

    return materials;
  }

  async reorderMaterials(
    userId: string,
    studyBoardId: string,
    materialIds: string[]
  ): Promise<void> {
    await this.verifyStudyBoardAccess(userId, studyBoardId);

    // Update order for each material
    const updates = materialIds.map((id, index) =>
      prisma.material.update({
        where: { id },
        data: { order: index },
      })
    );

    await Promise.all(updates);

    logger.info(
      `Reordered ${materialIds.length} materials in board ${studyBoardId}`
    );
  }
}
