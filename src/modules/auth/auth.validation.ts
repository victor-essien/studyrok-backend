// src/modules/auth/auth.validation.ts
import { z, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@utils/errors';

export const signdupSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain uppercase letter')
      .regex(/[a-z]/, 'Password must contain lowercase letter')
      .regex(/[0-9]/, 'Password must contain number'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
  }),
});

export const signupSchema = z.object({
  body: z.object({
    email: z
      .string({
        error: 'Email is required',
      })
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    password: z
      .string({
        error: 'Password is requried',
      })
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must not exceed 100 characters'),
    // .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    // .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    // .regex(/[0-9]/, 'Password must contain at least one number')
    // .regex(
    //   /[^A-Za-z0-9]/,
    //   'Password must contain at least one special character'
    // ),
    name: z
      .string({
        error: 'Name is required',
      })
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must not exceed 50 characters')
      .trim(),
  }),
});

// Login Validation schema

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({
        error: 'Email is required',
      })
      .email('Invalid email format')
      .toLowerCase()
      .trim(),

    password: z
      .string({
        error: 'Password is required',
      })
      .min(1, 'Password is required'),
  }),
});

export const onboardingSchema = z.object({
  body: z.object({
    studyGoal: z
      .enum([
        'stay_consistent',
        'catch_up',
        'prepare_exam',
        'build_understanding',
      ])
      .refine((val) => val, {
        message: 'Study goal is required',
        path: ['studyGoal'],
      }),

    educationLevel: z
      .enum(['high_school', 'college', 'grad_school'])
      .refine((val) => val, {
        message: 'Education level is required',
        path: ['educationLevel'],
      }),
  }),
});
// export const onboardingSchema = z.object({
//   body: z.object({
//     studyGoal: z.enum(
//       ['exam_prep', 'skill_building', 'career_change', 'curiosity'],
//       {
//         required_error: 'Study goal is required',
//         invalid_type_error: 'Invalid study goal',
//       }
//     ),

//     interests: z
//       .array(z.string())
//       .min(1, 'At least one interest is required')
//       .max(10, 'Maximum 10 interests allowed'),

//     learningStyle: z.enum(
//       ['visual', 'auditory', 'kinesthetic', 'reading'],
//       {
//         required_error: 'Learning style is required',
//         invalid_type_error: 'Invalid learning style',
//       }
//     ),
//   }),
// });

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z
      .string({
        error: 'Current password is required',
      })
      .min(1, 'Current password is required'),

    newPassword: z
      .string({
        error: 'New password is required',
      })
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must not exceed 100 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[^A-Za-z0-9]/,
        'Password must contain at least one special character'
      ),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({
        error: 'Email is required',
      })
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z
      .string({
        error: 'Reset token is required',
      })
      .min(1, 'Reset token is required'),

    newPassword: z
      .string({
        error: 'New password is required',
      })
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must not exceed 100 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[^A-Za-z0-9]/,
        'Password must contain at least one special character'
      ),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z
      .string({
        error: 'Refresh token is required',
      })
      .min(1, 'Refresh token is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must not exceed 50 characters')
      .trim()
      .optional(),

    avatar: z.string().url('Invalid avatar URL').optional(),

    interests: z
      .array(z.string())
      .max(10, 'Maximum 10 interests allowed')
      .optional(),

    learningStyle: z
      .enum(['visual', 'auditory', 'kinesthetic', 'reading'])
      .optional(),
  }),
});
// export const validate = (schema: z.ZodSchema) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     try {
//       schema.parse({
//         body: req.body,
//         query: req.query,
//         params: req.params,
//       });
//       next();
//     } catch (error) {
//       if (error instanceof ZodError) {
//         const message = error.issues .map((e) => e.message).join(', ');
//         throw new ValidationError(message);
//       }
//       next(error);
//     }
//   };
// };
