import 'reflect-metadata';
import express from 'express';
import { initializeDatabase, AppDataSource } from './config/database';
import {
  Receipt,
  StockSnapshot,
  RestockPhoto,
  RefundRecord,
  SupplierBillItem,
  ExceptionRecord,
  AuditLog,
  FailedRecord
} from './entities';
import { AuditService } from './services/AuditService';
import { ReceiptService } from './services/ReceiptService';
import { ReportService } from './services/ReportService';
import { AutoCheckService } from './services/AutoCheckService';
import { ReceiptController } from './controllers/ReceiptController';
import { ReportController } from './controllers/ReportController';
import { AutoCheckController } from './controllers/AutoCheckController';
import { createRoutes } from './routes';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await initializeDatabase();

    const receiptRepository = AppDataSource.getRepository(Receipt);
    const stockSnapshotRepository = AppDataSource.getRepository(StockSnapshot);
    const restockPhotoRepository = AppDataSource.getRepository(RestockPhoto);
    const refundRecordRepository = AppDataSource.getRepository(RefundRecord);
    const supplierBillItemRepository = AppDataSource.getRepository(SupplierBillItem);
    const exceptionRepository = AppDataSource.getRepository(ExceptionRecord);
    const auditLogRepository = AppDataSource.getRepository(AuditLog);
    const failedRecordRepository = AppDataSource.getRepository(FailedRecord);

    const entityManager = AppDataSource.manager;

    const auditService = new AuditService(auditLogRepository);
    const receiptService = new ReceiptService(
      receiptRepository,
      stockSnapshotRepository,
      restockPhotoRepository,
      refundRecordRepository,
      supplierBillItemRepository,
      exceptionRepository,
      failedRecordRepository,
      auditService,
      entityManager
    );
    const reportService = new ReportService(
      receiptRepository,
      stockSnapshotRepository,
      exceptionRepository
    );
    const autoCheckService = new AutoCheckService(
      receiptRepository,
      stockSnapshotRepository,
      refundRecordRepository,
      failedRecordRepository,
      auditLogRepository,
      exceptionRepository,
      entityManager
    );

    const receiptController = new ReceiptController(receiptService);
    const reportController = new ReportController(reportService);
    const autoCheckController = new AutoCheckController(autoCheckService);

    const app = express();

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    const routes = createRoutes(receiptController, reportController, autoCheckController);
    app.use('/api', routes);

    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({
        success: false,
        error: err.message || '服务器内部错误'
      });
    });

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   智能柜补货异常回执状态机 API 服务已启动                         ║
║                                                                ║
║   服务地址: http://localhost:${PORT}                             ║
║   健康检查: http://localhost:${PORT}/api/health                  ║
║                                                                ║
║   API 文档:                                                     ║
║   - POST   /api/receipts              创建回执批次               ║
║   - GET    /api/receipts              回执列表                  ║
║   - GET    /api/receipts/:id          回执详情                  ║
║   - PUT    /api/receipts/:id          更新回执                  ║
║   - POST   /api/receipts/:id/transition 状态流转               ║
║   - POST   /api/receipts/:id/attachments  添加附件             ║
║   - POST   /api/receipts/:id/archive    归档                   ║
║   - POST   /api/receipts/:id/revert     撤回                   ║
║                                                                ║
║   - GET    /api/reports/summary        汇总报表                 ║
║   - GET    /api/reports/detail         明细报表                 ║
║   - GET    /api/reports/export/excel   Excel导出               ║
║   - GET    /api/reports/export/csv     CSV导出                 ║
║                                                                ║
║   - GET    /api/checks/all             运行所有检查             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

bootstrap();
