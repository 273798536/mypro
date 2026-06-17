import express, { Request, Response } from 'express';
import path from 'path';
import { initDatabase } from './database';
import { loadSampleData, isSampleDataLoaded } from './data/sampleData';
import evaluationSetsRouter from './routes/evaluationSets';
import vocabulariesRouter from './routes/vocabularies';
import reportsRouter from './routes/reports';
import exportRouter from './routes/export';
import { successResponse, errorResponse } from './utils/response';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  successResponse(res, {
    service: '领域词表覆盖报告服务',
    version: '1.0.0',
    status: 'running',
    sample_data_loaded: isSampleDataLoaded(),
    endpoints: {
      'GET /api/evaluation-sets': '评测集列表',
      'GET /api/vocabularies': '领域词表列表',
      'GET /api/reports': '报告列表',
      'GET /api/export/:id': '导出报告',
    },
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  successResponse(res, { status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/sample-data/check', (req: Request, res: Response) => {
  successResponse(res, { loaded: isSampleDataLoaded() });
});

app.post('/api/sample-data/load', (req: Request, res: Response) => {
  try {
    if (isSampleDataLoaded()) {
      successResponse(res, { loaded: true, newly_created: false }, '示例数据已存在');
      return;
    }
    loadSampleData();
    successResponse(res, { loaded: true, newly_created: true }, '示例数据加载成功');
  } catch (e) {
    errorResponse(res, (e as Error).message, 500);
  }
});

app.use('/api/evaluation-sets', evaluationSetsRouter);
app.use('/api/vocabularies', vocabulariesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/export', exportRouter);

app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  console.error('[Error]', err);
  if (res.headersSent) {
    return next(err);
  }
  errorResponse(
    res,
    err.message || '服务器内部错误',
    err.statusCode || 500,
    err.details
  );
});

app.use((req: Request, res: Response) => {
  errorResponse(res, `接口不存在: ${req.method} ${req.path}`, 404);
});

export async function startServer() {
  await initDatabase();
  loadSampleData();

  app.listen(PORT, () => {
    console.log(`
========================================
  领域词表覆盖报告服务已启动
  端口: ${PORT}
  数据库: ${path.join(process.cwd(), 'data', 'coverage_report.db')}
  示例数据: ${isSampleDataLoaded() ? '已加载' : '未加载'}
========================================
`);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('启动失败:', err);
    process.exit(1);
  });
}

export default app;
