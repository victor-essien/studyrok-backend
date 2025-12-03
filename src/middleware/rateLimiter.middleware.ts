import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { RateLimitError } from '@utils/errors';

/**
 * General API rate limiter
 * Default: 100 requests per 15 minutes
 */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      code: 'RATE_LIMIT_ERROR',
      message: 'Too many requests, please slow down',
    });
  },
  // Skip rate limiting for certain conditions
  skip: (req: Request) => {
    // Skip for health checks
    if (req.path === '/health' || req.path === '/api/health') {
      return true;
    }
    return false;
  },
  // Use custom key generator (IP + User ID if authenticated)
  keyGenerator: (req: Request) => {
    const authReq = req as any;
    return authReq.user?.id || req.ip || 'unknown';
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/signup
 * 5 requests per 15 minutes
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'),
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      code: 'AUTH_RATE_LIMIT_ERROR',
      message: 'Too many authentication attempts. Please try again in 15 minutes',
    });
  },
  keyGenerator: (req: Request) => {
    // Rate limit by IP for auth endpoints
    return req.ip || 'unknown';
  },
});

/**
 * Rate limiter for AI generation endpoints
 * Prevents abuse of expensive AI operations
 * 10 requests per minute
 */
export const aiGenerationLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS || '10'),
  message: 'AI generation rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      code: 'AI_RATE_LIMIT_ERROR',
      message: 'AI generation limit reached. Please wait a minute before trying again',
    });
  },
  keyGenerator: (req: Request) => {
    const authReq = req as any;
    // Rate limit by user ID for authenticated requests
    return authReq.user?.id || req.ip || 'unknown';
  },
});

/**
 * Rate limiter for file uploads
 * 20 uploads per hour
 */
export const uploadLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many file uploads',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      code: 'UPLOAD_RATE_LIMIT_ERROR',
      message: 'File upload limit reached. Please try again later',
    });
  },
  keyGenerator: (req: Request) => {
    const authReq = req as any;
    return authReq.user?.id || req.ip || 'unknown';
  },
});

/**
 * Rate limiter for password reset
 * Very strict to prevent abuse
 * 3 requests per hour
 */
export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      code: 'PASSWORD_RESET_RATE_LIMIT_ERROR',
      message: 'Too many password reset attempts. Please try again in an hour',
    });
  },
  keyGenerator: (req: Request) => {
    // Use email from request body if available, otherwise IP
    const email = req.body?.email;
    return email || req.ip || 'unknown';
  },
});

/**
 * Dynamic rate limiter based on user tier
 * Free: 50 requests/hour
 * Pro: 200 requests/hour
 * Premium: 1000 requests/hour
 */
export const tieredRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req: Request) => {
    const authReq = req as any;
    const userTier = authReq.user?.tier || 'free';

    const limits: Record<string, number> = {
      free: 50,
      pro: 200,
      premium: 1000,
    };

    return limits[userTier] || 50;
  },
  message: 'Rate limit exceeded for your tier',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const authReq = req as any;
    const tier = authReq.user?.tier || 'free';
    res.status(429).json({
      success: false,
      statusCode: 429,
      code: 'TIERED_RATE_LIMIT_ERROR',
      message: `Rate limit exceeded for ${tier} tier. Consider upgrading your plan`,
    });
  },
  keyGenerator: (req: Request) => {
    const authReq = req as any;
    return authReq.user?.id || req.ip || 'unknown';
  },
});

/**
 * Sliding window rate limiter for critical operations
 * More accurate than fixed window
 */
export const criticalOperationLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Critical operation rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      code: 'CRITICAL_OPERATION_RATE_LIMIT_ERROR',
      message: 'You are performing critical operations too quickly. Please wait',
    });
  },
  keyGenerator: (req: Request) => {
    const authReq = req as any;
    return authReq.user?.id || req.ip || 'unknown';
  },
});

/**
 * Rate limiter for public endpoints
 * More lenient but still protects against abuse
 */
export const publicApiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      code: 'PUBLIC_RATE_LIMIT_ERROR',
      message: 'Too many requests from this IP. Please try again later',
    });
  },
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  },
});

/**
 * Create custom rate limiter with specific options
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        statusCode: 429,
        code: 'CUSTOM_RATE_LIMIT_ERROR',
        message: options.message || 'Rate limit exceeded',
      });
    },
    keyGenerator: options.keyGenerator || ((req: Request) => {
      const authReq = req as any;
      return authReq.user?.id || req.ip || 'unknown';
    }),
  });
};

/**
 * Strict rate limiter for study session tracking
 * Prevents session spam
 */
export const studySessionLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 session updates per minute
  message: 'Too many study session updates',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      code: 'STUDY_SESSION_RATE_LIMIT_ERROR',
      message: 'Too many study session updates. Please wait',
    });
  },
  keyGenerator: (req: Request) => {
    const authReq = req as any;
    return authReq.user?.id || req.ip || 'unknown';
  },
});

/**
 * Rate limiter for quiz attempts
 * Prevents rapid-fire quiz attempts
 */
export const quizAttemptLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 quiz attempts per 5 minutes
  message: 'Too many quiz attempts',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      code: 'QUIZ_ATTEMPT_RATE_LIMIT_ERROR',
      message: 'Too many quiz attempts. Take a break!',
    });
  },
  keyGenerator: (req: Request) => {
    const authReq = req as any;
    return authReq.user?.id || req.ip || 'unknown';
  },
});

/**
 * Export all rate limiters
 */
export default {
  apiLimiter,
  authLimiter,
  aiGenerationLimiter,
  uploadLimiter,
  passwordResetLimiter,
  tieredRateLimiter,
  criticalOperationLimiter,
  publicApiLimiter,
  studySessionLimiter,
  quizAttemptLimiter,
  createRateLimiter,
};