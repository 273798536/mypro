import express from 'express';
import { initializeDatabase } from '../db/data-source';
import { DatabaseService } from '../db/service';
import { StatusLinkEngine } from '../engine/status-link';
import { DataImportService } from '../imports';
import { ReportService } from '../reports';
import { createApiRouter } from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '医疗器械巡检验收回放链路服务运行正常',
    timestamp: new Date().toISOString()
  });
});

async function startServer(): Promise<void> {
  try {
    await initializeDatabase();

    const dbService = new DatabaseService();
    const statusEngine = new StatusLinkEngine(dbService);
    const importService = new DataImportService(dbService);
    const reportService = new ReportService(dbService);

    const apiRouter = createApiRouter(dbService, statusEngine, importService, reportService);
    app.use('/api', apiRouter);

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   医疗器械巡检验收回放链路服务                                ║
║   Medical Device Inspection Chain Service                    ║
║                                                              ║
║   服务地址: http://localhost:${PORT}                           ║
║   健康检查: http://localhost:${PORT}/health                    ║
║   API 路径: http://localhost:${PORT}/api                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });

    setInterval(async () => {
      await statusEngine.runFullStatusCheck();
    }, 3600000);

  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { app, startServer };