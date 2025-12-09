import { Response } from 'express';

/**
 * Standard API Response structure
 */
export interface ApiResponseData<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
  error?: {
    code?: string;
    details?: any;
  };
  timestamp: string;
}

/**
 * API Response Class
 */
export class ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: any;
  error?: any;
  timestamp: string;

  constructor(
    statusCode: number,
    message: string,
    data?: any, // T
    meta?: any,
    success: boolean = true
  ) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  statusCode: number = 200,
  message: string = 'Success',
  data?: T,
  meta?: any
): Response => {
  return res
    .status(statusCode)
    .json(new ApiResponse(statusCode, message, data, meta, true));
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  statusCode: number = 500,
  message: string = 'An error occurred',
  error?: {
    code?: string;
    details?: any;
  }
): Response => {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    error,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send paginated response
 */
export const sendPaginatedResponse = <T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  message: string = 'Success'
): Response => {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return res.status(200).json({
    success: true,
    statusCode: 200,
    message,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send created response (201)
 */
export const sendCreated = <T>(
  res: Response,
  message: string = 'Resource created successfully',
  data?: T
): Response => {
  return sendSuccess(res, 201, message, data);
};

/**
 * Send no content response (204)
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Send bad request response (400)
 */
export const sendBadRequest = (
  res: Response,
  message: string = 'Bad request',
  details?: any
): Response => {
  return sendError(res, 400, message, {
    code: 'BAD_REQUEST',
    details,
  });
};

/**
 * Send unauthorized response (401)
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized'
): Response => {
  return sendError(res, 401, message, {
    code: 'UNAUTHORIZED',
  });
};

/**
 * Send forbidden response (403)
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Forbidden'
): Response => {
  return sendError(res, 403, message, {
    code: 'FORBIDDEN',
  });
};

/**
 * Send not found response (404)
 */
export const sendNotFound = (
  res: Response,
  resource: string = 'Resource'
): Response => {
  return sendError(res, 404, `${resource} not found`, {
    code: 'NOT_FOUND',
  });
};

/**
 * Send conflict response (409)
 */
export const sendConflict = (
  res: Response,
  message: string = 'Resource already exists'
): Response => {
  return sendError(res, 409, message, {
    code: 'CONFLICT',
  });
};

/**
 * Send validation error response (422)
 */
export const sendValidationError = (
  res: Response,
  errors: Array<{ field: string; message: string }>
): Response => {
  return sendError(res, 422, 'Validation failed', {
    code: 'VALIDATION_ERROR',
    details: errors,
  });
};

/**
 * Send rate limit response (429)
 */
export const sendRateLimitError = (
  res: Response,
  message: string = 'Too many requests'
): Response => {
  return sendError(res, 429, message, {
    code: 'RATE_LIMIT_ERROR',
  });
};

/**
 * Send internal server error (500)
 */
export const sendInternalError = (
  res: Response,
  message: string = 'Internal server error'
): Response => {
  return sendError(res, 500, message, {
    code: 'INTERNAL_SERVER_ERROR',
  });
};

/**
 * Send service unavailable (503)
 */
export const sendServiceUnavailable = (
  res: Response,
  message: string = 'Service temporarily unavailable'
): Response => {
  return sendError(res, 503, message, {
    code: 'SERVICE_UNAVAILABLE',
  });
};
