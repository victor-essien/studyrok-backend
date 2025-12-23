import { prisma } from '@/lib/prisma';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  ConflictError,
} from '@/utils/errors';
import logger from '@/utils/logger';
import { paginate, buildPaginationMeta } from '@/utils/helpers';
import {
  GenerateQuizBody,
  SubmitQuizBody,
  QuizFilters,
  QuestionResponse,
  UpdateQuizBody,
} from '@/types/quiz.types';
import aiIntegrationService from '@/services/ai/aiIntegration.service';
import { diff } from 'util';

class QuizzesService {
  // Generate quiz frim studyboard material

  async generateQuiz(userId: string, boardId: string, data: GenerateQuizBody) {
    const {
      title,
      numberOfQuestions,
      difficulty,
      questionTypes,
      timeLimitMinutes,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showCorrectAnswer,
      focusAreas,
    } = data;

    // Check if board exists and has material
    const board = await prisma.studyBoard.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundError('Study board');
    }

    if (board.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to access this study board'
      );
    }

    if (!board.sourceType) {
      throw new ValidationError(
        'Study board has no material to generate quiz from'
      );
    }

    // Generate quiz using AI service
    const requestPayload: any = {
      // materialContent is required by GenerateQuizRequest; try common field names and fall back to empty string
      materialContent:
        (board as any).materialContent ?? (board as any).content ?? '',
      numberOfQuestions,
      difficulty,
      questionTypes: questionTypes ?? ['multiple-choice', 'true-false'],
      focusAreas,
    };

    const generatedQuestions = await aiIntegrationService.generateQuizForBoard(
      userId,
      boardId,
      requestPayload
    );

    // Create quiz
    const quiz = await prisma.quiz.create({
      data: {
        userId,
        studyBoardId: boardId,
        title: title || `${board.title} Quiz`,
        numberOfQuestions,
        difficulty,
        timeLimitMinutes: timeLimitMinutes ?? null,
        passingScore: passingScore || 70,
        shuffleQuestions: shuffleQuestions ?? true,
        shuffleOptions: shuffleOptions ?? true,
        showCorrectAnswer: showCorrectAnswer ?? true,
        generationParams: {
          questionTypes,
          focusAreas,
        } as any,
      },
    });

    // Create questions
    const questions = await prisma.question.createMany({
      data: generatedQuestions.map((q, index) => ({
        quizId: quiz.id,
        userId,
        questionType: q.questionType,
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation ?? null,
        hint: q.hint ?? null,
        difficulty: q.difficulty,
        points: q.points,
        order: index + 1,
      })),
    });

    // Upadate board quiz count
    await prisma.studyBoard.update({
      where: { id: boardId },
      data: {
        quizzesCount: {
          increment: 1,
        },
      },
    });
    logger.info(
      `Quiz generated: ${quiz.id} with ${numberOfQuestions} questions`
    );

    // Return quiz with questions
    const quizWithQuestions = await prisma.quiz.findUnique({
      where: { id: quiz.id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            questionType: true,
            question: true,
            options: true,
            hint: true,
            difficulty: true,
            points: true,
            order: true,
          },
        },
      },
    });

    return quizWithQuestions;
  }

  //  Get all quizzes for a studyboard

  async getQuizzesByBoard(
    userId: string,
    boardId: string,
    filters: QuizFilters
  ) {
    const {
      difficulty,
      isCompleted,
      minScore,
      maxScore,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const page = parseInt(filters.page as any) || 1;
    const limit = parseInt(filters.limit as any) || 10;
    // Build where clause
    const where: any = {
      studyBoardId: boardId,
      userId,
    };

    if (difficulty) where.difficulty = difficulty;
    if (isCompleted !== undefined) where.isCompleted = isCompleted;

    if (minScore !== undefined || maxScore !== undefined) {
      where.score = {};
      if (minScore !== undefined) where.score.gte = minScore;
      if (maxScore !== undefined) where.score.lte = maxScore;
    }
    // Get quizzes with pagination
    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        ...paginate(page, limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              questions: true,
            },
          },
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    return {
      data: quizzes,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // Get single quiz by ID

  async getQuizById(userId: string, quizId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            questionType: true,
            question: true,
            options: true,
            hint: true,
            difficulty: true,
            points: true,
            order: true,
            // Don't include correctAnswer or explanation until quiz is completed
          },
        },
        studyBoard: {
          select: {
            id: true,
            title: true,
            subject: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    if (quiz.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to access this quiz'
      );
    }

    return quiz;
  }

  //    Start quiz

  async startQuiz(userId: string, quizId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    if (quiz.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to access this quiz'
      );
    }

    if (quiz.isCompleted) {
      throw new ValidationError('Quiz has already been completed');
    }

    // Update quiz status
    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    logger.info(`Quiz started: ${quizId} by user: ${userId}`);

    return updatedQuiz;
  }

  /**
   * Submit quiz answers and calculate score
   */
  async submitQuiz(userId: string, quizId: string, data: SubmitQuizBody) {
    const { answers, timeTakenMinutes } = data;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
      },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    if (quiz.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to access this quiz'
      );
    }

    if (quiz.isCompleted) {
      throw new ValidationError('Quiz has already been completed');
    }

    // Check time limit
    if (quiz.timeLimitMinutes && timeTakenMinutes > quiz.timeLimitMinutes) {
      logger.warn(`Quiz ${quizId} exceeded time limit`);
    }

    // Grade quiz
    const gradingResult = this.gradeQuiz(quiz.questions, answers);

    // Calculate score percentage
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const scorePercentage = (gradingResult.totalPoints / totalPoints) * 100;

    // Update quiz
    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        isCompleted: true,
        status: 'completed',
        score: scorePercentage,
        correctAnswers: gradingResult.correctCount,
        incorrectAnswers: gradingResult.incorrectCount,
        skippedQuestions: gradingResult.skippedCount,
        completedAt: new Date(),
        timeTakenMinutes,
        userAnswers: answers as any,
      },
      include: {
        questions: true,
      },
    });

    // Update user answers and correctness in questions
    for (const question of quiz.questions) {
      const userAnswer = answers[question.id];
      const isCorrect = this.checkAnswer(
        question.correctAnswer,
        userAnswer,
        question.questionType
      );

      await prisma.question.update({
        where: { id: question.id },
        data: {
          userAnswer: userAnswer || null,
          isCorrect: userAnswer ? isCorrect : null,
        },
      });
    }

    logger.info(
      `Quiz completed: ${quizId} - Score: ${scorePercentage.toFixed(2)}%`
    );

    return {
      quiz: updatedQuiz,
      results: gradingResult.questionResults,
      passed: scorePercentage >= quiz.passingScore,
    };
  }

  // Grade quiz

  private gradeQuiz(
    questions: any[],
    answers: Record<string, string | undefined>
  ): {
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    totalPoints: number;
    questionResults: QuestionResponse[];
  } {
    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;
    let totalPoints = 0;

    const questionResults: QuestionResponse[] = questions.map((question) => {
      const userAnswer = answers[question.id];

      if (!userAnswer) {
        skippedCount++;
        return {
          questionId: question.id,
          userAnswer: '',
          correctAnswer: question.correctAnswer,
          isCorrect: false,
          explanation: question.explanation,
          points: question.points,
          pointsEarned: 0,
        };
      }

      const isCorrect = this.checkAnswer(
        question.correctAnswer,
        userAnswer,
        question.questionType
      );

      if (isCorrect) {
        correctCount++;
        totalPoints += question.points;
      } else {
        incorrectCount++;
      }

      return {
        questionId: question.id,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
        points: question.points,
        pointsEarned: isCorrect ? question.points : 0,
      };
    });

    return {
      correctCount,
      incorrectCount,
      skippedCount,
      totalPoints,
      questionResults,
    };
  }
  /**
   * Check if answer is correct
   */
  private checkAnswer(
    correctAnswer: string,
    userAnswer: string | undefined,
    questionType: string
  ): boolean {
    if (!userAnswer) return false;

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '');

    const normalizedCorrect = normalize(correctAnswer);
    const normalizedUser = normalize(userAnswer);

    if (questionType === 'multiple-choice' || questionType === 'true-false') {
      // Exact match for multiple-choice and true-false
      return normalizedCorrect === normalizedUser;
    }

    if (questionType === 'short-answer') {
      // For short-answer, check if user answer contains key terms
      // This is a simplified check - could be enhanced with NLP
      return (
        normalizedUser.includes(normalizedCorrect) ||
        normalizedCorrect.includes(normalizedUser)
      );
    }

    return false;
  }

  /**
   * Update quiz
   */
  async updateQuiz(userId: string, quizId: string, data: UpdateQuizBody) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    if (quiz.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to update this quiz'
      );
    }

    if (quiz.isCompleted) {
      throw new ValidationError('Cannot update completed quiz');
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data,
    });

    logger.info(`Quiz updated: ${quizId}`);

    return updatedQuiz;
  }

  /**
   * Delete quiz
   */
  async deleteQuiz(userId: string, quizId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    if (quiz.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to delete this quiz'
      );
    }

    // Delete quiz (cascade will delete questions)
    await prisma.quiz.delete({
      where: { id: quizId },
    });

    // Update board quiz count
    await prisma.studyBoard.update({
      where: { id: quiz.studyBoardId },
      data: {
        quizzesCount: {
          decrement: 1,
        },
      },
    });

    logger.info(`Quiz deleted: ${quizId}`);
  }

  /**
   * Get quiz statistics for user
   */
  async getQuizStats(userId: string) {
    const [totalQuizzes, completedQuizzes, quizzes, difficultyBreakdown] =
      await Promise.all([
        prisma.quiz.count({
          where: { userId },
        }),
        prisma.quiz.count({
          where: { userId, isCompleted: true },
        }),
        prisma.quiz.findMany({
          where: { userId, isCompleted: true },
          select: {
            score: true,
            timeTakenMinutes: true,
            passingScore: true,
          },
        }),
        prisma.quiz.groupBy({
          by: ['difficulty'],
          where: { userId },
          _count: true,
        }),
      ]);

    const averageScore =
      quizzes.length > 0
        ? quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length
        : 0;

    const bestScore =
      quizzes.length > 0 ? Math.max(...quizzes.map((q) => q.score || 0)) : 0;

    const totalTimeTaken = quizzes.reduce(
      (sum, q) => sum + (q.timeTakenMinutes || 0),
      0
    );

    const passedQuizzes = quizzes.filter(
      (q) => (q.score || 0) >= q.passingScore
    ).length;
    const passRate =
      quizzes.length > 0 ? (passedQuizzes / quizzes.length) * 100 : 0;

    const difficultyMap: any = {
      easy: 0,
      medium: 0,
      hard: 0,
    };

    difficultyBreakdown.forEach((item) => {
      difficultyMap[item.difficulty] = item._count;
    });

    return {
      totalQuizzes,
      completedQuizzes,
      averageScore: parseFloat(averageScore.toFixed(2)),
      bestScore: parseFloat(bestScore.toFixed(2)),
      totalTimeTaken,
      passRate: parseFloat(passRate.toFixed(2)),
      difficultyBreakdown: difficultyMap,
    };
  }

  /**
   * Get quiz leaderboard for a board
   */
  async getQuizLeaderboard(boardId: string, limit: number = 10) {
    const topScores = await prisma.quiz.findMany({
      where: {
        studyBoardId: boardId,
        isCompleted: true,
      },
      orderBy: [{ score: 'desc' }, { timeTakenMinutes: 'asc' }],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
      },
    });

    return topScores.map((quiz, index) => ({
      rank: index + 1,
      user: quiz.user,
      score: quiz.score,
      timeTaken: quiz.timeTakenMinutes,
      completedAt: quiz.completedAt,
    }));
  }

  /**
   * Retry quiz (create new attempt)
   */
  async retryQuiz(userId: string, quizId: string) {
    const originalQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
      },
    });

    if (!originalQuiz) {
      throw new NotFoundError('Quiz');
    }

    if (originalQuiz.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to retry this quiz'
      );
    }

    // Create new quiz instance
    const newQuiz = await prisma.quiz.create({
      data: {
        userId,
        studyBoardId: originalQuiz.studyBoardId,
        title: `${originalQuiz.title} (Retry)`,
        numberOfQuestions: originalQuiz.numberOfQuestions,
        difficulty: originalQuiz.difficulty,
        timeLimitMinutes: originalQuiz.timeLimitMinutes,
        passingScore: originalQuiz.passingScore,
        shuffleQuestions: originalQuiz.shuffleQuestions,
        shuffleOptions: originalQuiz.shuffleOptions,
        showCorrectAnswer: originalQuiz.showCorrectAnswer,
        generationParams: originalQuiz.generationParams as any,
      },
    });

    // Copy questions
    await prisma.question.createMany({
      data: originalQuiz.questions.map((q) => ({
        quizId: newQuiz.id,
        userId,
        questionType: q.questionType,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        hint: q.hint,
        difficulty: q.difficulty,
        points: q.points,
        order: q.order,
      })),
    });

    logger.info(`Quiz retry created: ${newQuiz.id} from ${quizId}`);

    return await this.getQuizById(userId, newQuiz.id);
  }
}

export default new QuizzesService();
