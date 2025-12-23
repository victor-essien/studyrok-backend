// import { Request } from "express";

// export interface GenerateQuizBody {
//     title?: string;
//     numberOfQuestions: number;
//     difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
//     questionTypes?: ('multiple-choice' | 'true-false' | 'short-answer' | 'fill-blank')[];
//   timeLimitMinutes?: number;
//   passingScore?: number;
//   shuffleQuestions?: boolean;
//   shuffleOptions?: boolean;
//   showCorrectAnswer?: boolean;
//   focusAreas?: string[];
// }

// export interface StartQuizBody {
//   shuffleQuestions?: boolean;
//   shuffleOptions?: boolean;
// }

// export interface SubmitQuizBody {
//   answers: Record<string, string>; // questionId: userAnswer
//   timeTakenMinutes: number;
// }

// export interface SubmitAnswerBody {
//   questionId: string;
//   answer: string;
// }

// export interface QuizFilters {
//   difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
//   isCompleted?: boolean;
//   minScore?: number;
//   maxScore?: number;
//   sortBy?: 'createdAt' | 'score' | 'timeTaken';
//   sortOrder?: 'asc' | 'desc';
//   page?: number;
//   limit?: number;
// }

// export interface QuestionResponse {
//   id: string;
//   quizId: string;
//   questionType: string;
//   question: string;
//   options: string[];
//   hint?: string | null;
//   image?: string | null;
//   points: number;
//   difficulty: string;
//   order: number;
//   // Don't send correct answer until quiz is completed
//   correctAnswer?: string;
//   explanation?: string | null;
//   userAnswer?: string | null;
//   isCorrect?: boolean;
//   timeTaken?: number;
// }

// export interface QuizResponse {
//   id: string;
//   studyBoardId: string;
//   userId: string;
//   title: string;
//   description: string | null;
//   numberOfQuestions: number;
//   difficulty: string;
//   timeLimitMinutes: number | null;
//   passingScore: number;
//   shuffleQuestions: boolean;
//   shuffleOptions: boolean;
//   showCorrectAnswer: boolean;
//   status: string;
//   isCompleted: boolean;
//   score: number | null;
//   correctAnswers: number | null;
//   incorrectAnswers: number | null;
//   skippedQuestions: number | null;
//   startedAt: Date | null;
//   completedAt: Date | null;
//   timeTakenMinutes: number | null;
//   createdAt: Date;
//   questions?: QuestionResponse[];
// }

// export interface QuizResultSummary {
//   quizId: string;
//   score: number;
//   percentage: number;
//   correctAnswers: number;
//   incorrectAnswers: number;
//   skippedQuestions: number;
//   totalQuestions: number;
//   timeTakenMinutes: number;
//   passed: boolean;
//   passingScore: number;
//   breakdown: {
//     easy: { correct: number; total: number };
//     medium: { correct: number; total: number };
//     hard: { correct: number; total: number };
//   };
//   questionResults: Array<{
//     questionId: string;
//     question: string;
//     userAnswer: string | null;
//     correctAnswer: string;
//     isCorrect: boolean;
//     explanation: string | null;
//     timeTaken: number | null;
//   }>;
// }

// export interface QuizStats {
//   totalQuizzes: number;
//   completedQuizzes: number;
//   averageScore: number;
//   totalTimeTaken: number;
//   passRate: number;
//   bestScore: number;
//   worstScore: number;
//   difficultyBreakdown: {
//     easy: { completed: number; averageScore: number };
//     medium: { completed: number; averageScore: number };
//     hard: { completed: number; averageScore: number };
//   };
//   recentQuizzes: Array<{
//     quizId: string;
//     title: string;
//     score: number;
//     completedAt: Date;
//   }>;
// }

/**
 * Quiz Types
 */

export interface GenerateQuizBody {
  title?: string;
  numberOfQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes: ('multiple-choice' | 'true-false' | 'short-answer')[];
  timeLimitMinutes?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showCorrectAnswer?: boolean;
  focusAreas?: string[];
}

export interface UpdateQuizBody {
  title?: string;
  description?: string;
  timeLimitMinutes?: number;
  passingScore?: number;
}

export interface SubmitQuizBody {
  answers: Record<string, string>; // questionId -> answer
  timeTakenMinutes: number;
}

export interface QuizFilters {
  page?: number;
  limit?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  isCompleted?: boolean;
  minScore?: number;
  maxScore?: number;
  sortBy?: 'createdAt' | 'score' | 'completedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface QuizAttempt {
  quizId: string;
  userId: string;
  answers: Record<string, string>;
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  timeTakenMinutes: number;
  passed: boolean;
  attemptNumber: number;
  completedAt: Date;
}

export interface QuizStats {
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
  bestScore: number;
  totalTimeTaken: number;
  passRate: number;
  difficultyBreakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface QuestionResponse {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  points: number;
  pointsEarned: number;
}
