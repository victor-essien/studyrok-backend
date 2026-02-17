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
import { quizzesQueue } from '@/queues/queue';
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
      questionType: 'multiple-choice' | 'true-false' | 'short-answer';
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
      questionType,
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
    logger.info('Section Notes retrieved');

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
      logger.info('Sending notes to start generation......');
      // Build quiz prompt
      const prompt = this.buildQuizPrompt(
        sectionContent,
        numberOfQuestions,
        difficulty.toLowerCase(),
        questionType,
        focusAreas
      );

      // Generate questions using AI service
      const response = await this.aiService.generateContent(prompt);

      logger.info('Quiz generation completed');
      console.log('Raw AI Response:', response);

      let generatedQuestions: any[];

      try {
        // Trim just in case
        const cleaned = response.trim();

        // Parse JSON
        generatedQuestions = JSON.parse(cleaned) as any;

        // Handle wrapped format { questions: [...] }
        if (!Array.isArray(generatedQuestions)) {
          if (Array.isArray((generatedQuestions as any)?.questions)) {
            generatedQuestions = (generatedQuestions as any).questions;
          }
        }
      } catch (error) {
        logger.error('Failed to parse AI JSON response', error);
        throw new ValidationError('Invalid JSON returned from AI');
      }

      console.log('========== FINAL DEBUG ==========');
      console.log('Is Array:', Array.isArray(generatedQuestions));
      console.log('Length:', generatedQuestions?.length);
      console.log(
        'Keys of first item:',
        generatedQuestions?.[0] ? Object.keys(generatedQuestions[0]) : null
      );
      console.log('=================================');

      // Final validation
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
          'Section is not associated with a study board Section'
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
            questionType,
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
    questionType: string,
    focusAreas?: string[]
  ): string {
    return `Generate ${numberOfQuestions} quiz questions from the following study material:

${content}

=================
QUIZ CONFIGURATION
=================
- Difficulty level: ${difficulty}
- Question type: ${questionType}  
(Allowed values: multiple-choice, true-false, short-answer)
${focusAreas && focusAreas.length > 0 ? `- Focus specifically on: ${focusAreas.join(', ')}` : ''}

=================
ABSOLUTE REQUIREMENT
=================
Every single question MUST use the EXACT questionType: "${questionType}".

- Mixing question types is STRICTLY FORBIDDEN.
- If even ONE question uses a different type, the response is INVALID.
- The "questionType" field of every object MUST equal "${questionType}" exactly.
- Do NOT generate any other question types.

If you cannot fully comply, return an empty JSON array: []

=================
QUESTION TYPE RULES
=================

If "${questionType}" = "multiple-choice":
- Each question MUST contain exactly 4 options.
- Only ONE correct answer.
- "options" field MUST contain exactly 4 strings.
- "correctAnswer" MUST match one of the 4 options exactly.
- Do NOT use "All of the above" or "None of the above".
- Do NOT leave "options" empty.

If "${questionType}" = "true-false":
- Each question MUST be a clear factual statement.
- "correctAnswer" MUST be either "True" or "False" (capitalized exactly).
- "options" MUST be an empty array [].
- Do NOT include more than one correct possibility.

If "${questionType}" = "short-answer":
- Each question MUST require a 1–3 sentence response.
- "correctAnswer" MUST contain the expected short answer.
- "options" MUST be an empty array [].
- Do NOT convert it into multiple-choice format.

=================
OUTPUT FORMAT (STRICT)
=================

Return ONLY a valid JSON array.
Do NOT include:
- Markdown
- Backticks
- Commentary
- Explanations outside JSON
- Extra text before or after the array

The JSON MUST follow this EXACT structure:

[
  {
    "questionType": "${questionType}",
    "question": "Question text",
    "options": [],
    "correctAnswer": "Answer",
    "explanation": "Clear educational explanation",
    "hint": "Optional hint or null",
    "difficulty": "easy | medium | hard",
    "points": 1
  }
]

=================
ADDITIONAL RULES
=================

- Generate exactly ${numberOfQuestions} questions (no more, no less).
- Every question must test different knowledge.
- Explanations must teach the concept.
- If difficulty = "mixed", vary difficulty across questions.
- Ensure strict JSON validity.
- No trailing commas.
- No comments.
- No missing fields.
- Return ONLY the JSON array.`;
  }

  /**
   * Get Quiz Generation Job Status
   * Retrieves the status of a quiz generation job
   */
  async getJobStatus(jobId: string) {
    try {
      
      const job = await quizzesQueue.getJob(jobId);

      if (!job) {
        throw new NotFoundError(`Job ${jobId} not found`);
      }

      const state = await job.getState();
      const progress = job.progress;
      const isCompleted = await job.isCompleted();
      const isFailed = await job.isFailed();
      const isActive = await job.isActive();
      const isWaiting = await job.isWaiting();

      let status = 'unknown';
      if (isCompleted) status = 'completed';
      else if (isFailed) status = 'failed';
      else if (isActive) status = 'processing';
      else if (isWaiting) status = 'queued';

      const result = {
        jobId: job.id,
        status,
        state,
        progress,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        createdAt: new Date(job.timestamp),
        data: job.data,
        failedReason: job.failedReason,
        returnValue: job.returnvalue,
      };

      logger.info(`Job status retrieved: ${jobId} - ${status}`);

      return result;
    } catch (error: any) {
      logger.error(`Failed to get job status for ${jobId}:`, error);
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new AppError('Failed to retrieve job status', 500);
    }
  }

  /**
   * Cancel Quiz Generation Job
   * Cancels an ongoing quiz generation job
   */
  async cancelJob(jobId: string) {
    try {
   
      const job = await quizzesQueue.getJob(jobId);

      if (!job) {
        throw new NotFoundError(`Job ${jobId} not found`);
      }

      const state = await job.getState();

      // Only cancel jobs that are waiting or active
      if (state !== 'waiting' && state !== 'active' && state !== 'delayed') {
        throw new ValidationError(
          `Cannot cancel job in ${state} state. Only waiting, delayed, or active jobs can be cancelled.`
        );
      }

      await job.remove();

      logger.info(`Job cancelled: ${jobId}`);

      return {
        jobId,
        message: 'Job cancelled successfully',
        previousState: state,
      };
    } catch (error: any) {
      logger.error(`Failed to cancel job ${jobId}:`, error);
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new AppError('Failed to cancel job', 500);
    }
  }

  /**
   * Get Quiz Generation Result by Job ID
   * Retrieves the result of a completed quiz generation job
   */
  async getJobResult(jobId: string) {
    try {
      
      const job = await quizzesQueue.getJob(jobId);

      if (!job) {
        throw new NotFoundError(`Job ${jobId} not found`);
      }

      const isCompleted = await job.isCompleted();

      if (!isCompleted) {
        throw new ValidationError('Job has not completed yet');
      }

      const result = job.returnvalue;

      if (!result || !result.quizId) {
        throw new AppError('Invalid job result', 500);
      }

      // Fetch the actual quiz data
      const quiz = await prisma.quiz.findUnique({
        where: { id: result.quizId },
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
          studyBoard: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!quiz) {
        throw new NotFoundError('Generated quiz not found');
      }

      logger.info(`Job result retrieved: ${jobId} - Quiz: ${result.quizId}`);

      return {
        jobId,
        status: 'completed',
        quiz,
      };
    } catch (error: any) {
      logger.error(`Failed to get job result for ${jobId}:`, error);
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new AppError('Failed to retrieve job result', 500);
    }
  }
}

export default new QuizzesService();

// Generate exactly ${numberOfQuestions} quiz questions from the following study material:

// ${content}

// ==============================
// QUIZ CONFIGURATION
// ==============================
// - Difficulty level: ${difficulty}
// - REQUIRED Question Type: ${questionType}
//   (Allowed values: "multiple-choice", "true-false", "short-answer")
// ${focusAreas && focusAreas.length > 0 ? `- Focus specifically on: ${focusAreas.join(', ')}` : ''}

// ==============================
// ABSOLUTE REQUIREMENT
// ==============================
// Every single question MUST use the EXACT questionType: "${questionType}".

// - Mixing question types is STRICTLY FORBIDDEN.
// - If even ONE question uses a different type, the response is INVALID.
// - The "questionType" field of every object MUST equal "${questionType}" exactly.
// - Do NOT generate any other question types.

// If you cannot fully comply, return an empty JSON array: []

// ==============================
// QUESTION TYPE RULES
// ==============================

// If "${questionType}" = "multiple-choice":
// - Each question MUST contain exactly 4 options.
// - Only ONE correct answer.
// - "options" field MUST contain exactly 4 strings.
// - "correctAnswer" MUST match one of the 4 options exactly.
// - Do NOT use "All of the above" or "None of the above".
// - Do NOT leave "options" empty.

// If "${questionType}" = "true-false":
// - Each question MUST be a clear factual statement.
// - "correctAnswer" MUST be either "True" or "False" (capitalized exactly).
// - "options" MUST be an empty array [].
// - Do NOT include more than one correct possibility.

// If "${questionType}" = "short-answer":
// - Each question MUST require a 1–3 sentence response.
// - "correctAnswer" MUST contain the expected short answer.
// - "options" MUST be an empty array [].
// - Do NOT convert it into multiple-choice format.

// ==============================
// OUTPUT FORMAT (STRICT)
// ==============================

// Return ONLY a valid JSON array.
// Do NOT include:
// - Markdown
// - Backticks
// - Commentary
// - Explanations outside JSON
// - Extra text before or after the array

// The JSON MUST follow this EXACT structure:

// [
//   {
//     "questionType": "${questionType}",
//     "question": "Question text",
//     "options": [],
//     "correctAnswer": "Answer",
//     "explanation": "Clear educational explanation",
//     "hint": "Optional hint or null",
//     "difficulty": "easy | medium | hard",
//     "points": 1
//   }
// ]

// ==============================
// ADDITIONAL RULES
// ==============================

// - Generate exactly ${numberOfQuestions} questions (no more, no less).
// - Every question must test different knowledge.
// - Explanations must teach the concept.
// - If difficulty = "mixed", vary difficulty across questions.
// - Ensure strict JSON validity.
// - No trailing commas.
// - No comments.
// - No missing fields.
// - Return ONLY the JSON array.
