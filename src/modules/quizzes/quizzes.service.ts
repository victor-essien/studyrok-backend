import { prisma } from '@/lib/prisma';
import { AIService } from '@/services/ai/ai.service';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  ConflictError,
  AppError,
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

class QuizzesService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }
  // Generate quiz frim studyboard material

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

  /**
   * Get Quiz Results
   * Retrieves the results of a completed quiz with detailed breakdown
   */
  async getQuizResult(userId: string, quizId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            question: true,
            questionType: true,
            options: true,
            correctAnswer: true,
            userAnswer: true,
            isCorrect: true,
            explanation: true,
            points: true,
            difficulty: true,
            order: true,
          },
        },
        studyBoard: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    // Verify access - user must be the quiz taker
    if (quiz.userId !== userId) {
      throw new AuthorizationError('Access denied to this quiz result');
    }

    // Check if quiz is completed
    if (!quiz.isCompleted) {
      throw new ValidationError('Quiz has not been completed yet');
    }

    // Calculate detailed statistics
    const totalQuestions = quiz.questions.length;
    const answeredQuestions = quiz.questions.filter((q) => q.userAnswer).length;
    const correctAnswers = quiz.questions.filter((q) => q.isCorrect).length;
    const incorrectAnswers = answeredQuestions - correctAnswers;
    const skippedQuestions = totalQuestions - answeredQuestions;

    // Calculate score percentage
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const earnedPoints = quiz.questions
      .filter((q) => q.isCorrect)
      .reduce((sum, q) => sum + q.points, 0);
    const scorePercentage =
      totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    // Determine if passed
    const passed = scorePercentage >= quiz.passingScore;

    // Group questions by type for analysis
    const questionsByType = {
      'multiple-choice': quiz.questions.filter(
        (q) => q.questionType === 'multiple-choice'
      ),
      'true-false': quiz.questions.filter(
        (q) => q.questionType === 'true-false'
      ),
      'short-answer': quiz.questions.filter(
        (q) => q.questionType === 'short-answer'
      ),
    };

    // Calculate performance by question type
    const performanceByType = {
      'multiple-choice': {
        total: questionsByType['multiple-choice'].length,
        correct: questionsByType['multiple-choice'].filter((q) => q.isCorrect)
          .length,
        percentage:
          questionsByType['multiple-choice'].length > 0
            ? (questionsByType['multiple-choice'].filter((q) => q.isCorrect)
                .length /
                questionsByType['multiple-choice'].length) *
              100
            : 0,
      },
      'true-false': {
        total: questionsByType['true-false'].length,
        correct: questionsByType['true-false'].filter((q) => q.isCorrect)
          .length,
        percentage:
          questionsByType['true-false'].length > 0
            ? (questionsByType['true-false'].filter((q) => q.isCorrect).length /
                questionsByType['true-false'].length) *
              100
            : 0,
      },
      'short-answer': {
        total: questionsByType['short-answer'].length,
        correct: questionsByType['short-answer'].filter((q) => q.isCorrect)
          .length,
        percentage:
          questionsByType['short-answer'].length > 0
            ? (questionsByType['short-answer'].filter((q) => q.isCorrect)
                .length /
                questionsByType['short-answer'].length) *
              100
            : 0,
      },
    };

    logger.info(`Quiz result retrieved: ${quizId} for user: ${userId}`);

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        studyBoard: quiz.studyBoard,
        difficulty: quiz.difficulty,
        numberOfQuestions: quiz.numberOfQuestions,
        timeLimitMinutes: quiz.timeLimitMinutes,
        passingScore: quiz.passingScore,
        startedAt: quiz.startedAt,
        completedAt: quiz.completedAt,
        timeTakenMinutes: quiz.timeTakenMinutes,
      },
      results: {
        score: parseFloat(scorePercentage.toFixed(2)),
        passed,
        totalPoints,
        earnedPoints,
        statistics: {
          totalQuestions,
          answeredQuestions,
          correctAnswers,
          incorrectAnswers,
          skippedQuestions,
        },
        performanceByType,
      },
      questions: quiz.questions.map((q) => ({
        id: q.id,
        question: q.question,
        questionType: q.questionType,
        options: q.options,
        difficulty: q.difficulty,
        points: q.points,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: q.isCorrect,
        explanation: q.explanation,
        order: q.order,
      })),
    };
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
   * Generate Quiz from Generated Note Section
   * Creates a quiz based on a specific section from a generated topic
   */
  async generateQuizFromSection(
    userId: string,
    sectionId: string,
    data: {
      title?: string;
      numberOfQuestions: number;
      difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
      questionTypes?: string[];
      timeLimitMinutes?: number;
      passingScore?: number;
      shuffleQuestions?: boolean;
      shuffleOptions?: boolean;
      showCorrectAnswer?: boolean;
      focusAreas?: string[];
    }
  ) {
    const {
      title,
      numberOfQuestions,
      difficulty,
      questionTypes = ['multiple-choice', 'true-false'],
      timeLimitMinutes,
      passingScore = 70,
      shuffleQuestions = true,
      shuffleOptions = true,
      showCorrectAnswer = true,
      focusAreas,
    } = data;

    // Get section with notes
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        notes: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            content: true,
            summary: true,
          },
        },
        topic: {
          select: {
            id: true,
            title: true,
            userId: true,
            material: {
              select: {
                studyBoardId: true,
              },
            },
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundError('Section not found');
    }

    // Verify access - user must own the topic or the associated study board
    if (
      section.topic.userId &&
      section.topic.userId !== userId &&
      section.topic.material?.studyBoardId
    ) {
      const studyBoard = await prisma.studyBoard.findUnique({
        where: { id: section.topic.material.studyBoardId },
        select: { userId: true },
      });

      if (studyBoard?.userId !== userId) {
        throw new AuthorizationError('Access denied to this section');
      }
    }

    // Combine all notes content from the section
    const sectionContent = section.notes
      .map((note) => `# ${note.title}\n\n${note.content}`)
      .join('\n\n');

    if (!sectionContent.trim()) {
      throw new ValidationError('Section has no content to generate quiz from');
    }

    try {
      // Build quiz prompt
      const prompt = this.buildQuizPrompt(
        sectionContent,
        numberOfQuestions,
        difficulty.toLowerCase(),
        questionTypes,
        focusAreas
      );

      // Generate questions using AI service
      const response = await this.aiService.generateContent(prompt);

      // Parse JSON response
      let generatedQuestions;
      try {
        // Extract JSON from response (in case there's surrounding text)
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('No JSON array found in AI response');
        }
        generatedQuestions = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        logger.error('Failed to parse AI response:', parseError);
        throw new AppError('Failed to parse AI response', 500);
      }

      // Validate generated questions
      if (
        !Array.isArray(generatedQuestions) ||
        generatedQuestions.length === 0
      ) {
        throw new ValidationError('No valid questions generated');
      }

      // Get the study board ID for the quiz
      let studyBoardId = section.topic.material?.studyBoardId;

      if (!studyBoardId) {
        // If no material/study board, create a temporary entry or throw error
        throw new ValidationError(
          'Section is not associated with a study board'
        );
      }

      // Create quiz
      const quiz = await prisma.quiz.create({
        data: {
          userId,
          studyBoardId,
          title: title || `${section.title} Quiz`,
          numberOfQuestions,
          difficulty,
          timeLimitMinutes: timeLimitMinutes ?? null,
          passingScore,
          shuffleQuestions,
          shuffleOptions,
          showCorrectAnswer,
          generationParams: {
            sectionId,
            questionTypes,
            focusAreas,
          } as any,
        },
      });

      // Create questions
      await prisma.question.createMany({
        data: generatedQuestions.map((q: any, index: number) => ({
          quizId: quiz.id,
          userId,
          questionType: q.questionType || 'multiple-choice',
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation ?? null,
          hint: q.hint ?? null,
          difficulty: q.difficulty || difficulty,
          points: q.points || 1,
          order: index + 1,
        })),
      });

      // Update study board quiz count
      if (studyBoardId) {
        await prisma.studyBoard.update({
          where: { id: studyBoardId },
          data: {
            quizzesCount: {
              increment: 1,
            },
          },
        });
      }

      logger.info(
        `Quiz generated from section: ${quiz.id} with ${numberOfQuestions} questions`
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
    } catch (error: any) {
      logger.error('Failed to generate quiz from section:', error);
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw new AppError('Failed to generate quiz from section', 500);
    }
  }

  private buildQuizPrompt(
    content: string,
    numberOfQuestions: number,
    difficulty: string,
    questionTypes: string[],
    focusAreas?: string[]
  ): string {
    return `Generate ${numberOfQuestions} quiz questions from the following study material:

${content}

Requirements:
- Difficulty level: ${difficulty}
- Question types: ${questionTypes.join(', ')}
${focusAreas && focusAreas.length > 0 ? `- Focus on: ${focusAreas.join(', ')}` : ''}

Question type guidelines:

MULTIPLE-CHOICE:
- 1 question, 4 options (A, B, C, D)
- Only ONE correct answer
- Make distractors plausible but clearly wrong
- Avoid "all of the above" or "none of the above"

TRUE-FALSE:
- Clear, unambiguous statement
- Definitively true or false
- Include explanation

SHORT-ANSWER:
- Question requiring 1-3 sentence response
- Specific, focused question
- Clear expected answer

Return the questions as a JSON array with this exact structure:
[
  {
    "questionType": "multiple-choice|true-false|short-answer",
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The correct answer or option",
    "explanation": "Why this is correct",
    "hint": "Optional hint",
    "difficulty": "easy|medium|hard",
    "points": 1
  }
]

Rules:
- Distribute question types evenly
- Vary difficulty if set to "mixed"
- Each question tests unique knowledge
- Explanations should teach, not just confirm
- Return ONLY the JSON array, no other text`;
  }
}

export default new QuizzesService();
