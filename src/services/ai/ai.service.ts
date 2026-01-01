import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "@/utils/logger";
import { AppError } from "@/utils/errors";
import { MarkdownCleanerService } from "@/utils/markdownCleaner";


export class AIService {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private markdownCleaner: MarkdownCleanerService;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is required')
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        this.markdownCleaner = new MarkdownCleanerService();

        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

        this.model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        })
    }


    async generateContent(prompt: string): Promise<string> {

        try {
             logger.info('Calling Gemini AI service...');
             const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new AppError('Empty response from AI service', 500);
      }

      logger.info('Gemini AI service response received');

        function convertEscapedNewlinesToReal(text: string) {
  return text.replace(/\\n/g, '\n');
}

    // const input = "Introduction to Electrolysis\n\nElectrolysis is a fundamental";
const output = convertEscapedNewlinesToReal(text);
console.log(output);
    //    Use the robust markdown cleaner
    const cleaned = this.markdownCleaner.cleanMarkdown(text);
    const outputt = convertEscapedNewlinesToReal(cleaned);

   // Validate the output (log issues but don't fail)
      const validation = this.markdownCleaner.validateMarkdown(cleaned);
      if (!validation.valid) {
        logger.warn('Markdown validation issues found:', validation.issues);
      }
  // Log stats
      const stats = this.markdownCleaner.getStats(cleaned);
      logger.info('Markdown stats:', stats);
      
      return outputt;
        } catch (error: any) {
             logger.error('Gemini AI service error:', error);
      
      if (error.message?.includes('API key')) {
        throw new AppError('AI service authentication failed', 500);
      }
      
      if (error.message?.includes('quota') || error.message?.includes('limit')) {
        throw new AppError('Rate limit exceeded. Please try again later.', 429);
      }

      throw new AppError('Failed to generate notes. Please try again.', 500);
    
        }
    }



async generateContentStream(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
    try {
      const result = await this.model.generateContentStream(prompt);
      let fullText = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullText += chunkText;
        }
      }

      // Clean the complete text once at the end
      const cleaned = this.markdownCleaner.cleanMarkdown(fullText);
      onChunk(cleaned);
    } catch (error: any) {
      logger.error('Gemini AI streaming error:', error);
      throw new AppError('Failed to generate notes stream', 500);
    }
  }
}