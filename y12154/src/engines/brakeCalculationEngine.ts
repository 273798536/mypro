import type {
  InspectionRecord,
  ElevatorProfile,
  BrakeCalculation,
  CalculationParams,
  ThresholdConfig,
  DataTrace,
} from '../types';
import { generateId, calculateHash } from '../utils/helpers';
import { GRAVITY_ACCELERATION, BRAKE_DISTANCE_FORMULA } from '../utils/constants';

export function calculateFrictionCoefficient(
  actualLoad: number,
  ratedLoad: number,
  config: ThresholdConfig
): number {
  const { baseCoefficient, loadInfluenceCoefficient } = config.friction;
  const loadRatio = (ratedLoad - actualLoad) / ratedLoad;
  return baseCoefficient * (1 + loadInfluenceCoefficient * loadRatio);
}

export function calculateTheoreticalBrakeDistance(
  ratedSpeed: number,
  frictionCoefficient: number,
  gravityAcceleration: number = GRAVITY_ACCELERATION
): number {
  if (ratedSpeed <= 0 || frictionCoefficient <= 0) {
    return 0;
  }
  return (ratedSpeed * ratedSpeed) / (2 * gravityAcceleration * frictionCoefficient);
}

export function calculateActualBrakeDistance(
  initialSpeed: number,
  brakeTime: number,
  frictionCoefficient: number,
  gravityAcceleration: number = GRAVITY_ACCELERATION
): number {
  if (initialSpeed <= 0 || brakeTime <= 0) {
    return 0;
  }
  
  const deceleration = gravityAcceleration * frictionCoefficient;
  return initialSpeed * brakeTime - 0.5 * deceleration * brakeTime * brakeTime;
}

export function calculateBrakeDistanceFromCurve(
  speedCurve: Array<{ time: number; speed: number }>
): number {
  if (speedCurve.length < 2) {
    return 0;
  }
  
  let distance = 0;
  
  for (let i = 1; i < speedCurve.length; i++) {
    const prev = speedCurve[i - 1];
    const curr = speedCurve[i];
    const timeDelta = curr.time - prev.time;
    const avgSpeed = (prev.speed + curr.speed) / 2;
    distance += avgSpeed * timeDelta;
  }
  
  return Math.abs(distance);
}

export function calculateBrakeDistance(
  record: InspectionRecord,
  elevator: ElevatorProfile,
  config: ThresholdConfig
): BrakeCalculation {
  const now = new Date().toISOString();
  
  const frictionCoefficient = calculateFrictionCoefficient(
    record.actualLoad,
    elevator.ratedLoad,
    config
  );
  
  const params: CalculationParams = {
    ratedSpeed: elevator.ratedSpeed,
    actualLoad: record.actualLoad,
    ratedLoad: elevator.ratedLoad,
    brakeTime: record.brakeTime,
    frictionCoefficient,
    gravityAcceleration: GRAVITY_ACCELERATION,
  };
  
  const theoreticalDistance = calculateTheoreticalBrakeDistance(
    elevator.ratedSpeed,
    frictionCoefficient
  );
  
  let actualDistance: number;
  
  if (record.speedCurveData && record.speedCurveData.length >= 2) {
    actualDistance = calculateBrakeDistanceFromCurve(record.speedCurveData);
  } else {
    actualDistance = calculateActualBrakeDistance(
      record.actualSpeed,
      record.brakeTime,
      frictionCoefficient
    );
  }
  
  const distanceDeviation = actualDistance - theoreticalDistance;
  const deviationRate = theoreticalDistance > 0 ? distanceDeviation / theoreticalDistance : 0;
  
  const dataHash = calculateHash({
    recordId: record.id,
    params,
    theoreticalDistance,
    actualDistance,
    frictionCoefficient,
  });
  
  return {
    id: generateId('calc_'),
    recordId: record.id,
    theoreticalDistance: Math.round(theoreticalDistance * 1000) / 1000,
    theoreticalBrakeDistance: Math.round(theoreticalDistance * 1000) / 1000,
    actualDistance: Math.round(actualDistance * 1000) / 1000,
    actualBrakeDistance: Math.round(actualDistance * 1000) / 1000,
    distanceDeviation: Math.round(distanceDeviation * 1000) / 1000,
    deviationRate: Math.round(deviationRate * 10000) / 10000,
    deviationPercent: Math.round(deviationRate * 10000) / 100,
    frictionCoefficient: Math.round(frictionCoefficient * 10000) / 10000,
    calculationFormula: BRAKE_DISTANCE_FORMULA,
    calculationParams: params,
    dataHash,
    calculatedAt: now,
  };
}

export function createCalculationTrace(
  record: InspectionRecord,
  calculation: BrakeCalculation,
  beforeOperation: string
): DataTrace {
  return {
    id: generateId('trace_'),
    recordId: record.id,
    traceStep: 'calculation',
    beforeData: {
      actualLoad: record.actualLoad,
      actualSpeed: record.actualSpeed,
      brakeTime: record.brakeTime,
    },
    afterData: {
      theoreticalDistance: calculation.theoreticalDistance,
      actualDistance: calculation.actualDistance,
      distanceDeviation: calculation.distanceDeviation,
      deviationRate: calculation.deviationRate,
      frictionCoefficient: calculation.calculationParams.frictionCoefficient,
    },
    operation: beforeOperation,
    operator: 'system',
    operatedAt: new Date().toISOString(),
  };
}

export function calculateBatch(
  records: InspectionRecord[],
  elevators: ElevatorProfile[],
  config: ThresholdConfig
): { calculations: BrakeCalculation[]; traces: DataTrace[] } {
  const elevatorMap = new Map(elevators.map(e => [e.id, e]));
  const calculations: BrakeCalculation[] = [];
  const traces: DataTrace[] = [];
  
  for (const record of records) {
    const elevator = elevatorMap.get(record.elevatorId);
    if (!elevator) continue;
    
    const calculation = calculateBrakeDistance(record, elevator, config);
    calculations.push(calculation);
    
    traces.push(
      createCalculationTrace(
        record,
        calculation,
        `制动距离计算完成: 理论值=${calculation.theoreticalDistance}m, 实际值=${calculation.actualDistance}m, 偏差率=${(calculation.deviationRate * 100).toFixed(1)}%`
      )
    );
  }
  
  return { calculations, traces };
}

export function getCalculationExplanation(calculation: BrakeCalculation): string {
  const { calculationParams, theoreticalDistance, actualDistance, deviationRate } = calculation;
  const { ratedSpeed, actualLoad, ratedLoad, frictionCoefficient } = calculationParams;
  
  const loadRatio = ((ratedLoad - actualLoad) / ratedLoad * 100).toFixed(1);
  
  return `
    计算公式: S = v² / (2 × g × f)
    额定速度 v = ${ratedSpeed} m/s
    重力加速度 g = 9.8 m/s²
    摩擦系数 f = ${frictionCoefficient.toFixed(4)} (载荷修正: ${loadRatio}%)
    理论制动距离 = ${theoreticalDistance.toFixed(3)} m
    实际制动距离 = ${actualDistance.toFixed(3)} m
    距离偏差 = ${(actualDistance - theoreticalDistance).toFixed(3)} m
    偏差率 = ${(deviationRate * 100).toFixed(1)}%
  `.trim();
}
