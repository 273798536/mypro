import express from 'express';
import { getDatabase, resetDatabase } from './db/database';
import { MonitoringRepository } from './repositories/monitoringRepository';
import { MonitoringService } from './services/monitoringService';
import { createMonitoringRoutes } from './routes/monitoringRoutes';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
  res.json({
    name: '桥梁索振动频率监测API',
    version: '1.0.0',
    endpoints: {
      'POST /api/seed/sample': '生成样例数据（两阶段完整导入）',
      'POST /api/import/phase1': '第一阶段导入：传感器序列 + 温度记录',
      'POST /api/import/phase2': '第二阶段导入：补录桥索档案，自动重分析',
      'GET /api/details': '查询监测明细列表（支持筛选）',
      'GET /api/details/:id': '查询单条明细及检测历史、变更记录',
      'PATCH /api/details/:id/status': '更新明细状态',
      'GET /api/export': '导出结果（支持 JSON/CSV）',
      'GET /api/statistics': '获取统计概览',
      'GET /api/sensors': '获取传感器列表',
      'GET /api/cables': '获取桥索档案列表',
      'GET /api/batches': '获取导入批次记录',
      'GET /api/details/:id/changes': '获取单条明细的变更历史',
      'DELETE /api/reset': '重置数据库（仅开发环境）'
    },
    boundaryCases: [
      '温度漂移：温度超过历史均值3倍标准差时自动检测',
      '传感器断点：频率或温度数据缺失时标记',
      '风速缺测：风速数据缺失时使用默认模型估算',
      '两阶段导入：补录桥索档案后自动重分析并标记受影响明细'
    ],
    features: [
      '频率校正：温度校正 + 风致振动校正',
      '异常检测：多维度评分机制，原因解释随检测变化',
      '趋势分析：与历史数据对比，自动标记上升/下降趋势',
      '版本追踪：每次重新分析生成新版本检测结果',
      '变更记录：所有字段修改均记录变更日志'
    ]
  });
});

app.delete('/api/reset', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, error: '生产环境禁止重置' });
    }
    await resetDatabase();
    res.json({ success: true, message: '数据库已重置' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

async function startServer() {
  try {
    const db = await getDatabase();
    const repository = new MonitoringRepository(db);
    const service = new MonitoringService(repository);

    const monitoringRoutes = createMonitoringRoutes(repository, service);
    app.use('/api', monitoringRoutes);

    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('服务器错误:', err);
      res.status(500).json({ success: false, error: '服务器内部错误' });
    });

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║  桥梁索振动频率监测后端API服务已启动                          ║
║  服务地址: http://localhost:${PORT}                             ║
║  API文档:  http://localhost:${PORT}/api                         ║
║  健康检查: http://localhost:${PORT}/health                      ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export default app;
