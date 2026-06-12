import { runQuery, runQueryOne, runExecute } from '../database';
import type { HistoryChange } from '@shared/types';
import { generateId } from '@shared/utils';

const toHistoryChange = (row: any): HistoryChange => ({
  id: row.id,
  recordId: row.record_id,
  fieldName: row.field_name,
  oldValue: row.old_value,
  newValue: row.new_value,
  changeType: row.change_type,
  changedBy: row.changed_by,
  changedAt: row.changed_at,
  remark: row.remark
});

export async function getHistoryByRecordId(recordId: string): Promise<HistoryChange[]> {
  const rows = await runQuery(
    'SELECT * FROM history_changes WHERE record_id = ? ORDER BY changed_at DESC',
    [recordId]
  );
  return rows.map(toHistoryChange);
}

export async function getHistoryById(id: string): Promise<HistoryChange | undefined> {
  const row = await runQueryOne('SELECT * FROM history_changes WHERE id = ?', [id]);
  return row ? toHistoryChange(row) : undefined;
}

export async function createHistoryChange(
  data: Omit<HistoryChange, 'id' | 'changedAt'>
): Promise<HistoryChange> {
  const id = generateId();
  const now = new Date().toISOString();
  
  await runExecute(
    `INSERT INTO history_changes 
     (id, record_id, field_name, old_value, new_value, change_type, changed_by, changed_at, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.recordId, data.fieldName, data.oldValue, data.newValue, 
     data.changeType, data.changedBy, now, data.remark]
  );
  
  const history = await getHistoryById(id);
  if (!history) throw new Error('Failed to create history change');
  return history;
}

export async function getHistoryByDateRange(
  startDate: string,
  endDate: string
): Promise<HistoryChange[]> {
  const rows = await runQuery(
    'SELECT * FROM history_changes WHERE changed_at >= ? AND changed_at <= ? ORDER BY changed_at DESC',
    [startDate, endDate]
  );
  return rows.map(toHistoryChange);
}

export async function getWeeklyReviewData(): Promise<{
  totalChanges: number;
  confirmations: number;
  modifications: number;
  records: HistoryChange[];
}> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const records = await getHistoryByDateRange(weekAgo.toISOString(), now.toISOString());
  
  return {
    totalChanges: records.length,
    confirmations: records.filter(r => r.changeType === 'confirm').length,
    modifications: records.filter(r => r.changeType === 'update' || r.changeType === 'status_change').length,
    records
  };
}
