/**
 * Base Application Error
 * All custom errors extend from this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string | undefined;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 400 - Bad Request
 * Used for validation errors and malformed requests
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400, true, 'VALIDATION_ERROR');
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 401 - Unauthorized
 * Used when authentication is required but not provided or invalid
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * 403 - Forbidden
 * Used when user doesn't have permission to access resource
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * 404 - Not Found
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 - Conflict
 * Used when request conflicts with current state (e.g., duplicate email)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, true, 'CONFLICT_ERROR');
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 429 - Too Many Requests
 * Used when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * 500 - Internal Server Error
 * Used for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, false, 'INTERNAL_SERVER_ERROR');
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * 503 - Service Unavailable
 * Used when service is temporarily unavailable (maintenance, overload)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, true, 'SERVICE_UNAVAILABLE');
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * 400 - Bad Request (Specific to invalid data)
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, true, 'BAD_REQUEST');
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 402 - Payment Required
 * Used when user needs to upgrade subscription
 */
export class PaymentRequiredError extends AppError {
  constructor(message: string = 'Payment required to access this feature') {
    super(message, 402, true, 'PAYMENT_REQUIRED');
    Object.setPrototypeOf(this, PaymentRequiredError.prototype);
  }
}

/**
 * 413 - Payload Too Large
 * Used when request body/file is too large
 */
export class PayloadTooLargeError extends AppError {
  constructor(message: string = 'Payload too large') {
    super(message, 413, true, 'PAYLOAD_TOO_LARGE');
    Object.setPrototypeOf(this, PayloadTooLargeError.prototype);
  }
}

/**
 * 415 - Unsupported Media Type
 * Used when file type is not supported
 */
export class UnsupportedMediaTypeError extends AppError {
  constructor(message: string = 'Unsupported media type') {
    super(message, 415, true, 'UNSUPPORTED_MEDIA_TYPE');
    Object.setPrototypeOf(this, UnsupportedMediaTypeError.prototype);
  }
}

/**
 * 422 - Unprocessable Entity
 * Used when request is well-formed but semantically incorrect
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string = 'Unprocessable entity') {
    super(message, 422, true, 'UNPROCESSABLE_ENTITY');
    Object.setPrototypeOf(this, UnprocessableEntityError.prototype);
  }
}

/**
 * Database specific errors
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database error occurred') {
    super(message, 500, false, 'DATABASE_ERROR');
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * External API errors
 */
export class ExternalAPIError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `External service ${service} error`,
      502,
      true,
      'EXTERNAL_API_ERROR'
    );
    Object.setPrototypeOf(this, ExternalAPIError.prototype);
  }
}

/**
 * AI Service specific errors
 */
export class AIServiceError extends AppError {
  constructor(message: string = 'AI service error') {
    super(message, 500, true, 'AI_SERVICE_ERROR');
    Object.setPrototypeOf(this, AIServiceError.prototype);
  }
}

/**
 * File processing errors
 */
export class FileProcessingError extends AppError {
  constructor(message: string = 'Error processing file') {
    super(message, 500, true, 'FILE_PROCESSING_ERROR');
    Object.setPrototypeOf(this, FileProcessingError.prototype);
  }
}

/**
 * Storage service errors
 */
export class StorageError extends AppError {
  constructor(message: string = 'Storage service error') {
    super(message, 500, true, 'STORAGE_ERROR');
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}
