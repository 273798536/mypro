import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db';
import samplesRouter from './routes/samples';
import importRouter from './routes/import';
import imagesRouter from './routes/images';
import reportsRouter from './routes/reports';

initDb();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/samples', samplesRouter);
app.use('/api/import', importRouter);
app.use('/api/images', imagesRouter);
app.use('/api/reports', reportsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`发酵菌种活性报告系统后端已启动: http://localhost:${PORT}`);
});
