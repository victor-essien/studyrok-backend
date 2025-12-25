import { z } from 'zod';

// Create study Board validation

export const createStudyBoardSchema = z.object({
  body: z.object({
    title: z
      .string({
        error: 'Title is required',
      })
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must not exceed 100 characters')
      .trim(),
    description: z
      .string()
      .max(500, 'Description must not exceed 500 characters')
      .trim()
      .optional(),

    subject: z
      .string()
      .max(50, 'Subject must not exceed 50 characters')
      .trim()
      .optional(),

    colorTheme: z
      .enum([
        'purple',
        'blue',
        'green',
        'orange',
        'red',
        'pink',
        'teal',
        'indigo',
      ])
      .default('purple'),
    emoji: z.string().max(10, 'Emoji must not exceed 10 characters').optional(),

    tags: z
      .array(z.string())
      .max(10, 'Maximum 10 tags allowed')
      .optional()
      .default([]),

    isPublic: z.boolean().optional().default(false),
  }),
});

// Add topic based material to study board
export const addTopicMaterialSchema = z.object({
  body: z.object({
    topic: z
      .string({
        error: 'Topic is required',
      })
      .min(3, 'Topic must be at least 3 characters')
      .max(200, 'Topic must not exceed 200 characters')
      .trim(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  }),
});

//  Update study board validation
export const updateStudyBoardSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must not exceed 100 characters')
      .trim()
      .optional(),

    description: z
      .string()
      .max(500, 'Description must not exceed 500 characters')
      .trim()
      .optional(),

    subject: z
      .string()
      .max(50, 'Subject must not exceed 50 characters')
      .trim()
      .optional(),

    colorTheme: z
      .enum([
        'purple',
        'blue',
        'green',
        'orange',
        'red',
        'pink',
        'teal',
        'indigo',
      ])
      .optional(),

    emoji: z.string().max(10, 'Emoji must not exceed 10 characters').optional(),

    tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),

    isPublic: z.boolean().optional(),

    isFavorite: z.boolean().optional(),

    isArchived: z.boolean().optional(),
  }),
});

// Query filters validation

export const studyBoardFiltersSchema = z.object({
  query: z.object({
    subject: z.string().optional(),

    tags: z
      .string()
      .transform((val) => val.split(',').filter(Boolean))
      .optional(),

    isArchived: z
      .string()
      .transform((val) => val === 'true')
      .optional(),

    isFavorite: z
      .string()
      .transform((val) => val === 'true')
      .optional(),

    sourceType: z.enum(['topic', 'upload']).optional(),

    hasMaterial: z
      .string()
      .transform((val) => val === 'true')
      .optional(),

    search: z.string().max(100).optional(),

    sortBy: z
      .enum(['createdAt', 'updatedAt', 'title', 'lastStudiedAt'])
      .optional()
      .default('createdAt'),

    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

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
      .default(10),
  }),
});
