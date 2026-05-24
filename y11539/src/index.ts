import express from 'express';
import path from 'path';
import batchRoutes from './routes/batches';
import materialRoutes from './routes/materials';
import auditRoutes from './routes/audit';
import taskRoutes from './routes/tasks';
import hrbpRoutes from './routes/hrbp';
import { TaskService } from './services/task-service';
import { AsyncTask } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/exports', express.static(path.join(process.cwd(), 'exports')));

app.use('/api/batches', batchRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/hrbp', hrbpRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    name: '企业培训签到权限追责台账服务',
    version: '1.0.0',
    endpoints: {
      batches: '/api/batches',
      materials: '/api/materials',
      audit: '/api/audit',
      tasks: '/api/tasks',
      hrbp: '/api/hrbp'
    },
    health: '/health'
  });
});

TaskService.registerHandler('material_analysis', async (task: AsyncTask) => {
  const payload = JSON.parse(task.payload);
  console.log(`[材料分析任务] 处理材料: ${payload.materialId}`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`[材料分析任务] 完成: ${payload.materialId}`);
});

TaskService.registerHandler('batch_validation', async (task: AsyncTask) => {
  const payload = JSON.parse(task.payload);
  console.log(`[批次校验任务] 处理批次: ${payload.batchId}`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`[批次校验任务] 完成: ${payload.batchId}`);
});

TaskService.registerHandler('export_generation', async (task: AsyncTask) => {
  const payload = JSON.parse(task.payload);
  console.log(`[导出生成任务] 生成导出: ${payload.exportType}`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log(`[导出生成任务] 完成: ${payload.exportType}`);
});

const server = app.listen(PORT, () => {
  console.log(`企业培训签到权限追责台账服务已启动`);
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  TaskService.startWorker(5000);
});

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务...');
  TaskService.stopWorker();
  server.close(() => {
    console.log('服务已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务...');
  TaskService.stopWorker();
  server.close(() => {
    console.log('服务已关闭');
    process.exit(0);
  });
});

export default app;
