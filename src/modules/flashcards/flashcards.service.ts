import { prisma } from '@/lib/prisma';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from '@/utils/errors';
import logger from '@/utils/logger';
import { paginate, buildPaginationMeta } from '@/utils/helpers';
// import aiIntegrationService from '@/services/ai/aiIntegration.service';
import spacedRepetitionService from './spacedRepetition.service';
import {
  CreateFlashcardSetBody,
  UpdateFlashcardSetBody,
  ReviewFlashcardBody,
  FlashcardFilters,
  StudySessionStats,
} from '@/types/flashcard.types';
import { AIService } from '@/services/ai/ai.service';

class FlashcardsService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }
  // Generate flashcard set from studyboard

  async generateFlashcardFromSection(
    flashcardsetId: string,
    userId: string,
    sectionId: string,
    includeHints: boolean,

    data: {
      numberOfCards: number;
      cardType: string;
      difficulty: string;
      focusAreas?: string[];
    }
  ) {
    const { numberOfCards, cardType, difficulty, focusAreas } = data;

    const BATCH_SIZE = 10;
    const MAX_RETRIES = 3;
    const MAX_CONCURRENT = 3;
console.log('sectionId', sectionId)
    // Fetch section content
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        notes: {
          orderBy: { orderIndex: 'asc' },
          select: { title: true, content: true },
        },
        topic: {
          select: {
            userId: true,
            material: { select: { studyBoardId: true } },
          },
        },
      },
    });
console.log('section', section)
    if (!section) throw new NotFoundError('Section');

    // Check ownership
    const ownsTopic = section.topic.userId === userId;

    let ownsBoard = false;
    if (section.topic.material?.studyBoardId) {
      const board = await prisma.studyBoard.findFirst({
        where: {
          id: section.topic.material.studyBoardId,
          userId,
        },
      });
      ownsBoard = !!board;
    }

    if (!ownsTopic && !ownsBoard) {
      throw new AuthorizationError('Access denied');
    }
    // Prepare content for AI
    const rawContent = section.notes
      .map((n) => `# ${n.title}\n\n${n.content}`)
      .join('\n\n');

    if (!rawContent.trim()) {
      throw new ValidationError('No content');
    }

    const sectionContent = rawContent.slice(0, 4000);

    // Helper-safe parse
    const safeParse = (response: string) => {
      try {
        const cleaned = response
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();

        let parsed = JSON.parse(cleaned);

        if (!Array.isArray(parsed) && parsed?.questions) {
          parsed = parsed.questions;
        }

        return parsed;
      } catch (err) {
        throw new Error('Invalid JSON');
      }
    };

    // Generate flashcards in batches
    const generateBatch = async (batchSize: number) => {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const prompt = this.buildFlashcardsPrompt(
            sectionContent,
            batchSize,
            difficulty,
            focusAreas
          );

          const response = await this.aiService.generateNormalContent(prompt);

          const parsed = safeParse(response);

          return parsed;
        } catch (error) {
          logger.warn(`⚠️ Batch failed (attempt ${attempt})`);

          if (attempt === MAX_RETRIES) {
            throw error;
          }
        }
      }
    };

    // Create flashcards in batches
    const batches: number[] = [];
    let remaining = numberOfCards;

    while (remaining > 0) {
      const batchSize = Math.min(BATCH_SIZE, remaining);
      batches.push(batchSize);
      remaining -= batchSize;
    }
    logger.info(`Total batches: ${batches.length}`);

    // Execute parallel batches with concurrency limit
    const results: any[] = [];

    for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
      const chunk = batches.slice(i, i + MAX_CONCURRENT);

      const promises = chunk.map((size) => generateBatch(size));

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults.flat());
    }

    // Validation
    let generatedFlashcards: any[] = results.filter((card: any) => {
      return card?.front && card?.back;
    });

    if (!generatedFlashcards.length) {
      throw new ValidationError('No valid flashcards generated');
    }

    const studyBoardId = section.topic.material?.studyBoardId;
    if (!studyBoardId) {
      throw new ValidationError('No study board');
    }

    // Save flashcards to DB

    await prisma.$transaction(async (tx) => {
      await tx.flashcard.createMany({
        data: generatedFlashcards.map((f: any, index: number) => ({
          flashcardSetId: flashcardsetId,
          userId,
          studyBoardId,
          cardType: f.cardType || cardType,
          front: f.front,
          back: f.back,
          hint: f.hint || null,
          difficulty: f.difficulty || difficulty,
          order: index + 1,
        })),
      });

      await tx.flashcardSet.update({
        where: { id: flashcardsetId },
        data: {
          status: 'completed',
          numberOfCards: generatedFlashcards.length,
        },
      });

      await tx.studyBoard.update({
        where: { id: studyBoardId },
        data: {
          flashcardsCount: { increment: 1 },
        },
      });
    });

    logger.info(
      `Flashcard ${flashcardsetId} generation completed with ${generatedFlashcards.length} cards`
    );
    return { success: true };
  }

  // async generateFlashcardSet(
  //   userId: string,
  //   boardId: string,
  //   data: CreateFlashcardSetBody
  // ) {
  //   const {
  //     title,
  //     description,
  //     numberOfCards,
  //     difficulty,
  //     focusAreas,
  //     cardType,
  //     includeHints,
  //   } = data;

  //   // Verify studyboard exists and belongs to user
  //   const board = await prisma.studyBoard.findUnique({
  //     where: { id: boardId },
  //   });

  //   if (!board) {
  //     throw new NotFoundError('Study board');
  //   }
  //   if (board.userId !== userId) {
  //     throw new AuthorizationError(
  //       'You do not have permission to access this board'
  //     );
  //   }

  //   if (!board.sourceType || board.sourceType === '') {
  //     throw new ValidationError(
  //       'Study board has no material. Add material before generating flashcards.'
  //     );
  //   }

  //   // Generate flashcards using AI
  //   const generatedFlashcards =
  //     await aiIntegrationService.generateFlashcardsForBoard(userId, boardId, {
  //       materialContent: '', // Will be fetched
  //       numberOfCards,
  //       difficulty,
  //       focusAreas: focusAreas ?? [],
  //       cardType,
  //       includeHints,
  //     });

  //   // Create flashcard set
  //   const setTitle = title || `${board.title} - Flashcards`;
  //   const flashcardSet = await prisma.flashcardSet.create({
  //     data: {
  //       studyBoardId: boardId,
  //       userId,
  //       title: setTitle,
  //       description: description ?? null,
  //       numberOfCards: generatedFlashcards.length,
  //       difficulty,
  //       generationParams: {
  //         focusAreas,
  //         cardType,
  //         includeHints,
  //       } as any,
  //     },
  //   });

  //   // Create individual flashcards
  //   const flashcards = await Promise.all(
  //     generatedFlashcards.map((card, index) =>
  //       prisma.flashcard.create({
  //         data: {
  //           flashcardSetId: flashcardSet.id,
  //           studyBoardId: boardId,
  //           userId,
  //           front: card.front,
  //           back: card.back,
  //           hint: card.hint ?? null,
  //           difficulty: card.difficulty,
  //           cardType: card.cardType,
  //           tags: card.tags || [],
  //           order: index + 1,
  //         },
  //       })
  //     )
  //   );
  //   // Update board flashcard count
  //   await prisma.studyBoard.update({
  //     where: { id: boardId },
  //     data: {
  //       flashcardsCount: {
  //         increment: flashcards.length,
  //       },
  //     },
  //   });

  //   logger.info(
  //     `Generated ${flashcards.length} flashcards for board ${boardId}`
  //   );

  //   return {
  //     set: flashcardSet,
  //     flashcards,
  //   };
  // }

  //  Create manual flashcard

  async createManualFlashcard(
    userId: string,
    setId: string,
    data: {
      front: string;
      back: string;
      hint?: string;
      difficulty: string;
      cardType: string;
      tags?: string[];
    }
  ) {
    const set = await prisma.flashcardSet.findUnique({
      where: { id: setId },
    });

    if (!set) {
      throw new NotFoundError('Flashcard set');
    }

    if (set.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to modify this set'
      );
    }

    // Get next order number
    const lastCard = await prisma.flashcard.findFirst({
      where: { flashcardSetId: setId },
      orderBy: { order: 'desc' },
    });

    const order = lastCard ? lastCard.order + 1 : 1;

    const flashcard = await prisma.flashcard.create({
      data: {
        flashcardSetId: setId,
        studyBoardId: set.studyBoardId,
        userId,
        ...data,
        order,
      },
    });

    // update set count
    await prisma.flashcardSet.update({
      where: { id: setId },
      data: {
        numberOfCards: {
          increment: 1,
        },
      },
    });

    return flashcard;
  }

  // Get flashcard set with cards

  async getFlashcardSet(userId: string, setId: string) {
    const set = await prisma.flashcardSet.findUnique({
      where: { id: setId },
      include: {
        studyBoard: {
          select: {
            id: true,
            title: true,
          },
        },
        flashcards: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!set) {
      throw new NotFoundError('Flashcard set');
    }

    if (set.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to access this set'
      );
    }

    return set;
  }

  //  Get all flashcard sets for a board

  async getFlashcardSetsForBoard(userId: string, boardId: string) {
    const sets = await prisma.flashcardSet.findMany({
      where: {
        studyBoardId: boardId,
        userId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            flashcards: true,
          },
        },
      },
    });

    return sets;
  }

  // Get due flashcards for review

  async getDueFlashcards(userId: string, setId: string, limit: number = 20) {
    const now = new Date();

    const dueCards = await prisma.flashcard.findMany({
      where: {
        flashcardSetId: setId,
        userId,
        OR: [
          { nextReviewDate: null }, // New cards
          { nextReviewDate: { lte: now } }, // Due cards
        ],
      },
      orderBy: [
        { masteryLevel: 'asc' }, // Prioritize less mastered cards
        { nextReviewDate: 'asc' }, // Then by due date
      ],
      take: limit,
    });

    return dueCards;
  }

  // Review Flashcard (submit answer)

  async reviewFlashcard(
    userId: string,
    cardId: string,
    data: ReviewFlashcardBody
  ) {
    const { quality, timeTaken } = data;

    const card = await prisma.flashcard.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundError('Flashcard');
    }

    if (card.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to review this card'
      );
    }

    // Calculate next review using SM-2 algorithm
    const sm2Result = spacedRepetitionService.calculateNextReview(
      quality,
      card.easeFactor,
      card.interval,
      card.reviewCount
    );

    const nextReviewDate = spacedRepetitionService.calculateNextReviewDate(
      sm2Result.interval
    );
    const newMasteryLevel = spacedRepetitionService.calculateMasteryLevel(
      sm2Result.easeFactor,
      sm2Result.repetition
    );

    const wasCorrect = quality >= 3;

    // Update flashcard

    const updatedCard = await prisma.flashcard.update({
      where: { id: cardId },
      data: {
        easeFactor: sm2Result.easeFactor,
        interval: sm2Result.interval,
        nextReviewDate,
        masteryLevel: newMasteryLevel,
        reviewCount: {
          increment: 1,
        },
        ...(wasCorrect
          ? { correctCount: { increment: 1 } }
          : { incorrectCount: { increment: 1 } }),
        lastReviewedAt: new Date(),
        lastReviewQuality: quality,
      },
    });

    // Create review record
    await prisma.flashcardReview.create({
      data: {
        flashcardId: cardId,
        quality,
        timeTaken,
        wasCorrect,
        previousInterval: card.interval,
        newInterval: sm2Result.interval,
        previousEaseFactor: card.easeFactor,
        newEaseFactor: sm2Result.easeFactor,
      },
    });

    // Update set statistics
    const flashcardSetUpdateData: any = {
      totalReviews: {
        increment: 1,
      },
      cardsReviewed: {
        increment: 1,
      },
      lastStudied: new Date(),
    };

    if (newMasteryLevel >= 4) {
      flashcardSetUpdateData.cardsMastered = { increment: 1 };
    }

    await prisma.flashcardSet.update({
      where: { id: card.flashcardSetId },
      data: flashcardSetUpdateData,
    });

    logger.info(`Card ${cardId} reviewed with quality ${quality}`);

    return {
      cardId,
      previousMasteryLevel: card.masteryLevel,
      newMasteryLevel,
      previousInterval: card.interval,
      newInterval: sm2Result.interval,
      nextReviewDate,
      wasCorrect,
    };
  }

  // Get flahcard statistics
  async getFlashcardStats(userId: string, setId: string) {
    const set = await prisma.flashcardSet.findUnique({
      where: { id: setId },
      include: {
        flashcards: true,
      },
    });

    if (!set) {
      throw new NotFoundError('Flashcard set');
    }

    if (set.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to access this set'
      );
    }

    const now = new Date();
    const dueCards = set.flashcards.filter((card) =>
      spacedRepetitionService.isDue(card.nextReviewDate)
    );

    const masteryDistribution =
      spacedRepetitionService.getDifficultyDistribution(set.flashcards);

    const totalReviews = set.flashcards.reduce(
      (sum, card) => sum + card.reviewCount,
      0
    );
    const totalCorrect = set.flashcards.reduce(
      (sum, card) => sum + card.correctCount,
      0
    );
    const accuracy = totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0;

    return {
      totalCards: set.numberOfCards,
      dueCards: dueCards.length,
      newCards: set.flashcards.filter((c) => c.masteryLevel === 0).length,
      masteredCards: set.flashcards.filter((c) => c.masteryLevel >= 4).length,
      masteryDistribution,
      totalReviews: set.totalReviews,
      accuracy: Math.round(accuracy),
      lastStudied: set.lastStudied,
      averageEaseFactor:
        set.flashcards.reduce((sum, c) => sum + c.easeFactor, 0) /
        set.flashcards.length,
    };
  }

  // Update flashcard set
  async updateFlashcardSet(
    userId: string,
    setId: string,
    data: UpdateFlashcardSetBody
  ) {
    const set = await prisma.flashcardSet.findUnique({
      where: { id: setId },
    });

    if (!set) {
      throw new NotFoundError('Flashcard set');
    }

    if (set.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to modify this set'
      );
    }

    const updatedSet = await prisma.flashcardSet.update({
      where: { id: setId },
      data,
    });

    return updatedSet;
  }

  // Update individual flashcard

  async updateFlashcard(
    userId: string,
    cardId: string,
    data: Partial<{
      front: string;
      back: string;
      hint: string;
      difficulty: string;
      tags: string[];
    }>
  ) {
    const card = await prisma.flashcard.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundError('Flashcard');
    }

    if (card.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to modify this card'
      );
    }

    const updatedCard = await prisma.flashcard.update({
      where: { id: cardId },
      data,
    });

    return updatedCard;
  }

  /**
   * Delete flashcard
   */
  async deleteFlashcard(userId: string, cardId: string) {
    const card = await prisma.flashcard.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundError('Flashcard');
    }

    if (card.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to delete this card'
      );
    }

    await prisma.flashcard.delete({
      where: { id: cardId },
    });

    // Update set count
    await prisma.flashcardSet.update({
      where: { id: card.flashcardSetId },
      data: {
        numberOfCards: {
          decrement: 1,
        },
      },
    });
  }

  // Delete flashcard set
  async deleteFlashcardSet(userId: string, setId: string) {
    const set = await prisma.flashcardSet.findUnique({
      where: { id: setId },
      include: {
        _count: {
          select: {
            flashcards: true,
          },
        },
      },
    });

    if (!set) {
      throw new NotFoundError('Flashcard set');
    }

    if (set.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to delete this set'
      );
    }

    await prisma.flashcardSet.delete({
      where: { id: setId },
    });

    // Update board count
    await prisma.studyBoard.update({
      where: { id: set.studyBoardId },
      data: {
        flashcardsCount: {
          decrement: set._count.flashcards,
        },
      },
    });
  }

  // Reset flashcard progress
  async resetFlashcardProgress(userId: string, cardId: string) {
    const card = await prisma.flashcard.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundError('Flashcard');
    }

    if (card.userId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to modify this card'
      );
    }

    await prisma.flashcard.update({
      where: { id: cardId },
      data: {
        masteryLevel: 0,
        easeFactor: 2.5,
        interval: 0,
        nextReviewDate: null,
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        lastReviewedAt: null,
        lastReviewQuality: null,
      },
    });
  }

  //    Get study session summary
  async getStudySessionSummary(
    userId: string,
    setId: string,
    sessionStart: Date
  ): Promise<StudySessionStats> {
    const reviews = await prisma.flashcardReview.findMany({
      where: {
        flashcard: {
          flashcardSetId: setId,
          userId,
        },
        reviewedAt: {
          gte: sessionStart,
        },
      },
    });

    const totalCards = reviews.length;
    const correctAnswers = reviews.filter((r) => r.wasCorrect).length;
    const incorrectAnswers = totalCards - correctAnswers;
    const accuracy = totalCards > 0 ? (correctAnswers / totalCards) * 100 : 0;
    const averageTime =
      totalCards > 0
        ? reviews.reduce((sum, r) => sum + r.timeTaken, 0) / totalCards
        : 0;
    const durationMinutes = Math.round(
      (Date.now() - sessionStart.getTime()) / 60000
    );

    return {
      totalCards,
      cardsReviewed: totalCards,
      correctAnswers,
      incorrectAnswers,
      accuracy: Math.round(accuracy),
      averageTime: Math.round(averageTime),
      durationMinutes,
    };
  }
  private buildFlashcardsPrompt(
    content: string,
    numberOfCards: number,
    difficulty: string,
    focusAreas?: string[],
    cardType?: string,
    includeHints?: boolean
  ): string {
    return `
You are an expert study assistant. Your task is to generate high-quality flashcards from the provided study material.

STUDY MATERIAL:
"""
${content}
"""

TASK:
Generate exactly ${numberOfCards} flashcards.

REQUIREMENTS:
- Difficulty level: ${difficulty}
- Card type: ${
      cardType === 'mixed'
        ? 'Use a balanced mix of "basic" and "cloze" cards'
        : `"${cardType}" only`
    }
${focusAreas && focusAreas.length > 0 ? `- Focus ONLY on these areas: ${focusAreas.join(', ')}` : '- Cover the most important concepts from the material'}
${includeHints ? '- Include a helpful hint for each card' : '- Do NOT include hints'}

---

CARD DESIGN RULES:

GENERAL:
- Each flashcard must test ONE clear concept
- Avoid vague or overly broad questions
- Avoid yes/no questions
- Ensure answers are factually accurate and directly supported by the material
- Prefer clarity over complexity

BASIC CARDS:
- Front: A clear, specific question
- Back: A concise but complete answer

CLOZE CARDS:
- Front: A sentence with a missing key term using [...] 
- The missing part must be meaningful (not trivial words)
- Back: ONLY the missing word/phrase (not the full sentence)

Example:
Front: "Photosynthesis occurs in the [...]"
Back: "chloroplasts"

---

DIFFICULTY GUIDELINES:
- easy → definitions, basic facts
- medium → understanding concepts, relationships
- hard → deeper reasoning, multi-step understanding

---

OUTPUT FORMAT (STRICT):

Return ONLY a valid JSON array. Do not include any explanations, markdown, or extra text.

[
  {
    "front": "string",
    "back": "string",
    "hint": ${includeHints ? '"string"' : 'null'},
    "difficulty": "easy|medium|hard",
    "cardType": "basic|cloze"
  }
]

---

IMPORTANT CONSTRAINTS:
- Return EXACTLY ${numberOfCards} flashcards
- Do not repeat concepts
- Do not invent information not present in the material
- Ensure JSON is valid and properly formatted
`;
  }
}

export default new FlashcardsService();
