import express from 'express';
import { getDatabase } from './database';
import materialsRouter from './routes/materials';
import costsRouter from './routes/costs';
import auditRouter from './routes/audit';
import exportRouter from './routes/export';
import failedRecordsRouter from './routes/failedRecords';
import dashboardRouter from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/materials', materialsRouter);
app.use('/api/costs', costsRouter);
app.use('/api', auditRouter);
app.use('/api/export', exportRouter);
app.use('/api/failed-records', failedRecordsRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

async function startServer() {
  try {
    const db = getDatabase('./database.sqlite');
    await db.init();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log('API Endpoints:');
      console.log('  GET  /health');
      console.log('  GET  /api/dashboard');
      console.log('  GET  /api/materials');
      console.log('  POST /api/materials');
      console.log('  GET  /api/materials/:id');
      console.log('  POST /api/materials/:id/status');
      console.log('  POST /api/materials/:id/submit');
      console.log('  POST /api/materials/:id/reject');
      console.log('  POST /api/materials/:id/confirm');
      console.log('  GET  /api/materials/:id/history');
      console.log('  POST /api/costs');
      console.log('  POST /api/costs/bulk');
      console.log('  GET  /api/costs/material/:id');
      console.log('  POST /api/audit');
      console.log('  POST /api/comments');
      console.log('  GET  /api/export/csv');
      console.log('  GET  /api/failed-records');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export default app;
