import { prisma } from "@/lib/prisma";
import { NotFoundError, AuthorizationError, ValidationError } from "@/utils/errors";
import logger from "@/utils/logger";
import { paginate, buildPaginationMeta } from "@/utils/helpers";
import aiIntegrationService from "@/services/ai/aiIntegration.service";
import spacedRepititionService from "./spacedRepitition.service";
import { CreateFlashcardSetBody, UpdateFlashcardSetBody, ReviewFlashcardBody, FlashcardFilters, StudySessionStats } from "@/types/flashcard.types";


class FlashcardsService {

    // Generate flashcard set from studyboard

    async generateFlashcardSet(
        userId: string,
        boardId: string,
        data: CreateFlashcardSetBody
    ) {
        const {title, description, numberOfCards, difficulty, focusAreas, cardType, includeHints} = data

        // Verify studyboard exists and belongs to user
        const board = await prisma.studyBoard.findUnique({
            where: {id: boardId},
        });

        if(!board) {
            throw new NotFoundError('Study board');
        }
        if(board.userId !== userId) {
            throw new AuthorizationError('You do not have permission to access this board');
        }

         if (!board.sourceType || board.sourceType === '') {
      throw new ValidationError('Study board has no material. Add material before generating flashcards.');
    }

    // Generate flashcards using AI
    const generatedFlashcards = await aiIntegrationService.generateFlashcardsForBoard(
        userId,
        boardId, {
            materialContent: '', // Will be fetched
            numberOfCards,
            difficulty,
            focusAreas: focusAreas ?? [],
            cardType,
            includeHints
        }
    )

    // Create flashcard set
    const setTitle = title || `${board.title} - Flashcards`;
    const flashcardSet = await prisma.flashcardSet.create({
        data: {
            studyBoardId: boardId,
            userId,
            title: setTitle,
            description: description ?? null,
            numberOfCards: generatedFlashcards.length,
            difficulty,
            generationParams: {
                focusAreas,
                cardType,
                includeHints
            } as any,
        }
    })

    // Create individual flashcards
    const flashcards = await Promise.all(
        generatedFlashcards.map((card, index) => 
            prisma.flashcard.create({
                data: {
                    flashcardSetId: flashcardSet.id,
                    studyBoardId: boardId,
                    userId,
                    front: card.front,
                    back: card.back,
                    hint: card.hint ?? null,
                    difficulty: card.difficulty,
                    cardType: card.cardType,
                    tags: card.tags || [],
                    order: index + 1
                }
            })
        )
    );
    // Update board flashcard count
    await prisma.studyBoard.update({
      where: { id: boardId },
      data: {
        flashcardsCount: {
          increment: flashcards.length,
        },
      },
    });

    logger.info(`Generated ${flashcards.length} flashcards for board ${boardId}`);

    return {
      set: flashcardSet,
      flashcards,
    };
    }

    //  Create manual flashcard

    async createManualFlashcard(
        userId: string,
        setId: string,
        data: {
            front: string;
            back: string;
            hint?:string;
            difficulty: string;
            cardType: string;
            tags?: string[];
        }
    ) {
        const set = await prisma.flashcardSet.findUnique({
            where: {id: setId}
        })

        if (!set) {
            throw new NotFoundError('Flashcard set')
        }

        if (set.userId !== userId) {
            throw new AuthorizationError('You do not have permission to modify this set');
        }

        // Get next order number
        const lastCard = await prisma.flashcard.findFirst({
            where: {flashcardSetId : setId},
            orderBy: {order: 'desc'},
        });

        const order = lastCard ? lastCard.order + 1 : 1;

        const flashcard = await prisma.flashcard.create({
            data: {
                flashcardSetId: setId,
                studyBoardId: set.studyBoardId,
                userId,
                ...data,
                order,
            }
        });

        // update set count
        await prisma.flashcardSet.update({
            where: {id: setId},
            data: {
                numberOfCards: {
                    increment: 1
                }
            }
        })

        return flashcard;
    }

    // Get flashcard set with cards

    async getFlashcardSet(userId: string, setId: string) {
        const set = await prisma.flashcardSet.findUnique({
            where: {id: setId},
            include: {
                studyBoard: {
                    select: {
                        id: true,
                        title: true,
                        subject: true,
                    }
                },
                flashcards: {
                    orderBy: {order: 'asc'}
                }
            }
        });

        if (!set) {
            throw new NotFoundError('Flashcard set');
        }

        if (set.userId !== userId) {
            throw new AuthorizationError('You do not have permission to access this set');
        }

        return set;
    }
}