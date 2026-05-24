import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import db from '../database';
import { RecordStatus, RoleType, RecordType } from '../database/schema';
import { logAuditTrail } from './auditService';
import { saveFailedRecord } from './failedRecordService';

export interface HandoverRecordInput {
  handoverNo: string;
  storeId: string;
  storeName: string;
  previousManagerId: string;
  previousManagerName: string;
  newManagerId: string;
  newManagerName: string;
  handoverDate: number;
  totalBalance: number;
  cashAmount: number;
  pendingRefundCount: number;
  witnessId?: string;
  witnessName?: string;
  remark?: string;
}

const handoverSchema = Joi.object({
  handoverNo: Joi.string().required(),
  storeId: Joi.string().required(),
  storeName: Joi.string().required(),
  previousManagerId: Joi.string().required(),
  previousManagerName: Joi.string().required(),
  newManagerId: Joi.string().required(),
  newManagerName: Joi.string().required(),
  handoverDate: Joi.number().required(),
  totalBalance: Joi.number().min(0).required(),
  cashAmount: Joi.number().min(0).required(),
  pendingRefundCount: Joi.number().integer().min(0).required(),
  witnessId: Joi.string().optional(),
  witnessName: Joi.string().optional(),
  remark: Joi.string().optional()
});

export async function createHandoverRecord(
  input: HandoverRecordInput,
  operator: { id: string; name: string; role: RoleType }
): Promise<any> {
  const { error } = handoverSchema.validate(input);
  if (error) {
    await saveFailedRecord({
      recordType: RecordType.HANDOVER,
      rawData: input,
      errorMessage: error.message,
      errorType: 'validation'
    });
    throw new Error(`数据校验失败: ${error.message}`);
  }

  const exists = await checkDuplicateHandoverNo(input.handoverNo);
  if (exists) {
    await saveFailedRecord({
      recordType: RecordType.HANDOVER,
      rawData: input,
      errorMessage: '交接单号已存在',
      errorType: 'duplicate'
    });
    throw new Error('交接单号已存在');
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
      `INSERT INTO store_handover_records 
       (id, handover_no, store_id, store_name, previous_manager_id, previous_manager_name,
        new_manager_id, new_manager_name, handover_date, total_balance, cash_amount,
        pending_refund_count, status, witness_id, witness_name, remark, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id, record.handoverNo, record.storeId, record.storeName,
        record.previousManagerId, record.previousManagerName,
        record.newManagerId, record.newManagerName, record.handoverDate,
        record.totalBalance, record.cashAmount, record.pendingRefundCount,
        record.status, record.witnessId, record.witnessName, record.remark,
        record.createdAt, record.updatedAt, record.version
      ],
      async (err) => {
        if (err) {
          await saveFailedRecord({
            recordType: RecordType.HANDOVER,
            rawData: input,
            errorMessage: err.message,
            errorType: 'database'
          });
          reject(err);
        } else {
          await logAuditTrail({
            recordId: record.id,
            recordType: RecordType.HANDOVER,
            action: 'create',
            newStatus: RecordStatus.DRAFT,
            operatorId: operator.id,
            operatorName: operator.name,
            operatorRole: operator.role,
            changeReason: '创建门店交接记录'
          });
          resolve(record);
        }
      }
    );
  });
}

function checkDuplicateHandoverNo(handoverNo: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT handover_no FROM store_handover_records WHERE handover_no = ?`,
      [handoverNo],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

export async function updateHandoverStatus(
  id: string,
  action: 'submit' | 'reject' | 'confirm' | 'audit',
  operator: { id: string; name: string; role: RoleType },
  changeReason: string
): Promise<any> {
  const record = await getHandoverById(id);
  if (!record) {
    throw new Error('记录不存在');
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

  if (record.status === RecordStatus.AUDITED) {
    throw new Error('已审计记录不可修改');
  }

  const now = Date.now();
  const newVersion = record.version + 1;

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE store_handover_records 
       SET status = ?, updated_at = ?, version = ?
       WHERE id = ? AND version = ?`,
      [newStatus, now, newVersion, id, record.version],
      async (err) => {
        if (err) reject(err);
        else {
          await logAuditTrail({
            recordId: id,
            recordType: RecordType.HANDOVER,
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

export function getHandoverById(id: string): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM store_handover_records WHERE id = ?`,
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

export function getHandoverList(options?: {
  storeId?: string;
  status?: RecordStatus;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let sql = `SELECT * FROM store_handover_records WHERE 1=1`;
    const params: any[] = [];

    if (options?.storeId) {
      sql += ` AND store_id = ?`;
      params.push(options.storeId);
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
