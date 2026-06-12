import { runQuery, runQueryOne, runExecute } from '../database';
import type { InspectionRecord, FilterCriteria, PaginatedResponse, HistoryChange, MaterialVersion, ManualNote } from '@shared/types';
import { generateId, detectOverlap } from '@shared/utils';
import { createHistoryChange } from './historyService';

const toRecord = (row: any): InspectionRecord => ({
  id: row.id,
  corridorId: row.corridor_id,
  recordDate: row.record_date,
  recordType: row.record_type,
  title: row.title,
  description: row.description,
  status: row.status,
  isOverlapping: row.is_overlapping === 1,
  confirmedBy: row.confirmed_by,
  confirmedAt: row.confirmed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by
});

function buildFilterWhereClause(filter: FilterCriteria): { sql: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (filter.corridorId) {
    conditions.push('corridor_id = ?');
    params.push(filter.corridorId);
  }
  if (filter.startDate) {
    conditions.push('record_date >= ?');
    params.push(filter.startDate);
  }
  if (filter.endDate) {
    conditions.push('record_date <= ?');
    params.push(filter.endDate);
  }
  if (filter.recordType?.length) {
    conditions.push(`record_type IN (${filter.recordType.map(() => '?').join(',')})`);
    params.push(...filter.recordType);
  }
  if (filter.status?.length) {
    conditions.push(`status IN (${filter.status.map(() => '?').join(',')})`);
    params.push(...filter.status);
  }
  if (filter.isOverlapping !== undefined) {
    conditions.push('is_overlapping = ?');
    params.push(filter.isOverlapping ? 1 : 0);
  }
  if (filter.searchKeyword) {
    conditions.push('(title LIKE ? OR description LIKE ?)');
    const keyword = `%${filter.searchKeyword}%`;
    params.push(keyword, keyword);
  }
  
  return {
    sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

export async function getRecords(
  filter: FilterCriteria,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<InspectionRecord>> {
  const { sql: whereSql, params } = buildFilterWhereClause(filter);
  
  const countRow = await runQueryOne(
    `SELECT COUNT(*) as total FROM inspection_records ${whereSql}`,
    params
  );
  const total = countRow?.total || 0;
  
  const offset = (page - 1) * pageSize;
  const rows = await runQuery(
    `SELECT * FROM inspection_records ${whereSql} ORDER BY record_date DESC, created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  
  return {
    data: rows.map(toRecord),
    total,
    page,
    pageSize
  };
}

export async function getOverlappingRecords(
  filter: FilterCriteria,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<InspectionRecord>> {
  return getRecords({ ...filter, isOverlapping: true }, page, pageSize);
}

export async function getRecordById(id: string): Promise<InspectionRecord | undefined> {
  const row = await runQueryOne('SELECT * FROM inspection_records WHERE id = ?', [id]);
  return row ? toRecord(row) : undefined;
}

export async function createRecord(
  data: Omit<InspectionRecord, 'id' | 'isOverlapping' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<InspectionRecord> {
  const id = generateId();
  const now = new Date().toISOString();
  
  await runExecute(
    `INSERT INTO inspection_records 
     (id, corridor_id, record_date, record_type, title, description, status, 
      is_overlapping, confirmed_by, confirmed_at, created_at, updated_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?, ?)`,
    [id, data.corridorId, data.recordDate, data.recordType, data.title, 
     data.description, data.status || 'pending', now, now, userId]
  );
  
  await updateOverlapStatus(data.corridorId, data.recordDate);
  await createHistoryChange({
    recordId: id,
    fieldName: 'record',
    changeType: 'create',
    changedBy: userId,
    remark: '创建巡检记录'
  });
  
  const record = await getRecordById(id);
  if (!record) throw new Error('Failed to create record');
  return record;
}

export async function updateRecord(
  id: string,
  data: Partial<Omit<InspectionRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>,
  userId: string
): Promise<InspectionRecord | undefined> {
  const existing = await getRecordById(id);
  if (!existing) return undefined;
  
  const updates: string[] = [];
  const params: any[] = [];
  
  if (data.corridorId !== undefined) { updates.push('corridor_id = ?'); params.push(data.corridorId); }
  if (data.recordDate !== undefined) { updates.push('record_date = ?'); params.push(data.recordDate); }
  if (data.recordType !== undefined) { updates.push('record_type = ?'); params.push(data.recordType); }
  if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title); }
  if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
  
  if (data.status !== undefined && data.status !== existing.status) {
    updates.push('status = ?');
    params.push(data.status);
    
    if (data.status === 'confirmed') {
      updates.push('confirmed_by = ?');
      updates.push('confirmed_at = ?');
      params.push(userId, new Date().toISOString());
    }
    
    await createHistoryChange({
      recordId: id,
      fieldName: 'status',
      oldValue: existing.status,
      newValue: data.status,
      changeType: 'status_change',
      changedBy: userId,
      remark: `状态从${existing.status}变更为${data.status}`
    });
  }
  
  if (data.description !== undefined && data.description !== existing.description) {
    await createHistoryChange({
      recordId: id,
      fieldName: 'description',
      oldValue: existing.description,
      newValue: data.description,
      changeType: 'update',
      changedBy: userId
    });
  }
  
  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  
  await runExecute(`UPDATE inspection_records SET ${updates.join(', ')} WHERE id = ?`, params);
  
  if (data.corridorId || data.recordDate) {
    await updateOverlapStatus(data.corridorId || existing.corridorId, data.recordDate || existing.recordDate);
    if (data.corridorId && data.corridorId !== existing.corridorId) {
      await updateOverlapStatus(existing.corridorId, existing.recordDate);
    }
  }
  
  return getRecordById(id);
}

export async function confirmRecord(
  id: string,
  userId: string,
  remark?: string
): Promise<InspectionRecord | undefined> {
  const existing = await getRecordById(id);
  if (!existing) return undefined;
  
  const now = new Date().toISOString();
  await runExecute(
    'UPDATE inspection_records SET status = ?, confirmed_by = ?, confirmed_at = ?, updated_at = ? WHERE id = ?',
    ['confirmed', userId, now, now, id]
  );
  
  await createHistoryChange({
    recordId: id,
    fieldName: 'status',
    oldValue: existing.status,
    newValue: 'confirmed',
    changeType: 'confirm',
    changedBy: userId,
    remark
  });
  
  return getRecordById(id);
}

export async function rejectRecord(
  id: string,
  userId: string,
  remark?: string
): Promise<InspectionRecord | undefined> {
  const existing = await getRecordById(id);
  if (!existing) return undefined;
  
  await runExecute(
    'UPDATE inspection_records SET status = ?, updated_at = ? WHERE id = ?',
    ['rejected', new Date().toISOString(), id]
  );
  
  await createHistoryChange({
    recordId: id,
    fieldName: 'status',
    oldValue: existing.status,
    newValue: 'rejected',
    changeType: 'reject',
    changedBy: userId,
    remark
  });
  
  return getRecordById(id);
}

export async function deleteRecord(id: string): Promise<boolean> {
  const record = await getRecordById(id);
  if (!record) return false;
  
  await runExecute('DELETE FROM inspection_records WHERE id = ?', [id]);
  await updateOverlapStatus(record.corridorId, record.recordDate);
  
  return true;
}

async function updateOverlapStatus(corridorId: string, recordDate: string): Promise<void> {
  const rows = await runQuery(
    'SELECT id, corridor_id, record_date FROM inspection_records WHERE corridor_id = ? AND record_date = ?',
    [corridorId, recordDate]
  );
  
  const overlappingIds = detectOverlap(rows);
  
  if (overlappingIds.length > 1) {
    const placeholders = overlappingIds.map(() => '?').join(',');
    await runExecute(
      `UPDATE inspection_records SET is_overlapping = 1 WHERE id IN (${placeholders})`,
      overlappingIds
    );
    
    const allIds = rows.map(r => r.id);
    const nonOverlappingIds = allIds.filter(id => !overlappingIds.includes(id));
    if (nonOverlappingIds.length) {
      const np = nonOverlappingIds.map(() => '?').join(',');
      await runExecute(
        `UPDATE inspection_records SET is_overlapping = 0 WHERE id IN (${np})`,
        nonOverlappingIds
      );
    }
  } else {
    await runExecute(
      'UPDATE inspection_records SET is_overlapping = 0 WHERE corridor_id = ? AND record_date = ?',
      [corridorId, recordDate]
    );
  }
}

export async function getRecordDetails(id: string) {
  const record = await getRecordById(id);
  if (!record) return undefined;
  
  const [materials, notes, history] = await Promise.all([
    runQuery('SELECT * FROM material_versions WHERE record_id = ? ORDER BY version DESC, created_at DESC', [id]),
    runQuery('SELECT * FROM manual_notes WHERE record_id = ? ORDER BY created_at DESC', [id]),
    runQuery('SELECT * FROM history_changes WHERE record_id = ? ORDER BY changed_at DESC', [id])
  ]);
  
  return {
    record,
    materials: materials.map((m: any) => ({
      id: m.id,
      recordId: m.record_id,
      version: m.version,
      materialType: m.material_type,
      fileName: m.file_name,
      fileUrl: m.file_url,
      fileSize: m.file_size,
      remark: m.remark,
      isCaliberModified: m.is_caliber_modified === 1,
      modifiedDescription: m.modified_description,
      createdAt: m.created_at,
      createdBy: m.created_by
    } as MaterialVersion)),
    notes: notes.map((n: any) => ({
      id: n.id,
      recordId: n.record_id,
      content: n.content,
      createdAt: n.created_at,
      createdBy: n.created_by,
      updatedAt: n.updated_at
    } as ManualNote)),
    history: history.map((h: any) => ({
      id: h.id,
      recordId: h.record_id,
      fieldName: h.field_name,
      oldValue: h.old_value,
      newValue: h.new_value,
      changeType: h.change_type,
      changedBy: h.changed_by,
      changedAt: h.changed_at,
      remark: h.remark
    } as HistoryChange))
  };
}
