import { Request, Response, NextFunction } from "express";
import { NotesService } from "./notes.services";
import logger from "@/utils/logger";
import { AppError } from "@/utils/errors";

export class NotesController {

    private notesService: NotesService

    constructor() {
        this.notesService = new NotesService()
    }

    async generateNotes(req: Request, res:Response, next: NextFunction) {
        try {
            const {topic, difficulty, includeExamples, cacheResult} = req.body

            logger.info(`Generating notes for topic: ${topic}`)

            const result = await this.notesService.generateNotes({
        topic,
        difficulty: difficulty || 'intermediate',
        includeExamples: includeExamples !== false,
        cacheResult: cacheResult !== false
      });

      res.json({
        success: true,
        data: result
      });
        } catch(error) {
            next(error)
        }
    }


     async getCachedNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { topicId } = req.params;
      if (!topicId) {
        throw new AppError('Topic Id not found')
      }

      const note = await this.notesService.getCachedNote(topicId);

      if (!note) {
        throw new AppError('Note not found', 404);
      }

      res.json({
        success: true,
        data: note
      });
    } catch (error) {
      next(error);
    }

    
  }

   async exportNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { topicId } = req.params;

      if (!topicId) {
        throw new AppError('Topic Id not found')
      }
      const note = await this.notesService.getCachedNote(topicId);

      if (!note) {
        throw new AppError('Note not found', 404);
      }

      const filename = `${note.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(note.notes);
    } catch (error) {
      next(error);
    }
  }

  async listNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const notes = await this.notesService.listCachedNotes();

      res.json({
        success: true,
        data: notes
      });
    } catch (error) {
      next(error);
    }
  }

}