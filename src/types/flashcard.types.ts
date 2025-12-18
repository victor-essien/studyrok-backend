


export interface CreateFlashcardSetBody {
    title?: string;
    description?: string;
    numberOfCards: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
    focusAreas?: string[];
    cardType: 'basic' | 'cloze' | 'mixed';
    includeHints: boolean
}


export interface UpdateFlashcardSetBody {
    title?: string;
    description?: string
}

export interface ReviewFlashcardBody {
    quality: number;
    timeTaken: number;
}

export interface FlashcardFilters {
    difficulty?: 'easy' | 'medium' | 'hard';
    cardType?: 'basic' | 'cloze'; // 0-5
    masteryLevel?: number;
    tags?: string[];
    dueOnly?:boolean; // Only cards due for review
    search?: string;
}

export interface StudySessionStats {
    totalCards: number;
    cardsReviewed:number;
    correctAnswers: number;
    incorrectAnswers: number;
    accuracy: number;
    averageTime: number;
    durationMinutes: number;
}

export interface SpacedRepetitionData {
    masteryLevel: number  // 0 = new, 1-5 = learning stages
    easeFactor: number;  // 1.3 to 2.5
    interval: number;   // days until next review
    nextReviewDate: Date | null;
    reviewCount: number;
    correctCount: number;
    incorrectCount: number;
}


export interface FlashcardReviewResult {
    cardId: string;
    previewMasteryLevel: number;
    newMasteryLevel: number;
    previousInterval: number;
    newInterval: number;
    nextReviewDate: Date;
    wasCorrect: boolean;
}