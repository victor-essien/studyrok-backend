import express from 'express'
import { logger } from './utils/logger';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message:string) => logger.info(message.trim())} }));
app.use(cookieParser());
app.get('/', (req, res) => {
    res.status(200).send('Studyrok API')
})


export default app;