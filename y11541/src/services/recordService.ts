import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { run, get, all } from '../db/database';
import { MaterialRecord, RecordStatus, ImportSource } from '../types';
import { getCurrentUser } from './userService';

export interface RawRecordData {
  material_id: string;
  material_name: string;
  platform: string;
  record_date: string;
  impressions?: number;
  clicks?: number;
  cost?: number;
  audit_status?: string;
  audit_reason?: string;
  [key: string]: any;
}

export async function findExistingRecord(
  material_id: string,
  platform: string,
  record_date: string,
  source: ImportSource
): Promise<MaterialRecord | null> {
  return get<MaterialRecord>(
    `SELECT * FROM material_records 
     WHERE material_id = ? AND platform = ? AND record_date = ? AND source = ?`,
    [material_id, platform, record_date, source]
  );
}

export async function findByRequestId(request_id: string): Promise<MaterialRecord[]> {
  return all<MaterialRecord>(
    'SELECT * FROM material_records WHERE request_id = ?',
    [request_id]
  );
}

export async function createRecord(
  data: RawRecordData,
  source: ImportSource,
  sourceLine?: number,
  requestId?: string
): Promise<MaterialRecord> {
  const user = await getCurrentUser();
  const id = uuidv4();
  const now = dayjs().toISOString();
  
  await run(
    `INSERT INTO material_records (
      id, source, source_line, material_id, material_name, platform, record_date,
      impressions, clicks, cost, audit_status, audit_reason, status,
      created_by, created_at, updated_at, request_id, raw_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      source,
      sourceLine ?? null,
      data.material_id,
      data.material_name,
      data.platform,
      data.record_date,
      data.impressions ?? null,
      data.clicks ?? null,
      data.cost ?? null,
      data.audit_status ?? null,
      data.audit_reason ?? null,
      'pending',
      user.id,
      now,
      now,
      requestId ?? null,
      JSON.stringify(data)
    ]
  );
  
  return getRecordById(id) as Promise<MaterialRecord>;
}

export async function updateRecord(
  id: string,
  updates: Partial<RawRecordData>,
  reason: string
): Promise<MaterialRecord> {
  const user = await getCurrentUser();
  const record = await getRecordById(id);
  
  if (!record) {
    throw new Error(`记录不存在: ${id}`);
  }
  
  const now = dayjs().toISOString();
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (key in record && (record as any)[key] !== value) {
      updateFields.push(`${key} = ?`);
      updateValues.push(value);
      
      const oldVal = String((record as any)[key] ?? '');
      const newVal = String(value ?? '');
      
      await run(
        `INSERT INTO change_history (id, record_id, field_name, old_value, new_value, changed_by, changed_at, change_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), id, key, oldVal, newVal, user.id, now, reason]
      );
    }
  }
  
  if (updateFields.length > 0) {
    updateFields.push('updated_at = ?');
    updateValues.push(now);
    updateValues.push(id);
    
    await run(
      `UPDATE material_records SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
  }
  
  return getRecordById(id) as Promise<MaterialRecord>;
}

export async function updateRecordStatus(id: string, status: RecordStatus, reason: string): Promise<void> {
  const user = await getCurrentUser();
  const now = dayjs().toISOString();
  
  const record = await getRecordById(id);
  if (record) {
    await run(
      `INSERT INTO change_history (id, record_id, field_name, old_value, new_value, changed_by, changed_at, change_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), id, 'status', record.status, status, user.id, now, reason]
    );
  }
  
  await run(
    'UPDATE material_records SET status = ?, updated_at = ? WHERE id = ?',
    [status, now, id]
  );
}

export async function getRecordById(id: string): Promise<MaterialRecord | null> {
  return get<MaterialRecord>('SELECT * FROM material_records WHERE id = ?', [id]);
}

export async function getRecordsByStatus(status: RecordStatus): Promise<MaterialRecord[]> {
  return all<MaterialRecord>(
    'SELECT * FROM material_records WHERE status = ? ORDER BY created_at DESC',
    [status]
  );
}

export async function getAllRecords(limit: number = 100): Promise<MaterialRecord[]> {
  return all<MaterialRecord>(
    'SELECT * FROM material_records ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

export async function getRecordHistory(recordId: string): Promise<Array<{
  id: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  changed_by: string;
  changed_at: string;
  change_reason: string;
}>> {
  return all(
    'SELECT * FROM change_history WHERE record_id = ? ORDER BY changed_at DESC',
    [recordId]
  );
}
