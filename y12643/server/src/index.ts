import express from 'express';
import cors from 'cors';
import { initDatabase } from './database';
import { seedMockData } from './seedData';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api', routes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message
  });
});

initDatabase();
seedMockData();

app.listen(PORT, () => {
  console.log('');
  console.log('============================================');
  console.log('  平面机构运动演示 - 后端服务已启动');
  console.log('============================================');
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  console.log(`  API 前缀: /api`);
  console.log('');
  console.log('  可用接口:');
  console.log('    GET    /api/layers              - 获取图层列表');
  console.log('    GET    /api/exceptions          - 获取异常列表（支持筛选）');
  console.log('    GET    /api/exceptions/:id      - 获取异常详情');
  console.log('    POST   /api/exceptions          - 导入异常记录');
  console.log('    PUT    /api/exceptions/:id      - 更新异常状态');
  console.log('    GET    /api/exceptions/:id/records - 获取处理历史');
  console.log('    POST   /api/exceptions/:id/records - 添加处理记录');
  console.log('    GET    /api/review              - 获取复核列表');
  console.log('    POST   /api/review/batch        - 批量复核');
  console.log('    GET    /api/review/export       - 导出复核报告');
  console.log('    GET    /api/canvas/overview     - 画布状态概览');
  console.log('============================================');
  console.log('');
});
