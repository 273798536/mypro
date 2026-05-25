import { Request, Response, NextFunction } from 'express';
import { AutoCheckService } from '../services/AutoCheckService';
import { DataSource } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

export const validateCreateReceipt = (
  autoCheckService: AutoCheckService
) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors: ValidationResult['errors'] = [];

  const { cabinetId, cabinetName, city, stockSnapshots } = req.body;
  const operatorId = req.headers['x-user-id'] as string || 'system';
  const operatorName = req.headers['x-user-name'] as string || '系统';

  if (!cabinetId || typeof cabinetId !== 'string') {
    errors.push({ field: 'cabinetId', message: '柜机ID不能为空且必须是字符串' });
  }

  if (!cabinetName || typeof cabinetName !== 'string') {
    errors.push({ field: 'cabinetName', message: '柜机名称不能为空且必须是字符串' });
  }

  if (!city || typeof city !== 'string') {
    errors.push({ field: 'city', message: '城市不能为空且必须是字符串' });
  }

  if (!stockSnapshots || !Array.isArray(stockSnapshots)) {
    errors.push({ field: 'stockSnapshots', message: '库存快照不能为空且必须是数组' });
  } else if (stockSnapshots.length === 0) {
    errors.push({ field: 'stockSnapshots', message: '库存快照不能为空' });
  } else {
    stockSnapshots.forEach((snapshot: any, index: number) => {
      if (!snapshot.slotId) {
        errors.push({
          field: `stockSnapshots[${index}].slotId`,
          message: '格口ID不能为空',
          value: snapshot
        });
      }
      if (!snapshot.productId) {
        errors.push({
          field: `stockSnapshots[${index}].productId`,
          message: '商品ID不能为空',
          value: snapshot
        });
      }
      if (snapshot.beforeStock === undefined || typeof snapshot.beforeStock !== 'number') {
        errors.push({
          field: `stockSnapshots[${index}].beforeStock`,
          message: '补货前库存必须是数字',
          value: snapshot.beforeStock
        });
      }
      if (snapshot.restockAmount === undefined || typeof snapshot.restockAmount !== 'number') {
        errors.push({
          field: `stockSnapshots[${index}].restockAmount`,
          message: '补货数量必须是数字',
          value: snapshot.restockAmount
        });
      }
      if (snapshot.afterStock === undefined || typeof snapshot.afterStock !== 'number') {
        errors.push({
          field: `stockSnapshots[${index}].afterStock`,
          message: '补货后库存必须是数字',
          value: snapshot.afterStock
        });
      }
      if (!snapshot.snapshotTime) {
        errors.push({
          field: `stockSnapshots[${index}].snapshotTime`,
          message: '快照时间不能为空',
          value: snapshot
        });
      }
    });
  }

  if (errors.length > 0) {
    const batchNo = req.body.batchNo || `VALIDATION_FAILED_${Date.now()}`;
    
    await autoCheckService.recordFailedImport(
      DataSource.CABINET_INVENTORY,
      'VALIDATION_ERROR',
      `输入校验失败: ${errors.map(e => e.message).join('; ')}`,
      { body: req.body, validationErrors: errors },
      batchNo,
      operatorId
    );

    res.status(400).json({
      success: false,
      error: '输入数据校验失败',
      details: errors,
      batchNo
    });
    return;
  }

  next();
};

export const validateStatusTransition = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { newStatus, reason } = req.body;
  const errors: ValidationResult['errors'] = [];

  if (!newStatus) {
    errors.push({ field: 'newStatus', message: '目标状态不能为空' });
  }

  const validStatuses = [
    'draft', 'pending_review', 'reviewing', 'frozen',
    'settled', 'archived', 'rejected'
  ];

  if (newStatus && !validStatuses.includes(newStatus)) {
    errors.push({
      field: 'newStatus',
      message: `目标状态必须是: ${validStatuses.join(', ')}`,
      value: newStatus
    });
  }

  const statusesRequiringReason = ['frozen', 'settled', 'archived', 'rejected'];
  if (newStatus && statusesRequiringReason.includes(newStatus) && !reason) {
    errors.push({
      field: 'reason',
      message: `${newStatus} 状态转换需要提供原因`
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: '状态转换校验失败',
      details: errors
    });
    return;
  }

  next();
};

export const validateApprovalEmailImport = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { emailId, subject, body, fromAddress, emailTime } = req.body;
  const errors: ValidationResult['errors'] = [];

  if (!emailId || typeof emailId !== 'string') {
    errors.push({ field: 'emailId', message: '邮件ID不能为空且必须是字符串' });
  }

  if (!subject || typeof subject !== 'string') {
    errors.push({ field: 'subject', message: '邮件主题不能为空且必须是字符串' });
  }

  if (!body || typeof body !== 'string') {
    errors.push({ field: 'body', message: '邮件内容不能为空且必须是字符串' });
  }

  if (!fromAddress || typeof fromAddress !== 'string') {
    errors.push({ field: 'fromAddress', message: '发件人地址不能为空且必须是字符串' });
  }

  if (!emailTime) {
    errors.push({ field: 'emailTime', message: '邮件时间不能为空' });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: '审批邮件校验失败',
      details: errors
    });
    return;
  }

  next();
};
