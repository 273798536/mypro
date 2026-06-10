import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { runQuery, runExecute } from '../db/database';
import { AuditLog } from '../types';

export interface AuditLogCreate {
  sampleId?: string;
  batchId?: string;
  operation: string;
  operator: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  ip?: string;
}

export class AuditLogRepository {
  static create(data: AuditLogCreate): AuditLog {
    const id = uuidv4();
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

    runExecute(
      `INSERT INTO audit_logs (
        id, sample_id, batch_id, operation, operator, operate_time,
        field_name, old_value, new_value, reason, ip
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.sampleId || null,
        data.batchId || null,
        data.operation,
        data.operator,
        now,
        data.fieldName || null,
        data.oldValue || null,
        data.newValue || null,
        data.reason || null,
        data.ip || null
      ]
    );

    return this.findById(id)!;
  }

  static findById(id: string): AuditLog | null {
    const results = runQuery('SELECT * FROM audit_logs WHERE id = ?', [id]);
    return results.length > 0 ? this.mapRow(results[0]) : null;
  }

  static findBySampleId(sampleId: string): AuditLog[] {
    const results = runQuery(
      'SELECT * FROM audit_logs WHERE sample_id = ? ORDER BY operate_time DESC',
      [sampleId]
    );
    return results.map(row => this.mapRow(row));
  }

  static findByBatchId(batchId: string): AuditLog[] {
    const results = runQuery(
      'SELECT * FROM audit_logs WHERE batch_id = ? ORDER BY operate_time DESC',
      [batchId]
    );
    return results.map(row => this.mapRow(row));
  }

  static findByOperator(operator: string): AuditLog[] {
    const results = runQuery(
      'SELECT * FROM audit_logs WHERE operator = ? ORDER BY operate_time DESC',
      [operator]
    );
    return results.map(row => this.mapRow(row));
  }

  static findByOperation(operation: string, batchId?: string): AuditLog[] {
    let sql = 'SELECT * FROM audit_logs WHERE operation = ?';
    const params: any[] = [operation];

    if (batchId) {
      sql += ' AND batch_id = ?';
      params.push(batchId);
    }

    sql += ' ORDER BY operate_time DESC';
    const results = runQuery(sql, params);
    return results.map(row => this.mapRow(row));
  }

  static findByFieldChange(fieldName: string, sampleId?: string): AuditLog[] {
    let sql = 'SELECT * FROM audit_logs WHERE field_name = ?';
    const params: any[] = [fieldName];

    if (sampleId) {
      sql += ' AND sample_id = ?';
      params.push(sampleId);
    }

    sql += ' ORDER BY operate_time DESC';
    const results = runQuery(sql, params);
    return results.map(row => this.mapRow(row));
  }

  static findAll(limit?: number): AuditLog[] {
    let sql = 'SELECT * FROM audit_logs ORDER BY operate_time DESC';
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    const results = runQuery(sql);
    return results.map(row => this.mapRow(row));
  }

  static traceSampleChanges(sampleId: string): {
    logs: AuditLog[];
    fieldChanges: Record<string, Array<{ oldValue: string; newValue: string; operator: string; time: string; reason?: string }>>;
  } {
    const logs = this.findBySampleId(sampleId);
    const fieldChanges: Record<string, Array<{ oldValue: string; newValue: string; operator: string; time: string; reason?: string }>> = {};

    for (const log of logs) {
      if (log.fieldName && log.oldValue !== undefined && log.newValue !== undefined) {
        if (!fieldChanges[log.fieldName]) {
          fieldChanges[log.fieldName] = [];
        }
        fieldChanges[log.fieldName].push({
          oldValue: log.oldValue,
          newValue: log.newValue,
          operator: log.operator,
          time: log.operateTime,
          reason: log.reason
        });
      }
    }

    return { logs, fieldChanges };
  }

  private static mapRow(row: any): AuditLog {
    return {
      id: row.id,
      sampleId: row.sample_id,
      batchId: row.batch_id,
      operation: row.operation,
      operator: row.operator,
      operateTime: row.operate_time,
      fieldName: row.field_name,
      oldValue: row.old_value,
      newValue: row.new_value,
      reason: row.reason,
      ip: row.ip
    };
  }
}
