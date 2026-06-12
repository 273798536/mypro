import { runQuery, runQueryOne, runExecute } from '../database';
import type { MaterialVersion } from '@shared/types';
import { generateId } from '@shared/utils';
import { createHistoryChange } from './historyService';

const toMaterial = (row: any): MaterialVersion => ({
  id: row.id,
  recordId: row.record_id,
  version: row.version,
  materialType: row.material_type,
  fileName: row.file_name,
  fileUrl: row.file_url,
  fileSize: row.file_size,
  remark: row.remark,
  isCaliberModified: row.is_caliber_modified === 1,
  modifiedDescription: row.modified_description,
  createdAt: row.created_at,
  createdBy: row.created_by
});

export async function getMaterialsByRecordId(recordId: string): Promise<MaterialVersion[]> {
  const rows = await runQuery(
    'SELECT * FROM material_versions WHERE record_id = ? ORDER BY version DESC, created_at DESC',
    [recordId]
  );
  return rows.map(toMaterial);
}

export async function getMaterialById(id: string): Promise<MaterialVersion | undefined> {
  const row = await runQueryOne('SELECT * FROM material_versions WHERE id = ?', [id]);
  return row ? toMaterial(row) : undefined;
}

export async function createMaterial(
  data: Omit<MaterialVersion, 'id' | 'version' | 'createdAt'>,
  userId: string
): Promise<MaterialVersion> {
  const id = generateId();
  const now = new Date().toISOString();
  
  const maxVersionRow = await runQueryOne(
    'SELECT COALESCE(MAX(version), 0) as max_version FROM material_versions WHERE record_id = ? AND material_type = ?',
    [data.recordId, data.materialType]
  );
  const version = (maxVersionRow?.max_version || 0) + 1;
  
  await runExecute(
    `INSERT INTO material_versions 
     (id, record_id, version, material_type, file_name, file_url, file_size, 
      remark, is_caliber_modified, modified_description, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.recordId, version, data.materialType, data.fileName, data.fileUrl, 
     data.fileSize, data.remark, data.isCaliberModified ? 1 : 0, 
     data.modifiedDescription, now, userId]
  );
  
  if (data.isCaliberModified) {
    await createHistoryChange({
      recordId: data.recordId,
      fieldName: `material_${data.materialType}`,
      changeType: 'update',
      changedBy: userId,
      remark: `上传${data.materialType}材料，口径已修改：${data.modifiedDescription || data.remark || ''}`
    });
  }
  
  const material = await getMaterialById(id);
  if (!material) throw new Error('Failed to create material');
  return material;
}

export async function updateMaterial(
  id: string,
  data: Partial<Pick<MaterialVersion, 'remark' | 'isCaliberModified' | 'modifiedDescription'>>,
  userId: string
): Promise<MaterialVersion | undefined> {
  const existing = await getMaterialById(id);
  if (!existing) return undefined;
  
  const updates: string[] = [];
  const params: any[] = [];
  
  if (data.remark !== undefined) { updates.push('remark = ?'); params.push(data.remark); }
  if (data.isCaliberModified !== undefined) { 
    updates.push('is_caliber_modified = ?'); 
    params.push(data.isCaliberModified ? 1 : 0); 
  }
  if (data.modifiedDescription !== undefined) { 
    updates.push('modified_description = ?'); 
    params.push(data.modifiedDescription); 
  }
  
  params.push(id);
  
  await runExecute(`UPDATE material_versions SET ${updates.join(', ')} WHERE id = ?`, params);
  
  if (data.isCaliberModified && !existing.isCaliberModified) {
    await createHistoryChange({
      recordId: existing.recordId,
      fieldName: `material_${existing.materialType}`,
      oldValue: '口径未修改',
      newValue: '口径已修改',
      changeType: 'update',
      changedBy: userId,
      remark: data.modifiedDescription
    });
  }
  
  return getMaterialById(id);
}

export async function deleteMaterial(id: string): Promise<boolean> {
  const result = await runExecute('DELETE FROM material_versions WHERE id = ?', [id]);
  return result.changes > 0;
}
