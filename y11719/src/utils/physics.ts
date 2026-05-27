import { DataPoint, CalculationResult, ScoreDetail, DiskParams, HangingMass } from '../types';
import { normalizeLength, normalizeMass, normalizeTime, normalizeAngularVelocity } from './unitConversion';

interface NormalizedPoint {
  time: number;
  angularVelocity: number;
  isValid: boolean;
}

function normalizeDataPoints(points: DataPoint[]): NormalizedPoint[] {
  return points.map((p) => ({
    time: normalizeTime(p.time, p.timeUnit),
    angularVelocity: normalizeAngularVelocity(p.angularVelocity, p.angularVelocityUnit),
    isValid: p.isValid,
  }));
}

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number; rSquared: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, rSquared: 0 };

  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumY2 = points.reduce((sum, p) => sum + p.y * p.y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const ssResidual = points.reduce((sum, p) => sum + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

  return { slope, intercept, rSquared };
}

function detectPhases(points: NormalizedPoint[]): {
  accelerationPhase: NormalizedPoint[];
  decelerationPhase: NormalizedPoint[];
} {
  const validPoints = points.filter((p) => p.isValid);
  if (validPoints.length < 4) {
    return { accelerationPhase: validPoints, decelerationPhase: [] };
  }

  const midIndex = Math.floor(validPoints.length / 2);
  const firstHalf = validPoints.slice(0, midIndex);
  const secondHalf = validPoints.slice(midIndex);

  const firstSlope = linearRegression(firstHalf.map((p) => ({ x: p.time, y: p.angularVelocity }))).slope;
  const secondSlope = linearRegression(secondHalf.map((p) => ({ x: p.time, y: p.angularVelocity }))).slope;

  if (firstSlope > 0 && secondSlope < 0) {
    return { accelerationPhase: firstHalf, decelerationPhase: secondHalf };
  }

  if (firstSlope < 0 && secondSlope > 0) {
    return { accelerationPhase: secondHalf, decelerationPhase: firstHalf };
  }

  if (firstSlope > 0) {
    return { accelerationPhase: validPoints, decelerationPhase: [] };
  }

  return { accelerationPhase: [], decelerationPhase: validPoints };
}

export function calculateMomentOfInertia(
  diskParams: DiskParams,
  hangingMass: HangingMass,
  dataPoints: DataPoint[],
  gravity: number = 9.8
): CalculationResult | null {
  const validPoints = dataPoints.filter((p) => p.isValid && p.time > 0 && p.angularVelocity > 0);
  if (validPoints.length < 3) {
    return null;
  }

  const normalizedPoints = normalizeDataPoints(validPoints);
  const { accelerationPhase, decelerationPhase } = detectPhases(normalizedPoints);

  const steps: string[] = [];
  const scoreDetails: ScoreDetail[] = [];

  const diskRadius = normalizeLength(diskParams.radius, diskParams.radiusUnit);
  const diskMass = normalizeMass(diskParams.mass, diskParams.massUnit);
  const hMass = normalizeMass(hangingMass.mass, hangingMass.massUnit);
  const stringRadius = normalizeLength(hangingMass.stringRadius, hangingMass.stringRadiusUnit);

  steps.push(`转盘参数: 半径 ${diskRadius.toFixed(4)} m, 质量 ${diskMass.toFixed(4)} kg`);
  steps.push(`砝码参数: 质量 ${hMass.toFixed(4)} kg, 绕线半径 ${stringRadius.toFixed(4)} m`);

  const theoreticalValue = 0.5 * diskMass * diskRadius * diskRadius;
  steps.push(`理论转动惯量: I = ½MR² = 0.5 × ${diskMass.toFixed(4)} × ${diskRadius.toFixed(4)}² = ${theoreticalValue.toExponential(4)} kg·m²`);

  let angularAcceleration = 0;
  let angularDeceleration = 0;
  let accelerationRSquared = 0;
  let decelerationRSquared = 0;

  if (accelerationPhase.length >= 3) {
    const accResult = linearRegression(accelerationPhase.map((p) => ({ x: p.time, y: p.angularVelocity })));
    angularAcceleration = accResult.slope;
    accelerationRSquared = accResult.rSquared;
    steps.push(`加速阶段角加速度: α = ${angularAcceleration.toFixed(4)} rad/s² (R² = ${accelerationRSquared.toFixed(4)})`);
  } else {
    const allResult = linearRegression(normalizedPoints.map((p) => ({ x: p.time, y: p.angularVelocity })));
    angularAcceleration = Math.abs(allResult.slope);
    accelerationRSquared = allResult.rSquared;
    steps.push(`整体角加速度: α = ${angularAcceleration.toFixed(4)} rad/s² (R² = ${accelerationRSquared.toFixed(4)})`);
  }

  if (decelerationPhase.length >= 3) {
    const decResult = linearRegression(decelerationPhase.map((p) => ({ x: p.time, y: p.angularVelocity })));
    angularDeceleration = Math.abs(decResult.slope);
    decelerationRSquared = decResult.rSquared;
    steps.push(`减速阶段角减速度: α_decel = ${angularDeceleration.toFixed(4)} rad/s² (R² = ${decelerationRSquared.toFixed(4)})`);
  }

  if (angularAcceleration <= 0) {
    return null;
  }

  const torqueApplied = hMass * (gravity - angularAcceleration * stringRadius) * stringRadius;
  const momentUncorrected = torqueApplied / angularAcceleration;
  steps.push(`未修正转动惯量: I_uncorrected = τ / α = ${momentUncorrected.toExponential(4)} kg·m²`);

  let frictionTorque = 0;
  let frictionCoefficient = 0;

  if (angularDeceleration > 0) {
    frictionTorque = momentUncorrected * angularDeceleration;
    frictionCoefficient = frictionTorque / (diskMass * gravity * diskRadius);
    steps.push(`摩擦转矩: τ_friction = I × α_decel = ${frictionTorque.toExponential(4)} N·m`);
    steps.push(`摩擦系数: μ = τ_friction / (MgR) = ${frictionCoefficient.toFixed(6)}`);
  } else {
    steps.push('警告: 未检测到减速阶段数据，无法进行摩擦修正');
  }

  const momentCorrected = momentUncorrected - frictionTorque / angularAcceleration;
  steps.push(`修正后转动惯量: I_corrected = I_uncorrected - τ_friction / α = ${momentCorrected.toExponential(4)} kg·m²`);

  const percentageError = Math.abs((momentCorrected - theoreticalValue) / theoreticalValue) * 100;
  steps.push(`相对误差: |${momentCorrected.toExponential(4)} - ${theoreticalValue.toExponential(4)}| / ${theoreticalValue.toExponential(4)} × 100% = ${percentageError.toFixed(2)}%`);

  const dataQualityScore = Math.min(100, Math.round(accelerationRSquared * 80 + (decelerationRSquared > 0 ? decelerationRSquared * 20 : 10)));
  scoreDetails.push({
    category: '数据质量',
    score: dataQualityScore,
    maxScore: 30,
    description: `基于线性拟合优度 R² = ${accelerationRSquared.toFixed(4)}`,
  });

  const frictionScore = angularDeceleration > 0 ? 25 : 10;
  scoreDetails.push({
    category: '摩擦补偿',
    score: frictionScore,
    maxScore: 25,
    description: angularDeceleration > 0 ? '已完成摩擦修正' : '缺少减速阶段数据',
  });

  const accuracyScore = Math.max(0, Math.round(25 - percentageError));
  scoreDetails.push({
    category: '测量精度',
    score: accuracyScore,
    maxScore: 25,
    description: `相对误差 ${percentageError.toFixed(2)}%`,
  });

  const completenessScore = Math.min(20, validPoints.length * 2);
  scoreDetails.push({
    category: '数据完整性',
    score: completenessScore,
    maxScore: 20,
    description: `有效数据点 ${validPoints.length} 个`,
  });

  const totalScore = scoreDetails.reduce((sum, d) => sum + Math.min(d.score, d.maxScore), 0);

  return {
    momentOfInertia: momentCorrected,
    momentOfInertiaUncorrected: momentUncorrected,
    frictionCoefficient,
    angularAcceleration,
    frictionTorque,
    angularDeceleration,
    theoreticalValue,
    percentageError,
    calculationSteps: steps,
    score: totalScore,
    scoreDetails,
  };
}
