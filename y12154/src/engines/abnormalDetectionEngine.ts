import type {
  InspectionRecord,
  ElevatorProfile,
  BrakeCalculation,
  AbnormalDetection,
  AbnormalLevel,
  AbnormalType,
  ThresholdConfig,
  DataTrace,
  SpeedPoint,
} from '../types';
import { generateId } from '../utils/helpers';
import { ABNORMAL_TYPE_LABELS } from '../utils/constants';

export function detectSpeedGap(
  speedCurve: SpeedPoint[],
  ratedSpeed: number,
  brakeTime: number,
  threshold: number
): { hasGap: boolean; gapValue: number; positions: number[] } {
  if (!speedCurve || speedCurve.length < 3 || brakeTime <= 0) {
    return { hasGap: false, gapValue: 0, positions: [] };
  }
  
  const brakeStartTime = speedCurve[0].time;
  const theoreticalDeceleration = ratedSpeed / brakeTime;
  const positions: number[] = [];
  let maxGap = 0;
  
  for (let i = 1; i < speedCurve.length; i++) {
    const point = speedCurve[i];
    const elapsedTime = point.time - brakeStartTime;
    
    if (elapsedTime > brakeTime) break;
    
    const theoreticalSpeed = ratedSpeed - theoreticalDeceleration * elapsedTime;
    const actualSpeed = point.speed;
    const gap = Math.abs(theoreticalSpeed - actualSpeed);
    
    if (gap > maxGap) {
      maxGap = gap;
    }
    
    if (gap > threshold) {
      positions.push(i);
    }
  }
  
  return {
    hasGap: maxGap > threshold,
    gapValue: Math.round(maxGap * 1000) / 1000,
    positions,
  };
}

export function detectBrakeDelay(
  speedCurve: SpeedPoint[],
  threshold: number
): { hasDelay: boolean; delayValue: number } {
  if (!speedCurve || speedCurve.length < 2) {
    return { hasDelay: false, delayValue: 0 };
  }
  
  const initialSpeed = speedCurve[0].speed;
  const speedDropThreshold = initialSpeed * 0.05;
  
  let delayStartTime = speedCurve[0].time;
  let speedDropTime: number | null = null;
  
  for (let i = 1; i < speedCurve.length; i++) {
    const speedDrop = initialSpeed - speedCurve[i].speed;
    if (speedDrop >= speedDropThreshold) {
      speedDropTime = speedCurve[i].time;
      break;
    }
  }
  
  if (speedDropTime === null) {
    return { hasDelay: false, delayValue: 0 };
  }
  
  const delay = speedDropTime - delayStartTime;
  
  return {
    hasDelay: delay > threshold,
    delayValue: Math.round(delay * 1000) / 1000,
  };
}

export function detectOverload(
  actualLoad: number,
  ratedLoad: number,
  overloadRate: number
): { hasOverload: boolean; overloadValue: number } {
  const overloadThreshold = ratedLoad * overloadRate;
  const overloadValue = Math.max(0, actualLoad - overloadThreshold);
  
  return {
    hasOverload: actualLoad > overloadThreshold,
    overloadValue: Math.round(overloadValue * 1000) / 1000,
  };
}

export function detectBrakeDistanceAbnormality(
  deviationRate: number,
  config: ThresholdConfig
): { isAbnormal: boolean; level: 'normal' | 'warning' | 'serious' } {
  const { brakeDistance } = config;
  const absDeviation = Math.abs(deviationRate);
  
  if (absDeviation >= brakeDistance.seriousMinRate && absDeviation <= brakeDistance.seriousMaxRate) {
    if (deviationRate < -brakeDistance.seriousMinRate || deviationRate > brakeDistance.seriousMaxRate) {
      return { isAbnormal: true, level: 'serious' };
    }
  }
  
  if (deviationRate < -brakeDistance.warningMinRate || deviationRate > brakeDistance.warningMaxRate) {
    return { isAbnormal: true, level: 'warning' };
  }
  
  return { isAbnormal: false, level: 'normal' };
}

export function determineAbnormalLevel(
  hasSpeedGap: boolean,
  hasBrakeDelay: boolean,
  hasOverload: boolean,
  brakeDistanceLevel: 'normal' | 'warning' | 'serious',
  config: ThresholdConfig
): AbnormalLevel {
  if (hasOverload) {
    return 'overload';
  }
  
  if (brakeDistanceLevel === 'serious' || hasSpeedGap || hasBrakeDelay) {
    return 'serious';
  }
  
  if (brakeDistanceLevel === 'warning') {
    return 'warning';
  }
  
  return 'normal';
}

export function generateAbnormalDescription(
  abnormalTypes: AbnormalType[],
  details: {
    speedGapValue?: number;
    brakeDelayValue?: number;
    overloadValue?: number;
    deviationRate?: number;
  }
): string {
  const descriptions: string[] = [];
  
  for (const type of abnormalTypes) {
    switch (type) {
      case 'speed_gap':
        descriptions.push(`速度缺口: ${details.speedGapValue?.toFixed(3)} m/s`);
        break;
      case 'brake_delay':
        descriptions.push(`制动延迟: ${details.brakeDelayValue?.toFixed(3)} s`);
        break;
      case 'overload':
        descriptions.push(`载荷超限: ${details.overloadValue?.toFixed(0)} kg`);
        break;
      case 'brake_distance':
        descriptions.push(`制动距离偏差: ${((details.deviationRate || 0) * 100).toFixed(1)}%`);
        break;
      case 'missing_data':
        descriptions.push('数据缺失');
        break;
    }
  }
  
  return descriptions.join('; ') || '无异常';
}

export function detectAbnormalities(
  record: InspectionRecord,
  elevator: ElevatorProfile,
  calculation: BrakeCalculation,
  config: ThresholdConfig
): AbnormalDetection {
  const now = new Date().toISOString();
  
  const speedGapResult = detectSpeedGap(
    record.speedCurveData,
    elevator.ratedSpeed,
    record.brakeTime,
    config.speedGap.seriousThreshold
  );
  
  const brakeDelayResult = detectBrakeDelay(
    record.speedCurveData,
    config.brakeDelay.seriousThreshold
  );
  
  const overloadResult = detectOverload(
    record.actualLoad,
    elevator.ratedLoad,
    config.load.overloadRate
  );
  
  const brakeDistanceResult = detectBrakeDistanceAbnormality(
    calculation.deviationRate,
    config
  );
  
  const abnormalTypes: AbnormalType[] = [];
  
  if (speedGapResult.hasGap) abnormalTypes.push('speed_gap');
  if (brakeDelayResult.hasDelay) abnormalTypes.push('brake_delay');
  if (overloadResult.hasOverload) abnormalTypes.push('overload');
  if (brakeDistanceResult.isAbnormal) abnormalTypes.push('brake_distance');
  
  const abnormalLevel = determineAbnormalLevel(
    speedGapResult.hasGap,
    brakeDelayResult.hasDelay,
    overloadResult.hasOverload,
    brakeDistanceResult.level,
    config
  );
  
  const abnormalDescription = generateAbnormalDescription(abnormalTypes, {
    speedGapValue: speedGapResult.gapValue,
    brakeDelayValue: brakeDelayResult.delayValue,
    overloadValue: overloadResult.overloadValue,
    deviationRate: calculation.deviationRate,
  });
  
  const overallResult = abnormalLevel === 'normal' ? 'pass' : 'fail';
  
  return {
    id: generateId('abn_'),
    recordId: record.id,
    hasSpeedGap: speedGapResult.hasGap,
    speedGapValue: speedGapResult.gapValue,
    hasBrakeDelay: brakeDelayResult.hasDelay,
    brakeDelayValue: brakeDelayResult.delayValue,
    hasOverload: overloadResult.hasOverload,
    overloadValue: overloadResult.overloadValue,
    abnormalTypes,
    detectedTypes: abnormalTypes,
    abnormalLevel,
    overallLevel: abnormalLevel,
    abnormalDescription,
    description: abnormalDescription,
    overallResult,
    reviewed: false,
    detectedAt: now,
  };
}

export function createAbnormalTrace(
  record: InspectionRecord,
  abnormal: AbnormalDetection
): DataTrace {
  return {
    id: generateId('trace_'),
    recordId: record.id,
    traceStep: 'abnormal',
    beforeData: {},
    afterData: {
      abnormalTypes: abnormal.abnormalTypes,
      abnormalLevel: abnormal.abnormalLevel,
      abnormalDescription: abnormal.abnormalDescription,
      speedGapValue: abnormal.speedGapValue,
      brakeDelayValue: abnormal.brakeDelayValue,
      overloadValue: abnormal.overloadValue,
    },
    operation: `异常检测完成: 等级=${abnormal.abnormalLevel}, 类型=${abnormal.abnormalTypes.map(t => ABNORMAL_TYPE_LABELS[t]).join(',')}`,
    operator: 'system',
    operatedAt: new Date().toISOString(),
  };
}

export function detectBatch(
  records: InspectionRecord[],
  elevators: ElevatorProfile[],
  calculations: BrakeCalculation[],
  config: ThresholdConfig
): { abnormalities: AbnormalDetection[]; traces: DataTrace[] } {
  const elevatorMap = new Map(elevators.map(e => [e.id, e]));
  const calculationMap = new Map(calculations.map(c => [c.recordId, c]));
  
  const abnormalities: AbnormalDetection[] = [];
  const traces: DataTrace[] = [];
  
  for (const record of records) {
    const elevator = elevatorMap.get(record.elevatorId);
    const calculation = calculationMap.get(record.id);
    
    if (!elevator || !calculation) continue;
    
    const abnormal = detectAbnormalities(record, elevator, calculation, config);
    abnormalities.push(abnormal);
    traces.push(createAbnormalTrace(record, abnormal));
  }
  
  return { abnormalities, traces };
}
