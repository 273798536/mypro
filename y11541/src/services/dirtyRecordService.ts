import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { run, get, all } from '../db/database';
import { DirtyType, MaterialRecord } from '../types';
import { getCurrentUser } from './userService';
import { getRecordById, updateRecordStatus } from './recordService';

export interface DirtyCheckResult {
  type: DirtyType;
  field?: string;
  expected?: string;
  actual?: string;
  suggestion: string;
}

export function checkMissingFields(data: Record<string, any>, source: string): DirtyCheckResult[] {
  const results: DirtyCheckResult[] = [];
  const requiredFields = ['material_id', 'material_name', 'platform', 'record_date'];
  
  for (const field of requiredFields) {
    if (!data[field] || String(data[field]).trim() === '') {
      results.push({
        type: 'missing_field',
        field,
        expected: '非空值',
        actual: String(data[field] ?? ''),
        suggestion: `请补充必填字段: ${field}`
      });
    }
  }
  
  return results;
}

export function checkCrossDay(data: Record<string, any>): DirtyCheckResult[] {
  const results: DirtyCheckResult[] = [];
  const dateStr = data.record_date;
  
  if (dateStr) {
    const date = dayjs(dateStr);
    if (!date.isValid()) {
      results.push({
        type: 'cross_day',
        field: 'record_date',
        expected: '有效的日期格式 (YYYY-MM-DD)',
        actual: String(dateStr),
        suggestion: '请修正日期格式，例如: 2024-01-15'
      });
    }
  }
  
  return results;
}

export function checkNameChange(
  data: Record<string, any>,
  existingRecords: MaterialRecord[]
): DirtyCheckResult[] {
  const results: DirtyCheckResult[] = [];
  const materialId = data.material_id;
  const materialName = data.material_name;
  const platform = data.platform;
  
  const sameIdRecords = existingRecords.filter(
    r => r.material_id === materialId && r.platform === platform
  );
  
  const differentNames = new Set(
    sameIdRecords
      .filter(r => r.material_name !== materialName)
      .map(r => r.material_name)
  );
  
  if (differentNames.size > 0) {
    results.push({
      type: 'name_change',
      field: 'material_name',
      expected: Array.from(differentNames).join(', '),
      actual: materialName,
      suggestion: `同一素材ID在${platform}平台存在不同名称: ${Array.from(differentNames).join(', ')}。可建立别名关联或确认是否为改名。`
    });
  }
  
  return results;
}

export function checkAmountConflict(
  data: Record<string, any>,
  existingRecords: MaterialRecord[]
): DirtyCheckResult[] {
  const results: DirtyCheckResult[] = [];
  const materialId = data.material_id;
  const platform = data.platform;
  const recordDate = data.record_date;
  
  const sameDayRecords = existingRecords.filter(
    r => r.material_id === materialId && r.platform === platform && r.record_date === recordDate
  );
  
  if (sameDayRecords.length > 0 && data.cost !== undefined) {
    const existingCosts = sameDayRecords
      .filter(r => r.cost !== undefined && r.cost !== null)
      .map(r => r.cost!);
    
    if (existingCosts.length > 0) {
      const avgCost = existingCosts.reduce((a, b) => a + b, 0) / existingCosts.length;
      const newCost = Number(data.cost);
      
      if (Math.abs(newCost - avgCost) / avgCost > 0.5 && avgCost > 0) {
        results.push({
          type: 'amount_conflict',
          field: 'cost',
          expected: `约 ${avgCost.toFixed(2)} (已有记录平均值)`,
          actual: String(newCost),
          suggestion: `新花费(${newCost})与历史平均值(${avgCost.toFixed(2)})差异超过50%，请确认数据准确性`
        });
      }
    }
  }
  
  return results;
}

export function checkQuantityConflict(
  data: Record<string, any>,
  existingRecords: MaterialRecord[]
): DirtyCheckResult[] {
  const results: DirtyCheckResult[] = [];
  const materialId = data.material_id;
  const platform = data.platform;
  const recordDate = data.record_date;
  
  const sameDayRecords = existingRecords.filter(
    r => r.material_id === materialId && r.platform === platform && r.record_date === recordDate
  );
  
  if (sameDayRecords.length > 0) {
    if (data.impressions !== undefined) {
      const existingImpressions = sameDayRecords
        .filter(r => r.impressions !== undefined && r.impressions !== null)
        .map(r => r.impressions!);
      
      if (existingImpressions.length > 0) {
        const avgImpressions = existingImpressions.reduce((a, b) => a + b, 0) / existingImpressions.length;
        const newImpressions = Number(data.impressions);
        
        if (Math.abs(newImpressions - avgImpressions) / avgImpressions > 0.5 && avgImpressions > 0) {
          results.push({
            type: 'quantity_conflict',
            field: 'impressions',
            expected: `约 ${Math.round(avgImpressions)} (已有记录平均值)`,
            actual: String(newImpressions),
            suggestion: `新曝光量(${newImpressions})与历史平均值(${Math.round(avgImpressions)})差异超过50%，请确认`
          });
        }
      }
    }
  }
  
  return results;
}

export function checkAllDirty(
  data: Record<string, any>,
  source: string,
  existingRecords: MaterialRecord[]
): DirtyCheckResult[] {
  return [
    ...checkMissingFields(data, source),
    ...checkCrossDay(data),
    ...checkNameChange(data, existingRecords),
    ...checkAmountConflict(data, existingRecords),
    ...checkQuantityConflict(data, existingRecords)
  ];
}

export async function saveDirtyRecords(recordId: string, dirtyResults: DirtyCheckResult[]): Promise<void> {
  const now = dayjs().toISOString();
  
  for (const result of dirtyResults) {
    await run(
      `INSERT INTO dirty_records (
        id, record_id, dirty_type, field_name, expected_value, actual_value, suggestion, fixed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        uuidv4(),
        recordId,
        result.type,
        result.field ?? null,
        result.expected ?? null,
        result.actual ?? null,
        result.suggestion,
        now
      ]
    );
  }
}

export async function getDirtyRecords(recordId: string): Promise<Array<{
  id: string;
  dirty_type: DirtyType;
  field_name?: string;
  expected_value?: string;
  actual_value?: string;
  suggestion: string;
  fixed: boolean;
  created_at: string;
}>> {
  const rows = await all(
    'SELECT * FROM dirty_records WHERE record_id = ? ORDER BY created_at DESC',
    [recordId]
  );
  return rows.map(r => ({ ...r, fixed: !!r.fixed })) as any[];
}

export async function fixDirtyRecord(dirtyRecordId: string): Promise<void> {
  const user = await getCurrentUser();
  const now = dayjs().toISOString();
  
  await run(
    'UPDATE dirty_records SET fixed = 1, fixed_by = ?, fixed_at = ? WHERE id = ?',
    [user.id, now, dirtyRecordId]
  );
  
  const dirtyRecord = await get<any>('SELECT * FROM dirty_records WHERE id = ?', [dirtyRecordId]);
  if (dirtyRecord) {
    const recordId = dirtyRecord.record_id;
    const remaining = await get<{ count: number }>(
      'SELECT COUNT(*) as count FROM dirty_records WHERE record_id = ? AND fixed = 0',
      [recordId]
    );
    
    if (remaining && remaining.count === 0) {
      await updateRecordStatus(recordId, 'fixed', '所有脏记录已修复');
    }
  }
}

export async function getUnfixedDirtyRecords(): Promise<Array<{
  id: string;
  record_id: string;
  material_id: string;
  material_name: string;
  source_line?: number;
  dirty_type: DirtyType;
  suggestion: string;
}>> {
  return all(`
    SELECT dr.id, dr.record_id, mr.material_id, mr.material_name, mr.source_line, dr.dirty_type, dr.suggestion
    FROM dirty_records dr
    JOIN material_records mr ON dr.record_id = mr.id
    WHERE dr.fixed = 0
    ORDER BY mr.source_line, dr.created_at
  `);
}
