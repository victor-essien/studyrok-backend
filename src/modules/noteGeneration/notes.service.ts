import { AIService } from '@/services/ai/ai.service';
import { DatabaseService } from './dbService';
import { MarkdownCleanerService } from '@/utils/markdownCleaner';
import logger from '@/utils/logger';

export interface GenerateTopicRequest {
  title: string;
  userId: string;
  subject: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  includeExamples?: boolean;
  maxDepth?: number;
}

export interface TopicStructure {
  topicId: string;
  title: string;
  sections: SectionStructure[];
  totalNotes: number;
  estimatedTime: number;
}

export interface SectionStructure {
  sectionId: string;
  title: string;
  description: string;
  depthLevel: 'foundational' | 'intermediate' | 'advanced';
  notes: NoteStructure[];
  orderIndex: number;
}

export interface NoteStructure {
  noteId: string;
  title: string;
  content: string;
  summary: string;
  depthLevel: 'foundational' | 'intermediate' | 'advanced';
  wordCount: number;
  estimatedReadTime: number;
  orderIndex: number;
}

export class ComprehensiveNotesService {
  private aiService: AIService;
  private db: DatabaseService;
  private markdownCleaner: MarkdownCleanerService;

  constructor() {
    this.aiService = new AIService();
    this.db = new DatabaseService();
    this.markdownCleaner = new MarkdownCleanerService();
  }

  /**
   * Generate comprehensive study materials for a topic
   */

  async generateComprehensiveTopic(
    request: GenerateTopicRequest
  ): Promise<TopicStructure> {
    const {
      title,
      userId,
      difficulty = 'intermediate',
      subject = 'auto',
      includeExamples = true,
      maxDepth = 3,
    } = request;

    logger.info(`Starting comprehensive generation for ${title}`);

    // Convert to uppercase enum
    const difficultyEnum = difficulty.toUpperCase() as
      | 'BEGINNER'
      | 'INTERMEDIATE'
      | 'ADVANCED';

    // Create topic record
    const topic = await this.db.createTopic({
      userId,
      title,
      difficulty: difficultyEnum,
      status: 'GENERATING',
    });

    const topicId = topic.id;

    try {
      // Analyze and generate topic structure
      const structure = await this.analyzeTopicStructure(
        title,
        subject,
        difficulty,
        maxDepth
      );

      // Generate sections
      const sections: SectionStructure[] = [];

      for (let i = 0; i < structure.sections.length; i++) {
        const sectionPlan = structure.sections[i];

        logger.info(
          `Generating section ${i + 1}/${structure.sections.length}: ${sectionPlan.title}`
        );

        const section = await this.generateSection(
          topicId,
          sectionPlan,
          i,
          difficulty,
          includeExamples
        );

        sections.push(section);

        // Update progress
        await this.db.updateTopic(topicId, {
          totalSections: structure.sections.length,
          totalNotes: sections.reduce((sum, s) => sum + s.notes.length, 0),
        });
      }
      // Calculate total statistics
      const totalNotes = sections.reduce((sum, s) => sum + s.notes.length, 0);
      const estimatedTime = sections.reduce(
        (sum, s) =>
          sum + s.notes.reduce((nSum, n) => nSum + n.estimatedReadTime, 0),
        0
      );

      // Mark as completed
      await this.db.updateTopic(topicId, {
        status: 'COMPLETED',
        totalSections: sections.length,
        totalNotes,
        estimatedReadTime: estimatedTime,
        completedAt: new Date(),
      });
      logger.info(
        `Completed generation: ${totalNotes} notes across ${sections.length} sections`
      );

      return {
        topicId,
        title,
        sections,
        totalNotes,
        estimatedTime,
      };
    } catch (error) {
      logger.error('Failed to generate comprehensive topic:', error);
      await this.db.updateTopic(topicId, { status: 'FAILED' });
      throw error;
    }
  }

  /**
   *  Analyze topic and create hierarchical structure
   */

  private async analyzeTopicStructure(
    title: string,
    difficulty: string,
    subject: string,
    maxDepth: number
  ): Promise<{ sections: any[] }> {
    let prompt;
    if (subject === 'auto') {
      prompt = `You are an expert curriculum designer. Analyze this topic and create a comprehensive learning structure based on the difficulty and subject it might be related to.

TOPIC: "${title}"
DIFFICULTY: ${difficulty}
MAX_DEPTH: ${maxDepth} levels


Create a hierarchical structure that:
1. Breaks the topic into 5-8 major SECTIONS (broad areas)
2. Each section should have 3-6 individual NOTES (specific topics)
3. Progress from foundational → intermediate → advanced concepts
4. Ensure comprehensive coverage of all important aspects

EXAMPLE for "Object Oriented Programming":
{
  "sections": [
    {
      "title": "Introduction to OOP Pillars",
      "description": "Foundation concepts of object-oriented programming",
      "depthLevel": "foundational",
      "notes": [
        {"title": "What is OOP?", "depthLevel": "foundational"},
        {"title": "OOP vs Procedural Programming", "depthLevel": "foundational"},
        {"title": "The Four Pillars Explained", "depthLevel": "foundational"},
        {"title": "Benefits and Use Cases", "depthLevel": "intermediate"}
      ]
    },
    {
      "title": "Encapsulation",
      "description": "Data hiding and access control",
      "depthLevel": "intermediate",
      "notes": [
        {"title": "Understanding Encapsulation", "depthLevel": "intermediate"},
        {"title": "Access Modifiers", "depthLevel": "intermediate"},
        {"title": "Getters and Setters", "depthLevel": "intermediate"},
        {"title": "Best Practices", "depthLevel": "advanced"}
      ]
    }
  ]
}

    Return ONLY valid JSON with the structure. No markdown, no explanations.`;
    }

    prompt = `You are an expert curriculum designer. Analyze this topic and create a comprehensive learning structure based on the difficulty and subject it might be related to which might be included.

TOPIC: "${title}"
DIFFICULTY: ${difficulty}
MAX_DEPTH: ${maxDepth} levels
SUBJECT: ${subject}

Create a hierarchical structure that:
1. Breaks the topic into 5-8 major SECTIONS (broad areas)
2. Each section should have 3-6 individual NOTES (specific topics)
3. Progress from foundational → intermediate → advanced concepts
4. Ensure comprehensive coverage of all important aspects

EXAMPLE for "Object Oriented Programming":
{
  "sections": [
    {
      "title": "Introduction to OOP Pillars",
      "description": "Foundation concepts of object-oriented programming",
      "depthLevel": "foundational",
      "notes": [
        {"title": "What is OOP?", "depthLevel": "foundational"},
        {"title": "OOP vs Procedural Programming", "depthLevel": "foundational"},
        {"title": "The Four Pillars Explained", "depthLevel": "foundational"},
        {"title": "Benefits and Use Cases", "depthLevel": "intermediate"}
      ]
    },
    {
      "title": "Encapsulation",
      "description": "Data hiding and access control",
      "depthLevel": "intermediate",
      "notes": [
        {"title": "Understanding Encapsulation", "depthLevel": "intermediate"},
        {"title": "Access Modifiers", "depthLevel": "intermediate"},
        {"title": "Getters and Setters", "depthLevel": "intermediate"},
        {"title": "Best Practices", "depthLevel": "advanced"}
      ]
    }
  ]
}

    Return ONLY valid JSON with the structure. No markdown, no explanations.`;
    try {
      const response = await this.aiService.generateContent(prompt);
      const cleaned = response
        .replace(/```json\n?/g, '')
        .replace(/```/g, '')
        .trim();
      const structure = JSON.parse(cleaned);

      return structure;
    } catch (error) {
      logger.error('Failed to analyze structure, using fallback', error);
      return this.getFallbackStructure(title);
    }
  }

  /**
   * Generate a complete section with all its notes
   */

  private async generateSection(
    topicId: string,
    sectionPlan: any,
    orderIndex: number,
    difficulty: string,
    includeExamples: boolean
  ): Promise<SectionStructure> {
    // Convert depth level to uppercase enum
    const depthLevelEnum = sectionPlan.depthLevel.toUpperCase() as
      | 'FOUNDATIONAL'
      | 'INTERMEDIATE'
      | 'ADVANCED';

    // Create section record
    const section = await this.db.createSection({
      topicId,
      title: sectionPlan.title,
      description: sectionPlan.description,
      orderIndex,
      depthLevel: depthLevelEnum,
      status: 'GENERATING',
    });

    const sectionId = section.id;
    const notes: NoteStructure[] = [];

    // Generate each note in the section

    for (let i = 0; i < sectionPlan.notes.length; i++) {
      const notePlan = sectionPlan.notes[i];

      logger.info(
        ` Generating note ${i + 1}/${sectionPlan.notes.length}: ${notePlan.title}`
      );

      const note = await this.generateIndividualNote(
        topicId,
        sectionId,
        notePlan,
        sectionPlan.title,
        i,
        difficulty,
        includeExamples
      );

      notes.push(note);
    }

    await this.db.updateSection(sectionId, {
      status: 'COMPLETED',
      totalNotes: notes.length,
      completedAt: new Date(),
    });

    return {
      sectionId,
      title: sectionPlan.title,
      description: sectionPlan.description,
      depthLevel: sectionPlan.depthLevel,
      notes,
      orderIndex,
    };
  }

  /**
   *  Generate a single, focused note
   */

  private async generateIndividualNote(
    topicId: string,
    sectionId: string,
    notePlan: any,
    sectionTitle: string,
    orderIndex: number,
    difficulty: string,
    includesExamples: boolean
  ): Promise<NoteStructure> {
    const prompt = this.buildNotePrompt(
      notePlan.title,
      sectionTitle,
      notePlan.depthLevel,
      difficulty,
      includesExamples
    );

    const rawContent = await this.aiService.generateContent(prompt);
    const cleanedContent = this.markdownCleaner.cleanMarkdown(rawContent);

    // Extract summary
    const summary = await this.generateSummary(cleanedContent);

    // Calculate metadata
    const wordCount = cleanedContent.split(/\s+/).length;
    const estimatedReadTime = Math.ceil(wordCount / 200);

    // Check content features
    const includesCode = /```/.test(cleanedContent);
    const includesDiagrams = /\|.*\|/.test(cleanedContent);

    // Convert depth level to uppercase enum
    const depthLevelEnum = notePlan.depthLevel.toUpperCase() as
      | 'FOUNDATIONAL'
      | 'INTERMEDIATE'
      | 'ADVANCED';

    // Create note record
    const note = await this.db.createNote({
      topicId,
      sectionId,
      title: notePlan.title,
      content: cleanedContent,
      summary,
      orderIndex,
      depthLevel: depthLevelEnum,
      wordCount,
      estimatedReadTime,
      includesExamples,
      includesCode,
      includesDiagrams,
      status: 'COMPLETED',
    });

    // Extract and store key concepts
    await this.extractAndStoreConcepts(note.id, topicId, cleanedContent);

    return {
      noteId: note.id,
      title: notePlan.title,
      content: cleanedContent,
      summary,
      depthLevel: notePlan.depthLevel,
      wordCount,
      estimatedReadTime,
      orderIndex,
    };
  }

  /**
   *  Build a focused prompt for individual note generation
   */

  private buildNotePrompt(
    noteTitle: string,
    sectionTitle: string,
    depthLevel: string,
    difficulty: string,
    includeExamples: boolean
  ): string {
    const exampleText = includeExamples
      ? 'Include 1-2 practical examples with code snippets where relevant.'
      : 'Focus on concepts without code examples.';

    return `You are writing ONE focused study note.

NOTE TITLE: "${noteTitle}"
SECTION CONTEXT: "${sectionTitle}"
DEPTH LEVEL: ${depthLevel}
DIFFICULTY: ${difficulty}

CRITICAL FORMATTING RULES:
1. Start with # ${noteTitle}
2. Use HYPHENS (-) for bullets, NOT asterisks (*)
3. Use actual line breaks, NOT literal \\n
4. Output ONLY markdown, NO code fences around the output
5. Use ## for subsections, ### for sub-subsections
6. Use **bold** for emphasis (no spaces inside asterisks)

CONTENT REQUIREMENTS:
1. Write a brief introduction (2-3 sentences)
2. Explain the concept thoroughly in 3-5 paragraphs
3. Break down into logical subsections with ## or ###
4. Use bullet points for key takeaways
5. ${exampleText}
6. Add a "Key Points" section at the end with 3-5 bullets
7. Target length: 500-800 words
8. Make it educational and clear for ${difficulty} level

WRITE THE NOTE NOW:`;
  }

  /**
   *  Generate a concise summary of the note
   */

  private async generateSummary(content: string): Promise<string> {
    const prompt = `Summarize this note in 2-3 sentences. Focus on the main concept and key takeaway.

CONTENT:
${content.substring(0, 1000)}...

Return ONLY the summary, no extra text.`;

    try {
      const summary = await this.aiService.generateContent(prompt);
      return summary.trim();
    } catch (error) {
      logger.error('Failed to generate summary:', error);
      return 'Summary unavailable';
    }
  }

  /**
   * Extract key concepts from note content
   */
  private async extractAndStoreConcepts(
    noteId: string,
    topicId: string,
    content: string
  ): Promise<void> {
    const prompt = `Extract 3-5 key concepts/terms from this content.

CONTENT:
${content.substring(0, 1500)}

Return ONLY a JSON array like:
[
  {"term": "Encapsulation", "definition": "Brief definition", "importance": "critical"},
  {"term": "Access Modifier", "definition": "Brief definition", "importance": "important"}
]

Importance levels: critical, important, supplementary`;

    try {
      const response = await this.aiService.generateContent(prompt);
      const cleaned = response
        .replace(/```json\n?/g, '')
        .replace(/```/g, '')
        .trim();
      const concepts = JSON.parse(cleaned);

      for (const concept of concepts) {
        // Convert importance to uppercase enum
        const importanceEnum = concept.importance.toUpperCase() as
          | 'CRITICAL'
          | 'IMPORTANT'
          | 'SUPPLEMENTARY';

        await this.db.createConcept({
          noteId,
          topicId,
          term: concept.term,
          definition: concept.definition,
          importance: importanceEnum,
        });
      }
    } catch (error) {
      logger.warn('Failed to extract concepts:', error);
    }
  }

  /**
   * Fallback structure if AI analysis fails
   */
  private getFallbackStructure(title: string): { sections: any[] } {
    return {
      sections: [
        {
          title: `Introduction to ${title}`,
          description: 'Foundational concepts and overview',
          depthLevel: 'foundational',
          notes: [
            { title: `What is ${title}?`, depthLevel: 'foundational' },
            { title: 'Key Concepts', depthLevel: 'foundational' },
            { title: 'Historical Context', depthLevel: 'foundational' },
          ],
        },
        {
          title: 'Core Principles',
          description: 'Main concepts and theories',
          depthLevel: 'intermediate',
          notes: [
            { title: 'Principle 1', depthLevel: 'intermediate' },
            { title: 'Principle 2', depthLevel: 'intermediate' },
            { title: 'Practical Applications', depthLevel: 'intermediate' },
          ],
        },
        {
          title: 'Advanced Topics',
          description: 'In-depth exploration',
          depthLevel: 'advanced',
          notes: [
            { title: 'Advanced Concept 1', depthLevel: 'advanced' },
            { title: 'Advanced Concept 2', depthLevel: 'advanced' },
            { title: 'Best Practices', depthLevel: 'advanced' },
          ],
        },
      ],
    };
  }

  /**
   * Get complete topic with all sections and notes
   */
  async getTopicWithContent(topicId: string): Promise<any> {
    return await this.db.getTopicWithContent(topicId);
  }

  /**
   * Get topic generation status
   */
  async getTopicStatus(topicId: string): Promise<any> {
    return await this.db.getTopicStatus(topicId);
  }
  /**
   *  Get topic generation status
   */
  async regenerateNote(noteId: string): Promise<NoteStructure> {
    const note = await this.db.getNote(noteId);
    if (!note) throw new Error('Note not found');

    // Regenerate with same parameters
    return await this.generateIndividualNote(
      note.topicId,
      note.sectionId,
      { title: note.title, depthLevel: note.depthLevel },
      note.section.title,
      note.orderIndex,
      'intermediate',
      true
    );
  }
}
