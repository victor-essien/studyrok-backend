import express from 'express';
import { logger } from './utils/logger';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { authRoutes } from './modules/auth';
import { boardRoutes } from './modules/studyBoards';
import { flashcardRoutes } from './modules/flashcards';
import fs from 'fs';
import path from 'path';
// import { noteRoutes } from './modules/studyBoards';
import { noteRoutes } from './modules/noteGeneration';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
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

const swaggerDocument = yaml.load(
  fs.readFileSync(path.join(__dirname, '../docs/openapi.yaml'), 'utf8')
);
// app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Global rate limiting
// app.use('/api', apiLimiter);

// auth routes
app.use('/api/auth', authRoutes);

// study board routes
app.use('/api/v1', boardRoutes);

// notes routes
app.use('/api/note', noteRoutes);

// flashcard routes
app.use('/api/flashcards', flashcardRoutes);

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
app.get('/', (req, res) => {
  res.status(200).send('Studyrok API');
});

export default app;
