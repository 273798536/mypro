import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../database';
import { ChangeRecord } from '../types';

function rowToChangeRecord(row: any): ChangeRecord {
  return {
    id: row.id,
    ledgerId: row.ledger_id,
    version: row.version,
    action: row.action,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    changeReason: row.change_reason,
    beforeData: JSON.parse(row.before_data),
    afterData: JSON.parse(row.after_data),
    diffSummary: row.diff_summary,
    changedFields: JSON.parse(row.changed_fields),
    createdAt: row.created_at
  };
}

export async function createChangeRecord(data: Omit<ChangeRecord, 'id' | 'createdAt'>): Promise<ChangeRecord> {
  const id = uuidv4();
  const now = new Date().toISOString();

  await runQuery(`
    INSERT INTO change_record (
      id, ledger_id, version, action, operator_id, operator_name,
      change_reason, before_data, after_data, diff_summary, changed_fields, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.ledgerId,
    data.version,
    data.action,
    data.operatorId,
    data.operatorName,
    data.changeReason,
    JSON.stringify(data.beforeData),
    JSON.stringify(data.afterData),
    data.diffSummary,
    JSON.stringify(data.changedFields),
    now
  ]);

  return getChangeRecordById(id) as Promise<ChangeRecord>;
}

export async function getChangeRecordById(id: string): Promise<ChangeRecord | null> {
  const row = await getOne('SELECT * FROM change_record WHERE id = ?', [id]);
  return row ? rowToChangeRecord(row) : null;
}

export async function getChangeRecordsByLedgerId(ledgerId: string): Promise<ChangeRecord[]> {
  const rows = await getAll(`
    SELECT * FROM change_record 
    WHERE ledger_id = ? 
    ORDER BY version ASC, created_at ASC
  `, [ledgerId]);
  return rows.map(rowToChangeRecord);
}

export async function getChangeRecordsByOperator(operatorId: string): Promise<ChangeRecord[]> {
  const rows = await getAll(`
    SELECT * FROM change_record 
    WHERE operator_id = ? 
    ORDER BY created_at DESC
  `, [operatorId]);
  return rows.map(rowToChangeRecord);
}
