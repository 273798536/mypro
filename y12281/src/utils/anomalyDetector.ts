import type { Region, MonthlyMetrics, Anomaly } from '@/types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function detectOverlaps(regions: Region[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const gridPositions = new Map<string, string[]>();

  regions.forEach((region) => {
    const key = `${region.gridPos.row}-${region.gridPos.col}`;
    if (!gridPositions.has(key)) {
      gridPositions.set(key, []);
    }
    gridPositions.get(key)!.push(region.id);
  });

  gridPositions.forEach((regionIds, key) => {
    if (regionIds.length > 1) {
      const [row, col] = key.split('-').map(Number);
      regionIds.forEach((regionId) => {
        anomalies.push({
          id: generateId(),
          type: 'overlap',
          regionId,
          description: `区域与其他 ${regionIds.length - 1} 个区域在网格位置 (行: ${row}, 列: ${col}) 重叠`,
          severity: 'high',
          status: 'pending',
          detectedAt: new Date().toISOString(),
        });
      });
    }
  });

  return anomalies;
}

export function detectMissingMonths(
  data: MonthlyMetrics[],
  regionId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const existingMonths = new Set(data.map((d) => `${d.year}-${d.month}`));

  let currentYear = startYear;
  let currentMonth = startMonth;

  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    const key = `${currentYear}-${currentMonth}`;
    if (!existingMonths.has(key)) {
      anomalies.push({
        id: generateId(),
        type: 'missing_month',
        regionId,
        month: currentMonth,
        description: `${currentYear}年${currentMonth}月数据缺失`,
        severity: 'medium',
        status: 'pending',
        detectedAt: new Date().toISOString(),
      });
    }

    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  return anomalies;
}

export function detectExtremeValues(
  data: MonthlyMetrics[],
  field: 'lossRatio' | 'premium' | 'hazardExposure',
  regionId: string,
  threshold: number = 3
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const values = data.map((d) => d[field]).filter((v): v is number => v !== undefined);

  if (values.length < 4) return anomalies;

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.ceil(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;

  data.forEach((metrics) => {
    const value = metrics[field];
    if (value !== undefined && (value < lowerBound || value > upperBound)) {
      const fieldNames: Record<string, string> = {
        lossRatio: '赔付率',
        premium: '保费',
        hazardExposure: '灾害暴露',
      };
      anomalies.push({
        id: generateId(),
        type: 'extreme_value',
        regionId,
        month: metrics.month,
        description: `${metrics.year}年${metrics.month}月${fieldNames[field]}(${value.toFixed(2)})超出正常范围 [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
        severity: value > upperBound ? 'high' : 'low',
        status: 'pending',
        detectedAt: new Date().toISOString(),
      });
    }
  });

  return anomalies;
}

export function detectPartialData(regions: Region[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  regions.forEach((region) => {
    if (region.status === 'partial') {
      const missingFields: string[] = [];
      if (!region.dataSource.lossRatio) missingFields.push('赔付率');
      if (!region.dataSource.premium) missingFields.push('保费');
      if (!region.dataSource.hazardExposure) missingFields.push('灾害暴露');

      anomalies.push({
        id: generateId(),
        type: 'partial_data',
        regionId: region.id,
        description: `数据不完整，缺少: ${missingFields.join('、')}`,
        severity: 'low',
        status: 'pending',
        detectedAt: new Date().toISOString(),
      });
    }
  });

  return anomalies;
}

export function detectAllAnomalies(
  regions: Region[],
  monthlyData: Record<string, MonthlyMetrics[]>,
  timeRange: { startYear: number; startMonth: number; endYear: number; endMonth: number }
): Anomaly[] {
  const allAnomalies: Anomaly[] = [];

  allAnomalies.push(...detectOverlaps(regions));
  allAnomalies.push(...detectPartialData(regions));

  regions.forEach((region) => {
    const data = monthlyData[region.id] || [];
    allAnomalies.push(
      ...detectMissingMonths(data, region.id, timeRange.startYear, timeRange.startMonth, timeRange.endYear, timeRange.endMonth)
    );
    allAnomalies.push(...detectExtremeValues(data, 'lossRatio', region.id));
    allAnomalies.push(...detectExtremeValues(data, 'premium', region.id));
    allAnomalies.push(...detectExtremeValues(data, 'hazardExposure', region.id));
  });

  const seen = new Set<string>();
  return allAnomalies.filter((a) => {
    const key = `${a.type}-${a.regionId}-${a.month ?? 'all'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
