import { Request, Response, NextFunction } from 'express';
import { ReconciliationService } from '../services/reconciliation';
import { DataImportService } from '../services/dataImport';
import { ExportService } from '../services/export';
import { Operator, DataSourceType, ReceiptStatus, ExportOptions } from '../types';
import { logger } from '../utils/logger';
import * as path from 'path';

const reconciliationService = new ReconciliationService();
const dataImportService = new DataImportService();
const exportService = new ExportService();

const getOperator = (req: Request): Operator => ({
  id: req.headers['x-operator-id'] as string || 'system',
  name: req.headers['x-operator-name'] as string || '系统',
  role: req.headers['x-operator-role'] as string || 'admin'
});

export const createReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operator = getOperator(req);
    const receipt = await reconciliationService.createReceipt(req.body, operator);
    res.status(201).json({ success: true, data: receipt });
  } catch (error) {
    logger.error('创建回执失败:', error);
    next(error);
  }
};

export const getReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const detail = await reconciliationService.getReceiptDetail(id);
    res.json({ success: true, data: detail });
  } catch (error) {
    logger.error('获取回执详情失败:', error);
    next(error);
  }
};

export const listReceipts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplierId, status, batchNo } = req.query;
    const receipts = await reconciliationService.listReceipts({
      supplierId: supplierId as string,
      status: status as ReceiptStatus,
      batchNo: batchNo as string
    });
    res.json({ success: true, data: receipts });
  } catch (error) {
    logger.error('获取回执列表失败:', error);
    next(error);
  }
};

export const submitReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperator(req);
    const receipt = await reconciliationService.submitReceipt(id, operator, reason);
    res.json({ success: true, data: receipt });
  } catch (error) {
    logger.error('提交回执失败:', error);
    next(error);
  }
};

export const submitForReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperator(req);
    const receipt = await reconciliationService.submitForReview(id, operator, reason);
    res.json({ success: true, data: receipt });
  } catch (error) {
    logger.error('提交复核失败:', error);
    next(error);
  }
};

export const approveReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperator(req);
    const receipt = await reconciliationService.approveReceipt(id, operator, reason);
    res.json({ success: true, data: receipt });
  } catch (error) {
    logger.error('审核通过失败:', error);
    next(error);
  }
};

export const rejectReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperator(req);
    const receipt = await reconciliationService.rejectReceipt(id, operator, reason);
    res.json({ success: true, data: receipt });
  } catch (error) {
    logger.error('驳回失败:', error);
    next(error);
  }
};

export const manualModify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { confirmedAmount, abnormalAmount, deductionAmount, manualReason } = req.body;
    const operator = getOperator(req);
    const receipt = await reconciliationService.manualModify(id, operator, {
      confirmedAmount,
      abnormalAmount,
      deductionAmount,
      manualReason
    });
    res.json({ success: true, data: receipt });
  } catch (error) {
    logger.error('人工改判失败:', error);
    next(error);
  }
};

export const freezeReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperator(req);
    const receipt = await reconciliationService.freezeReceipt(id, operator, reason);
    res.json({ success: true, data: receipt });
  } catch (error) {
    logger.error('冻结失败:', error);
    next(error);
  }
};

export const unfreezeReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, targetStatus } = req.body;
    const operator = getOperator(req);
    const receipt = await reconciliationService.unfreezeReceipt(id, operator, reason, targetStatus);
    res.json({ success: true, data: receipt });
  } catch (error) {
    logger.error('解冻失败:', error);
    next(error);
  }
};

export const withdrawReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperator(req);
    const receipt = await reconciliationService.withdrawReceipt(id, operator, reason);
    res.json({ success: true, data: receipt });
  } catch (error) {
    logger.error('撤回失败:', error);
    next(error);
  }
};

export const resubmitAfterWithdraw = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperator(req);
    const receipt = await reconciliationService.resubmitAfterWithdraw(id, operator, reason);
    res.json({ success: true, data: receipt });
  } catch (error) {
    logger.error('重新提交失败:', error);
    next(error);
  }
};

export const archiveReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperator(req);
    const receipt = await reconciliationService.archiveReceipt(id, operator, reason);
    res.json({ success: true, data: receipt });
  } catch (error) {
    logger.error('归档失败:', error);
    next(error);
  }
};

export const uploadAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const operator = getOperator(req);
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请选择要上传的文件' });
    }

    const attachment = await reconciliationService.uploadAttachment(
      id,
      req.file as any,
      operator,
      description
    );
    res.status(201).json({ success: true, data: attachment });
  } catch (error) {
    logger.error('上传附件失败:', error);
    next(error);
  }
};

export const importData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceType, skipHeader } = req.body;
    const operator = getOperator(req);
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请选择要导入的文件' });
    }

    const result = await dataImportService.importFromFile(
      (req.file as any).path,
      sourceType as DataSourceType,
      operator,
      { skipHeader: skipHeader === 'true' }
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('数据导入失败:', error);
    next(error);
  }
};

export const exportData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operator = getOperator(req);
    const options = req.body as ExportOptions;
    
    const { buffer, summary, fileName } = await exportService.generateExport(options, operator);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  } catch (error) {
    logger.error('数据导出失败:', error);
    next(error);
  }
};

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await exportService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('获取统计数据失败:', error);
    next(error);
  }
};
