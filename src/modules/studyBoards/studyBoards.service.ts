import { prisma } from '@/lib/prisma';
import {
  NotFoundError,
  ConflictError,
  AuthorizationError,
  ValidationError,
} from '@/utils/errors';
import logger from '@/utils/logger';
import {
  CreateStudyBoardBody,
  UpdateStudyBoardBody,
  StudyBoardFilters,
  GeneratedMaterial,
  UploadedFile,
} from '@/types/studyBoard.types';
import { paginate, buildPaginationMeta } from '@/utils/helpers';
import aiIntegrationService from '@/services/ai/aiIntegration.service';

// TODO: Implement study board views
class StudyBoardService {
  async createStudyBoard(userId: string, data: CreateStudyBoardBody) {
    const { title, description, colorTheme, emoji, tags, isPublic } = data;

    const studyBoard = await prisma.studyBoard.create({
      data: {
        userId,
        title,
        description: description ?? null,
        sourceType: '',
        emoji: emoji ?? null,
        colorTheme: colorTheme || 'purple',
        tags: tags || [],
        isPublic: isPublic || false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    logger.info(
      `Studyboard created with ID: ${studyBoard.id} by User: ${userId}`
    );
    return studyBoard;
  }

  //   //    Check if board exists and user owns it
  //   const board = await prisma.studyBoard.findUnique({
  //     where: { id: boardId },
  //   });

  //   if (!board) {
  //     throw new NotFoundError('Study board');
  //   }

  //   if (board.userId !== userId) {
  //     throw new AuthorizationError(
  //       'You do not have the permission to modify this study board'
  //     );
  //   }
  //   // Check if board already has material
  //   if (board.sourceType) {
  //     throw new ConflictError(
  //       'Study board already has material. Delete existing material first or create a new board.'
  //     );
  //   }

  //   // TODO: Call AI service to generate content from topic
  //   const generatedMaterial = await aiIntegrationService.generateNotesForBoard(
  //     userId,
  //     boardId,
  //     { topic } as any
  //   );

  //   const updatedBoard = await prisma.studyBoard.update({
  //     where: { id: boardId },
  //     data: {
  //       sourceType: 'topic',
  //       topic,
  //       generatedMaterial: generatedMaterial as any,
  //     },
  //     include: {
  //       user: {
  //         select: {
  //           id: true,
  //           name: true,
  //           email: true,
  //         },
  //       },
  //     },
  //   });

  //   logger.info(`Topic material added to board: ${boardId} by user: ${userId}`);
  //   return updatedBoard;
  // }
  // Add uploaded material to study board

  //  Get single studyboard

  async getBoardById(userId: string, boardId: string) {
    const board = await prisma.studyBoard.findUnique({
      where: { id: boardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        flashcardSets: {
          select: {
            id: true,
            title: true,
            numberOfCards: true,
            difficulty: true,
            lastStudied: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },

        quizzes: {
          select: {
            id: true,
            title: true,
            numberOfQuestions: true,
            difficulty: true,
            isCompleted: true,
            score: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        studySession: {
          select: {
            id: true,
            sessionType: true,
            durationMinutes: true,
            accuracy: true,
            startedAt: true,
          },
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!board) {
      throw new NotFoundError('Study board');
    }

    // Check if user owns the board or if it's public
    if (board.userId !== userId && !board.isPublic) {
      throw new AuthorizationError(
        'You do not have permission to access this study board'
      );
    }

    return board;
  }

  async updateBoard(
    userId: string,
    boardId: string,
    data: UpdateStudyBoardBody
  ) {
    // Check if board exists and user owns it
    const existingBoard = await prisma.studyBoard.findUnique({
      where: { id: boardId },
    });

    if (!existingBoard) {
      throw new NotFoundError('Study board');
    }
    if (existingBoard.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to update this study board'
      );
    }
    // Update board
    const updatedBoard = await prisma.studyBoard.update({
      where: { id: boardId },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Study board updated: ${boardId} by user: ${userId}`);

    return updatedBoard;
  }

  // Delete Study board

  async deleteBoard(userId: string, boardId: string) {
    // Check if board exists and user owns it
    const existingBoard = await prisma.studyBoard.findUnique({
      where: { id: boardId },
    });

    if (!existingBoard) {
      throw new NotFoundError('Study board');
    }

    if (existingBoard.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to delete this study board'
      );
    }

    // TODO: If it has uploaded file, delete form R2 storage

    await prisma.studyBoard.delete({
      where: { id: boardId },
    });

    logger.info(`Study board deleted: ${boardId} by user: ${userId}`);
  }

  // Toggle Archive status
  async toggleArchive(userId: string, boardId: string) {
    const board = await prisma.studyBoard.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundError('Study board');
    }

    if (board.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to modify this study board'
      );
    }

    const updatedBoard = await prisma.studyBoard.update({
      where: { id: boardId },
      data: {
        isArchived: !board.isArchived,
      },
    });

    logger.info(
      `Study board ${updatedBoard.isArchived ? 'archived' : 'unarchived'}: ${boardId}`
    );
    return updatedBoard;
  }

  //  Toggle favorite status
  async toggleFavorite(userId: string, boardId: string) {
    const board = await prisma.studyBoard.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundError('Study board');
    }

    if (board.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to modify this study board'
      );
    }

    const updatedBoard = await prisma.studyBoard.update({
      where: { id: boardId },
      data: {
        isFavorite: !board.isFavorite,
      },
    });

    logger.info(`Study board favorite toggled: ${boardId}`);

    return updatedBoard;
  }

  async getBoardStats(userId: string) {
    const [
      totalBoards,
      archivedBoards,
      favoriteBoards,
      studyTimeData,
      flashcardsCount,
      quizzesCount,
      recentBoards,
    ] = await Promise.all([
      prisma.studyBoard.count({
        where: { userId, isArchived: false },
      }),
      prisma.studyBoard.count({
        where: { userId, isArchived: true },
      }),
      prisma.studyBoard.count({
        where: { userId, sourceType: '' },
      }),
      prisma.studyBoard.aggregate({
        where: { userId },
        _sum: {
          totalStudyTime: true,
        },
      }),
      prisma.flashcard.count({
        where: { userId },
      }),
      prisma.quiz.count({
        where: { userId },
      }),
      prisma.studyBoard.findMany({
        where: { userId, lastStudiedAt: { not: null } },
        select: {
          id: true,
          title: true,
          lastStudiedAt: true,
        },
        orderBy: { lastStudiedAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalBoards,
      archivedBoards,
      favoriteBoards,
      //   boardsWithMaterial,
      //   boardsWithoutMaterial,
      totalStudyTime: studyTimeData._sum.totalStudyTime || 0,
      totalFlashcards: flashcardsCount,
      totalQuizzes: quizzesCount,
      recentActivity: recentBoards.map((board) => ({
        boardId: board.id,
        boardTitle: board.title,
        lastStudied: board.lastStudiedAt!,
      })),
    };
  }

  //   Get recently accessed boards

  async getRecentBoards(userId: string, limit: number = 5) {
    const boards = await prisma.studyBoard.findMany({
      where: {
        userId,
        isArchived: false,
      },
      orderBy: [{ lastStudiedAt: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        subject: true,
        sourceType: true,
        colorTheme: true,
        thumbnail: true,
        emoji: true,
        flashcardsCount: true,
        quizzesCount: true,
        lastStudiedAt: true,
        updatedAt: true,
      },
    });
    return boards;
  }

  // Get all study boards for a user with filters, sorting and pagination
  // async getAllBoards(userId: string, filters: StudyBoardFilters = {}) {
  //   const page = Number(filters.page) || 1;
  //   const limit = Number(filters.limit) || 10;

  //   const where: any = { userId };

  //   if (typeof filters.isArchived !== 'undefined') {
  //     // allow both boolean and string values
  //     where.isArchived =
  //       filters.isArchived === 'true' || filters.isArchived === true;
  //   }

  //   if (typeof filters.isFavorite !== 'undefined') {
  //     where.isFavorite =
  //       filters.isFavorite === 'true' || filters.isFavorite === true;
  //   }

  //   if (filters.sourceType) {
  //     where.sourceType = filters.sourceType;
  //   }

  //   if (filters.subject) {
  //     where.subject = {
  //       contains: String(filters.subject),
  //       mode: 'insensitive',
  //     };
  //   }

  //   if (filters.tags) {
  //     // tags may be provided as comma separated string or array
  //     const tagsArray = Array.isArray(filters.tags)
  //       ? filters.tags
  //       : String(filters.tags).split(',').filter(Boolean);
  //     if (tagsArray.length) {
  //       where.tags = { hasSome: tagsArray };
  //     }
  //   }

  //   if (typeof filters.hasMaterial !== 'undefined') {
  //     const hasMat =
  //       filters.hasMaterial === 'true' || filters.hasMaterial === true;
  //     if (hasMat) {
  //       // at least one related material
  //       where.AND = where.AND || [];
  //       where.AND.push({ materials: { some: {} } });
  //     }
  //   }

  //   if (filters.search) {
  //     const q = String(filters.search);
  //     where.OR = [
  //       { title: { contains: q, mode: 'insensitive' } },
  //       { description: { contains: q, mode: 'insensitive' } },
  //     ];
  //   }

  //   const sortBy = (filters.sortBy as string) || 'createdAt';
  //   const sortOrder = (filters.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  //   // map to allowed order fields
  //   const allowedSortFields = [
  //     'createdAt',
  //     'updatedAt',
  //     'title',
  //     'lastStudiedAt',
  //   ];
  //   const orderField = allowedSortFields.includes(sortBy)
  //     ? sortBy
  //     : 'createdAt';

  //   const total = await prisma.studyBoard.count({ where });

  //   const boards = await prisma.studyBoard.findMany({
  //     where,
  //     orderBy: { [orderField]: sortOrder },
  //     skip: (page - 1) * limit,
  //     take: limit,
  //     select: {
  //       id: true,
  //       title: true,
  //       description: true,
  //       subject: true,
  //       sourceType: true,
  //       colorTheme: true,
  //       thumbnail: true,
  //       emoji: true,
  //       tags: true,
  //       isPublic: true,
  //       isFavorite: true,
  //       isArchived: true,
  //       flashcardsCount: true,
  //       quizzesCount: true,
  //       lastStudiedAt: true,
  //       createdAt: true,
  //       updatedAt: true,
  //     },
  //   });

  //   return {
  //     data: boards,
  //     meta: {
  //       page,
  //       limit,
  //       total,
  //     },
  //   };
  // }

  //  Get favorite boards
  async getFavoriteBoards(userId: string) {
    const boards = await prisma.studyBoard.findMany({
      where: {
        userId,
        isFavorite: true,
        isArchived: false,
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        subject: true,
        sourceType: true,
        colorTheme: true,
        thumbnail: true,
        emoji: true,
        flashcardsCount: true,
        quizzesCount: true,
        lastStudiedAt: true,
        createdAt: true,
      },
    });
  }

  // Duplicate board
  async duplicateBoard(userId: string, boardId: string) {
    const originalBoard = await prisma.studyBoard.findUnique({
      where: { id: boardId },
    });

    if (!originalBoard) {
      throw new NotFoundError('Study board');
    }

    // Check permissions
    if (originalBoard.userId !== userId && !originalBoard.isPublic) {
      throw new AuthorizationError(
        'You do not have permission to duplicate this study board'
      );
    }

    // Create duplicate
    const duplicatedBoard = await prisma.studyBoard.create({
      data: {
        userId, // Assign to current user
        title: `${originalBoard.title} (Copy)`,
        description: originalBoard.description,
        subject: originalBoard.subject,
        sourceType: originalBoard.sourceType,
        topic: originalBoard.topic,
        // generatedMaterial: originalBoard.generatedMaterial,
        // uploadedFile: originalBoard.uploadedFile,
        colorTheme: originalBoard.colorTheme,
        emoji: originalBoard.emoji,
        tags: originalBoard.tags,
        isPublic: false, // Duplicates are private by default
      },
    });

    logger.info(
      `Study board duplicated: ${boardId} -> ${duplicatedBoard.id} by user: ${userId}`
    );

    return duplicatedBoard;
  }

  // Update study time

  async updateStudyTime(boardId: string, minutes: number) {
    await prisma.studyBoard.update({
      where: { id: boardId },
      data: {
        totalStudyTime: {
          increment: minutes,
        },
        lastStudiedAt: new Date(),
      },
    });
    logger.info(
      `Study time updated for board: ${boardId} - ${minutes} minutes`
    );
  }
}

export default new StudyBoardService();
