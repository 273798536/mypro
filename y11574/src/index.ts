import express from 'express';
import { authenticate } from './middleware/auth';
import recordsRouter from './routes/records';
import exportRouter from './routes/export';
import summaryRouter from './routes/summary';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '客服工单升级权限追责台账 API 运行正常',
    timestamp: new Date().toISOString()
  });
});

app.use(authenticate);

app.use('/api/records', recordsRouter);
app.use('/api/export', exportRouter);
app.use('/api/summary', summaryRouter);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('');
    console.log('可用测试用户:');
    console.log('  录入员:    entry-1');
    console.log('  复核员:    reviewer-1');
    console.log('  主管:      supervisor-1');
    console.log('  只读用户:  readonly-1');
    console.log('');
    console.log('使用示例:');
    console.log('  curl -H "x-user-id: entry-1" http://localhost:3000/health');
  });
}

export default app;
