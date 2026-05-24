import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { RecordType, RoleType, RecordStatus } from '../database/schema';

export interface AuditTrailInput {
  recordId: string;
  recordType: RecordType;
  action: string;
  oldStatus?: RecordStatus;
  newStatus: RecordStatus;
  operatorId: string;
  operatorName: string;
  operatorRole: RoleType;
  changeReason?: string;
  changedFields?: Record<string, { old: any; new: any }>;
}

export function logAuditTrail(input: AuditTrailInput): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    const trail = {
      id: uuidv4(),
      record_id: input.recordId,
      record_type: input.recordType,
      action: input.action,
      old_status: input.oldStatus,
      new_status: input.newStatus,
      operator_id: input.operatorId,
      operator_name: input.operatorName,
      operator_role: input.operatorRole,
      change_reason: input.changeReason,
      changed_fields: input.changedFields ? JSON.stringify(input.changedFields) : null,
      created_at: now
    };

    db.run(
      `INSERT INTO audit_trails (id, record_id, record_type, action, old_status, new_status, 
        operator_id, operator_name, operator_role, change_reason, changed_fields, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trail.id, trail.record_id, trail.record_type, trail.action, trail.old_status,
        trail.new_status, trail.operator_id, trail.operator_name, trail.operator_role,
        trail.change_reason, trail.changed_fields, trail.created_at
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function getAuditTrailsByRecord(recordId: string, recordType: RecordType): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM audit_trails WHERE record_id = ? AND record_type = ? ORDER BY created_at DESC`,
      [recordId, recordType],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

export function getAllAuditTrails(options?: {
  startTime?: number;
  endTime?: number;
  operatorRole?: RoleType;
}): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let sql = `SELECT * FROM audit_trails WHERE 1=1`;
    const params: any[] = [];

    if (options?.startTime) {
      sql += ` AND created_at >= ?`;
      params.push(options.startTime);
    }
    if (options?.endTime) {
      sql += ` AND created_at <= ?`;
      params.push(options.endTime);
    }
    if (options?.operatorRole) {
      sql += ` AND operator_role = ?`;
      params.push(options.operatorRole);
    }

    sql += ` ORDER BY created_at DESC`;

    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
