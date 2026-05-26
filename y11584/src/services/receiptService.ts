import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import db from '../database';
import { RecordStatus, RoleType, RecordType } from '../database/schema';
import { logAuditTrail } from './auditService';
import { saveFailedRecord } from './failedRecordService';
import { validateStateTransition, ActionType } from './stateMachine';

export interface ExternalReceiptInput {
  receiptNo: string;
  relatedRecordId: string;
  relatedRecordType: RecordType;
  storeId: string;
  storeName: string;
  receiptType: 'payment' | 'refund' | 'transfer';
  amount: number;
  channel: string;
  channelTransactionId?: string;
  operatorId: string;
  operatorName: string;
  remark?: string;
}

const receiptSchema = Joi.object({
  receiptNo: Joi.string().required(),
  relatedRecordId: Joi.string().required(),
  relatedRecordType: Joi.string().valid('recharge', 'refund', 'handover', 'receipt').required(),
  storeId: Joi.string().required(),
  storeName: Joi.string().required(),
  receiptType: Joi.string().valid('payment', 'refund', 'transfer').required(),
  amount: Joi.number().required(),
  channel: Joi.string().required(),
  channelTransactionId: Joi.string().optional(),
  operatorId: Joi.string().required(),
  operatorName: Joi.string().required(),
  remark: Joi.string().optional()
});

export async function createExternalReceipt(
  input: ExternalReceiptInput,
  operator: { id: string; name: string; role: RoleType }
): Promise<any> {
  const { error } = receiptSchema.validate(input);
  if (error) {
    await saveFailedRecord({
      recordType: RecordType.RECEIPT,
      rawData: input,
      errorMessage: error.message,
      errorType: 'validation'
    });
    throw new Error(`数据校验失败: ${error.message}`);
  }

  const exists = await checkDuplicateReceiptNo(input.receiptNo);
  if (exists) {
    await saveFailedRecord({
      recordType: RecordType.RECEIPT,
      rawData: input,
      errorMessage: '回执单号已存在',
      errorType: 'duplicate'
    });
    throw new Error('回执单号已存在');
  }

  const now = Date.now();
  const record = {
    id: uuidv4(),
    ...input,
    status: RecordStatus.DRAFT,
    createdAt: now,
    updatedAt: now,
    version: 1
  };

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO external_receipts 
       (id, receipt_no, related_record_id, related_record_type, store_id, store_name,
        receipt_type, amount, channel, channel_transaction_id, operator_id, operator_name,
        status, remark, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id, record.receiptNo, record.relatedRecordId, record.relatedRecordType,
        record.storeId, record.storeName, record.receiptType, record.amount,
        record.channel, record.channelTransactionId, record.operatorId,
        record.operatorName, record.status, record.remark,
        record.createdAt, record.updatedAt, record.version
      ],
      async (err) => {
        if (err) {
          await saveFailedRecord({
            recordType: RecordType.RECEIPT,
            rawData: input,
            errorMessage: err.message,
            errorType: 'database'
          });
          reject(err);
        } else {
          await logAuditTrail({
            recordId: record.id,
            recordType: RecordType.RECEIPT,
            action: 'create',
            newStatus: RecordStatus.DRAFT,
            operatorId: operator.id,
            operatorName: operator.name,
            operatorRole: operator.role,
            changeReason: '创建外部回执'
          });
          resolve(record);
        }
      }
    );
  });
}

function checkDuplicateReceiptNo(receiptNo: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT receipt_no FROM external_receipts WHERE receipt_no = ?`,
      [receiptNo],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

export async function updateReceiptStatus(
  id: string,
  action: ActionType,
  operator: { id: string; name: string; role: RoleType },
  changeReason: string
): Promise<any> {
  const record = await getReceiptById(id);
  if (!record) {
    throw new Error('记录不存在');
  }

  const validation = validateStateTransition(action, record.status as RecordStatus, operator.role);
  if (!validation.valid) {
    throw new Error(validation.error || '状态流转校验失败');
  }

  const transitions: Record<string, RecordStatus> = {
    submit: RecordStatus.SUBMITTED,
    reject: RecordStatus.REJECTED,
    confirm: RecordStatus.CONFIRMED,
    audit: RecordStatus.AUDITED
  };

  const newStatus = transitions[action];
  if (!newStatus) {
    throw new Error('无效的操作');
  }

  const now = Date.now();
  const newVersion = record.version + 1;

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE external_receipts 
       SET status = ?, updated_at = ?, version = ?
       WHERE id = ? AND version = ?`,
      [newStatus, now, newVersion, id, record.version],
      async (err) => {
        if (err) reject(err);
        else {
          await logAuditTrail({
            recordId: id,
            recordType: RecordType.RECEIPT,
            action,
            oldStatus: record.status as RecordStatus,
            newStatus,
            operatorId: operator.id,
            operatorName: operator.name,
            operatorRole: operator.role,
            changeReason
          });
          resolve({ id, status: newStatus, version: newVersion });
        }
      }
    );
  });
}

export function getReceiptById(id: string): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM external_receipts WHERE id = ?`,
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

export function getReceiptList(options?: {
  storeId?: string;
  relatedRecordId?: string;
  relatedRecordType?: RecordType;
  status?: RecordStatus;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let sql = `SELECT * FROM external_receipts WHERE 1=1`;
    const params: any[] = [];

    if (options?.storeId) {
      sql += ` AND store_id = ?`;
      params.push(options.storeId);
    }
    if (options?.relatedRecordId) {
      sql += ` AND related_record_id = ?`;
      params.push(options.relatedRecordId);
    }
    if (options?.relatedRecordType) {
      sql += ` AND related_record_type = ?`;
      params.push(options.relatedRecordType);
    }
    if (options?.status) {
      sql += ` AND status = ?`;
      params.push(options.status);
    }
    if (options?.startTime) {
      sql += ` AND created_at >= ?`;
      params.push(options.startTime);
    }
    if (options?.endTime) {
      sql += ` AND created_at <= ?`;
      params.push(options.endTime);
    }

    sql += ` ORDER BY created_at DESC`;

    if (options?.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }
    if (options?.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
