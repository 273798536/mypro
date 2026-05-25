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
  FailedRecord,
  ApprovalEmail
} from './entities';
import { AuditService } from './services/AuditService';
import { ReceiptService } from './services/ReceiptService';
import { ReportService } from './services/ReportService';
import { AutoCheckService } from './services/AutoCheckService';
import { ApprovalEmailService } from './services/ApprovalEmailService';
import { ReceiptController } from './controllers/ReceiptController';
import { ReportController } from './controllers/ReportController';
import { AutoCheckController } from './controllers/AutoCheckController';
import { ApprovalEmailController } from './controllers/ApprovalEmailController';
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
    const approvalEmailRepository = AppDataSource.getRepository(ApprovalEmail);

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
    const approvalEmailService = new ApprovalEmailService(
      approvalEmailRepository,
      exceptionRepository,
      failedRecordRepository,
      entityManager
    );

    const receiptController = new ReceiptController(receiptService);
    const reportController = new ReportController(reportService);
    const autoCheckController = new AutoCheckController(autoCheckService);
    const approvalEmailController = new ApprovalEmailController(approvalEmailService);

    const app = express();

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    const routes = createRoutes(
      receiptController,
      reportController,
      autoCheckController,
      approvalEmailController,
      autoCheckService
    );
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
║   回执管理:                                                     ║
║   - POST   /api/receipts              创建回执批次(含校验)       ║
║   - GET    /api/receipts              回执列表                  ║
║   - GET    /api/receipts/:id          回执详情                  ║
║   - GET    /api/receipts/batch/:batchNo 按批次号查询           ║
║   - PUT    /api/receipts/:id          更新回执                  ║
║   - POST   /api/receipts/:id/transition 状态流转(含权限校验)   ║
║   - POST   /api/receipts/:id/attachments  添加附件             ║
║   - POST   /api/receipts/:id/archive    归档(需admin)          ║
║   - POST   /api/receipts/:id/revert     撤回(需admin)          ║
║   - GET    /api/receipts/failed-records  失败记录列表          ║
║                                                                ║
║   审批邮件:                                                     ║
║   - POST   /api/approval-emails       导入审批邮件(含校验)      ║
║   - POST   /api/approval-emails/batch 批量导入审批邮件         ║
║   - GET    /api/approval-emails       审批邮件列表              ║
║   - POST   /api/approval-emails/link  关联邮件到回执           ║
║                                                                ║
║   报表导出:                                                     ║
║   - GET    /api/reports/summary        汇总报表                 ║
║   - GET    /api/reports/detail         明细报表                 ║
║   - GET    /api/reports/export/excel   Excel导出               ║
║   - GET    /api/reports/export/csv     CSV导出                 ║
║   - POST   /api/reports/verify-consistency  校验导出一致性     ║
║                                                                ║
║   自动化检查:                                                   ║
║   - GET    /api/checks/all             运行所有检查             ║
║   - GET    /api/checks/duplicate-imports  重复导入检查         ║
║   - GET    /api/checks/exception-retention  异常保留检查       ║
║   - GET    /api/checks/data-consistency   数据一致性检查       ║
║   - GET    /api/checks/stock-overflow     热销格口满仓检查     ║
║   - GET    /api/checks/history-integrity  历史完整性检查       ║
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
