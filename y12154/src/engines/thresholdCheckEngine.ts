import type {
  InspectionRecord,
  ElevatorProfile,
  BrakeCalculation,
  AbnormalDetection,
  ThresholdCheck,
  ThresholdConfig,
  DataTrace,
  AbnormalLevel,
} from '../types';
import { generateId } from '../utils/helpers';

export function calculateBrakeDistanceRange(
  theoreticalDistance: number,
  config: ThresholdConfig
): { min: number; max: number } {
  const { brakeDistance } = config;
  return {
    min: theoreticalDistance * brakeDistance.warningMinRate,
    max: theoreticalDistance * brakeDistance.warningMaxRate,
  };
}

export function checkBrakeDistance(
  actualDistance: number,
  min: number,
  max: number
): boolean {
  return actualDistance >= min && actualDistance <= max;
}

export function checkSpeedGap(
  gapValue: number,
  threshold: number
): boolean {
  return gapValue <= threshold;
}

export function checkBrakeDelay(
  delayValue: number,
  threshold: number
): boolean {
  return delayValue <= threshold;
}

export function checkLoad(
  actualLoad: number,
  ratedLoad: number,
  overloadRate: number
): boolean {
  return actualLoad <= ratedLoad * overloadRate;
}

export function performThresholdCheck(
  record: InspectionRecord,
  elevator: ElevatorProfile,
  calculation: BrakeCalculation,
  abnormal: AbnormalDetection,
  config: ThresholdConfig
): ThresholdCheck {
  const now = new Date().toISOString();
  
  const brakeDistanceRange = calculateBrakeDistanceRange(
    calculation.theoreticalDistance,
    config
  );
  
  const isBrakeDistanceOk = checkBrakeDistance(
    calculation.actualDistance,
    brakeDistanceRange.min,
    brakeDistanceRange.max
  );
  
  const isSpeedGapOk = checkSpeedGap(
    abnormal.speedGapValue,
    config.speedGap.warningThreshold
  );
  
  const isBrakeDelayOk = checkBrakeDelay(
    abnormal.brakeDelayValue,
    config.brakeDelay.warningThreshold
  );
  
  const isLoadOk = checkLoad(
    record.actualLoad,
    elevator.ratedLoad,
    config.load.overloadRate
  );
  
  const overallResult = isBrakeDistanceOk && isSpeedGapOk && isBrakeDelayOk && isLoadOk
    ? 'pass'
    : 'fail';
  
  const deviationRate = Math.abs(calculation.deviationRate);
  let brakeDistanceLevel: AbnormalLevel = 'normal';
  if (deviationRate > config.brakeDistance.seriousMaxRate - 1) {
    brakeDistanceLevel = 'serious';
  } else if (deviationRate > config.brakeDistance.warningMaxRate - 1) {
    brakeDistanceLevel = 'warning';
  }
  
  let speedGapLevel: AbnormalLevel = 'normal';
  if (abnormal.speedGapValue > config.speedGap.seriousThreshold) {
    speedGapLevel = 'serious';
  } else if (abnormal.speedGapValue > config.speedGap.warningThreshold) {
    speedGapLevel = 'warning';
  }
  
  let brakeDelayLevel: AbnormalLevel = 'normal';
  if (abnormal.brakeDelayValue > config.brakeDelay.seriousThreshold) {
    brakeDelayLevel = 'serious';
  } else if (abnormal.brakeDelayValue > config.brakeDelay.warningThreshold) {
    brakeDelayLevel = 'warning';
  }
  
  let loadLevel: AbnormalLevel = 'normal';
  const loadRate = record.actualLoad / elevator.ratedLoad;
  if (loadRate > config.load.overloadRate) {
    loadLevel = 'overload';
  } else if (loadRate > config.load.warningRate) {
    loadLevel = 'warning';
  }
  
  return {
    id: generateId('thr_'),
    recordId: record.id,
    brakeDistanceMin: Math.round(brakeDistanceRange.min * 1000) / 1000,
    brakeDistanceMax: Math.round(brakeDistanceRange.max * 1000) / 1000,
    speedGapThreshold: config.speedGap.warningThreshold,
    brakeDelayThreshold: config.brakeDelay.warningThreshold,
    loadThreshold: Math.round(elevator.ratedLoad * config.load.overloadRate),
    isBrakeDistanceOk,
    isSpeedGapOk,
    isBrakeDelayOk,
    isLoadOk,
    brakeDistanceLevel,
    speedGapLevel,
    brakeDelayLevel,
    loadLevel,
    overallResult,
    checkedAt: now,
  };
}

export function createThresholdTrace(
  record: InspectionRecord,
  threshold: ThresholdCheck
): DataTrace {
  return {
    id: generateId('trace_'),
    recordId: record.id,
    traceStep: 'threshold',
    beforeData: {},
    afterData: {
      brakeDistanceMin: threshold.brakeDistanceMin,
      brakeDistanceMax: threshold.brakeDistanceMax,
      isBrakeDistanceOk: threshold.isBrakeDistanceOk,
      isSpeedGapOk: threshold.isSpeedGapOk,
      isBrakeDelayOk: threshold.isBrakeDelayOk,
      isLoadOk: threshold.isLoadOk,
      overallResult: threshold.overallResult,
    },
    operation: `阈值校验完成: 制动距离=[${threshold.brakeDistanceMin}, ${threshold.brakeDistanceMax}]m, 综合结果=${threshold.overallResult}`,
    operator: 'system',
    operatedAt: new Date().toISOString(),
  };
}

export function checkBatch(
  records: InspectionRecord[],
  elevators: ElevatorProfile[],
  calculations: BrakeCalculation[],
  abnormalities: AbnormalDetection[],
  config: ThresholdConfig
): { thresholdChecks: ThresholdCheck[]; traces: DataTrace[] } {
  const elevatorMap = new Map(elevators.map(e => [e.id, e]));
  const calculationMap = new Map(calculations.map(c => [c.recordId, c]));
  const abnormalMap = new Map(abnormalities.map(a => [a.recordId, a]));
  
  const thresholdChecks: ThresholdCheck[] = [];
  const traces: DataTrace[] = [];
  
  for (const record of records) {
    const elevator = elevatorMap.get(record.elevatorId);
    const calculation = calculationMap.get(record.id);
    const abnormal = abnormalMap.get(record.id);
    
    if (!elevator || !calculation || !abnormal) continue;
    
    const threshold = performThresholdCheck(
      record,
      elevator,
      calculation,
      abnormal,
      config
    );
    
    thresholdChecks.push(threshold);
    traces.push(createThresholdTrace(record, threshold));
  }
  
  return { thresholdChecks, traces };
}

export function getThresholdSummary(
  checks: ThresholdCheck[]
): {
  total: number;
  pass: number;
  fail: number;
  passRate: number;
  brakeDistanceFail: number;
  speedGapFail: number;
  brakeDelayFail: number;
  loadFail: number;
} {
  const total = checks.length;
  const pass = checks.filter(c => c.overallResult === 'pass').length;
  const fail = total - pass;
  
  return {
    total,
    pass,
    fail,
    passRate: total > 0 ? pass / total : 0,
    brakeDistanceFail: checks.filter(c => !c.isBrakeDistanceOk).length,
    speedGapFail: checks.filter(c => !c.isSpeedGapOk).length,
    brakeDelayFail: checks.filter(c => !c.isBrakeDelayOk).length,
    loadFail: checks.filter(c => !c.isLoadOk).length,
  };
}
