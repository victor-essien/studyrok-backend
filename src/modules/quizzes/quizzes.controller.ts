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
import { ValidationError } from '@/utils/errors';
import { prisma } from '@/lib/prisma';

export const generateQuizFromSection = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { sectionId } = req.params;
    const payload = req.body;
    const {
      title,
      numberOfQuestions,
      difficulty,
      questionType,
      studyBoardId,
    } = payload;

        console.log(sectionId, title, numberOfQuestions, difficulty, questionType);

    if(!title) {
      return sendError(res, 400, 'Title is required');
    }
    if(!numberOfQuestions){ 
      return sendError(res, 400, 'Number of Questions is required');
    }
    if(numberOfQuestions > 50) {
      throw new ValidationError("Max 50 questions allowed");
    }

    if(!questionType) {
      return sendError(res, 400, 'Question type is required');
    }
    

    if (!sectionId) {
      return sendError(res, 400, 'sectionId is required');
    }

    // Create quiz record
    const quiz = await prisma.quiz.create({
      data: {
        userId,
        studyBoardId,
        title: title || 'Generating Quiz...',
        difficulty,
        numberOfQuestions,
        status: 'queued',
        generationParams:{
          sectionId,
          ...payload
        }
      }
    })

    // Enqueue background job to generate quiz from section
    const job = await quizzesQueue.add(
      'generate-quiz-from-section',
      {
        quizId: quiz.id,
        userId,
        sectionId,
        payload: req.body,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        
      }
    );
 
    sendCreated(res, 'Quiz generation started', {
      jobId: job.id,
      quizId: quiz.id,
      status: 'queued',
      sectionId,
    });
  }
);
/**
 * @route   GET /api/jobs/:jobId/status
 * @desc    Get quiz generation job status
 * @access  Private
 */
export const getJobStatus = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { jobId } = req.params;

    if (!jobId) {
      return sendError(res, 400, 'jobId is required');
    }

    const status = await quizzesService.getJobStatus(jobId);

    sendSuccess(res, 200, 'Job status retrieved successfully', status);
  }
);

/**
 * @route   GET /api/jobs/:jobId/result
 * @desc    Get quiz generation job result
 * @access  Private
 */
export const getJobResult = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { jobId } = req.params;

    if (!jobId) {
      return sendError(res, 400, 'jobId is required');
    }

    const result = await quizzesService.getJobResult(jobId);

    sendSuccess(res, 200, 'Job result retrieved successfully', result);
  }
);

/**
 * @route   DELETE /api/jobs/:jobId
 * @desc    Cancel quiz generation job
 * @access  Private
 */
export const cancelJob = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { jobId } = req.params;

    if (!jobId) {
      return sendError(res, 400, 'jobId is required');
    }

    const result = await quizzesService.cancelJob(jobId);

    sendSuccess(res, 200, 'Job cancelled successfully', result);
  }
);
