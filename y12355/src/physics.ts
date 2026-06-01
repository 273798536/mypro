import { PHYSICAL_CONSTANTS } from './types';
import type { 
  PendulumRecord, 
  PeriodCalculation, 
  ErrorEstimate, 
  LengthUnit, 
  AngleUnit,
  ErrorSource
} from './types';

const { g, SMALL_ANGLE_THRESHOLD, LARGE_ANGLE_THRESHOLD } = PHYSICAL_CONSTANTS;

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

export const convertLengthToMeters = (value: number, unit: LengthUnit): number => {
  switch (unit) {
    case 'm': return value;
    case 'cm': return value / 100;
    case 'mm': return value / 1000;
    default: return value;
  }
};

export const convertAngleToRadians = (value: number, unit: AngleUnit): number => {
  return unit === 'deg' ? degToRad(value) : value;
};

export const calculateSmallAnglePeriod = (lengthMeters: number): number => {
  if (lengthMeters <= 0) return 0;
  return 2 * Math.PI * Math.sqrt(lengthMeters / g);
};

export const calculateLargeAnglePeriod = (
  lengthMeters: number,
  angleRadians: number,
  order: number = 4
): number => {
  if (lengthMeters <= 0) return 0;
  const T0 = calculateSmallAnglePeriod(lengthMeters);
  const sinHalf = Math.sin(angleRadians / 2);
  
  let correction = 1;
  for (let n = 1; n <= order; n++) {
    const numerator = Math.pow(factorial(2 * n), 2);
    const denominator = Math.pow(Math.pow(2, n) * factorial(n), 4);
    correction += (numerator / denominator) * Math.pow(sinHalf, 2 * n);
  }
  
  return T0 * correction;
};

const factorial = (n: number): number => {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
};

export const getLargeAngleCorrection = (
  lengthMeters: number,
  angleRadians: number
): number => {
  const T0 = calculateSmallAnglePeriod(lengthMeters);
  const T = calculateLargeAnglePeriod(lengthMeters, angleRadians);
  return ((T - T0) / T0) * 100;
};

export const shouldUseLargeAngle = (angleRadians: number): boolean => {
  return Math.abs(angleRadians) > SMALL_ANGLE_THRESHOLD;
};

export const calculatePeriodCalculation = (
  record: PendulumRecord
): PeriodCalculation => {
  const lengthMeters = convertLengthToMeters(record.length, record.lengthUnit);
  const angleRadians = convertAngleToRadians(record.angle, record.angleUnit);
  
  const smallAnglePeriod = calculateSmallAnglePeriod(lengthMeters);
  const largeAnglePeriod = calculateLargeAnglePeriod(lengthMeters, angleRadians);
  const largeAngleCorrection = getLargeAngleCorrection(lengthMeters, angleRadians);
  const usesLargeAngle = shouldUseLargeAngle(angleRadians);
  
  const theoreticalPeriod = usesLargeAngle ? largeAnglePeriod : smallAnglePeriod;
  const measuredError = Math.abs(record.measuredPeriod - theoreticalPeriod) / theoreticalPeriod * 100;
  
  const smallAngleApproxError = Math.abs(smallAnglePeriod - largeAnglePeriod) / largeAnglePeriod * 100;
  const largeAngleApproxError = 0;
  
  return {
    recordId: record.id,
    smallAnglePeriod,
    largeAnglePeriod,
    largeAngleCorrection,
    smallAngleApproxError,
    largeAngleApproxError,
    measuredError,
    usesLargeAngle
  };
};

export const calculateErrorEstimate = (
  record: PendulumRecord,
  calculation: PeriodCalculation
): ErrorEstimate => {
  const lengthMeters = convertLengthToMeters(record.length, record.lengthUnit);
  const angleRadians = convertAngleToRadians(record.angle, record.angleUnit);
  
  const errorSources: ErrorSource[] = [];
  
  const lengthUncertainty = 0.001;
  const lengthError = (lengthUncertainty / (2 * lengthMeters)) * 100;
  errorSources.push({
    type: 'length',
    value: lengthError,
    description: `摆长测量误差 ±1mm，相对误差 ${lengthError.toFixed(3)}%`
  });
  
  const angleUncertainty = degToRad(1);
  const angleFactor = (Math.sin(angleRadians) / 2) / (1 + Math.cos(angleRadians));
  const angleError = Math.abs(angleFactor * angleUncertainty) * 100;
  errorSources.push({
    type: 'angle',
    value: angleError,
    description: `角度测量误差 ±1°，相对误差 ${angleError.toFixed(3)}%`
  });
  
  const timingUncertainty = 0.01;
  const timingError = (timingUncertainty / record.totalTiming) * 100;
  errorSources.push({
    type: 'timing',
    value: timingError,
    description: `计时误差 ±0.01s，总计时 ${record.totalTiming}s，相对误差 ${timingError.toFixed(3)}%`
  });
  
  const countError = record.measuredCount > 0 
    ? (1 / (2 * record.measuredCount)) * 100 
    : 0;
  errorSources.push({
    type: 'count',
    value: countError,
    description: `周期计数误差，共 ${record.measuredCount} 个周期，相对误差 ${countError.toFixed(3)}%`
  });
  
  const approxError = calculation.usesLargeAngle 
    ? calculation.largeAngleApproxError 
    : calculation.smallAngleApproxError;
  if (approxError > 0.01) {
    errorSources.push({
      type: calculation.usesLargeAngle ? 'large_angle_approx' : 'small_angle_approx',
      value: approxError,
      description: calculation.usesLargeAngle 
        ? `大角度近似误差 ${approxError.toFixed(3)}%`
        : `小角度近似误差 ${approxError.toFixed(3)}%`
    });
  }
  
  const systematicError = Math.sqrt(
    Math.pow(lengthError, 2) + 
    Math.pow(angleError, 2)
  );
  
  const randomError = Math.sqrt(
    Math.pow(timingError, 2) + 
    Math.pow(countError, 2)
  );
  
  const totalError = Math.sqrt(
    Math.pow(systematicError, 2) + 
    Math.pow(randomError, 2) +
    Math.pow(approxError, 2)
  );
  
  return {
    recordId: record.id,
    lengthError,
    angleError,
    timingError,
    systematicError,
    randomError,
    totalError,
    errorSources
  };
};

export const getAngleCategory = (angleRadians: number): 'small' | 'medium' | 'large' => {
  const absAngle = Math.abs(angleRadians);
  if (absAngle <= SMALL_ANGLE_THRESHOLD) return 'small';
  if (absAngle <= LARGE_ANGLE_THRESHOLD) return 'medium';
  return 'large';
};

export const recalculateAllForRecord = (record: PendulumRecord) => {
  const calculation = calculatePeriodCalculation(record);
  const errorEstimate = calculateErrorEstimate(record, calculation);
  return { calculation, errorEstimate };
};

export const recalculateBatch = (records: PendulumRecord[]) => {
  return records.map(record => ({
    record,
    ...recalculateAllForRecord(record)
  }));
};
