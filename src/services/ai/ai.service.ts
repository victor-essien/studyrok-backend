import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '@/utils/logger';
import { AppError } from '@/utils/errors';
import { GeminiClient } from './clients/gemini.client';
import { DeepSeekClient } from './clients/deepseek.client';
import { MarkdownCleanerService } from '@/utils/markdownCleaner';
import { token } from 'morgan';

type AIProvider = 'deepseek' | 'gemini';

export class AIService {
  private model: any;
  private geminiClient: GeminiClient;
  private deekSeekClient: DeepSeekClient;
  private markdownCleaner: MarkdownCleanerService;

  constructor() {
    this.markdownCleaner = new MarkdownCleanerService();
    this.geminiClient = new GeminiClient();
    this.deekSeekClient = new DeepSeekClient();
  }

  async generateContent(
    prompt: string,
    provider: AIProvider = 'deepseek'
  ): Promise<string> {
    try {
      logger.info(`Calling AI provider: ${provider}`);
      let rawText;

      if (provider === 'deepseek') {
        rawText = await this.deekSeekClient.chat(prompt);
      } else {
        rawText = await this.geminiClient.chat(prompt);
      }

      if (!rawText) {
        throw new AppError('Empty response from AI service', 500);
      }

      logger.info(' AI service response received');

      function convertEscapedNewlinesToReal(text: string) {
        return text.replace(/\\n/g, '\n');
      }

      // Normalize escaped newlines
      const normalized = rawText.text.replace(/\\n/g, '\n');

      // Clean markdown
      const cleaned = this.markdownCleaner.cleanMarkdown(normalized);

      // Validate (non-fatal)
      const validation = this.markdownCleaner.validateMarkdown(cleaned);
      if (!validation.valid) {
        logger.warn('Markdown validation issues found:', validation.issues);
      }
      // Log stats
      const stats = this.markdownCleaner.getStats(cleaned);
      logger.info('Markdown stats:', stats);

      logger.info('AI usage', {
        provider,
        tokens: rawText.cost,
        cost: rawText.cost,
      });

      return cleaned;
    } catch (error: any) {
      logger.error(`AI service error (${error?.message})`, error);
      if (error.message?.includes('API key')) {
        throw new AppError('AI service authentication failed', 500);
      }

      if (
        error.message?.includes('quota') ||
        error.message?.includes('limit')
      ) {
        throw new AppError('Rate limit exceeded. Please try again later.', 429);
      }

      throw new AppError('Failed to generate content. Please try again.', 500);
    }
  }

  async generateContentStream(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
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
