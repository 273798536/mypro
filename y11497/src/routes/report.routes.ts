import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { ReportService } from '../services/report.service';
import { UserRole, RetryCategory, FailureReason } from '../types';
import logger from '../utils/logger';

const router = Router();

router.use(authenticate);

router.get('/summary', requireRole(UserRole.REVIEWER, UserRole.SUPERVISOR, UserRole.READ_ONLY), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status, department, retryCategory, failureReason } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (retryCategory) filter.retryCategory = retryCategory;
    if (failureReason) filter.failureReason = failureReason;

    const summary = ReportService.generateSummary(filter);

    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    logger.error('获取汇总报表失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.get('/dashboard', requireRole(UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const dashboard = ReportService.getManagerDashboard();

    res.json({
      success: true,
      data: dashboard
    });
  } catch (err) {
    logger.error('获取经理看板失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.get('/failed', requireRole(UserRole.REVIEWER, UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status, department } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;
    if (status) filter.status = status;
    if (department) filter.department = department;

    const failedRecords = ReportService.getFailedRecords(filter);

    res.json({
      success: true,
      data: failedRecords
    });
  } catch (err) {
    logger.error('获取失败记录失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.get('/retryable', requireRole(UserRole.REVIEWER, UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const retryable = ReportService.getRetryableRecords();

    res.json({
      success: true,
      data: retryable
    });
  } catch (err) {
    logger.error('获取可重试记录失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.get('/audit-trail/:reimbursementId', requireRole(UserRole.REVIEWER, UserRole.SUPERVISOR, UserRole.READ_ONLY), async (req: Request, res: Response) => {
  try {
    const auditTrail = ReportService.getAuditTrail(req.params.reimbursementId);

    res.json({
      success: true,
      data: auditTrail
    });
  } catch (err) {
    logger.error('获取审计追踪失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.get('/export', requireRole(UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status, department } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;
    if (status) filter.status = status;
    if (department) filter.department = department;

    const filePath = await ReportService.exportToCsv(filter);

    res.json({
      success: true,
      data: { filePath },
      message: '报表导出成功'
    });
  } catch (err) {
    logger.error('导出报表失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.get('/categories', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      retryCategories: Object.values(RetryCategory),
      failureReasons: Object.values(FailureReason),
      descriptions: {
        retryCategories: {
          [RetryCategory.DUPLICATE_DETECTION]: '重复检测 - 检测住宿和交通等重复报销',
          [RetryCategory.MISMATCH_AMOUNT]: '金额不匹配 - 发票金额与申报金额不符',
          [RetryCategory.MISSING_DOCUMENT]: '缺少文件 - 缺少必要的证明材料',
          [RetryCategory.INVALID_DATA]: '数据无效 - 数据格式或内容不合法',
          [RetryCategory.SYSTEM_ERROR]: '系统错误 - 系统处理异常',
          [RetryCategory.CONFLICT_RESOLUTION]: '冲突解决 - 行程或班次冲突'
        },
        failureReasons: {
          [FailureReason.DUPLICATE_ACCOMMODATION]: '重复住宿报销',
          [FailureReason.DUPLICATE_TRANSPORTATION]: '重复交通报销',
          [FailureReason.AMOUNT_MISMATCH]: '金额不匹配',
          [FailureReason.INVOICE_INVALID]: '发票无效',
          [FailureReason.MISSING_APPROVAL]: '缺少审批',
          [FailureReason.TRAVEL_CONFLICT]: '行程冲突',
          [FailureReason.SHIFT_MISMATCH]: '班次不匹配',
          [FailureReason.CURRENCY_ERROR]: '币种错误',
          [FailureReason.EXPIRED_INVOICE]: '发票过期',
          [FailureReason.SYSTEM_ERROR]: '系统错误'
        }
      }
    }
  });
});

export default router;
