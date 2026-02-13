import { Response } from 'express';
import { AuthRequest } from '@/types/auth.types';
import studyBoardsService from './studyBoards.service';
import { asyncHandler } from '@/utils/asyncHandler';
import {
  sendSuccess,
  sendError,
  sendCreated,
  sendNoContent,
  sendPaginatedResponse,
} from '@/utils/apiResponse';
import { UploadedFile } from '@/types/studyBoard.types';

// Create studyboard

export const createBoard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const board = await studyBoardsService.createStudyBoard(userId, req.body);

    sendCreated(res, 'Studyboard created successfully', board);
  }
);

//  Get all boards

export const getAllBoards = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const filters = req.query;

    const result = await studyBoardsService.getAllBoards(
      userId,
      filters as any
    );

    sendPaginatedResponse(
      res,
      result.data,
      {
        page: result.meta.page,
        limit: result.meta.limit,
        total: result.meta.total,
      },
      'Study boards retrieved successfully'
    );
  }
);

export const getRecentBoards = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 5;

    const boards = await studyBoardsService.getRecentBoards(userId, limit);

    sendSuccess(res, 200, 'Recent studyboards retrieved successfully', boards);
  }
);

export const getBoardStats = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const stats = await studyBoardsService.getBoardStats(userId);

    sendSuccess(
      res,
      200,
      'Study board statistics retrieved successfully',
      stats
    );
  }
);

export const getBoardById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { boardId } = req.params;
    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }
    const board = await studyBoardsService.getBoardById(userId, boardId);

    sendSuccess(res, 200, 'Study board retrieved successfully', board);
  }
);

export const updateBoard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { studyboardId } = req.params;

    if (!studyboardId) {
      return sendError(res, 400, 'studyboardId is required');
    }
    const board = await studyBoardsService.updateBoard(
      userId,
      studyboardId,
      req.body
    );

    sendSuccess(res, 200, 'Studyboard updated successfully', board);
  }
);

export const deleteBoard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { studyboardId } = req.params;

    if (!studyboardId) {
      return sendError(res, 400, 'studyboardId is required');
    }

    await studyBoardsService.deleteBoard(userId, studyboardId);

    sendNoContent(res);
  }
);

export const toggleArchive = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { studyboardId } = req.params;
    if (!studyboardId) {
      return sendError(res, 400, 'studyboardId is required');
    }

    const board = await studyBoardsService.toggleArchive(userId, studyboardId);

    sendSuccess(
      res,
      200,
      `Studyboard ${board.isArchived ? 'archived' : 'unarchived'} successfully`,
      board
    );
  }
);

export const toggleFavorite = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { studyboardId } = req.params;
    if (!studyboardId) {
      return sendError(res, 400, 'boardId is required');
    }

    const board = await studyBoardsService.toggleFavorite(userId, studyboardId);

    sendSuccess(
      res,
      200,
      `Studyboard ${board.isFavorite ? 'added to' : 'removed from'} favorites`,
      board
    );
  }
);

export const updateStudyTime = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { studyboardId } = req.params;
    const { minutes } = req.body;

    if (!studyboardId) {
      return sendError(res, 400, 'studyboardId is required');
    }

    await studyBoardsService.updateStudyTime(studyboardId, minutes);

    sendSuccess(res, 200, 'Study time updated successfully');
  }
);
