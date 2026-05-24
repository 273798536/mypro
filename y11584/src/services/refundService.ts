import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import db from '../database';
import { RecordStatus, RoleType, RecordType } from '../database/schema';
import { logAuditTrail } from './auditService';
import { saveFailedRecord } from './failedRecordService';
import { getRechargeByOrderNo } from './rechargeService';

export interface RefundApplicationInput {
  applyNo: string;
  storeId: string;
  storeName: string;
  rechargeOrderNo: string;
  memberId: string;
  memberPhone: string;
  refundAmount: number;
  refundReason: string;
  applicantId: string;
  applicantName: string;
}

const refundSchema = Joi.object({
  applyNo: Joi.string().required(),
  storeId: Joi.string().required(),
  storeName: Joi.string().required(),
  rechargeOrderNo: Joi.string().required(),
  memberId: Joi.string().required(),
  memberPhone: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
  refundAmount: Joi.number().positive().required(),
  refundReason: Joi.string().required(),
  applicantId: Joi.string().required(),
  applicantName: Joi.string().required()
});

export async function createRefundApplication(
  input: RefundApplicationInput,
  operator: { id: string; name: string; role: RoleType }
): Promise<any> {
  const { error } = refundSchema.validate(input);
  if (error) {
    await saveFailedRecord({
      recordType: RecordType.REFUND,
      rawData: input,
      errorMessage: error.message,
      errorType: 'validation'
    });
    throw new Error(`数据校验失败: ${error.message}`);
  }

  const rechargeRecord = await getRechargeByOrderNo(input.rechargeOrderNo);
  if (!rechargeRecord) {
    await saveFailedRecord({
      recordType: RecordType.REFUND,
      rawData: input,
      errorMessage: '关联的充值订单不存在',
      errorType: 'validation'
    });
    throw new Error('关联的充值订单不存在');
  }

  if (input.refundAmount > rechargeRecord.amount) {
    await saveFailedRecord({
      recordType: RecordType.REFUND,
      rawData: input,
      errorMessage: '退款金额不能超过充值金额',
      errorType: 'validation'
    });
    throw new Error('退款金额不能超过充值金额');
  }

  const exists = await checkDuplicateApplyNo(input.applyNo);
  if (exists) {
    await saveFailedRecord({
      recordType: RecordType.REFUND,
      rawData: input,
      errorMessage: '申请单号已存在',
      errorType: 'duplicate'
    });
    throw new Error('申请单号已存在');
  }

  const now = Date.now();
  const record = {
    id: uuidv4(),
    ...input,
    status: RecordStatus.DRAFT,
    inventoryRollback: 0,
    createdAt: now,
    updatedAt: now,
    version: 1
  };

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO refund_applications 
       (id, apply_no, store_id, store_name, recharge_order_no, member_id, 
        member_phone, refund_amount, refund_reason, applicant_id, applicant_name, 
        status, inventory_rollback, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id, record.applyNo, record.storeId, record.storeName,
        record.rechargeOrderNo, record.memberId, record.memberPhone,
        record.refundAmount, record.refundReason, record.applicantId,
        record.applicantName, record.status, record.inventoryRollback,
        record.createdAt, record.updatedAt, record.version
      ],
      async (err) => {
        if (err) {
          await saveFailedRecord({
            recordType: RecordType.REFUND,
            rawData: input,
            errorMessage: err.message,
            errorType: 'database'
          });
          reject(err);
        } else {
          await logAuditTrail({
            recordId: record.id,
            recordType: RecordType.REFUND,
            action: 'create',
            newStatus: RecordStatus.DRAFT,
            operatorId: operator.id,
            operatorName: operator.name,
            operatorRole: operator.role,
            changeReason: '创建退款申请'
          });
          resolve(record);
        }
      }
    );
  });
}

function checkDuplicateApplyNo(applyNo: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT apply_no FROM refund_applications WHERE apply_no = ?`,
      [applyNo],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

export async function updateRefundStatus(
  id: string,
  action: 'submit' | 'reject' | 'confirm' | 'audit',
  operator: { id: string; name: string; role: RoleType },
  changeReason: string,
  reviewRemark?: string,
  inventoryRollback?: boolean
): Promise<any> {
  const record = await getRefundById(id);
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
      `UPDATE refund_applications 
       SET status = ?, reviewer_id = ?, reviewer_name = ?, review_remark = ?, 
           inventory_rollback = ?, updated_at = ?, version = ?
       WHERE id = ? AND version = ?`,
      [
        newStatus, operator.id, operator.name, reviewRemark,
        inventoryRollback ? 1 : 0, now, newVersion, id, record.version
      ],
      async (err) => {
        if (err) reject(err);
        else {
          await logAuditTrail({
            recordId: id,
            recordType: RecordType.REFUND,
            action,
            oldStatus: record.status as RecordStatus,
            newStatus,
            operatorId: operator.id,
            operatorName: operator.name,
            operatorRole: operator.role,
            changeReason,
            changedFields: {
              inventoryRollback: { old: record.inventory_rollback, new: inventoryRollback ? 1 : 0 }
            }
          });
          resolve({ id, status: newStatus, version: newVersion });
        }
      }
    );
  });
}

export function getRefundById(id: string): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM refund_applications WHERE id = ?`,
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

export function getRefundList(options?: {
  storeId?: string;
  rechargeOrderNo?: string;
  status?: RecordStatus;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let sql = `SELECT * FROM refund_applications WHERE 1=1`;
    const params: any[] = [];

    if (options?.storeId) {
      sql += ` AND store_id = ?`;
      params.push(options.storeId);
    }
    if (options?.rechargeOrderNo) {
      sql += ` AND recharge_order_no = ?`;
      params.push(options.rechargeOrderNo);
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

export function getRefundSummary(options?: {
  storeId?: string;
  startTime?: number;
  endTime?: number;
}): Promise<any> {
  return new Promise((resolve, reject) => {
    let sql = `SELECT 
      COUNT(*) as total_count,
      SUM(CASE WHEN status = 'audited' THEN refund_amount ELSE 0 END) as verified_amount,
      SUM(CASE WHEN status = 'audited' THEN 1 ELSE 0 END) as verified_count,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
      SUM(CASE WHEN status IN ('draft', 'submitted', 'confirmed') THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'audited' AND inventory_rollback = 1 THEN 1 ELSE 0 END) as inventory_rolled_back_count
      FROM refund_applications WHERE 1=1`;
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
