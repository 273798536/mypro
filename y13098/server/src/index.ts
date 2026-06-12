import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import corridorsRouter from './routes/corridors';
import recordsRouter from './routes/records';
import exportRouter from './routes/export';
import historyRouter from './routes/history';
import usersRouter from './routes/users';
import { initDatabase } from './database';

const app = express();
const PORT = process.env.PORT || 3001;

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/corridors', corridorsRouter);
app.use('/api/records', recordsRouter);
app.use('/api/export', exportRouter);
app.use('/api/history', historyRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API Health: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

export default app;
