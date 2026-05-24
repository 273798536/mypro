import express from 'express';
import { initDatabase, closeDatabase } from './database';
import { requireAuth } from './middleware/auth';
import ledgerRoutes from './routes/ledger';
import auditRoutes from './routes/audit';
import taskRoutes from './routes/task';
import exportRoutes from './routes/export';
import { startTaskProcessor, stopTaskProcessor } from './services/taskService';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'meeting-ledger-api'
    }
  });
});

app.use(requireAuth);

app.use('/api/ledgers', ledgerRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/export', exportRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: err.message
  });
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  stopTaskProcessor();
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  stopTaskProcessor();
  await closeDatabase();
  process.exit(0);
});

async function startServer() {
  try {
    await initDatabase();
    startTaskProcessor();

    app.listen(PORT, () => {
      console.log(`会议室占用权限追责台账 API 服务已启动`);
      console.log(`服务地址: http://localhost:${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/health`);
      console.log('');
      console.log('请求头认证信息:');
      console.log('  x-user-id: 用户ID');
      console.log('  x-user-name: 用户名');
      console.log('  x-user-role: 角色 (admin/manager/operator/auditor/guest)');
    });
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }
}

startServer();
