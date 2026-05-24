import { createApiServer } from './api/server';

const PORT = process.env.PORT || 3000;
const workDir = process.env.WORK_DIR || process.cwd();

const app = createApiServer(workDir);

app.listen(PORT, () => {
  console.log(`线下展会物料巡检API服务已启动`);
  console.log(`端口: ${PORT}`);
  console.log(`工作目录: ${workDir}`);
  console.log('');
  console.log('API端点:');
  console.log('  GET  /health                 健康检查');
  console.log('  POST /api/import             导入数据');
  console.log('  POST /api/check              检查数据');
  console.log('  GET  /api/report             获取报告');
  console.log('  GET  /api/batches            批次列表');
  console.log('  GET  /api/batches/:id        批次详情');
  console.log('  GET  /api/history/:code      物料历史');
  console.log('  GET  /api/audit-logs         审计日志');
  console.log('  GET  /api/failed-records     失败记录');
  console.log('  PATCH /api/failed-records/:id 更新失败记录');
  console.log('  GET  /api/tasks              任务列表');
  console.log('  POST /api/tasks/retry        重试任务');
  console.log('  POST /api/export             导出数据');
});
