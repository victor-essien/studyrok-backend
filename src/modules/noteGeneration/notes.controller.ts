import { Request, Response, NextFunction } from 'express';
import { ComprehensiveNotesService } from './notes.service';
import { DatabaseService } from './dbService';
import logger from '@/utils/logger';
import { AppError } from '@/utils/errors';
import { sendError } from '@/utils/apiResponse';

export class ComprehensiveNotesController {
  private notesService: ComprehensiveNotesService;
  private db: DatabaseService;

  constructor() {
    this.notesService = new ComprehensiveNotesService();
    this.db = new DatabaseService();
  }

  /**
   * POST /api/notes/generate-comprehensive
   * Generate complete study materials with sections and notes
   */

  async generateComprehensive(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, userId, difficulty, includeExamples, maxDepth } = req.body;

      if (!title || title.trim().length < 3) {
        throw new AppError('Title must be at least 3 characters', 400);
      }

      logger.info(`Starting comprehensive note generation: ${title}`);

      // Start generation in background for large topics
      const isLargeTopic = maxDepth > 2;

      if (isLargeTopic) {
        // Async generation for large topics
        const topicId = await this.startAsyncGeneration(req.body);

        return res.status(202).json({
          success: true,
          message: 'Generation started',
          data: {
            topicId,
            status: 'GENERATING',
            estimatedTime: '3-10 minutes',
          },
        });
      } else {
        // Synchronous generation for smaller topics
        const result = await this.notesService.generateComprehensiveTopic(
          req.body
        );

        return res.json({
          success: true,
          data: result,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/note/:topicId/status
   * Check generation status
   */
  async getTopicStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { topicId } = req.params;
      if (!topicId) {
        return sendError(res, 400, 'topidId is required');
      }

      const status = await this.notesService.getTopicStatus(topicId);

      if (!status) {
        throw new AppError('Topic not found', 404);
      }

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/topics/:topicId
   * Get complete topic with all content
   */
  async getTopic(req: Request, res: Response, next: NextFunction) {
    try {
      const { topicId } = req.params;
      if (!topicId) {
        return sendError(res, 400, 'topidId is required');
      }

      const topic = await this.notesService.getTopicWithContent(topicId);

      if (!topic) {
        throw new AppError('Topic not found', 404);
      }

      res.json({
        success: true,
        data: topic,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/topics/:topicId/sections/:sectionId
   * Get a specific section with its notes
   */
  async getSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { sectionId } = req.params;
      if (!sectionId) {
        return sendError(res, 400, 'sectionId is required');
      }

      const section = await this.db.getSection(sectionId);
      if (!section) {
        throw new AppError('Section not found', 404);
      }

      res.json({
        success: true,
        data: {
          ...section.section,
          notes: section.notesQuery.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/notes/:noteId
   * Get a specific note with its content
   */
  async getNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { noteId } = req.params;

      if (!noteId) {
        return sendError(res, 400, 'noteId is required');
      }

      const note = await this.db.getNote(noteId);
      if (!note) {
        throw new AppError('Note not found', 404);
      }

      // Get concepts for this note
      const concepts = await this.db.getConceptsByNote(noteId);

      res.json({
        success: true,
        data: {
          ...note,
          concepts,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/topics
   * List all topics
   */
  async listTopics(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, limit = 50, offset = 0 } = req.query;

      const topics = await this.db.listTopics(
        userId as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: topics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/topics/:topicId/concepts
   * Get all key concepts from a topic
   */
  async getTopicConcepts(req: Request, res: Response, next: NextFunction) {
    try {
      const { topicId } = req.params;
      if (!topicId) {
        return sendError(res, 400, 'topidId is required');
      }

      const concepts = await this.db.getConceptsByTopic(topicId);

      res.json({
        success: true,
        data: concepts,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v2/notes/:noteId/regenerate
   * Regenerate a specific note
   */
  async regenerateNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { noteId } = req.params;
      if (!noteId) {
        return sendError(res, 400, 'noteId is required');
      }

      const note = await this.notesService.regenerateNote(noteId);

      res.json({
        success: true,
        data: note,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v2/progress
   * Track user progress
   */
  async trackProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, noteId, topicId, status, progressPercentage, timeSpent } =
        req.body;

      if (!userId || !noteId || !topicId || !status) {
        throw new AppError(
          'userId, noteId, topicId, and status are required',
          400
        );
      }

      await this.db.trackProgress({
        userId,
        topicId,
        noteId,
        status,
        progressPercentage,
        timeSpent,
      });

      res.json({
        success: true,
        message: 'Progress tracked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/users/:userId/progress/:topicId
   * Get user's progress for a topic
   */
  async getUserProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, topicId } = req.params;
      if (!userId) {
        return sendError(res, 400, 'userId is required');
      }
      if (!topicId) {
        return sendError(res, 400, 'topidId is required');
      }

      const progress = await this.db.getUserProgress(userId, topicId);

      res.json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/topics/:topicId/export
   * Export entire topic as markdown file
   */
  async exportTopic(req: Request, res: Response, next: NextFunction) {
    try {
      const { topicId } = req.params;
      if (!topicId) {
        return sendError(res, 400, 'topicId is required');
      }

      const topic = await this.notesService.getTopicWithContent(topicId);
      if (!topic) {
        throw new AppError('Topic not found', 404);
      }

      // Build complete markdown document
      let markdown = `# ${topic.title}\n\n`;
      markdown += `*Generated: ${new Date().toISOString()}*\n\n`;
      markdown += `**Difficulty:** ${topic.difficulty}\n`;
      markdown += `**Estimated Read Time:** ${topic.estimated_read_time} minutes\n\n`;
      markdown += `---\n\n`;

      // Add table of contents
      markdown += `## Table of Contents\n\n`;
      topic.sections.forEach((section: any, i: number) => {
        markdown += `${i + 1}. [${section.title}](#section-${i + 1})\n`;
        section.notes.forEach((note: any, j: number) => {
          markdown += `   ${i + 1}.${j + 1}. [${note.title}](#note-${i + 1}-${j + 1})\n`;
        });
      });
      markdown += `\n---\n\n`;

      // Add all content
      topic.sections.forEach((section: any, i: number) => {
        markdown += `<a name="section-${i + 1}"></a>\n`;
        markdown += `# ${i + 1}. ${section.title}\n\n`;
        markdown += `*${section.description}*\n\n`;

        section.notes.forEach((note: any, j: number) => {
          markdown += `<a name="note-${i + 1}-${j + 1}"></a>\n`;
          markdown += note.content;
          markdown += `\n\n---\n\n`;
        });
      });

      const filename = `${topic.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.send(markdown);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Helper: Start async generation for large topics
   */
  private async startAsyncGeneration(request: any): Promise<any> {
    // Create topic record first
    const topic = await this.db.createTopic({
      userId: request.userId,
      title: request.title,
      difficulty: request.difficulty || 'intermediate',
      status: 'GENERATING',
    });

    // Start generation in background (don't await)
    this.notesService
      .generateComprehensiveTopic({
        ...request,
        topic,
      })
      .catch((error) => {
        logger.error('Background generation failed:', error);
        this.db.updateTopic(topic.id, { status: 'failed' });
      });

    return topic;
  }
}
