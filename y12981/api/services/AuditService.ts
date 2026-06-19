import db from '../db/database';
import crypto from 'crypto-js';
import { AuditLog, OperationType, AuditChange } from '../../shared/types';

export class AuditService {
  public logOperation(
    operationType: OperationType,
    operatorId: string,
    operatorName: string,
    description: string,
    options: {
      batchId?: string;
      reason?: string;
      snapshotBefore?: string;
      snapshotAfter?: string;
      approverId?: string;
      approverName?: string;
      changes?: AuditChange[];
    } = {}
  ): AuditLog {
    const now = Date.now();
    const id = 'audit-' + crypto.MD5('audit' + now + Math.random()).toString();

    db.prepare(`
      INSERT INTO audit_log 
      (id, operation_type, operator_id, operator_name, timestamp, batch_id, description, 
       reason, snapshot_before, snapshot_after, approver_id, approver_name, changes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      operationType,
      operatorId,
      operatorName,
      now,
      options.batchId || null,
      description,
      options.reason || null,
      options.snapshotBefore || null,
      options.snapshotAfter || null,
      options.approverId || null,
      options.approverName || null,
      options.changes ? JSON.stringify(options.changes) : null
    );

    return {
      id,
      operationType,
      operatorId,
      operatorName,
      timestamp: now,
      batchId: options.batchId,
      description,
      reason: options.reason,
      snapshotBefore: options.snapshotBefore,
      snapshotAfter: options.snapshotAfter,
      approverId: options.approverId,
      approverName: options.approverName,
      changes: options.changes
    };
  }

  public getLogs(options: {
    page?: number;
    pageSize?: number;
    operationType?: OperationType;
    operatorId?: string;
    batchId?: string;
    startDate?: number;
    endDate?: number;
  } = {}): { logs: AuditLog[]; total: number } {
    const { page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;

    const whereConditions: string[] = [];
    const params: any[] = [];

    if (options.operationType) {
      whereConditions.push('operation_type = ?');
      params.push(options.operationType);
    }
    if (options.operatorId) {
      whereConditions.push('operator_id = ?');
      params.push(options.operatorId);
    }
    if (options.batchId) {
      whereConditions.push('batch_id = ?');
      params.push(options.batchId);
    }
    if (options.startDate) {
      whereConditions.push('timestamp >= ?');
      params.push(options.startDate);
    }
    if (options.endDate) {
      whereConditions.push('timestamp <= ?');
      params.push(options.endDate);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    const countSql = `SELECT COUNT(*) as count FROM audit_log ${whereClause}`;
    const total = (db.prepare(countSql).get(...params) as { count: number }).count;

    const sql = `
      SELECT * FROM audit_log 
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(sql).all(...params, pageSize, offset) as any[];

    const logs: AuditLog[] = rows.map(r => ({
      id: r.id,
      operationType: r.operation_type,
      operatorId: r.operator_id,
      operatorName: r.operator_name,
      timestamp: r.timestamp,
      batchId: r.batch_id,
      description: r.description,
      reason: r.reason,
      snapshotBefore: r.snapshot_before,
      snapshotAfter: r.snapshot_after,
      approverId: r.approver_id,
      approverName: r.approver_name,
      changes: r.changes ? JSON.parse(r.changes) : undefined
    }));

    return { logs, total };
  }

  public rollback(batchId: string, operatorId: string, operatorName: string, reason: string) {
    const currentBatch = db.prepare('SELECT * FROM diagnosis_batch WHERE id = ?').get(batchId) as any;
    if (!currentBatch) throw new Error('Batch not found');

    const snapshots = db.prepare(
      'SELECT * FROM version_snapshot WHERE batch_id = ? ORDER BY created_at ASC'
    ).all(batchId) as any[];

    if (snapshots.length < 2) {
      throw new Error('No previous version to rollback');
    }

    const previousSnapshot = snapshots[snapshots.length - 2];
    const currentSnapshot = snapshots[snapshots.length - 1];

    db.prepare('DELETE FROM diagnosis_result WHERE batch_id = ?').run(batchId);
    db.prepare("UPDATE diagnosis_batch SET status = 'pending', raw_data = ? WHERE id = ?").run(
      previousSnapshot.data,
      batchId
    );

    const newSnapshotId = 'snap-' + crypto.MD5('snapshot' + batchId + Date.now()).toString();
    db.prepare(`
      INSERT INTO version_snapshot (id, batch_id, data, checksum, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(newSnapshotId, batchId, previousSnapshot.data, previousSnapshot.checksum, Date.now());

    this.logOperation('rollback', operatorId, operatorName, `回滚批次 ${batchId} 到历史版本`, {
      batchId,
      reason,
      snapshotBefore: currentSnapshot.data,
      snapshotAfter: previousSnapshot.data
    });

    const previousData = JSON.parse(previousSnapshot.data);
    const currentData = JSON.parse(currentSnapshot.data);

    return {
      success: true,
      message: '回滚成功',
      comparison: {
        previousData,
        currentData
      }
    };
  }

  public getSnapshots(batchId: string) {
    const rows = db.prepare(
      'SELECT * FROM version_snapshot WHERE batch_id = ? ORDER BY created_at ASC'
    ).all(batchId) as any[];

    return rows.map(r => ({
      ...r,
      data: JSON.parse(r.data)
    }));
  }

  public confirmDiagnosis(batchId: string, operatorId: string, operatorName: string, reason?: string) {
    this.logOperation('confirm', operatorId, operatorName, `确认批次 ${batchId} 诊断结果`, {
      batchId,
      reason
    });

    return { success: true, message: '确认成功' };
  }
}

export default new AuditService();
