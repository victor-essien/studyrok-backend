import { Request, Response, NextFunction } from 'express';
import {z,  ZodError } from 'zod';
import { ValidationError } from '@utils/errors';

/**
 * Validation middleware using Zod schemas
 * Validates request body, params, and query against provided schema
 */
export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the request data
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into readable messages
        const formattedErrors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        const errorMessage = formattedErrors
          .map((err) => `${err.field}: ${err.message}`)
          .join(', ');

        return next(new ValidationError(errorMessage));
      }
      
      next(error);
    }
  };
};

/**
 * Validate file uploads
 */
// export const validateFileUpload = (options: {
//   required?: boolean;
//   maxSize?: number; // in bytes
//   allowedMimeTypes?: string[];
//   allowedExtensions?: string[];
// }) => {
//   const {
//     required = false,
//     maxSize = 50 * 1024 * 1024, // 50MB default
//     allowedMimeTypes = [
//       'application/pdf',
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//       'text/plain',
//     ],
//     allowedExtensions = ['.pdf', '.docx', '.txt'],
//   } = options;

//   return (req: Request, res: Response, next: NextFunction) => {
//     const file = req.file;

//     // Check if file is required
//     if (required && !file) {
//       return next(new ValidationError('File upload is required'));
//     }

//     // If file not provided and not required, continue
//     if (!file) {
//       return next();
//     }

//     // Validate file size
//     if (file.size > maxSize) {
//       return next(
//         new ValidationError(
//           `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`
//         )
//       );
//     }

//     // Validate MIME type
//     if (!allowedMimeTypes.includes(file.mimetype)) {
//       return next(
//         new ValidationError(
//           `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
//         )
//       );
//     }

//     // Validate file extension
//     const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
//     if (!allowedExtensions.includes(fileExtension)) {
//       return next(
//         new ValidationError(
//           `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`
//         )
//       );
//     }

//     next();
//   };
// };

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }

    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }

    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }

    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  if (page < 1) {
    return next(new ValidationError('Page number must be greater than 0'));
  }

  if (limit < 1 || limit > 100) {
    return next(new ValidationError('Limit must be between 1 and 100'));
  }

  // Attach validated values to request
  req.query.page = page.toString();
  req.query.limit = limit.toString();

  next();
};

/**
 * Validate UUID parameters
 */
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[paramName];
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuid || !uuidRegex.test(uuid)) {
      return next(new ValidationError(`Invalid ${paramName} format`));
    }

    next();
  };
};