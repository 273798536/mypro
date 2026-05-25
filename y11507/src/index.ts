import express from 'express';
import queueRoutes from './routes/queue';
import exportRoutes from './routes/export';
import { checkAndUpdateCalibrationStatus } from './services/queueService';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/queue', queueRoutes);
app.use('/api/export', exportRoutes);

setInterval(async () => {
  try {
    const result = await checkAndUpdateCalibrationStatus();
    if (result.updated > 0) {
      console.log(`[定时任务] 已自动更新 ${result.updated} 条过期证书状态`);
    }
  } catch (error) {
    console.error('[定时任务] 证书状态检查失败:', error);
  }
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   医疗器械巡检重试补偿队列 API 服务已启动                   ║
║                                                            ║
║   服务地址: http://localhost:${PORT}                        ║
║                                                            ║
║   可用接口:                                                ║
║   GET  /health                            - 健康检查       ║
║                                                            ║
║   POST /api/queue/submit                  - 提交回执       ║
║   GET  /api/queue                         - 队列列表       ║
║   GET  /api/queue/statistics              - 统计数据       ║
║   GET  /api/queue/manual-intervention     - 人工处理列表   ║
║   GET  /api/queue/dead-letter             - 死信列表       ║
║   GET  /api/queue/:id                     - 队列详情       ║
║   POST /api/queue/:id/retry               - 重试           ║
║   POST /api/queue/:id/assign              - 分配人工       ║
║   POST /api/queue/:id/fix                 - 修正并补偿     ║
║   POST /api/queue/:id/compensate          - 补偿入账       ║
║   POST /api/queue/:id/close               - 关闭           ║
║   POST /api/queue/process                 - 批量处理       ║
║   POST /api/queue/check-calibration       - 检查证书过期   ║
║   POST /api/queue/disable-device/:id      - 停用设备       ║
║                                                            ║
║   GET  /api/export/records                - 统一记录查询   ║
║   GET  /api/export/csv                    - CSV导出        ║
║   GET  /api/export/json                   - JSON导出       ║
║   GET  /api/export/nurse-report           - 护士长报告     ║
║                                                            ║
║   后台任务:                                                ║
║   • 每小时自动检查并更新过期证书状态                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
