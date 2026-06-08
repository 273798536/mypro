import './db/index.js';

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { seedDemoData } from './db/seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
const EXPORTS_DIR = path.resolve(__dirname, '../exports');

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/exports', express.static(EXPORTS_DIR));

app.use('/api', apiRoutes);

seedDemoData();

app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'ok',
  });
});

app.use(errorHandler);
app.use(notFoundHandler);

export default app;
