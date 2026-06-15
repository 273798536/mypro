import type { SalinityUnit, WeatherRecord, BuoyRecord, TideRecord, GapItem, WaterQualityAlert, ProcessOpinion, WindRoseBin, ReviewTask, SupplementEntry } from '@/types';
import { WIND_DIRS } from '@/types';

export function psuToPermille(psu: number): number {
  return Number((psu * 1.00477).toFixed(2));
}

export function permilleToPsu(permille: number): number {
  return Number((permille / 1.00477).toFixed(2));
}

export function normalizeSalinity(value: number, unit: SalinityUnit): number {
  if (unit === 'PSU') return psuToPermille(value);
  return value;
}

export function validateWindSpeed(raw: string): { value: number; valid: boolean } {
  const cleaned = raw.replace(/m\/s/i, '').replace(/m.s/i, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return { value: 0, valid: false };
  if (num < 0 || num > 80) return { value: num, valid: false };
  return { value: num, valid: true };
}

export function validateWaterTemp(raw: string): { value: number; valid: boolean; corrected?: number } {
  const cleaned = raw.replace(/°C/i, '').replace(/℃/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return { value: 0, valid: false };
  if (num > 45) {
    const correctedStr = cleaned.slice(0, -1) + '.' + cleaned.slice(-1);
    const corrected = parseFloat(correctedStr);
    if (!isNaN(corrected) && corrected >= 0 && corrected <= 45) {
      return { value: num, valid: false, corrected };
    }
    return { value: num, valid: false };
  }
  return { value: num, valid: true };
}

export function computeWindRose(records: WeatherRecord[]): WindRoseBin[] {
  const bins: WindRoseBin[] = WIND_DIRS.map((d, i) => ({
    direction: d,
    deg: i * 45,
    speed0to5: 0,
    speed5to10: 0,
    speed10to15: 0,
    speed15plus: 0,
  }));

  const dirMap: Record<string, number> = {};
  WIND_DIRS.forEach((d, i) => { dirMap[d] = i; });

  for (const r of records) {
    if (r.isAnomaly) continue;
    const idx = dirMap[r.windDirection] ?? 0;
    if (r.windSpeed < 5) bins[idx].speed0to5++;
    else if (r.windSpeed < 10) bins[idx].speed5to10++;
    else if (r.windSpeed < 15) bins[idx].speed10to15++;
    else bins[idx].speed15plus++;
  }
  return bins;
}

export function computeSeaStateSummary(records: WeatherRecord[]): { level: number; label: string; count: number }[] {
  const map = new Map<number, number>();
  for (const r of records) {
    if (r.isAnomaly) continue;
    map.set(r.seaState, (map.get(r.seaState) || 0) + 1);
  }
  const result = Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, count]) => ({ level, label: ['', '平静', '微波', '轻浪', '中浪', '大浪', '巨浪'][level] || '未知', count }));
  return result;
}

export function computeWithPartialTide(
  records: TideRecord[]
): { computed: TideRecord[]; gaps: GapItem[] } {
  const gaps: GapItem[] = [];
  const computed: TideRecord[] = [];

  for (const r of records) {
    if (r.tideLevel === null || r.isGap) {
      gaps.push({
        id: `gap-${r.id}`,
        timestamp: r.timestamp,
        field: 'tideLevel',
        status: 'pending',
      });
      computed.push({ ...r, isGap: true });
    } else {
      computed.push({ ...r, isGap: false });
    }
  }
  return { computed, gaps };
}

export function computeSalinityAlert(
  records: BuoyRecord[],
  threshold: number = 35.1
): WaterQualityAlert | null {
  const normalized = records.map(r => r.salinityNormalized);
  const avg = normalized.reduce((a, b) => a + b, 0) / normalized.length;

  const unnormalized = records.map(r => r.salinity);
  const avgUnnorm = unnormalized.reduce((a, b) => a + b, 0) / unnormalized.length;

  const hasMixedUnits = records.some(r => r.salinityUnit === 'PSU') && records.some(r => r.salinityUnit === '‰');

  if (!hasMixedUnits && avg <= threshold && avgUnnorm <= threshold) return null;

  const beforeJudgment = avgUnnorm > threshold ? 'warning' as const : 'normal' as const;
  const afterJudgment = avg > threshold ? 'warning' as const : 'normal' as const;

  if (!hasMixedUnits && beforeJudgment === afterJudgment && avg <= threshold) return null;

  return {
    id: `alert-salinity-${Date.now()}`,
    indicator: '盐度均值',
    threshold,
    thresholdUnit: '‰',
    beforeValue: Number(avgUnnorm.toFixed(3)),
    afterValue: Number(avg.toFixed(3)),
    beforeJudgment,
    afterJudgment,
    reason: hasMixedUnits
      ? `浮标盐度单位混用(PSU/‰)，换算后均值从${avgUnnorm.toFixed(3)}‰变为${avg.toFixed(3)}‰`
      : `盐度均值${avg.toFixed(3)}‰超过阈值${threshold}‰`,
    changedByExport: beforeJudgment !== afterJudgment || hasMixedUnits,
  };
}

export function computeTempAnomalyAlert(
  records: BuoyRecord[],
  threshold: number = 32
): WaterQualityAlert | null {
  const anomalies = records.filter(r => r.isAnomaly && r.anomalyReason?.includes('水温'));
  if (anomalies.length === 0) return null;

  const validRecords = records.filter(r => !r.isAnomaly || !r.anomalyReason?.includes('水温'));
  const avgTemp = validRecords.length > 0
    ? validRecords.reduce((a, b) => a + b.waterTemp, 0) / validRecords.length
    : 0;

  const allAvg = records.reduce((a, b) => a + b.waterTemp, 0) / records.length;

  if (validRecords.length === 0) return null;

  const beforeJudgment = allAvg > threshold ? 'warning' as const : 'normal' as const;
  const afterJudgment = avgTemp > threshold ? 'warning' as const : 'normal' as const;

  return {
    id: `alert-temp-${Date.now()}`,
    indicator: '水温均值',
    threshold,
    thresholdUnit: '°C',
    beforeValue: Number(allAvg.toFixed(1)),
    afterValue: Number(avgTemp.toFixed(1)),
    beforeJudgment,
    afterJudgment,
    reason: `${anomalies.length}条水温异常记录已剔除，均值从${allAvg.toFixed(1)}°C修正为${avgTemp.toFixed(1)}°C`,
    changedByExport: beforeJudgment !== afterJudgment,
  };
}

export function generateOpinion(
  weatherRecords: WeatherRecord[],
  buoyRecords: BuoyRecord[],
  tideGaps: GapItem[],
  alerts: WaterQualityAlert[]
): ProcessOpinion {
  const hasAnomalies = alerts.some(a => a.afterJudgment !== 'normal');
  const hasGaps = tideGaps.length > 0;
  const maxSeaState = Math.max(...weatherRecords.filter(r => !r.isAnomaly).map(r => r.seaState), 0);

  let conclusion: 'safe' | 'caution' | 'danger';
  const reasons: string[] = [];

  if (maxSeaState >= 5) {
    conclusion = 'danger';
    reasons.push(`海况等级${maxSeaState}级(大浪)，不建议出海`);
  } else if (hasAnomalies && hasGaps) {
    conclusion = 'danger';
    reasons.push('存在水质异常且潮汐数据不完整');
  } else if (hasAnomalies) {
    conclusion = 'caution';
    reasons.push('存在水质异常预警');
  } else if (hasGaps) {
    conclusion = 'caution';
    reasons.push(`潮汐数据缺失${tideGaps.length}个时段`);
  } else if (maxSeaState >= 4) {
    conclusion = 'caution';
    reasons.push('海况等级较高，需谨慎');
  } else {
    conclusion = 'safe';
    reasons.push('气象与水质条件正常');
  }

  return {
    id: `opinion-${Date.now()}`,
    conclusion,
    reason: reasons.join('；'),
    confirmed: false,
    rejected: false,
    runCount: 1,
  };
}

let _taskId = 0;

export function createMockReviewTask(): ReviewTask {
  _taskId++;
  const now = new Date();
  const ts = (offset: number) => {
    const d = new Date(now.getTime() + offset * 3600000);
    return d.toISOString();
  };

  const weatherRecords: WeatherRecord[] = [
    { id: `w1-${_taskId}`, timestamp: ts(-5), windSpeedRaw: '8.2m/s', windSpeed: 8.2, windDirection: 'NE', windDirDeg: 45, seaState: 3, airTemp: 26.1, isAnomaly: false },
    { id: `w2-${_taskId}`, timestamp: ts(-4), windSpeedRaw: '12.5m/s', windSpeed: 12.5, windDirection: 'NE', windDirDeg: 45, seaState: 4, airTemp: 25.8, isAnomaly: false },
    { id: `w3-${_taskId}`, timestamp: ts(-3), windSpeedRaw: '8.3', windSpeed: 8.3, windDirection: 'E', windDirDeg: 90, seaState: 3, airTemp: 26.0, rawNote: '单位缺失', isAnomaly: true, anomalyReason: '风速记录"8.3"缺少单位' },
    { id: `w4-${_taskId}`, timestamp: ts(-2), windSpeedRaw: '15.2m/s', windSpeed: 15.2, windDirection: 'SE', windDirDeg: 135, seaState: 4, airTemp: 25.5, isAnomaly: false },
    { id: `w5-${_taskId}`, timestamp: ts(-1), windSpeedRaw: '7.1', windSpeed: 7.1, windDirection: 'SE', windDirDeg: 135, seaState: 3, airTemp: 25.9, rawNote: '单位缺失', isAnomaly: true, anomalyReason: '风速记录"7.1"缺少单位' },
    { id: `w6-${_taskId}`, timestamp: ts(0), windSpeedRaw: '9.8m/s', windSpeed: 9.8, windDirection: 'S', windDirDeg: 180, seaState: 3, airTemp: 26.2, isAnomaly: false },
  ];

  const buoyRecords: BuoyRecord[] = [
    { id: `b1-${_taskId}`, timestamp: ts(-5), buoyId: 'A', salinity: 35, salinityUnit: 'PSU', salinityNormalized: psuToPermille(35), waterTempRaw: '28.7°C', waterTemp: 28.7, tideLevel: 1.2, isAnomaly: false },
    { id: `b2-${_taskId}`, timestamp: ts(-4), buoyId: 'B', salinity: 35, salinityUnit: '‰', salinityNormalized: 35, waterTempRaw: '287°C', waterTemp: 287, tideLevel: 1.5, isAnomaly: true, anomalyReason: '水温"287°C"疑似笔误，应为28.7°C' },
    { id: `b3-${_taskId}`, timestamp: ts(-3), buoyId: 'C', salinity: 35.3, salinityUnit: '‰', salinityNormalized: 35.3, waterTempRaw: '27.9°C', waterTemp: 27.9, tideLevel: 1.8, isAnomaly: false },
    { id: `b4-${_taskId}`, timestamp: ts(-2), buoyId: 'A', salinity: 35.1, salinityUnit: 'PSU', salinityNormalized: psuToPermille(35.1), waterTempRaw: '28.2°C', waterTemp: 28.2, tideLevel: null, isAnomaly: false },
    { id: `b5-${_taskId}`, timestamp: ts(-1), buoyId: 'B', salinity: 34.8, salinityUnit: '‰', salinityNormalized: 34.8, waterTempRaw: '28.0°C', waterTemp: 28.0, tideLevel: null, isAnomaly: false },
    { id: `b6-${_taskId}`, timestamp: ts(0), buoyId: 'C', salinity: 35.4, salinityUnit: '‰', salinityNormalized: 35.4, waterTempRaw: '27.8°C', waterTemp: 27.8, tideLevel: 2.1, isAnomaly: false },
  ];

  const tideRecords: TideRecord[] = [
    { id: `t1-${_taskId}`, timestamp: ts(0), tideLevel: 1.2, isGap: false },
    { id: `t2-${_taskId}`, timestamp: ts(4), tideLevel: 1.5, isGap: false },
    { id: `t3-${_taskId}`, timestamp: ts(8), tideLevel: null, isGap: true },
    { id: `t4-${_taskId}`, timestamp: ts(12), tideLevel: 1.8, isGap: false },
    { id: `t5-${_taskId}`, timestamp: ts(16), tideLevel: null, isGap: true },
    { id: `t6-${_taskId}`, timestamp: ts(20), tideLevel: 2.1, isGap: false },
  ];

  const { gaps } = computeWithPartialTide(tideRecords);
  const salinityAlert = computeSalinityAlert(buoyRecords);
  const tempAlert = computeTempAnomalyAlert(buoyRecords);
  const alerts: WaterQualityAlert[] = [salinityAlert, tempAlert].filter(Boolean) as WaterQualityAlert[];
  const opinion = generateOpinion(weatherRecords, buoyRecords, gaps, alerts);

  return {
    id: `task-${_taskId}`,
    status: 'completed',
    createdAt: now.toISOString(),
    operator: '运维工程师',
    runCount: 1,
    weatherRecords,
    buoyRecords,
    tideRecords,
    opinion,
    alerts,
    gapItems: gaps,
    supplementLog: [],
  };
}
