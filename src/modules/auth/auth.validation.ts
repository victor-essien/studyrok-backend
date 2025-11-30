// src/modules/auth/auth.validation.ts
import { z, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@utils/errors';

export const signupSchema = z.object({
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

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues .map((e) => e.message).join(', ');
        throw new ValidationError(message);
      }
      next(error);
    }
  };
};