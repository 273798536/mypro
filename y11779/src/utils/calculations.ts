import type { PredictionRecord, GroupStats, DashboardMetrics, GroupByDimension } from '../types';

export function isCovered(record: PredictionRecord): boolean {
  return record.actualValue >= record.lowerBound && record.actualValue <= record.upperBound;
}

export function calculateCoverage(records: PredictionRecord[]): number {
  if (records.length === 0) return 0;
  const covered = records.filter(isCovered).length;
  return covered / records.length;
}

export function calculateAvgError(records: PredictionRecord[]): number {
  if (records.length === 0) return 0;
  const totalError = records.reduce((sum, r) => {
    return sum + Math.abs(r.actualValue - r.predictedValue) / r.predictedValue;
  }, 0);
  return totalError / records.length;
}

export function groupByDimension(
  records: PredictionRecord[],
  dimension: GroupByDimension
): GroupStats[] {
  if (dimension === 'none') {
    return [{
      groupKey: 'all',
      groupName: '全部',
      totalCount: records.length,
      coveredCount: records.filter(isCovered).length,
      coverageRate: calculateCoverage(records),
      avgError: calculateAvgError(records),
      anomalyCount: records.filter(r => !isCovered(r) || r.isPromotion).length,
      promotionCount: records.filter(r => r.isPromotion).length
    }];
  }

  const groups = new Map<string, PredictionRecord[]>();
  
  for (const record of records) {
    let key: string;
    if (dimension === 'category') {
      key = record.category;
    } else {
      key = record.isPromotion ? '促销期' : '非促销期';
    }
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(record);
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    groupKey: key,
    groupName: key,
    totalCount: items.length,
    coveredCount: items.filter(isCovered).length,
    coverageRate: calculateCoverage(items),
    avgError: calculateAvgError(items),
    anomalyCount: items.filter(r => !isCovered(r) || r.isPromotion).length,
    promotionCount: items.filter(r => r.isPromotion).length
  }));
}

export function calculateDashboardMetrics(
  records: PredictionRecord[],
  targetCoverage: number = 0.9
): DashboardMetrics {
  const categories = new Set(records.map(r => r.category));
  
  return {
    overallCoverage: calculateCoverage(records),
    totalRecords: records.length,
    totalAnomalies: records.filter(r => !isCovered(r)).length,
    categoryCount: categories.size,
    promotionCount: records.filter(r => r.isPromotion).length,
    targetCoverage
  };
}

export function aggregateByDate(records: PredictionRecord[]): PredictionRecord[] {
  const dateMap = new Map<string, PredictionRecord[]>();
  
  for (const record of records) {
    if (!dateMap.has(record.date)) {
      dateMap.set(record.date, []);
    }
    dateMap.get(record.date)!.push(record);
  }

  return Array.from(dateMap.entries()).map(([date, items]) => ({
    id: `agg-${date}`,
    date,
    category: '汇总',
    predictedValue: items.reduce((sum, r) => sum + r.predictedValue, 0),
    lowerBound: items.reduce((sum, r) => sum + r.lowerBound, 0),
    upperBound: items.reduce((sum, r) => sum + r.upperBound, 0),
    actualValue: items.reduce((sum, r) => sum + r.actualValue, 0),
    isPromotion: items.some(r => r.isPromotion),
    source: '汇总计算',
    confidenceLevel: 0.95
  })).sort((a, b) => a.date.localeCompare(b.date));
}

export function filterRecords(
  records: PredictionRecord[],
  filters: {
    categories?: string[];
    startDate?: string;
    endDate?: string;
    promotionOnly?: boolean;
    anomaliesOnly?: boolean;
  }
): PredictionRecord[] {
  return records.filter(r => {
    if (filters.categories?.length && !filters.categories.includes(r.category)) {
      return false;
    }
    if (filters.startDate && r.date < filters.startDate) {
      return false;
    }
    if (filters.endDate && r.date > filters.endDate) {
      return false;
    }
    if (filters.promotionOnly && !r.isPromotion) {
      return false;
    }
    if (filters.anomaliesOnly && isCovered(r)) {
      return false;
    }
    return true;
  });
}
