import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import db from '../database';
import { RecordStatus, RoleType, RecordType } from '../database/schema';
import { logAuditTrail } from './auditService';
import { saveFailedRecord } from './failedRecordService';
import { validateStateTransition, ActionType } from './stateMachine';

export interface RechargeRecordInput {
  orderNo: string;
  storeId: string;
  storeName: string;
  memberId: string;
  memberPhone: string;
  amount: number;
  beforeBalance: number;
  afterBalance: number;
  operatorId: string;
  operatorName: string;
  source?: string;
  remark?: string;
}

const rechargeSchema = Joi.object({
  orderNo: Joi.string().required(),
  storeId: Joi.string().required(),
  storeName: Joi.string().required(),
  memberId: Joi.string().required(),
  memberPhone: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
  amount: Joi.number().positive().required(),
  beforeBalance: Joi.number().min(0).required(),
  afterBalance: Joi.number().min(0).required(),
  operatorId: Joi.string().required(),
  operatorName: Joi.string().required(),
  source: Joi.string().optional(),
  remark: Joi.string().optional()
});

export async function createRechargeRecord(
  input: RechargeRecordInput,
  operator: { id: string; name: string; role: RoleType }
): Promise<any> {
  const { error } = rechargeSchema.validate(input);
  if (error) {
    await saveFailedRecord({
      recordType: RecordType.RECHARGE,
      rawData: input,
      errorMessage: error.message,
      errorType: 'validation'
    });
    throw new Error(`数据校验失败: ${error.message}`);
  }

  if (input.beforeBalance + input.amount !== input.afterBalance) {
    await saveFailedRecord({
      recordType: RecordType.RECHARGE,
      rawData: input,
      errorMessage: '储值前后余额不匹配',
      errorType: 'validation'
    });
    throw new Error('储值前后余额不匹配');
  }

  const exists = await checkDuplicateOrder(input.orderNo);
  if (exists) {
    await saveFailedRecord({
      recordType: RecordType.RECHARGE,
      rawData: input,
      errorMessage: '订单号已存在',
      errorType: 'duplicate'
    });
    throw new Error('订单号已存在');
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
      `INSERT INTO recharge_records 
       (id, order_no, store_id, store_name, member_id, member_phone, amount, 
        before_balance, after_balance, operator_id, operator_name, status, 
        source, remark, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id, record.orderNo, record.storeId, record.storeName,
        record.memberId, record.memberPhone, record.amount, record.beforeBalance,
        record.afterBalance, record.operatorId, record.operatorName, record.status,
        record.source, record.remark, record.createdAt, record.updatedAt, record.version
      ],
      async (err) => {
        if (err) {
          await saveFailedRecord({
            recordType: RecordType.RECHARGE,
            rawData: input,
            errorMessage: err.message,
            errorType: 'database'
          });
          reject(err);
        } else {
          await logAuditTrail({
            recordId: record.id,
            recordType: RecordType.RECHARGE,
            action: 'create',
            newStatus: RecordStatus.DRAFT,
            operatorId: operator.id,
            operatorName: operator.name,
            operatorRole: operator.role,
            changeReason: '创建充值流水记录'
          });
          resolve(record);
        }
      }
    );
  });
}

function checkDuplicateOrder(orderNo: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT order_no FROM recharge_records WHERE order_no = ?`,
      [orderNo],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

export async function updateRechargeStatus(
  id: string,
  action: ActionType,
  operator: { id: string; name: string; role: RoleType },
  changeReason: string,
  reviewRemark?: string
): Promise<any> {
  const record = await getRechargeById(id);
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
      `UPDATE recharge_records 
       SET status = ?, updated_at = ?, version = ?
       WHERE id = ? AND version = ?`,
      [newStatus, now, newVersion, id, record.version],
      async (err) => {
        if (err) reject(err);
        else {
          await logAuditTrail({
            recordId: id,
            recordType: RecordType.RECHARGE,
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

export function getRechargeById(id: string): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM recharge_records WHERE id = ?`,
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

export function getRechargeByOrderNo(orderNo: string): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM recharge_records WHERE order_no = ?`,
      [orderNo],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

export function getRechargeList(options?: {
  storeId?: string;
  memberId?: string;
  status?: RecordStatus;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let sql = `SELECT * FROM recharge_records WHERE 1=1`;
    const params: any[] = [];

    if (options?.storeId) {
      sql += ` AND store_id = ?`;
      params.push(options.storeId);
    }
    if (options?.memberId) {
      sql += ` AND member_id = ?`;
      params.push(options.memberId);
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

export function getRechargeSummary(options?: {
  storeId?: string;
  startTime?: number;
  endTime?: number;
}): Promise<any> {
  return new Promise((resolve, reject) => {
    let sql = `SELECT 
      COUNT(*) as total_count,
      SUM(CASE WHEN status = 'audited' THEN amount ELSE 0 END) as verified_amount,
      SUM(CASE WHEN status = 'audited' THEN 1 ELSE 0 END) as verified_count,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
      SUM(CASE WHEN status IN ('draft', 'submitted', 'confirmed') THEN 1 ELSE 0 END) as pending_count
      FROM recharge_records WHERE 1=1`;
    const params: any[] = [];

    if (options?.storeId) {
      sql += ` AND store_id = ?`;
      params.push(options.storeId);
    }
    if (options?.startTime) {
      sql += ` AND created_at >= ?`;
      params.push(options.startTime);
    }
    if (options?.endTime) {
      sql += ` AND created_at <= ?`;
      params.push(options.endTime);
    }

    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}
