import { diff } from 'util';
import { z } from 'zod';

export const generateFlashcardSetSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must not exceed 100 characters')
      .optional(),

    description: z
      .string()
      .max(500, 'Description must not exceed 500 characters')
      .optional(),

    numberOfCards: z
      .number({
        error: 'Number of cards is required',
        // invalid_type_error: 'Number of cards must be a number',
      })
      .int('Number of cards must be an integer')
      .min(5, 'Minimum 5 cards')
      .max(100, 'Maximum 100 cards'),

    difficulty: z.enum(['easy', 'medium', 'hard', 'mixed'], {
      error: 'Difficulty level is required',
    }),

    focusArea: z.array(z.string()).max(5, 'Maximum 5 focus areas').optional(),

    cardType: z.enum(['basic', 'cloze', 'mixed'], {
      error: 'Card type is required',
    }),

    includeHints: z.boolean().default(true),
  }),
});

// Update flashcard set validation

export const updateFlashcardSetSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must not exceed 100 characters')
      .optional(),

    description: z
      .string()
      .max(500, 'Description must not exceed 500 characters')
      .optional(),
  }),
});

//  Review flashcard validation

export const reviewFlashcardSchema = z.object({
  body: z.object({
    quality: z
      .number({
        error: 'Quality of response is required',
        // invalid_type_error: 'Quality must be a number',
      })
      .int('Quality must be an integer')
      .min(0, 'Quality must be between 0 and 5')
      .max(5, 'Quality must be between 0 and 5'),

    timeTaken: z
      .number({
        error: 'Time taken is required',
      })
      .int('Time taken must be an integer')
      .min(1, 'Time taken must be at least 1 second')
      .max(600, 'Time taken must not exceed 600 seconds'),
  }),
});

// Create manual flashcard validation

export const createManualFlashcardSchema = z.object({
  body: z.object({
    front: z
      .string({
        error: 'Front content is required',
      })
      .min(1, 'Front content cannot be empty')
      .max(500, 'Front content must not exceed 500 characters'),

    back: z
      .string({
        error: 'Back content is required',
      })
      .min(1, 'Back content cannot be empty')
      .max(1000, 'Back content must not exceed 1000 characters'),

    hints: z
      .string()
      .max(300, 'Hints must not exceed 300 characters')
      .optional(),

    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),

    cardType: z.enum(['basic', 'cloze']).default('basic'),

    tags: z.array(z.string()).max(10, 'Maximum 10 tags').optional(),
  }),
});

//  Update flashcard validation

export const updateFlashcardSchema = z.object({
  body: z.object({
    front: z
      .string()
      .min(1, 'Front content cannot be empty')
      .max(500, 'Front content must not exceed 500 characters')
      .optional(),

    back: z
      .string()
      .min(1, 'Back content cannot be empty')
      .max(1000, 'Back content must not exceed 1000 characters')
      .optional(),

    hint: z.string().max(300, 'Hint must not exceed 300 characters').optional(),

    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),

    tags: z.array(z.string()).max(10, 'Maximum 10 tags').optional(),
  }),
});

// FLascard filters validation
export const flashcardFiltersSchema = z.object({
  query: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),

    cardType: z.enum(['basic', 'cloze']).optional(),

    masteryLevel: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(0).max(5))
      .optional(),

    tags: z
      .string()
      .transform((val) => val.split(',').filter(Boolean))
      .optional(),

    dueOnly: z
      .string()
      .transform((val) => val === 'true')
      .optional(),

    search: z.string().max(100).optional(),

    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1))
      .optional()
      .default(1),

    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional()
      .default(20),
  }),
});
