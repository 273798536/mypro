import 'reflect-metadata';
import express from 'express';
import { initializeDatabase } from './config/database';
import { authMiddleware } from './middleware/auth';
import applicationsRouter from './routes/applications';
import queueRouter from './routes/queue';
import deadLetterRouter from './routes/deadletter';
import exportRouter from './routes/export';
import expressRouter from './routes/express';
import compensationRouter from './routes/compensation';
import receiptsRouter from './routes/receipts';
import { AutomatedCheckService } from './services/AutomatedCheckService';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(authMiddleware);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      user: req.user
    }
  });
});

app.use('/api/applications', applicationsRouter);
app.use('/api/queue', queueRouter);
app.use('/api/dead-letters', deadLetterRouter);
app.use('/api/export', exportRouter);
app.use('/api/express-orders', expressRouter);
app.use('/api/compensations', compensationRouter);
app.use('/api/receipts', receiptsRouter);

app.get('/api/checks', async (req, res) => {
  try {
    const results = await AutomatedCheckService.runAllChecks();
    res.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('未捕获的异常:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    errorMessage: err.message
  });
});

async function startServer() {
  try {
    await initializeDatabase();
    console.log('数据库初始化完成');
    
    console.log('运行自动化检查...');
    const checkResults = await AutomatedCheckService.runAllChecks();
    AutomatedCheckService.printCheckResults(checkResults);
    
    app.listen(PORT, () => {
      console.log(`\n服务已启动: http://localhost:${PORT}`);
      console.log('API 文档:');
      console.log('  GET  /health - 健康检查');
      console.log('  POST /api/applications/submit - 提交借阅申请');
      console.log('  POST /api/applications/batch-submit - 批量提交');
      console.log('  GET  /api/applications/:id - 查询申请详情');
      console.log('  POST /api/applications/:id/withdraw - 撤回申请');
      console.log('  POST /api/applications/:id/resubmit - 重新提交');
      console.log('  POST /api/applications/:id/close - 关闭申请');
      console.log('  POST /api/applications/:id/comments - 添加主管批注');
      console.log('  GET  /api/queue/stats - 队列统计');
      console.log('  GET  /api/queue/pending - 待处理任务');
      console.log('  POST /api/queue/:taskId/freeze - 冻结任务');
      console.log('  POST /api/queue/:taskId/unfreeze - 解冻任务');
      console.log('  POST /api/queue/:taskId/manual - 人工干预');
      console.log('  GET  /api/dead-letters - 死信列表');
      console.log('  POST /api/dead-letters/:id/requeue - 重新入队');
      console.log('  POST /api/export/applications - 导出申请');
      console.log('  GET  /api/checks - 运行自动化检查');
      console.log('\n请求头要求:');
      console.log('  X-User-ID: 用户ID');
      console.log('  X-User-Name: 用户名');
      console.log('  X-User-Role: 角色 (admin/supervisor/operator/viewer)');
    });
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export default app;
