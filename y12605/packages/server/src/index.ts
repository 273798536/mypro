import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import taskRoutes from './routes/tasks';
import { seedData } from './seed';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    data: { 
      status: 'ok', 
      service: '儿童几何拼图课堂 - 审核服务',
      version: '1.0.0'
    } 
  });
});

app.use('/api/tasks', taskRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    validationErrors: [{
      field: 'server',
      message: err.message || '发生未知错误',
      suggestion: '请稍后重试，如果问题持续请联系技术支持'
    }]
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    validationErrors: [{
      field: 'path',
      message: `路径 ${req.path} 不存在`,
      suggestion: '请检查API路径是否正确'
    }]
  });
});

seedData();

app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('  儿童几何拼图课堂 - 后端服务');
  console.log('========================================');
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`  API 文档: http://localhost:${PORT}/api/health`);
  console.log('========================================');
  console.log('  可用接口:');
  console.log('  GET    /api/tasks          - 获取任务列表');
  console.log('  GET    /api/tasks/levels   - 获取关卡列表');
  console.log('  POST   /api/tasks          - 创建任务');
  console.log('  GET    /api/tasks/:id      - 获取任务详情');
  console.log('  POST   /api/tasks/:id/undo - 撤销操作');
  console.log('  POST   /api/tasks/:id/redo - 重做操作');
  console.log('  POST   /api/tasks/:id/export - 导出报告');
  console.log('========================================\n');
});
