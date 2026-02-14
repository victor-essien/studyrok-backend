import { Response } from 'express';
import { AuthRequest } from '@/types/auth.types';
import quizzesService from './quizzes.service';
import { asyncHandler } from '@/utils/asyncHandler';
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginatedResponse,
  sendError,
} from '@/utils/apiResponse';

/**
 * Quizzes Controller
 * Handles HTTP requests for quizzes
 */

/**
 * @route   GET /api/quizzes/board/:boardId
 * @desc    Get all quizzes for a study board
 * @access  Private
 */
export const getQuizzesByBoard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { boardId } = req.params;

    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }

    const result = await quizzesService.getQuizzesByBoard(
      userId,
      boardId,
      req.query as any
    );

    sendPaginatedResponse(
      res,
      result.data,
      {
        page: result.meta.page,
        limit: result.meta.limit,
        total: result.meta.total,
      },
      'Quizzes retrieved successfully'
    );
  }
);

/**
 * @route   GET /api/quizzes/:quizId
 * @desc    Get single quiz by ID
 * @access  Private
 */
export const getQuizById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { quizId } = req.params;
    if (!quizId) {
      return sendError(res, 400, 'quizId is required');
    }
    const quiz = await quizzesService.getQuizById(userId, quizId);

    sendSuccess(res, 200, 'Quiz retrieved successfully', quiz);
  }
);

/**
 * @route   GET /api/quizzes/:quizId/result
 * @desc    Get quiz result with detailed breakdown
 * @access  Private
 */
export const getQuizResult = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { quizId } = req.params;

    if (!quizId) {
      return sendError(res, 400, 'quizId is required');
    }

    const result = await quizzesService.getQuizResult(userId, quizId);

    sendSuccess(res, 200, 'Quiz result retrieved successfully', result);
  }
);

/**
 * @route   DELETE /api/quizzes/:quizId
 * @desc    Delete quiz
 * @access  Private
 */
export const deleteQuiz = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { quizId } = req.params;
    if (!quizId) {
      return sendError(res, 400, 'quizId is required');
    }
    await quizzesService.deleteQuiz(userId, quizId);

    sendNoContent(res);
  }
);

/**
 * @route   GET /api/quizzes/stats
 * @desc    Get quiz statistics for user
 * @access  Private
 */
export const getQuizStats = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const stats = await quizzesService.getQuizStats(userId);

    sendSuccess(res, 200, 'Quiz statistics retrieved successfully', stats);
  }
);

/**
 * @route   POST /api/sections/:sectionId/generate-quiz
 * @desc    Generate quiz from generated note section
 * @access  Private
 */
import { quizzesQueue } from '@/queues/queue';

export const generateQuizFromSection = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { sectionId } = req.params;

    if (!sectionId) {
      return sendError(res, 400, 'sectionId is required');
    }

    // Enqueue background job to generate quiz from section
    const job = await quizzesQueue.add(
      'generate-quiz-from-section',
      {
        userId,
        sectionId,
        payload: req.body,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    sendCreated(res, 'Quiz generation started', {
      jobId: job.id,
      status: 'queued',
      sectionId,
    });
  }
);
