import aiIntegrationService from '@/services/ai/aiIntegration.service';
import logger from '@/utils/logger';
import { createHash } from 'crypto';
import { CacheService } from '@/services/cache/cache.service';
import geminiService from '@/services/ai/gemini.service';
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
  subtopics?: string[] | undefined;
  metadata: {
    generatedAt: string;
    wordCount: number;
    estimatedReadTime: number;
  };
}

export class NotesService {
  private aiService: any;
  private cacheService: CacheService;

  constructor() {
    this.aiService = geminiService;
    this.cacheService = new CacheService();
  }

  async generateNotes(request: GenerateNotesRequest): Promise<NoteResult> {
    const {
      topic,
      difficulty = 'intermediate',
      includeExamples = true,
      cacheResult = true,
    } = request;

    // Generate topic ID
    const topicId = this.generateTopicId(topic, difficulty);

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
      subtopics: subtopics.length > 1 ? subtopics : undefined,
      metadata: {
        generatedAt: new Date().toISOString(),
        wordCount,
        estimatedReadTime,
      }
    };
    // Cache the result
    if (cacheResult) {
      await this.cacheService.set(topicId, result);
    }

    return result;
  }

  private async analyzeTopicComplexity(topic: string): Promise<string[]> {
    const prompt = `Analyze this topic and determine if it should be broken down into subtopics for comprehensive study notes.

Topic: "${topic}"

If the topic is broad and complex, return 3-5 main subtopics that would make logical sections.
If the topic is focused enough, return just the original topic.

Return ONLY a JSON array of subtopic strings, nothing else.

Examples:
- For "Photosynthesis": ["Photosynthesis"]
- For "Computer Organization and Architecture": ["Introduction to Computer Architecture", "CPU Organization", "Memory Hierarchy", "Input/Output Systems", "Instruction Set Architecture"]`;

    try {
      const response = await geminiService.generateContent(prompt);
      const subtopics = JSON.parse(response.trim());
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
    const prompt = this.buildPrompt(topic, difficulty, includeExamples);
    return await geminiService.generateContent(prompt);
  }

  private async generateNotesForComplexTopic(
    mainTopic: string,
    subtopics: string[],
    difficulty: string,
    includeExamples: boolean
  ): Promise<string> {
    const sections: string[] = [];
    // Add main header
    sections.push(`# ${mainTopic}\n`);
    sections.push(
      `*Comprehensive study notes covering key concepts and fundamentals*\n`
    );
    sections.push(`---\n`);
    // Generate notes for each subtopic
    for (const subtopic of subtopics) {
      logger.info(`Generating section for: ${subtopic}`);
      const sectionPrompt = this.buildSubtopicPrompt(
        mainTopic,
        subtopic,
        difficulty,
        includeExamples
      );
      const sectionNotes = await this.aiService.generateContent(sectionPrompt);
      sections.push(sectionNotes);
      sections.push('\n---\n');
    }

    // Add summary
    sections.push(this.generateSummarySection(mainTopic, subtopics));

    return sections.join('\n');
  }
  private buildPrompt(
    topic: string,
    difficulty: string,
    includeExamples: boolean
  ): string {
    const examplesText = includeExamples
      ? 'Include practical examples, code snippets, or real-world applications where relevant.'
      : '';

 return `Generate comprehensive study notes on the following topic in clean Markdown format.

Topic: "${topic}"
Difficulty Level: ${difficulty}

CRITICAL FORMATTING RULES:
1. Use ONLY standard Markdown syntax - no escaped characters
2. Use hyphens (-) for bullet points, NOT asterisks (*)
3. Use proper newlines (actual line breaks), NOT literal \\n characters
4. Use <br> for line breaks instead of \n
5. For headers: Use # for h1, ## for h2, ### for h3
6. For emphasis: **bold** for bold, *italic* for italic
7. For horizontal rules: Use --- on its own line with blank lines before and after
8. Do NOT wrap the response in markdown code fences (no \`\`\`markdown)
9. Add a space after using asterixs for bold or italic

CONTENT REQUIREMENTS:
1. Start with a main heading: # ${topic}
2. Add a brief italic description under the heading
3. Include an introduction paragraph (no heading)
4. Break down into clear sections with ## subheadings
5. Use ### for subsections within main sections
6. Use bullet points (with - not *) for lists and key points
7. ${examplesText}
8. Include tables in Markdown format where helpful
9. Add a "## Key Takeaways" section at the end with 3-5 main points as bullet list
10. Make the content detailed and educational, suitable for ${difficulty} level learners

EXAMPLE FORMAT:
# Topic Name

*Brief description of what this covers*

This is an introduction paragraph explaining the topic...

## Section 1

Content here with explanation...

### Subsection 1.1

- First point
- Second point
- Third point

**Example:** Details here...

---

## Section 2

More content...

---

## Key Takeaways

- Main point 1
- Main point 2
- Main point 3

Return ONLY the formatted markdown content. Be thorough and educational.`;
    }

  private buildSubtopicPrompt(
    mainTopic: string,
    subtopic: string,
    difficulty: string,
    includeExamples: boolean
  ): string {
    const examplesText = includeExamples
      ? 'Include practical examples where relevant.'
      : '';

    return `Generate a detailed section for study notes on "${subtopic}" as part of the broader topic "${mainTopic}".

Difficulty Level: ${difficulty}

CRITICAL FORMATTING RULES:
1. Use ONLY standard Markdown - no escaped characters or literal \\n
2. Use hyphens (-) for bullet points, NOT asterisks (*)
3. Use actual line breaks, NOT the text "\\n"
4. Do NOT wrap in markdown code fences

CONTENT REQUIREMENTS:
1. Start with: ## ${subtopic}
2. Write 2-3 paragraphs of clear explanation
3. Break down into subsections using ### where appropriate
4. Use bullet points (with -) for key concepts
5. ${examplesText}
6. Keep it focused and educational for ${difficulty} level

Return ONLY the formatted section. Be thorough but concise.`;
  }


  private generateSummarySection(
    mainTopic: string,
    subtopics: string[]
  ): string {
    
 return `## Summary

This comprehensive guide covered **${mainTopic}** through the following key areas:

${subtopics.map((st, i) => `${i + 1}. **${st}**`).join('\n')}

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
