import { getDatabase } from '../db/init';
import type { HistoryRecord, MergeEvidence } from '@shared/types';

export class HistoryRepository {
  private db = getDatabase();

  addHistory(recordId: string, field: string, oldValue: string, newValue: string, operator: string, note?: string): string {
    const id = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.db.prepare(`
      INSERT INTO history_record (id, record_id, field, old_value, new_value, operator, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, recordId, field, oldValue, newValue, operator, note || null);
    return id;
  }

  getByRecordId(recordId: string): HistoryRecord[] {
    return this.db.prepare(`
      SELECT * FROM history_record WHERE record_id = ? ORDER BY operate_time DESC
    `).all(recordId).map((row: any) => ({
      id: row.id,
      recordId: row.record_id,
      field: row.field,
      oldValue: row.old_value || '',
      newValue: row.new_value || '',
      operator: row.operator,
      operateTime: row.operate_time,
      note: row.note || undefined,
    }));
  }

  addMergeEvidence(recordId: string, mergedIds: string[], mergedNames: string[], operator: string, reason: string): string {
    const id = `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.db.prepare(`
      INSERT INTO merge_evidence (id, record_id, merged_ids, merged_names, operator, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      recordId,
      JSON.stringify(mergedIds),
      JSON.stringify(mergedNames),
      operator,
      reason
    );
    return id;
  }

  getMergeEvidence(recordId: string): MergeEvidence | null {
    const row = this.db.prepare(`
      SELECT * FROM merge_evidence WHERE record_id = ?
    `).get(recordId) as any;

    if (!row) return null;

    return {
      id: row.id,
      mergedIds: JSON.parse(row.merged_ids),
      mergedNames: JSON.parse(row.merged_names),
      operator: row.operator,
      operateTime: row.operate_time,
      reason: row.reason,
    };
  }
}
