// // src/utils/logger.ts
// import winston from 'winston';
// import path from 'path';

// const logFormat = winston.format.combine(
//   winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
//   winston.format.errors({ stack: true }),
//   winston.format.splat(),
//   winston.format.json()
// );

// export const logger = winston.createLogger({
//   level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
//   format: logFormat,
//   transports: [
//     // Write all logs to console
//     new winston.transports.Console({
//       format: winston.format.combine(
//         winston.format.colorize(),
//         winston.format.simple()
//       ),
//     }),
//     // Write all logs to file
//     new winston.transports.File({
//       filename: path.join('logs', 'error.log'),
//       level: 'error',
//     }),
//     new winston.transports.File({
//       filename: path.join('logs', 'combined.log'),
//     }),
//   ],
// });

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom log format
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Console log format (colorized for development)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }

    return msg;
  })
);

/**
 * Log levels
 * error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
 */
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

/**
 * Define transports
 */
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // Error log file
  new winston.transports.File({
    filename: path.join(logsDir, process.env.LOG_FILE_ERROR || 'error.log'),
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 7, // Keep 7 days of logs
  }),

  // Combined log file
  new winston.transports.File({
    filename: path.join(
      logsDir,
      process.env.LOG_FILE_COMBINED || 'combined.log'
    ),
    maxsize: 10485760, // 10MB
    maxFiles: 7, // Keep 7 days of logs
  }),
];

/**
 * Create Winston logger instance
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || level(),
  format: logFormat,
  transports,
  exitOnError: false,
});

/**
 * Stream for Morgan HTTP logging
 */
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Log database queries in development
 */
export const logQuery = (query: string, params?: any, duration?: number) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Database Query:', {
      query,
      params,
      duration: duration ? `${duration}ms` : undefined,
    });
  }
};

/**
 * Log API requests
 */
export const logRequest = (
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  userId?: string
) => {
  const level =
    statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger.log(level, 'API Request', {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    userId,
  });
};

/**
 * Log errors with context
 */
export const logError = (
  error: Error,
  context?: {
    userId?: string;
    url?: string;
    method?: string;
    body?: any;
    query?: any;
  }
) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

/**
 * Log authentication events
 */
export const logAuth = (
  event: 'signup' | 'login' | 'logout' | 'password_reset' | 'token_refresh',
  userId?: string,
  details?: any
) => {
  logger.info('Auth Event', {
    event,
    userId,
    timestamp: new Date(),
    ...details,
  });
};

/**
 * Log AI operations
 */
export const logAI = (
  operation:
    | 'flashcard_generation'
    | 'quiz_generation'
    | 'note_generation'
    | 'video_generation',
  userId: string,
  details: {
    tokensUsed?: number;
    duration?: number;
    model?: string;
    success?: boolean;
    error?: string;
  }
) => {
  logger.info('AI Operation', {
    operation,
    userId,
    timestamp: new Date(),
    ...details,
  });
};

/**
 * Log file operations
 */
export const logFile = (
  operation: 'upload' | 'download' | 'delete' | 'process',
  userId: string,
  details: {
    filename?: string;
    size?: number;
    mimeType?: string;
    success?: boolean;
    error?: string;
  }
) => {
  logger.info('File Operation', {
    operation,
    userId,
    timestamp: new Date(),
    ...details,
  });
};

/**
 * Log security events
 */
export const logSecurity = (
  event:
    | 'rate_limit'
    | 'suspicious_activity'
    | 'auth_failure'
    | 'unauthorized_access',
  details: {
    ip?: string;
    userId?: string;
    url?: string;
    reason?: string;
  }
) => {
  logger.warn('Security Event', {
    event,
    timestamp: new Date(),
    ...details,
  });
};

/**
 * Log performance metrics
 */
export const logPerformance = (
  operation: string,
  duration: number,
  details?: any
) => {
  if (duration > 1000) {
    // Log slow operations (> 1 second)
    logger.warn('Slow Operation', {
      operation,
      duration: `${duration}ms`,
      ...details,
    });
  } else {
    logger.debug('Performance', {
      operation,
      duration: `${duration}ms`,
      ...details,
    });
  }
};

/**
 * Log database operations
 */
export const logDatabase = (
  operation: 'create' | 'read' | 'update' | 'delete',
  model: string,
  recordId?: string,
  userId?: string
) => {
  logger.info('Database Operation', {
    operation,
    model,
    recordId,
    userId,
    timestamp: new Date(),
  });
};

/**
 * Log cron jobs
 */
export const logCron = (
  jobName: string,
  status: 'started' | 'completed' | 'failed',
  details?: any
) => {
  const level = status === 'failed' ? 'error' : 'info';

  logger.log(level, 'Cron Job', {
    jobName,
    status,
    timestamp: new Date(),
    ...details,
  });
};

/**
 * Log external API calls
 */
export const logExternalAPI = (
  service: string,
  operation: string,
  details: {
    success?: boolean;
    duration?: number;
    statusCode?: number;
    error?: string;
  }
) => {
  const level = details.success === false ? 'error' : 'info';

  logger.log(level, 'External API Call', {
    service,
    operation,
    timestamp: new Date(),
    ...details,
  });
};

/**
 * Create child logger with default metadata
 */
export const createLogger = (defaultMeta: Record<string, any>) => {
  return logger.child(defaultMeta);
};

// Export logger as default
export default logger;
