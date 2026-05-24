import { v4 as uuidv4 } from 'uuid';
import { run, all } from '../database';
import { ChangeHistory, StatusTransition, BatchStatus } from '../types';

function mapChangeHistoryRow(row: any): ChangeHistory {
  return {
    id: row.id,
    batchId: row.batch_id,
    materialId: row.material_id,
    fieldName: row.field_name,
    oldValue: row.old_value,
    newValue: row.new_value,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
    changeReason: row.change_reason
  };
}

function mapStatusTransitionRow(row: any): StatusTransition {
  return {
    id: row.id,
    batchId: row.batch_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    operatedBy: row.operated_by,
    operatedAt: row.operated_at,
    reason: row.reason
  };
}

export class AuditService {
  static async recordChange(
    batchId: string,
    fieldName: string,
    oldValue: string | undefined,
    newValue: string | undefined,
    changedBy: string,
    changeReason: string,
    materialId?: string
  ): Promise<void> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await run(
      `INSERT INTO change_history (id, batch_id, material_id, field_name, old_value, new_value, changed_by, changed_at, change_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, batchId, materialId || null, fieldName, oldValue || null, newValue || null, changedBy, now, changeReason]
    );
  }

  static async recordStatusTransition(
    batchId: string,
    fromStatus: BatchStatus,
    toStatus: BatchStatus,
    operatedBy: string,
    reason: string
  ): Promise<void> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await run(
      `INSERT INTO status_transitions (id, batch_id, from_status, to_status, operated_by, operated_at, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, batchId, fromStatus, toStatus, operatedBy, now, reason]
    );

    await this.recordChange(
      batchId,
      'status',
      fromStatus,
      toStatus,
      operatedBy,
      reason
    );
  }

  static async getBatchChangeHistory(batchId: string): Promise<ChangeHistory[]> {
    const rows = await all<any>(
      `SELECT * FROM change_history WHERE batch_id = ? ORDER BY changed_at DESC`,
      [batchId]
    );
    return rows.map(r => mapChangeHistoryRow(r));
  }

  static async getBatchStatusTransitions(batchId: string): Promise<StatusTransition[]> {
    const rows = await all<any>(
      `SELECT * FROM status_transitions WHERE batch_id = ? ORDER BY operated_at DESC`,
      [batchId]
    );
    return rows.map(r => mapStatusTransitionRow(r));
  }

  static async getAllChangeHistory(page: number = 1, pageSize: number = 50): Promise<{ data: ChangeHistory[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const rows = await all<any>(
      `SELECT * FROM change_history ORDER BY changed_at DESC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    const total = await all<{ count: number }>(`SELECT COUNT(*) as count FROM change_history`);
    
    return { data: rows.map(r => mapChangeHistoryRow(r)), total: total[0]?.count || 0 };
  }
}
