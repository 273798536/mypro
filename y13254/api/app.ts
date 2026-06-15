import express, {
  type Request,
  type Response,
  type NextFunction
} from 'express';
import cors from 'cors';
import multer, { type Multer } from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import locationsRouter from './routes/locations';
import materialsRouterFactory from './routes/materials';
import itemsRouter from './routes/items';
import feedbacksRouter from './routes/feedbacks';
import consistencyRouter from './routes/consistency';
import timelineRouter from './routes/timeline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload: Multer = multer({ storage });

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/api/locations', locationsRouter);
app.use('/api/materials', materialsRouterFactory(upload));
app.use('/api/items', itemsRouter);
app.use('/api/feedbacks', feedbacksRouter);
app.use('/api/consistency', consistencyRouter);
app.use('/api/timeline', timelineRouter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ code: 0, data: { status: 'ok', ts: new Date().toISOString() }, msg: 'ok' });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ code: 404, data: null, msg: 'API not found' });
});

app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ code: 500, data: null, msg: err.message });
  }
);

export { app };
export default app;
