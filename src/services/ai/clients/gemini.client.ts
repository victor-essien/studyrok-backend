import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '@/utils/errors';
import logger from '@/utils/logger';

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required ');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
  }
  async chat(prompt: string) {
    logger.info('Calling AI service..');
    const result = await this.model.generateContent(prompt);
    const response = result.response;

    const text = response.text();

    return {
      text,
      usage: this.estimateTokens(prompt, text),
      cost: this.estimateCost(prompt, text),
    };
  }

  private estimateTokens(input: string, output: string) {
    const promptTokens = Math.ceil(input.length / 4);
    const completionTokens = Math.ceil(output.length / 4);

    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  private estimateCost(input: string, output: string) {
    const tokens = Math.ceil((input.length + output.length) / 4);
    return (tokens / 1_000) * 0.001;
  }
}
