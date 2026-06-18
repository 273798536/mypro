import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import systemRoutes from './routes/system';
import ticketRoutes from './routes/tickets';
import missingCitationRoutes from './routes/missingCitations';
import grayResultRoutes from './routes/grayResults';
import screenshotRoutes from './routes/screenshots';
import exportRoutes from './routes/export';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

app.use('/api/system', systemRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/missing-citations', missingCitationRoutes);
app.use('/api/gray-results', grayResultRoutes);
app.use('/api/screenshots', screenshotRoutes);
app.use('/api/export', exportRoutes);

app.get('/api', (_req, res) => {
  res.json({
    name: '舆情聚类人工改判系统 API',
    version: '1.0.0',
    endpoints: {
      system: '/api/system/*',
      tickets: '/api/tickets/*',
      missing_citations: '/api/missing-citations/*',
      gray_results: '/api/gray-results/*',
      screenshots: '/api/screenshots/*',
      export: '/api/export/*'
    }
  });
});

if (fs.existsSync(distDir)) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   舆情聚类人工改判系统 - 后端服务已启动            ║
  ║   API地址: http://localhost:${PORT}/api             ║
  ║   健康检查: http://localhost:${PORT}/api/system/health║
  ╚═══════════════════════════════════════════════════╝
  `);
});

export default app;
