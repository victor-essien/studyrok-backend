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

    sendCreated(res, 'Study board created successfully', board);
  }
);

// Add topic material

export const addTopicMaterial = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { boardId } = req.params;
    const { topic } = req.body;

    // Validate required params
    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }

    if (!topic || typeof topic !== 'string') {
      return sendError(res, 400, 'topic is required and must be a string');
    }

    const board = await studyBoardsService.addTopicMaterial(
      userId,
      boardId,
      topic
    );

    sendSuccess(res, 200, 'Topic material added successfully', board);
  }
);

// Upload Material

export const addUploadMaterial = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { boardId } = req.params;
    const file = req.file;

    if (!file) {
      return sendSuccess(res, 400, 'No file uploaded');
    }
    // Validate required params
    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }

    // Prepare file data (set by file processing middleware)
    const fileData: UploadedFile = {
      url: (req as any).fileUrl || '',
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      extractedText: (req as any).extractedText || '',
      pageCount: (req as any).pageCount,
    };

    const board = await studyBoardsService.addUploadMaterial(
      userId,
      boardId,
      fileData
    );

    sendSuccess(res, 200, 'Upload material added successfully', board);
  }
);

//  Remove Material

export const removeMaterial = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { boardId } = req.params;
    // Validate required params
    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }

    const board = await studyBoardsService.removeMaterial(userId, boardId);

    sendSuccess(res, 200, 'Material removed succesfully', board);
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

export const getFavoriteBoards = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const boards = await studyBoardsService.getFavoriteBoards(userId);

    sendSuccess(
      res,
      200,
      'Favorite study boards retrieved successfully',
      boards
    );
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
    const { boardId } = req.params;

    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }
    const board = await studyBoardsService.updateBoard(
      userId,
      boardId,
      req.body
    );

    sendSuccess(res, 200, 'Study board updated successfully', board);
  }
);

export const deleteBoard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { boardId } = req.params;

    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }

    await studyBoardsService.deleteBoard(userId, boardId);

    sendNoContent(res);
  }
);

export const toggleArchive = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { boardId } = req.params;
    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }

    const board = await studyBoardsService.toggleArchive(userId, boardId);

    sendSuccess(
      res,
      200,
      `Study board ${board.isArchived ? 'archived' : 'unarchived'} successfully`,
      board
    );
  }
);

export const toggleFavorite = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { boardId } = req.params;
    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }

    const board = await studyBoardsService.toggleFavorite(userId, boardId);

    sendSuccess(
      res,
      200,
      `Study board ${board.isFavorite ? 'added to' : 'removed from'} favorites`,
      board
    );
  }
);

export const duplicateBoard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { boardId } = req.params;

    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }

    const board = await studyBoardsService.duplicateBoard(userId, boardId);

    sendCreated(res, 'Study board duplicated successfully', board);
  }
);

export const updateStudyTime = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { boardId } = req.params;
    const { minutes } = req.body;

    if (!boardId) {
      return sendError(res, 400, 'boardId is required');
    }

    await studyBoardsService.updateStudyTime(boardId, minutes);

    sendSuccess(res, 200, 'Study time updated successfully');
  }
);
