import { Request } from 'express';

export interface CreateStudyBoardBody {
  title: string;
  description?: string;
  subject?: string;
  colorTheme?: string;
  emoji?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface AddMaterialBody {
  sourceType: 'topic' | 'upload';
  topic?: string;
}
export interface UpdateStudyBoardBody {
  title?: string;
  description?: string;
  subject?: string;
  colorTheme?: string;
  emoji?: string;
  tags?: string[];
  isPublic?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
}

export interface StudyBoardFilters {
  subject?: string;
  tags?: string[];
  isArchived?: boolean;
  isFavorite?: boolean;
  sourceType?: 'topic' | 'upload';
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'lastStudiedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GeneratedMaterial {
  format: 'markdown';
  content: string;
  wordCount: number;
  readTimeMinutes: number;
  sections: string[];
}

export interface UploadedFile {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  extractedText: string;
  pageCount?: number;
}

export interface StudyBoardResponse {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  subject: string | null;
  sourceType: string | null; // null if no material added yet
  topic: string | null;
  generatedMaterial: GeneratedMaterial | null;
  uploadedFile: UploadedFile | null;
  colorTheme: string;
  thumbnail: string | null;
  emoji: string | null;
  tags: string[];
  isPublic: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  flashcardsCount: number;
  quizzesCount: number;
  videosCount: number;
  totalStudyTime: number;
  lastStudiedAt: Date | null;
  tokensUsed: number;
  aiGenerations: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyBoardStats {
  totalBoards: number;
  archivedBoards: number;
  favoriteBoards: number;
  totalStudyTime: number;
  totalFlashcards: number;
  totalQuizzes: number;
  recentActivity: Array<{
    boardId: string;
    boardTitle: string;
    lastStudied: Date;
  }>;
}
