import 'dotenv/config';
import 'reflect-metadata';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { initializeDatabase } from './database';
import { authMiddleware } from './middleware/auth';
import batchRoutes from './routes/batches';
import auditRoutes from './routes/audit';
import taskRoutes from './routes/tasks';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(authMiddleware);

app.use('/api/batches', batchRoutes);
app.use('/api/audit-trails', auditRoutes);
app.use('/api/tasks', taskRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`社区团购售后权限追责台账 API 服务已启动`);
      console.log(`服务地址: http://localhost:${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('启动服务失败:', error);
    process.exit(1);
  }
}

startServer();
