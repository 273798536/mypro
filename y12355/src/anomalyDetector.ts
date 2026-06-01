import { convertAngleToRadians, convertLengthToMeters } from './physics';
import type { PendulumRecord, AnomalyInfo, AnomalyType, PeriodCalculation } from './types';
import { PHYSICAL_CONSTANTS } from './types';

const { LARGE_ANGLE_THRESHOLD } = PHYSICAL_CONSTANTS;

const detectLargeAngleApprox = (
  record: PendulumRecord,
  calculation: PeriodCalculation
): AnomalyInfo | null => {
  const angleRadians = convertAngleToRadians(record.angle, record.angleUnit);
  
  if (Math.abs(angleRadians) <= LARGE_ANGLE_THRESHOLD) {
    return null;
  }
  
  const angleDegrees = record.angleUnit === 'deg' ? record.angle : (record.angle * 180) / Math.PI;
  const correctionPercent = calculation.largeAngleCorrection;
  const severity = correctionPercent > 5 ? 'high' : correctionPercent > 2 ? 'medium' : 'low';
  
  return {
    recordId: record.id,
    type: 'large_angle_approx',
    severity,
    description: `摆角 ${angleDegrees.toFixed(1)}° 超过小角度近似阈值（10°），大角度修正量为 ${correctionPercent.toFixed(2)}%`,
    suggestion: '使用大角度周期公式进行计算，或减小摆角重新测量。当前已自动应用大角度修正。',
    affectedFields: ['angle', 'smallAnglePeriod', 'largeAnglePeriod']
  };
};

const detectLengthUnitError = (
  record: PendulumRecord,
  batchRecords: PendulumRecord[]
): AnomalyInfo | null => {
  if (record.lengthUnitConfirmed) {
    return null;
  }
  
  const otherRecords = batchRecords.filter(r => r.id !== record.id);
  if (otherRecords.length === 0) return null;
  
  const recordLengthMeters = convertLengthToMeters(record.length, record.lengthUnit);
  const avgLength = otherRecords.reduce((sum, r) => 
    sum + convertLengthToMeters(r.length, r.lengthUnit), 0
  ) / otherRecords.length;
  
  const deviationPercent = Math.abs(recordLengthMeters - avgLength) / avgLength * 100;
  
  if (deviationPercent < 50) return null;
  
  let suggestedUnit: 'm' | 'cm' | 'mm' | null = null;
  
  if (record.lengthUnit === 'm' && record.length < 0.1) {
    suggestedUnit = 'cm';
  } else if (record.lengthUnit === 'cm' && record.length > 500) {
    suggestedUnit = 'mm';
  } else if (record.lengthUnit === 'mm' && record.length < 10) {
    suggestedUnit = 'cm';
  }
  
  const possibleCorrectLength = suggestedUnit 
    ? convertLengthToMeters(record.length, suggestedUnit)
    : null;
  
  const correctedDeviation = possibleCorrectLength
    ? Math.abs(possibleCorrectLength - avgLength) / avgLength * 100
    : deviationPercent;
  
  if (correctedDeviation > 20) return null;
  
  const severity = deviationPercent > 200 ? 'high' : deviationPercent > 100 ? 'medium' : 'low';
  
  return {
    recordId: record.id,
    type: 'length_unit_error',
    severity,
    description: `摆长 ${record.length} ${record.lengthUnit} 与批次平均值偏差 ${deviationPercent.toFixed(1)}%，` +
      (suggestedUnit ? `疑似单位误写，可能应为 ${record.length} ${suggestedUnit}` : '请确认单位是否正确'),
    suggestion: suggestedUnit 
      ? `建议将单位改为 ${suggestedUnit}，修正后偏差为 ${correctedDeviation.toFixed(1)}%。确认后请勾选"单位已确认"。`
      : '请手动确认摆长单位是否正确，确认后勾选"单位已确认"。',
    affectedFields: ['length', 'lengthUnit']
  };
};

const detectTimingMissed = (
  record: PendulumRecord,
  calculation: PeriodCalculation
): AnomalyInfo | null => {
  const theoreticalPeriod = calculation.usesLargeAngle 
    ? calculation.largeAnglePeriod 
    : calculation.smallAnglePeriod;
  
  if (theoreticalPeriod === 0) return null;
  
  if (record.measuredCount <= 0) {
    return {
      recordId: record.id,
      type: 'timing_missed',
      severity: 'high',
      description: '周期计数为0，无法计算测量周期',
      suggestion: '请输入正确的周期计数（总计时内的完整周期数）',
      affectedFields: ['measuredCount', 'measuredPeriod']
    };
  }
  
  if (record.totalTiming <= 0) {
    return {
      recordId: record.id,
      type: 'timing_missed',
      severity: 'high',
      description: '总计时为0，无法计算测量周期',
      suggestion: '请输入正确的总计时时间',
      affectedFields: ['totalTiming', 'measuredPeriod']
    };
  }
  
  const expectedTiming = theoreticalPeriod * record.measuredCount;
  const timingDeviation = Math.abs(record.totalTiming - expectedTiming) / expectedTiming * 100;
  
  if (timingDeviation > 30) {
    const missedCycles = Math.round((record.totalTiming / theoreticalPeriod) - record.measuredCount);
    const severity = timingDeviation > 100 ? 'high' : timingDeviation > 50 ? 'medium' : 'low';
    
    return {
      recordId: record.id,
      type: 'timing_missed',
      severity,
      description: `计时与周期计数不匹配：总计时 ${record.totalTiming}s，理论值约 ${expectedTiming.toFixed(2)}s，` +
        `偏差 ${timingDeviation.toFixed(1)}%` +
        (missedCycles !== 0 ? `，疑似漏拍约 ${Math.abs(missedCycles)} 个周期` : ''),
      suggestion: missedCycles > 0
        ? `建议检查周期计数，可能漏数了 ${missedCycles} 个周期；或重新测量`
        : missedCycles < 0
        ? `建议检查周期计数，可能多数了 ${Math.abs(missedCycles)} 个周期；或重新测量`
        : '请核对总计时和周期计数是否一致',
      affectedFields: ['totalTiming', 'measuredCount', 'measuredPeriod']
    };
  }
  
  const periodFromTiming = record.totalTiming / record.measuredCount;
  const periodDeviation = Math.abs(record.measuredPeriod - periodFromTiming) / periodFromTiming * 100;
  
  if (periodDeviation > 1) {
    return {
      recordId: record.id,
      type: 'timing_missed',
      severity: 'low',
      description: `输入的测量周期 ${record.measuredPeriod.toFixed(4)}s 与计算值 ${periodFromTiming.toFixed(4)}s 偏差 ${periodDeviation.toFixed(2)}%`,
      suggestion: '测量周期建议由系统自动计算（总计时/周期数），以确保一致性',
      affectedFields: ['measuredPeriod', 'totalTiming', 'measuredCount']
    };
  }
  
  return null;
};

export const detectAnomalies = (
  record: PendulumRecord,
  calculation: PeriodCalculation,
  batchRecords: PendulumRecord[]
): AnomalyInfo[] => {
  const anomalies: AnomalyInfo[] = [];
  
  const largeAngleAnomaly = detectLargeAngleApprox(record, calculation);
  if (largeAngleAnomaly) anomalies.push(largeAngleAnomaly);
  
  const unitAnomaly = detectLengthUnitError(record, batchRecords);
  if (unitAnomaly) anomalies.push(unitAnomaly);
  
  const timingAnomaly = detectTimingMissed(record, calculation);
  if (timingAnomaly) anomalies.push(timingAnomaly);
  
  return anomalies;
};

export const getAnomalyLabel = (type: AnomalyType): string => {
  switch (type) {
    case 'large_angle_approx': return '大角度近似';
    case 'length_unit_error': return '摆长单位错误';
    case 'timing_missed': return '计时漏拍';
    case 'none': return '正常';
    default: return '未知';
  }
};

export const getAnomalyIcon = (type: AnomalyType): string => {
  switch (type) {
    case 'large_angle_approx': return '📐';
    case 'length_unit_error': return '📏';
    case 'timing_missed': return '⏱️';
    case 'none': return '✅';
    default: return '❓';
  }
};

export const hasHighSeverity = (anomalies: AnomalyInfo[]): boolean => {
  return anomalies.some(a => a.severity === 'high');
};

export const getOverallAnomalyType = (anomalies: AnomalyInfo[]): AnomalyType => {
  if (anomalies.length === 0) return 'none';
  
  const priority: AnomalyType[] = ['timing_missed', 'length_unit_error', 'large_angle_approx'];
  for (const type of priority) {
    if (anomalies.some(a => a.type === type)) return type;
  }
  return anomalies[0].type;
};
