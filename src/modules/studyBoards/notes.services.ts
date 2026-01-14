import { AIService } from '@/services/ai/ai.service';
import { CacheService } from '@/services/cache/cache.service';
import { PromptBuilderService } from '@/services/ai/prompts/promptBuilder';
import logger from '@/utils/logger';
import { createHash } from 'crypto';

export interface GenerateNotesRequest {
  topic: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  includeExamples?: boolean;
  cacheResult?: boolean;
}

export interface NoteResult {
  topicId: string;
  topic: string;
  difficulty: string;
  notes: string;
  subtopics?: string[];
  metadata: {
    generatedAt: string;
    wordCount: number;
    estimatedReadTime: number;
  };
}

export class NotesService {
  private aiService: AIService;
  private cacheService: CacheService;
  private promptBuilder: PromptBuilderService;

  constructor() {
    this.aiService = new AIService();
    this.cacheService = new CacheService();
    this.promptBuilder = new PromptBuilderService();
  }

  async generateNotes(request: GenerateNotesRequest): Promise<NoteResult> {
    const {
      topic,
      difficulty = 'advanced',
      includeExamples = true,
      cacheResult = true,
    } = request;

    // Generate topic ID
    const topicId = this.generateTopicId(topic, difficulty);

    // Check cache first
    if (cacheResult) {
      const cached = await this.cacheService.get(topicId);
      if (cached) {
        logger.info(`Returning cached notes for: ${topic}`);
        return cached;
      }
    }

    // Analyze if topic needs to be broken down
    const subtopics = await this.analyzeTopicComplexity(topic);

    let notes: string;

    if (subtopics.length > 1) {
      logger.info(
        `Topic is complex, breaking into ${subtopics.length} subtopics`
      );
      notes = await this.generateNotesForComplexTopic(
        topic,
        subtopics,
        difficulty,
        includeExamples
      );
    } else {
      notes = await this.generateNotesForSimpleTopic(
        topic,
        difficulty,
        includeExamples
      );
    }

    // Calculate metadata
    const wordCount = notes.split(/\s+/).length;
    const estimatedReadTime = Math.ceil(wordCount / 200); // Average reading speed

    const result: NoteResult = {
      topicId,
      topic,
      difficulty,
      notes,
      metadata: {
        generatedAt: new Date().toISOString(),
        wordCount,
        estimatedReadTime,
      },
    };

    if (subtopics.length > 1) {
      result.subtopics = subtopics;
    }

    // Cache the result
    if (cacheResult) {
      await this.cacheService.set(topicId, result);
    }

    return result;
  }

  private async analyzeTopicComplexity(topic: string): Promise<string[]> {
    const prompt = this.promptBuilder.buildAnalysisPrompt(topic);

    try {
      const response = await this.aiService.generateContent(prompt);
      const cleaned = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const subtopics = JSON.parse(cleaned);
      return Array.isArray(subtopics) ? subtopics : [topic];
    } catch (error) {
      logger.warn(
        'Failed to analyze topic complexity, using single topic',
        error
      );
      return [topic];
    }
  }

  private async generateNotesForSimpleTopic(
    topic: string,
    difficulty: string,
    includeExamples: boolean
  ): Promise<string> {
    const prompt = this.promptBuilder.buildMainPrompt(
      topic,
      difficulty as any,
      includeExamples
    );
    return await this.aiService.generateContent(prompt);
  }

  private async generateNotesForComplexTopic(
    mainTopic: string,
    subtopics: string[],
    difficulty: string,
    includeExamples: boolean
  ): Promise<string> {
    function convertEscapedNewlinesToReal(text: string) {
      return text.replace(/\\n/g, '\n');
    }

    const input = 'Line one\\n\\nLine two';
    const output = convertEscapedNewlinesToReal(input);

    // const sections: string[] = [];

    // sections.push(`# ${mainTopic}\n`);
    // sections.push(`*Comprehensive study notes covering key concepts and fundamentals*\n`);
    // sections.push(`---\n`);

    const sections: string[] = [];

    sections.push(`# ${mainTopic}\n\n`);
    sections.push(
      `_Comprehensive study notes covering key concepts and fundamentals._\n\n`
    );
    sections.push(`---\n\n`);

    for (const subtopic of subtopics) {
      logger.info(`Generating section for: ${subtopic}`);
      const sectionPrompt = this.promptBuilder.buildSubtopicPrompt(
        mainTopic,
        subtopic,
        difficulty as any,
        includeExamples
      );
      const sectionNotes = await this.aiService.generateContent(sectionPrompt);
      sections.push(sectionNotes);
      // sections.push('\n\n---\n\n');
    }

    sections.push(this.generateSummarySection(mainTopic, subtopics));

    return sections.join('');
  }

  private generateSummarySection(
    mainTopic: string,
    subtopics: string[]
  ): string {
    return `## Summary

This comprehensive guide covered **${mainTopic}** through the following key areas:

${subtopics.map((st, i) => `${i + 1}. **${st}**`).join('')}

These notes provide a solid foundation for understanding the fundamental concepts and practical applications of ${mainTopic}.

---

*📚 Study Tip: Review each section thoroughly and try to explain the concepts in your own words.*`;
  }

  private generateTopicId(topic: string, difficulty: string): string {
    const hash = createHash('md5')
      .update(`${topic.toLowerCase()}-${difficulty}`)
      .digest('hex');
    return hash.substring(0, 16);
  }

  async getCachedNote(topicId: string): Promise<NoteResult | null> {
    return await this.cacheService.get(topicId);
  }

  async listCachedNotes(): Promise<
    Array<{
      topicId: string;
      topic: string;
      difficulty: string;
      generatedAt: string;
    }>
  > {
    return await this.cacheService.list();
  }
}
