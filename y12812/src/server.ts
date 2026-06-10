import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { initDatabase } from './db/database';
import { checkAndSeedData } from './db/seedData';
import importRoutes from './routes/import';
import reviewRoutes from './routes/review';
import qcRoutes from './routes/qc';
import statusRoutes from './routes/status';
import statisticsRoutes from './routes/statistics';
import reportRoutes from './routes/report';
import auditRoutes from './routes/audit';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/data/exports', express.static(path.join(process.cwd(), 'data', 'exports')));

app.use('/api/import', importRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    await initDatabase();
    checkAndSeedData();

    app.listen(PORT, () => {
      console.log(`种子发芽率统计系统已启动: http://localhost:${PORT}`);
      console.log(`API 文档:`);
      console.log(`  导入:   POST /api/import/batch                     - 创建批次`);
      console.log(`          GET  /api/import/batch                     - 查询所有批次`);
      console.log(`          POST /api/import/batch/:batchId/samples     - 上传样本(文件)`);
      console.log(`          POST /api/import/samples/json               - 上传样本(JSON)`);
      console.log(`          GET  /api/import/batch/:batchId/samples     - 查询批次样本`);
      console.log(`  复核:   POST /api/review/sample/:id                - 复核单条样本`);
      console.log(`          POST /api/review/batch/:batchId/review      - 批量复核`);
      console.log(`          GET  /api/review/pending/:batchId           - 待复核列表`);
      console.log(`  质控:   POST /api/qc/sample/:id                    - 单条质控`);
      console.log(`          POST /api/qc/batch/:batchId                 - 批量质控`);
      console.log(`          GET  /api/qc/results/:batchId               - 质控结果`);
      console.log(`  状态:   POST /api/status/sample/:id                - 单条状态推进`);
      console.log(`          POST /api/status/batch/:batchId             - 批量状态推进`);
      console.log(`          GET  /api/status/valid-next/:id             - 查询可用状态`);
      console.log(`  统计:   GET  /api/statistics/group/:batchId        - 分组统计`);
      console.log(`          GET  /api/statistics/overall/:batchId       - 整体统计`);
      console.log(`          GET  /api/statistics/time-point-completeness/:batchId - 时间点完整性`);
      console.log(`          POST /api/statistics/calculate/:batchId     - 执行统计计算`);
      console.log(`          GET  /api/statistics/abnormal/:batchId      - 异常样本详情`);
      console.log(`  报告:   POST /api/report/export/:batchId           - 导出报告`);
      console.log(`          GET  /api/report/download/:fileName         - 下载报告`);
      console.log(`          GET  /api/report/history/:batchId           - 导出历史`);
      console.log(`          GET  /api/report/preview/:batchId           - 报告预览`);
      console.log(`  审计:   GET  /api/audit/sample/:id                 - 样本审计日志`);
      console.log(`          GET  /api/audit/sample/:id/trace            - 异常追溯(含病理备注)`);
      console.log(`          GET  /api/audit/batch/:batchId              - 批次审计日志`);
      console.log(`          GET  /api/audit/recent                      - 最近审计记录`);
    });
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
}

startServer();
