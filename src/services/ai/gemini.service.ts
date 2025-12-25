import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIServiceError } from '@/utils/errors';
import { logAI, logger } from '@/utils/logger';
import {
  GeneratedNotes,
  GeneratedFlashcard,
  GeneratedFlashcardsRequest,
  GeneratedNotesRequest,
  GenerateQuizRequest,
  GenerateVideoScriptRequest,
  GeneratedQuestion,
  GeneratedVideoScript,
} from '@/types/ai.types';
import { success } from 'zod';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelName: string;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
  }

  // Generate Study notes form topic
  async generateNotes(
    request: GeneratedNotesRequest,
    userId: string
  ): Promise<GeneratedNotes> {
    const startTime = Date.now();

    try {
      const { topic, extractedText, subject, additionalContext } = request;

      const sourceContent = topic || extractedText;
      if (!sourceContent) {
        throw new AIServiceError(
          'Either topic or extracted text must be provided'
        );
      }

      const prompt = this.buildNotesPrompt(
        sourceContent,
        subject,
        additionalContext,
        !!topic
      );

      logger.info('Generating notes with Gemini....');

      const result = await this.model.generateContent(prompt);
      console.log('result from generation',result);
      const response = await result.response;
      const text = response.text();

      // Parse response
      const notes = this.parseNotesResponse(text);

      // Log AI request
      const duration = Date.now() - startTime;
      logAI('note_generation', userId, {
        model: this.modelName,
        duration,
        tokensUsed: this.estimateTokens(text),
        success: true,
      });

      logger.info(`Notes generated successfully in ${duration}ms`);
      return notes;
    } catch (error) {
      const duration = Date.now() - startTime;
      logAI('note_generation', userId, {
        model: this.modelName,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      logger.error('Note generation falied:', error);
      throw new AIServiceError('Failed to generate notes');
    }
  }

  //  Generate flashcards from material content

  async generateFlashcards(
    request: GeneratedFlashcardsRequest,
    userId: string
  ): Promise<GeneratedFlashcard[]> {
    const startTime = Date.now();

    try {
      const {
        materialContent,
        numberOfCards,
        difficulty,
        focusAreas,
        cardType,
        includeHints,
      } = request;

      const prompt = this.buildFlashcardsPrompt(
        materialContent,
        numberOfCards,
        difficulty,
        focusAreas,
        cardType,
        includeHints
      );

      logger.info(`Generating ${numberOfCards} flashcards with Gemini...`);

      const result = await this.model.generateContent(prompt);
      const response = await result.response();
      const text = response.text();

      // Parse response
      const flashcards = this.parseFlashcardsResponse(
        text,
        difficulty,
        cardType
      );

      // Log AI usage
      const duration = Date.now() - startTime;
      logAI('flashcard_generation', userId, {
        model: this.modelName,
        duration,
        tokensUsed: this.estimateTokens(text),
        success: true,
      });
      logger.info(`${flashcards.length} flashcards generated in ${duration}ms`);

      return flashcards;
    } catch (error) {
      const duration = Date.now() - startTime;
      logAI('flashcard_generation', userId, {
        model: this.modelName,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      logger.error('Flashcard generation failed:', error);
      throw new AIServiceError('Failed to generate flashcards');
    }
  }

  // Generate quiz questions from material

  async generateQuiz(
    request: GenerateQuizRequest,
    userId: string
  ): Promise<GeneratedQuestion[]> {
    const startTime = Date.now();

    try {
      const {
        materialContent,
        numberOfQuestions,
        difficulty,
        questionTypes,
        focusAreas,
      } = request;

      const prompt = this.buildQuizPrompt(
        materialContent,
        numberOfQuestions,
        difficulty,
        questionTypes,
        focusAreas
      );

      logger.info(
        `Generating ${numberOfQuestions} quiz questions with Gemini...`
      );

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response
      const questions = this.parseQuizResponse(text, difficulty);

      // Log AI usage
      const duration = Date.now() - startTime;
      logAI('quiz_generation', userId, {
        model: this.modelName,
        duration,
        tokensUsed: this.estimateTokens(text),
        success: true,
      });

      logger.info(`${questions.length} questions generated in ${duration}ms`);

      return questions;
    } catch (error) {
      const duration = Date.now() - startTime;
      logAI('quiz_generation', userId, {
        model: this.modelName,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      logger.error('Quiz generation failed:', error);
      throw new AIServiceError('Failed to generate quiz questions');
    }
  }

  async generateVideoScript(
    request: GenerateVideoScriptRequest,
    userId: string
  ): Promise<GeneratedVideoScript> {
    const startTime = Date.now();

    try {
      const { materialContent, topic, duration, style, targetAudience } =
        request;

      const prompt = this.buildVideoScriptPrompt(
        materialContent,
        topic,
        duration,
        style,
        targetAudience
      );

      logger.info('Generating video script with Gemini...');

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response
      const script = this.parseVideoScriptResponse(text, topic, duration);

      // Log AI usage
      const durationTime = Date.now() - startTime;
      logAI('video_generation', userId, {
        model: this.modelName,
        duration: durationTime,
        tokensUsed: this.estimateTokens(text),
        success: true,
      });

      logger.info(`Video script generated in ${durationTime}ms`);

      return script;
    } catch (error) {
      const durationTime = Date.now() - startTime;
      logAI('video_generation', userId, {
        model: this.modelName,
        duration: durationTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      logger.error('Video script generation failed:', error);
      throw new AIServiceError('Failed to generate video script');
    }
  }

  private buildNotesPrompt(
    content: string,
    subject?: string,
    additionalContext?: string,
    isTopic: boolean = false
  ): string {
    const basePrompt = isTopic
      ? `Create comprehensive study notes about the following topic: "${content}"`
      : `Create comprehensive study notes from the following text:\n\n${content}`;

    return `${basePrompt}

${subject ? `Subject: ${subject}` : ''}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Please create well-structured study notes in Markdown format with the following sections:

1. **Introduction** - Brief overview of the topic
2. **Key Concepts** - Main ideas and definitions (use bullet points)
3. **Detailed Explanation** - In-depth coverage of the material
4. **Examples** - Practical examples or applications
5. **Summary** - Concise recap of main points
6. **Learning Objectives** - What students should know after studying

Format requirements:
- Use proper Markdown headings (##, ###)
- Use bullet points for lists
- Bold important terms
- Include clear section breaks
- Make it easy to read and study from

Also provide:
- A list of key concepts (5-10 items)
- Learning objectives (3-5 items)
- A brief summary (2-3 sentences)

Return ONLY valid Markdown content without any code blocks or JSON formatting.`;
  }

  // Build prompt for flashcards generation
  private buildFlashcardsPrompt(
    content: string,
    numberOfCards: number,
    difficulty: string,
    focusAreas?: string[],
    cardType?: string,
    includeHints?: boolean
  ): string {
    return `Generate ${numberOfCards} flashcards from the following study material:

${content}

Requirements:
- Difficulty level: ${difficulty}
- Card types: ${cardType === 'mixed' ? 'Mix of basic Q&A and cloze deletion' : cardType}
${focusAreas && focusAreas.length > 0 ? `- Focus on: ${focusAreas.join(', ')}` : ''}
${includeHints ? '- Include helpful hints for each card' : ''}

For BASIC cards:
- Front: Clear, concise question
- Back: Complete, accurate answer
- Avoid yes/no questions

For CLOZE cards:
- Front: Sentence with [...] for missing word/phrase
- Back: The complete answer to fill in
- Example: "Photosynthesis occurs in the [...]" → "chloroplasts"

Return the flashcards as a JSON array with this exact structure:
[
  {
    "front": "Question or statement with [...]",
    "back": "Complete answer",
    "hint": "Optional helpful hint",
    "difficulty": "easy|medium|hard",
    "cardType": "basic|cloze"
  }
]

Rules:
- Make questions specific and clear
- Ensure answers are accurate and complete
- Vary difficulty if set to "mixed"
- Each card should test one concept
- Return ONLY the JSON array, no other text`;
  }

  // Build quiz generation
  private buildQuizPrompt(
    content: string,
    numberOfQuestions: number,
    difficulty: string,
    questionTypes: string[],
    focusAreas?: string[]
  ): string {
    return `Generate ${numberOfQuestions} quiz questions from the following study material:

${content}

Requirements:
- Difficulty level: ${difficulty}
- Question types: ${questionTypes.join(', ')}
${focusAreas && focusAreas.length > 0 ? `- Focus on: ${focusAreas.join(', ')}` : ''}

Question type guidelines:

MULTIPLE-CHOICE:
- 1 question, 4 options (A, B, C, D)
- Only ONE correct answer
- Make distractors plausible but clearly wrong
- Avoid "all of the above" or "none of the above"

TRUE-FALSE:
- Clear, unambiguous statement
- Definitively true or false
- Include explanation

SHORT-ANSWER:
- Question requiring 1-3 sentence response
- Specific, focused question
- Clear expected answer

Return the questions as a JSON array with this exact structure:
[
  {
    "questionType": "multiple-choice|true-false|short-answer",
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The correct answer or option",
    "explanation": "Why this is correct",
    "hint": "Optional hint",
    "difficulty": "easy|medium|hard",
    "points": 1
  }
]

Rules:
- Distribute question types evenly
- Vary difficulty if set to "mixed"
- Each question tests unique knowledge
- Explanations should teach, not just confirm
- Return ONLY the JSON array, no other text`;
  }

  // Build prompt for video script
  private buildVideoScriptPrompt(
    content: string,
    topic: string,
    duration: number,
    style: string,
    targetAudience: string
  ): string {
    const wordsPerMinute = 150;
    const estimatedWords = Math.floor((duration / 60) * wordsPerMinute);

    return `Create a video script about "${topic}" from the following material:

${content}

Requirements:
- Target duration: ${duration} seconds (~${estimatedWords} words)
- Style: ${style}
- Target audience: ${targetAudience}

Script structure:
1. **Hook** (0-10 seconds) - Grab attention immediately
2. **Introduction** (10-30 seconds) - What we'll cover
3. **Main Content** (60-80% of time) - Core explanations
4. **Examples/Applications** - Real-world connections
5. **Summary** (last 20 seconds) - Key takeaways
6. **Call-to-Action** - Next steps

Return as JSON with this structure:
{
  "title": "Engaging video title",
  "description": "Brief description for video",
  "script": "Full script with [VISUAL: description] for visual cues",
  "estimatedDuration": ${duration},
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "visualSuggestions": ["Visual 1", "Visual 2", "Visual 3"]
}

Style guidelines:
- ${style === 'educational' ? 'Clear, structured, pedagogical approach' : ''}
- ${style === 'casual' ? 'Conversational, friendly, relatable tone' : ''}
- ${style === 'professional' ? 'Formal, authoritative, business-like' : ''}
- ${targetAudience === 'beginner' ? 'Simple language, basic concepts' : ''}
- ${targetAudience === 'intermediate' ? 'Moderate complexity, some terminology' : ''}
- ${targetAudience === 'advanced' ? 'Technical depth, expert terminology' : ''}

Return ONLY the JSON object, no other text`;
  }

  // Parse notes response
  private parseNotesResponse(text: string): GeneratedNotes {
    //  Extract sections
    const sections = this.extractSections(text);
    // Extract key concepts
    const keyConcepts = this.extractListItems(text, 'Key Concepts');

    // Extract learning objectives
    const learningObjectives = this.extractListItems(
      text,
      'Learning Objectives'
    );

    // Extract or generate summary
    const summary = this.extractSummary(text);

    const wordCount = text.split(/\s+/).length;
    const readTimeMinutes = Math.ceil(wordCount / 200);

    return {
      format: 'markdown',
      content: text,
      wordCount,
      readTimeMinutes,
      sections,
      keyConcepts: keyConcepts.slice(0, 10),
      learningObjectives: learningObjectives.slice(0, 5),
      summary,
    };
  }

  private parseFlashcardsResponse(
    text: string,
    difficulty: string,
    cardType: string
  ): GeneratedFlashcard[] {
    try {
      // Extract JSON from text
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const flashcards = JSON.parse(jsonMatch[0]);

      // Validate and normalize
      return flashcards.map((card: any, index: number) => ({
        front: card.front || `Question ${index + 1}`,
        back: card.back || 'Answer not provided',
        hint: card.hint || undefined,
        difficulty: card.difficulty || difficulty,
        cardType: card.cardType || cardType,
        tags: card.tags || [],
      }));
    } catch (error) {
      logger.error('Failed to parse flashcards response:', error);
      throw new AIServiceError('Failed to parse flashcards from AI response');
    }
  }

  private parseQuizResponse(
    text: string,
    difficulty: string
  ): GeneratedQuestion[] {
    try {
      // Extract JSON from text
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const questions = JSON.parse(jsonMatch[0]);

      // Validate and normalize
      return questions.map((q: any, index: number) => ({
        questionType: q.questionType || 'multiple-choice',
        question: q.question || `Question ${index + 1}`,
        options: q.options || [],
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        hint: q.hint || undefined,
        difficulty: q.difficulty || difficulty,
        points: q.points || 1,
      }));
    } catch (error) {
      logger.error('Failed to parse quiz response:', error);
      throw new AIServiceError('Failed to parse quiz from AI response');
    }
  }

  private parseVideoScriptResponse(
    text: string,
    topic: string,
    duration: number
  ): GeneratedVideoScript {
    try {
      // Extract JSON from text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const script = JSON.parse(jsonMatch[0]);

      return {
        title: script.title || topic,
        description: script.description || '',
        script: script.script || '',
        estimatedDuration: script.estimatedDuration || duration,
        keyPoints: script.keyPoints || [],

        // visualSuggestions: script.visualSuggestions || [],
      };
    } catch (error) {
      logger.error('Failed to parse video script response:', error);
      throw new AIServiceError('Failed to parse video script from AI response');
    }
  }

  // Extract sections from markdown

  private extractSections(text: string): string[] {
    const sections: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('## ')) {
        sections.push(line.replace('## ', '').trim());
      }
    }

    return sections;
  }

  private extractListItems(text: string, sectionName: string): string[] {
    const items: string[] = [];
    const sectionRegex = new RegExp(
      `## ${sectionName}([\\s\\S]*?)(?=##|$)`,
      'i'
    );
    const match = text.match(sectionRegex);

    if (match && typeof match[1] === 'string') {
      const sectionContent = match[1];
      const lines = sectionContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          items.push(trimmed.replace(/^[-*]\s*/, '').trim());
        }
      }
    }

    return items;
  }

  private extractSummary(text: string): string {
    const summaryRegex = /## Summary([\\s\\S]*?)(?=##|$)/i;
    const match = text.match(summaryRegex);

    // Ensure the capture group exists and is a string before using it
    if (match && typeof match[1] === 'string' && match[1].length > 0) {
      return match[1].trim().substring(0, 300);
    }

    // Fallback: use first paragraph
    const paragraphs = text.split('\n\n');
    for (const para of paragraphs) {
      if (para.length > 50 && !para.startsWith('#')) {
        return para.trim().substring(0, 300);
      }
    }

    return 'Summary not available';
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

export default new GeminiService();
