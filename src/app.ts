import express from 'express';
import { logger } from './utils/logger';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { authRoutes } from './modules/auth';
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan('combined', {
    stream: { write: (message: string) => logger.info(message.trim()) },
  })
);
app.use(cookieParser());

// Global rate limiting
// app.use('/api', apiLimiter);

// auth routes
app.use('/api/auth', authRoutes);

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
app.get('/', (req, res) => {
  res.status(200).send('Studyrok API');
});

export default app;
