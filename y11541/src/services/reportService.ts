import { get, all } from '../db/database';
import { ReportSummary } from '../types';

export async function generateReport(): Promise<ReportSummary> {
  const totalRecords = await get<{ count: number }>('SELECT COUNT(*) as count FROM material_records');
  const dirtyRecords = await get<{ count: number }>("SELECT COUNT(*) as count FROM material_records WHERE status = 'dirty'");
  const fixedRecords = await get<{ count: number }>("SELECT COUNT(*) as count FROM material_records WHERE status = 'fixed'");
  const importedRecords = await get<{ count: number }>("SELECT COUNT(*) as count FROM material_records WHERE status = 'imported'");
  
  const byPlatform = await all<{ platform: string; count: number }>(
    'SELECT platform, COUNT(*) as count FROM material_records GROUP BY platform'
  );
  
  const byDirtyType = await all<{ dirty_type: string; count: number }>(
    'SELECT dirty_type, COUNT(*) as count FROM dirty_records WHERE fixed = 0 GROUP BY dirty_type'
  );
  
  const failedList = await all<{
    source_line: number;
    material_id: string;
    material_name: string;
    dirty_types: string;
    suggestions: string;
  }>(`
    SELECT 
      mr.source_line,
      mr.material_id,
      mr.material_name,
      GROUP_CONCAT(dr.dirty_type, ';') as dirty_types,
      GROUP_CONCAT(dr.suggestion, ';') as suggestions
    FROM material_records mr
    JOIN dirty_records dr ON mr.id = dr.record_id
    WHERE dr.fixed = 0
    GROUP BY mr.id
    ORDER BY mr.source_line
  `);
  
  const byPlatformMap: Record<string, number> = {};
  for (const item of byPlatform) {
    byPlatformMap[item.platform] = item.count;
  }
  
  const byDirtyTypeMap: Record<string, number> = {};
  for (const item of byDirtyType) {
    byDirtyTypeMap[item.dirty_type] = item.count;
  }
  
  return {
    totalRecords: totalRecords?.count ?? 0,
    dirtyRecords: dirtyRecords?.count ?? 0,
    fixedRecords: fixedRecords?.count ?? 0,
    importedRecords: importedRecords?.count ?? 0,
    byPlatform: byPlatformMap,
    byDirtyType: byDirtyTypeMap,
    failedList: failedList.map(item => ({
      source_line: item.source_line,
      material_id: item.material_id,
      material_name: item.material_name,
      dirty_types: item.dirty_types ? item.dirty_types.split(';') : [],
      suggestions: item.suggestions ? item.suggestions.split(';') : []
    }))
  };
}
