import type { SalinityData, BaseDataRecord, QualityIssue } from '@/types';

export function detectSalinityUnitMismatch(records: SalinityData[]): string[] {
  const unitCounts = new Map<string, number>();
  records.forEach(r => {
    unitCounts.set(r.unit, (unitCounts.get(r.unit) || 0) + 1);
  });

  if (unitCounts.size <= 1) return [];

  const dominantUnit = Array.from(unitCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  return records.filter(r => r.unit !== dominantUnit).map(r => r.id);
}

export function detectNegativeDepth(records: BaseDataRecord[]): string[] {
  return records
    .filter(r => r.location.depth !== undefined && r.location.depth < 0)
    .map(r => r.id);
}

export function detectOutliers<T extends BaseDataRecord>(
  records: T[],
  valueExtractor: (r: T) => number | undefined
): string[] {
  const values = records
    .map(valueExtractor)
    .filter((v): v is number => v !== undefined && !isNaN(v));

  if (values.length < 4) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return records.filter(r => {
    const v = valueExtractor(r);
    return v !== undefined && (v < lowerBound || v > upperBound);
  }).map(r => r.id);
}

export function detectMissingFields(records: BaseDataRecord[]): string[] {
  return records
    .filter(r => {
      if (!r.location.lat || !r.location.lng) return true;
      if (!r.source || !r.importBatch) return true;
      return false;
    })
    .map(r => r.id);
}

export function runAllQualityChecks(
  records: BaseDataRecord[]
): Map<string, QualityIssue[]> {
  const issues = new Map<string, QualityIssue[]>();

  records.forEach(r => issues.set(r.id, []));

  const salinityRecords = records.filter((r): r is SalinityData => r.type === 'salinity');
  const unitMismatchIds = detectSalinityUnitMismatch(salinityRecords);
  unitMismatchIds.forEach(id => {
    issues.get(id)?.push('unit_mismatch');
  });

  const negativeDepthIds = detectNegativeDepth(records);
  negativeDepthIds.forEach(id => {
    issues.get(id)?.push('negative_depth');
  });

  const missingIds = detectMissingFields(records);
  missingIds.forEach(id => {
    issues.get(id)?.push('missing');
  });

  const shipRecords = records.filter((r): r is any => r.type === 'ship_track');
  const powerOutliers = detectOutliers(shipRecords, r => r.powerConsumption);
  powerOutliers.forEach(id => {
    issues.get(id)?.push('outlier');
  });

  const aquaRecords = records.filter((r): r is any => r.type === 'aquaculture_log');
  const usageOutliers = detectOutliers(aquaRecords, r => r.dailyPowerUsage);
  usageOutliers.forEach(id => {
    issues.get(id)?.push('outlier');
  });

  const salinityOutliers = detectOutliers(salinityRecords, r => r.salinity);
  salinityOutliers.forEach(id => {
    issues.get(id)?.push('outlier');
  });

  return issues;
}

export function classifyByStatus(records: BaseDataRecord[]): {
  available: string[];
  suspended: string[];
  recollect: string[];
} {
  const available: string[] = [];
  const suspended: string[] = [];
  const recollect: string[] = [];

  records.forEach(r => {
    const issues = r.qualityIssues;
    if (issues.includes('missing') || issues.includes('negative_depth')) {
      recollect.push(r.id);
    } else if (issues.includes('unit_mismatch') || issues.includes('outlier')) {
      suspended.push(r.id);
    } else {
      available.push(r.id);
    }
  });

  return { available, suspended, recollect };
}

export function generateResultNote(issues: QualityIssue[]): string {
  if (issues.length === 0) return '数据完整，质量良好，可用于负荷预测。';

  const notes: string[] = [];
  if (issues.includes('missing')) notes.push('关键字段缺失');
  if (issues.includes('negative_depth')) notes.push('存在深度为负的异常记录');
  if (issues.includes('unit_mismatch')) notes.push('盐度单位存在混用');
  if (issues.includes('outlier')) notes.push('存在统计异常值');
  if (issues.includes('duplicate')) notes.push('存在重复记录');

  if (issues.includes('missing') || issues.includes('negative_depth')) {
    return `暂缓使用：${notes.join('、')}，建议重新采集。`;
  }
  return `可用但需注意：${notes.join('、')}，已标记待人工复核。`;
}
