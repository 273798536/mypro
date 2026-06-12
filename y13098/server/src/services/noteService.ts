import { runQuery, runQueryOne, runExecute } from '../database';
import type { ManualNote } from '@shared/types';
import { generateId } from '@shared/utils';
import { createHistoryChange } from './historyService';

const toNote = (row: any): ManualNote => ({
  id: row.id,
  recordId: row.record_id,
  content: row.content,
  createdAt: row.created_at,
  createdBy: row.created_by,
  updatedAt: row.updated_at
});

export async function getNotesByRecordId(recordId: string): Promise<ManualNote[]> {
  const rows = await runQuery(
    'SELECT * FROM manual_notes WHERE record_id = ? ORDER BY created_at DESC',
    [recordId]
  );
  return rows.map(toNote);
}

export async function getNoteById(id: string): Promise<ManualNote | undefined> {
  const row = await runQueryOne('SELECT * FROM manual_notes WHERE id = ?', [id]);
  return row ? toNote(row) : undefined;
}

export async function createNote(
  data: Omit<ManualNote, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<ManualNote> {
  const id = generateId();
  const now = new Date().toISOString();
  
  await runExecute(
    `INSERT INTO manual_notes 
     (id, record_id, content, created_at, created_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.recordId, data.content, now, userId, now]
  );
  
  await createHistoryChange({
    recordId: data.recordId,
    fieldName: 'manual_note',
    changeType: 'update',
    changedBy: userId,
    remark: '添加人工备注'
  });
  
  const note = await getNoteById(id);
  if (!note) throw new Error('Failed to create note');
  return note;
}

export async function updateNote(
  id: string,
  content: string,
  userId: string
): Promise<ManualNote | undefined> {
  const existing = await getNoteById(id);
  if (!existing) return undefined;
  
  await runExecute(
    'UPDATE manual_notes SET content = ?, updated_at = ? WHERE id = ?',
    [content, new Date().toISOString(), id]
  );
  
  await createHistoryChange({
    recordId: existing.recordId,
    fieldName: 'manual_note',
    oldValue: existing.content,
    newValue: content,
    changeType: 'update',
    changedBy: userId,
    remark: '更新人工备注'
  });
  
  return getNoteById(id);
}

export async function deleteNote(id: string): Promise<boolean> {
  const result = await runExecute('DELETE FROM manual_notes WHERE id = ?', [id]);
  return result.changes > 0;
}
