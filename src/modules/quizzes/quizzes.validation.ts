import z from "zod";


export const generateQuizSchema = z.object({
    body: z.object({
        title: z.string()
        .min(3, 'TItle must be at least 3 characters')
        .max(100, 'Title must not exceed 100 characters')
        .optional(),

         numberOfQuestions: z
      .number({
        error: 'Number of questions is required',
      })
      .int()
      .min(5, 'Minimum 5 questions')
      .max(50, 'Maximum 50 questions'),

    difficulty: z.enum(['easy', 'medium', 'hard', 'mixed'], {
      error: 'Difficulty is required',
    }),

    questionTypes: z
      .array(
        z.enum(['multiple-choice', 'true-false', 'short-answer', 'fill-blank'])
      )
      .min(1, 'At least one question type is required')
      .optional()
      .default(['multiple-choice', 'true-false']),

    timeLimitMinutes: z
      .number()
      .int()
      .min(5, 'Minimum time limit is 5 minutes')
      .max(180, 'Maximum time limit is 180 minutes')
      .optional()
      .nullable(),

    passingScore: z
      .number()
      .int()
      .min(0, 'Passing score must be at least 0')
      .max(100, 'Passing score cannot exceed 100')
      .optional()
      .default(70),

    shuffleQuestions: z.boolean().optional().default(true),

    shuffleOptions: z.boolean().optional().default(true),

    showCorrectAnswer: z.boolean().optional().default(true),

    focusAreas: z
      .array(z.string())
      .max(5, 'Maximum 5 focus areas')
      .optional(),
    })
})


/**
 * Submit quiz validation schema
 */
export const submitQuizSchema = z.object({
  body: z.object({
    answers: z.record(z.string(), z.string()),
    timeTakenMinutes: z
      .number({
        error: 'Time taken is required',
      })
      .int()
      .min(0, 'Time taken cannot be negative'),
  }),
});

export const submitAnswerSchema = z.object({
  body: z.object({
    questionId: z
      .string({
        error: 'Question ID is required',
      })
      .uuid('Invalid question ID format'),

    answer: z.string({
      error: 'Answer is required',
    }),
  }),
});


export const quizFiltersSchema = z.object({
  query: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),

    isCompleted: z
      .string()
      .transform((val) => val === 'true')
      .optional(),

    minScore: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(0).max(100))
      .optional(),

    maxScore: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(0).max(100))
      .optional(),

    sortBy: z
      .enum(['createdAt', 'score', 'timeTaken'])
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