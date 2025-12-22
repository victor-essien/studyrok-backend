import { Response } from "express";
import { AuthRequest } from "@/types/auth.types";
import flashcardsService from "./flashcards.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess, sendCreated, sendNoContent, sendError } from "@/utils/apiResponse";



export const generateFlashcardSet = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const { boardId } = req.body;

        if (!boardId) {
          return sendError(res, 400, 'boardId is required');
        }
    
        const result = await flashcardsService.generateFlashcardSet(
            userId,
            boardId,
            req.body
        )

        sendCreated(res, 'Flashcard set generated successfully', result)
    }
)


export const createManualFlashcard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { setId } = req.params;

    if (!setId) {
      return sendError(res, 400, 'setId is required');
    }

    const flashcard = await flashcardsService.createManualFlashcard(
      userId,
      setId,
      req.body
    );

    sendCreated(res, 'Flashcard created successfully', flashcard);
  }
);

export const getFlashcardSet = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { setId } = req.params;

    if (!setId) {
      return sendError(res, 400, 'setId is required');
    }

    const set = await flashcardsService.getFlashcardSet(userId, setId);

    sendSuccess(res, 200, 'Flashcard set retrieved successfully', set);
  }
);


export const getFlashcardSetsForBoard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { boardId } = req.params;

    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }

    const sets = await flashcardsService.getFlashcardSetsForBoard(userId, boardId);

    sendSuccess(res, 200, 'Flashcard sets retrieved successfully', sets);
  }
);



export const getDueFlashcards = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { setId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!setId) {
      return sendError(res, 400, 'setId is required');
    }

    const cards = await flashcardsService.getDueFlashcards(userId, setId, limit);

    sendSuccess(res, 200, 'Due flashcards retrieved successfully', {
      dueCards: cards,
      count: cards.length,
    });
  }
);

export const reviewFlashcard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { cardId } = req.params;

    if (!cardId) {
      return sendError(res, 400, 'cardId is required');
    }

    const result = await flashcardsService.reviewFlashcard(userId, cardId, req.body);

    sendSuccess(res, 200, 'Flashcard reviewed successfully', result);
  }
);


/**
 * @route   GET /api/flashcards/sets/:setId/stats
 * @desc    Get flashcard set statistics
 * @access  Private
 */
export const getFlashcardStats = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { setId } = req.params;

    if (!setId) {
      return sendError(res, 400, 'setId is required');
    }

    const stats = await flashcardsService.getFlashcardStats(userId, setId);

    sendSuccess(res, 200, 'Statistics retrieved successfully', stats);
  }
);

/**
 * @route   PATCH /api/flashcards/sets/:setId
 * @desc    Update flashcard set
 * @access  Private
 */
export const updateFlashcardSet = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { setId } = req.params;

    if (!setId) {
      return sendError(res, 400, 'setId is required');
    }

    const set = await flashcardsService.updateFlashcardSet(userId, setId, req.body);

    sendSuccess(res, 200, 'Flashcard set updated successfully', set);
  }
);

/**
 * @route   PATCH /api/flashcards/cards/:cardId
 * @desc    Update flashcard
 * @access  Private
 */
export const updateFlashcard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { cardId } = req.params;

    if (!cardId) {
      return sendError(res, 400, 'cardId is required');
    }

    const card = await flashcardsService.updateFlashcard(userId, cardId, req.body);

    sendSuccess(res, 200, 'Flashcard updated successfully', card);
  }
);

/**
 * @route   DELETE /api/flashcards/cards/:cardId
 * @desc    Delete flashcard
 * @access  Private
 */
export const deleteFlashcard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { cardId } = req.params;

    if (!cardId) {
      return sendError(res, 400, 'cardId is required');
    }

    await flashcardsService.deleteFlashcard(userId, cardId);

    sendNoContent(res);
  }
);

/**
 * @route   DELETE /api/flashcards/sets/:setId
 * @desc    Delete flashcard set
 * @access  Private
 */
export const deleteFlashcardSet = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { setId } = req.params;

    if (!setId) {
      return sendError(res, 400, 'setId is required');
    }

    await flashcardsService.deleteFlashcardSet(userId, setId);

    sendNoContent(res);
  }
);

/**
 * @route   POST /api/flashcards/cards/:cardId/reset
 * @desc    Reset flashcard progress
 * @access  Private
 */
export const resetFlashcardProgress = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { cardId } = req.params;

    if (!cardId) {
      return sendError(res, 400, 'cardId is required');
    }

    await flashcardsService.resetFlashcardProgress(userId, cardId);

    sendSuccess(res, 200, 'Flashcard progress reset successfully');
  }
);

/**
 * @route   GET /api/flashcards/sets/:setId/session-summary
 * @desc    Get study session summary
 * @access  Private
 */
export const getStudySessionSummary = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { setId } = req.params;
    const sessionStart = new Date(req.query.startTime as string);

    if (!setId) {
      return sendError(res, 400, 'setId is required');
    }

    const summary = await flashcardsService.getStudySessionSummary(
      userId,
      setId,
      sessionStart
    );

    sendSuccess(res, 200, 'Session summary retrieved successfully', summary);
  }
);