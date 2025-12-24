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
 * @route   POST /api/quizzes/generate/:boardId
 * @desc    Generate quiz from study board material
 * @access  Private
 */
export const generateQuiz = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { boardId } = req.params;

    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }

    const quiz = await quizzesService.generateQuiz(userId, boardId, req.body);

    sendCreated(res, 'Quiz generated successfully', quiz);
  }
);

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
 * @route   POST /api/quizzes/:quizId/start
 * @desc    Start quiz (update status to in-progress)
 * @access  Private
 */
export const startQuiz = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { quizId } = req.params;
    if (!quizId) {
      return sendError(res, 400, 'quizId is required');
    }

    const quiz = await quizzesService.startQuiz(userId, quizId);

    sendSuccess(res, 200, 'Quiz started successfully', quiz);
  }
);

/**
 * @route   POST /api/quizzes/:quizId/submit
 * @desc    Submit quiz answers and get results
 * @access  Private
 */
export const submitQuiz = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { quizId } = req.params;
    if (!quizId) {
      return sendError(res, 400, 'quizId is required');
    }
    const result = await quizzesService.submitQuiz(userId, quizId, req.body);

    sendSuccess(res, 200, 'Quiz submitted successfully', result);
  }
);

/**
 * @route   PATCH /api/quizzes/:quizId
 * @desc    Update quiz
 * @access  Private
 */
export const updateQuiz = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { quizId } = req.params;
    if (!quizId) {
      return sendError(res, 400, 'quizId is required');
    }

    const quiz = await quizzesService.updateQuiz(userId, quizId, req.body);

    sendSuccess(res, 200, 'Quiz updated successfully', quiz);
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
 * @route   GET /api/quizzes/board/:boardId/leaderboard
 * @desc    Get quiz leaderboard for a board
 * @access  Private
 */
export const getQuizLeaderboard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { boardId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }

    const leaderboard = await quizzesService.getQuizLeaderboard(boardId, limit);

    sendSuccess(res, 200, 'Leaderboard retrieved successfully', leaderboard);
  }
);

/**
 * @route   POST /api/quizzes/:quizId/retry
 * @desc    Retry quiz (create new attempt)
 * @access  Private
 */
export const retryQuiz = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { quizId } = req.params;
    if (!quizId) {
      return sendError(res, 400, 'quizId is required');
    }
    const newQuiz = await quizzesService.retryQuiz(userId, quizId);

    sendCreated(res, 'Quiz retry created successfully', newQuiz);
  }
);
