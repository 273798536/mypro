import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import evaluationRoutes from './routes/evaluation.routes';
import csvRoutes from './routes/csv.routes';
import modelVersionRoutes from './routes/model-version.routes';

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    code: 0,
    message: 'success',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: '病历问答灰度对比系统',
    },
  });
});

app.use('/api/evaluations', evaluationRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/model-versions', modelVersionRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    code: 500,
    message: err.message || '服务器内部错误',
  });
});

app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
  });
});

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║   🩺 病历问答灰度对比系统 - 后端服务                        ║
  ║                                                            ║
  ║   服务地址: http://localhost:${PORT}                           ║
  ║   健康检查: http://localhost:${PORT}/api/health                ║
  ║                                                            ║
  ║   API文档:                                                 ║
  ║   GET    /api/evaluations              - 评测记录列表       ║
  ║   GET    /api/evaluations/:id          - 评测记录详情       ║
  ║   GET    /api/evaluations/statistics   - 统计数据           ║
  ║   POST   /api/evaluations              - 创建评测记录       ║
  ║   POST   /api/evaluations/:id/withdraw - 撤回记录           ║
  ║   POST   /api/evaluations/:id/confirm  - 人工确认           ║
  ║   POST   /api/evaluations/:id/revise   - 改判               ║
  ║   POST   /api/csv/import               - CSV导入            ║
  ║   GET    /api/csv/export               - CSV导出            ║
  ║   GET    /api/model-versions           - 模型版本列表       ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
