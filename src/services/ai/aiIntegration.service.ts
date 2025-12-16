import geminiService from "./gemini.service";
import { prisma } from "@/lib/prisma";
import { GeneratedNotesRequest, GenerateQuizRequest, GeneratedFlashcardsRequest, GenerateVideoScriptRequest } from "@/types/ai.types";
import authService from "@/modules/auth/auth.service";
import logger from "@/utils/logger";


class AIIntegrationService {

    // Generate and save study notes for a board

    async generateNotesForBoard(
        userId: string,
        boardId: string,
        request: GeneratedNotesRequest
    ) {
        // Check Ai limit
        const hasLimit = await authService.checkAILimit(userId);
        if (!hasLimit) {
            throw new Error('AI request limit exceeded');
        }

        // Generate notes
        const notes = await geminiService.generateNotes(request, userId);

        // Update board with generated material
        await prisma.studyBoard.update({
            where: {id: boardId},
            data: {
                generatedMaterial: notes as any,
                aiGenerations: {
                    increment: 1
                },
                tokensUsed: {
                    increment: notes.wordCount / 4,
                }
            }
        })

        // Increment AI request count
        await authService.incrementAIRequest(userId);

        logger.info(`Notes generated for ${boardId}`)

        return notes;
    }


    async generateFlashcardsForBoard(
        userId: string,
        boardId: string,
        request: GeneratedFlashcardsRequest
    ) {
        // Check Limi
        const hasLimit = await authService.checkAILimit(userId)
        if (!hasLimit)  {
            throw new Error('AI request limit exceeded');
        }

        // Get board materials
        const board = await prisma.studyBoard.findUnique({
            where: {id: boardId}
        })

          if (!board) {
      throw new Error('Study board not found');
    }

    // Get material content
    let materialContent = '';
    if (board.sourceType === 'topic' && board.generatedMaterial) {
      materialContent = (board.generatedMaterial as any).content;
    } else if (board.sourceType === 'upload' && board.uploadedFile) {
      materialContent = (board.uploadedFile as any).extractedText;
    }

    if (!materialContent) {
      throw new Error('Board has no material to generate from');
    }

    // Add material to request
    const fullRequest = {
      ...request,
      materialContent,
    };

    // Generate flashcards
    const flashcards = await geminiService.generateFlashcards(fullRequest, userId);
 // Increment AI request count
    await authService.incrementAIRequest(userId);

    // Update board AI stats
    await prisma.studyBoard.update({
      where: { id: boardId },
      data: {
        aiGenerations: {
          increment: 1,
        },
        tokensUsed: {
          increment: flashcards.length * 50, // Rough estimate
        },
      },
    });

    logger.info(`${flashcards.length} flashcards generated for board ${boardId}`);

    return flashcards;
    }

    // Generate quiz from material

     async generateQuizForBoard(
    userId: string,
    boardId: string,
    request: GenerateQuizRequest
  ) {
    // Check AI limit
    const hasLimit = await authService.checkAILimit(userId);
    if (!hasLimit) {
      throw new Error('AI request limit exceeded');
    }

    // Get board material
    const board = await prisma.studyBoard.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new Error('Study board not found');
    }

    // Get material content
    let materialContent = '';
    if (board.sourceType === 'topic' && board.generatedMaterial) {
      materialContent = (board.generatedMaterial as any).content;
    } else if (board.sourceType === 'upload' && board.uploadedFile) {
      materialContent = (board.uploadedFile as any).extractedText;
    }

    if (!materialContent) {
      throw new Error('Board has no material to generate from');
    }

    // Add material to request
    const fullRequest = {
      ...request,
      materialContent,
    };

    // Generate quiz
    const questions = await geminiService.generateQuiz(fullRequest, userId);

    // Increment AI request count
    await authService.incrementAIRequest(userId);

    // Update board AI stats
    await prisma.studyBoard.update({
      where: { id: boardId },
      data: {
        aiGenerations: {
          increment: 1,
        },
        tokensUsed: {
          increment: questions.length * 100, // Rough estimate
        },
      },
    });

    logger.info(`${questions.length} quiz questions generated for board ${boardId}`);

    return questions;
  }

//    Generate Video script from material

 async generateVideoScriptForBoard(
    userId: string,
    boardId: string,
    request: GenerateVideoScriptRequest
  ) {
    // Check AI limit
    const hasLimit = await authService.checkAILimit(userId);
    if (!hasLimit) {
      throw new Error('AI request limit exceeded');
    }

    // Get board material
    const board = await prisma.studyBoard.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new Error('Study board not found');
    }

    // Get material content
    let materialContent = '';
    if (board.sourceType === 'topic' && board.generatedMaterial) {
      materialContent = (board.generatedMaterial as any).content;
    } else if (board.sourceType === 'upload' && board.uploadedFile) {
      materialContent = (board.uploadedFile as any).extractedText;
    }

    if (!materialContent) {
      throw new Error('Board has no material to generate from');
    }

    // Add material to request
    const fullRequest = {
      ...request,
      materialContent,
    };

    // Generate video script
    const script = await geminiService.generateVideoScript(fullRequest, userId);

    // Increment AI request count
    await authService.incrementAIRequest(userId);

    // Update board AI stats
    await prisma.studyBoard.update({
      where: { id: boardId },
      data: {
        aiGenerations: {
          increment: 1,
        },
        tokensUsed: {
          increment: script.script.length / 4, // Rough estimate
        },
        videosCount: {
          increment: 1,
        },
      },
    });

    logger.info(`Video script generated for board ${boardId}`);

    return script;
  }

//     Get AI usage stats for user

 async getAIUsageStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        aiRequestsUsed: true,
        aiRequestLimit: true,
        lastResetDate: true,
        tier: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const boards = await prisma.studyBoard.findMany({
      where: { userId },
      select: {
        tokensUsed: true,
        aiGenerations: true,
      },
    });

    const totalTokens = boards.reduce((sum, board) => sum + board.tokensUsed, 0);
    const totalGenerations = boards.reduce((sum, board) => sum + board.aiGenerations, 0);

    return {
      requestsUsed: user.aiRequestsUsed,
      requestLimit: user.aiRequestLimit,
      requestsRemaining: user.aiRequestLimit - user.aiRequestsUsed,
      totalTokensUsed: totalTokens,
      totalGenerations,
      tier: user.tier,
      lastResetDate: user.lastResetDate,
    };
  }

   async validateBoardForGeneration(boardId: string): Promise<boolean> {
    const board = await prisma.studyBoard.findUnique({
      where: { id: boardId },
      select: {
        sourceType: true,
        generatedMaterial: true,
        uploadedFile: true,
      },
    });

    if (!board || !board.sourceType || board.sourceType === '') {
      return false;
    }

    if (board.sourceType === 'topic' && !board.generatedMaterial) {
      return false;
    }

    if (board.sourceType === 'upload' && !board.uploadedFile) {
      return false;
    }

    return true;
  }

}

export default new AIIntegrationService()