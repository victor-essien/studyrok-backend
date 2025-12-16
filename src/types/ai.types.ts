
//  AI Service Types

export interface GeneratedNotesRequest {
    topic?: string;
    extractedText?: string;
    subject?: string;
    additionalContext?: string;
}

export interface GeneratedNotes {
    format: 'markdown';
    content: string;
    wordCount: number;
    readTimeMinutes: number;
    sections: string[];
    keyConcepts: string[];
    learningObjectives: string[];
    summary: string;
}

export interface GeneratedFlashcardsRequest {
    materialContent: string;
    numberOfCards: number;
    difficulty: 'easy'| 'medium' | 'hard' | 'mixed';
    focusAreas?: string[];
    cardType: 'basic' | 'cloze' | 'mixed';
    includeHints: boolean;
}

export interface GeneratedFlashcard {
    front: string;
    back: string;
    hint?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    cardType: 'basic' | 'cloze'
    tags?: string[]
}


export interface GenerateQuizRequest {
    materialContent: string;
    numberOfQuestions: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
     questionTypes: ('multiple-choice' | 'true-false' | 'short-answer')[];
     focusAreas?: string[];
}

export interface GeneratedQuestion {
    questionType: 'multiple-choice' | 'true-false' | 'short-answer';
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    hint?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
}

export interface GenerateVideoScriptRequest {
    materialContent: string;
    topic: string;
    duration: number;
    style: 'educational' | 'casual' | 'professional';
    targetAudience: 'beginner' | 'intermediate' | 'advanced';
}


export interface GeneratedVideoScript {
    title: string;
    description: string;
    script: string;
    estimatedDuration: number;
    keyPoints: string[]
}

export interface AIUsage {
    tokensUsed: number;
    model: string;
    timestamp: Date;
    operation: string;
}