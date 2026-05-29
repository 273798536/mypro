import type {
  Vector2D,
  Path,
  VectorField,
  IntegrationResult,
  IntegrationBreakdown,
} from '../../types';
import {
  interpolatePath,
  computeTangent,
  dotProduct,
  distance,
  getPathLength,
} from './geometry';

export function computeLineIntegralTrapezoidal(
  path: Path,
  field: VectorField,
  customStepSize?: number
): IntegrationResult {
  const startTime = performance.now();
  const stepSize = customStepSize ?? path.sampleStep;

  const interpolatedNodes = interpolatePath(path.nodes, stepSize);
  const samples = interpolatedNodes.length;

  if (samples < 2) {
    return {
      pathId: path.id,
      vectorFieldId: field.id,
      value: 0,
      numericalError: 0,
      convergenceRate: 0,
      sampleCount: samples,
      computationTime: 0,
      stepSize,
      directionFactor: path.direction,
      breakdown: [],
      timestamp: Date.now(),
      method: 'trapezoidal',
    };
  }

  const breakdown: IntegrationBreakdown[] = [];
  let integral = 0;

  for (let i = 0; i < interpolatedNodes.length - 1; i++) {
    const currentPos = interpolatedNodes[i].position;
    const nextPos = interpolatedNodes[i + 1].position;

    const currentVector = field.computeVector(currentPos.x, currentPos.y);
    const nextVector = field.computeVector(nextPos.x, nextPos.y);

    const tangent = computeTangent(interpolatedNodes, i);
    const segmentLength = distance(currentPos, nextPos);

    const currentDot = dotProduct(currentVector, tangent);
    const nextDot = dotProduct(nextVector, tangent);

    const segmentContribution =
      ((currentDot + nextDot) / 2) * segmentLength * path.direction;

    integral += segmentContribution;

    breakdown.push({
      position: currentPos,
      vector: currentVector,
      tangent,
      dotProduct: currentDot,
      contribution: segmentContribution,
    });
  }

  const lastIndex = interpolatedNodes.length - 1;
  const lastPos = interpolatedNodes[lastIndex].position;
  const lastVector = field.computeVector(lastPos.x, lastPos.y);
  const lastTangent = computeTangent(interpolatedNodes, lastIndex);
  const lastDot = dotProduct(lastVector, lastTangent);

  breakdown.push({
    position: lastPos,
    vector: lastVector,
    tangent: lastTangent,
    dotProduct: lastDot,
    contribution: 0,
  });

  const error = estimateTrapezoidalError(interpolatedNodes, field, path);
  const computationTime = performance.now() - startTime;

  return {
    pathId: path.id,
    vectorFieldId: field.id,
    value: integral,
    numericalError: Math.abs(error),
    convergenceRate: 2,
    sampleCount: samples,
    computationTime,
    stepSize,
    directionFactor: path.direction,
    breakdown,
    timestamp: Date.now(),
    method: 'trapezoidal',
  };
}

export function computeLineIntegralSimpson(
  path: Path,
  field: VectorField,
  customStepSize?: number
): IntegrationResult {
  const startTime = performance.now();
  const stepSize = customStepSize ?? path.sampleStep;

  let interpolatedNodes = interpolatePath(path.nodes, stepSize);

  if (interpolatedNodes.length % 2 === 0 && interpolatedNodes.length > 2) {
    interpolatedNodes = interpolatedNodes.slice(0, -1);
  }

  const samples = interpolatedNodes.length;

  if (samples < 3) {
    return computeLineIntegralTrapezoidal(path, field, customStepSize);
  }

  const breakdown: IntegrationBreakdown[] = [];
  let integral = 0;

  for (let i = 0; i < interpolatedNodes.length - 2; i += 2) {
    const p0 = interpolatedNodes[i].position;
    const p1 = interpolatedNodes[i + 1].position;
    const p2 = interpolatedNodes[i + 2].position;

    const v0 = field.computeVector(p0.x, p0.y);
    const v1 = field.computeVector(p1.x, p1.y);
    const v2 = field.computeVector(p2.x, p2.y);

    const t0 = computeTangent(interpolatedNodes, i);
    const t1 = computeTangent(interpolatedNodes, i + 1);
    const t2 = computeTangent(interpolatedNodes, i + 2);

    const h = distance(p0, p2) / 2;

    const dot0 = dotProduct(v0, t0);
    const dot1 = dotProduct(v1, t1);
    const dot2 = dotProduct(v2, t2);

    const segmentContribution =
      ((dot0 + 4 * dot1 + dot2) / 3) * h * path.direction;

    integral += segmentContribution;

    if (breakdown.length === 0) {
      breakdown.push({
        position: p0,
        vector: v0,
        tangent: t0,
        dotProduct: dot0,
        contribution: segmentContribution / 3,
      });
    }

    breakdown.push({
      position: p1,
      vector: v1,
      tangent: t1,
      dotProduct: dot1,
      contribution: (4 * dot1 / 3) * h * path.direction,
    });

    breakdown.push({
      position: p2,
      vector: v2,
      tangent: t2,
      dotProduct: dot2,
      contribution: segmentContribution / 3,
    });
  }

  const error = estimateSimpsonError(interpolatedNodes, field, path);
  const computationTime = performance.now() - startTime;

  return {
    pathId: path.id,
    vectorFieldId: field.id,
    value: integral,
    numericalError: Math.abs(error),
    convergenceRate: 4,
    sampleCount: samples,
    computationTime,
    stepSize,
    directionFactor: path.direction,
    breakdown,
    timestamp: Date.now(),
    method: 'simpson',
  };
}

function estimateTrapezoidalError(
  nodes: { position: Vector2D }[],
  field: VectorField,
  path: Path
): number {
  if (nodes.length < 4) return 0;

  let maxSecondDerivative = 0;

  for (let i = 1; i < nodes.length - 1; i++) {
    const prev = field.computeVector(
      nodes[i - 1].position.x,
      nodes[i - 1].position.y
    );
    const curr = field.computeVector(
      nodes[i].position.x,
      nodes[i].position.y
    );
    const next = field.computeVector(
      nodes[i + 1].position.x,
      nodes[i + 1].position.y
    );

    const secondDerivX = Math.abs(next.x - 2 * curr.x + prev.x);
    const secondDerivY = Math.abs(next.y - 2 * curr.y + prev.y);
    maxSecondDerivative = Math.max(maxSecondDerivative, secondDerivX, secondDerivY);
  }

  const pathLength = getPathLength(path.nodes);
  const h = pathLength / (nodes.length - 1);

  return (pathLength * h * h * maxSecondDerivative) / 12;
}

function estimateSimpsonError(
  nodes: { position: Vector2D }[],
  field: VectorField,
  path: Path
): number {
  if (nodes.length < 6) return 0;

  let maxFourthDerivative = 0;

  for (let i = 2; i < nodes.length - 2; i++) {
    const v0 = field.computeVector(nodes[i - 2].position.x, nodes[i - 2].position.y);
    const v1 = field.computeVector(nodes[i - 1].position.x, nodes[i - 1].position.y);
    const v2 = field.computeVector(nodes[i].position.x, nodes[i].position.y);
    const v3 = field.computeVector(nodes[i + 1].position.x, nodes[i + 1].position.y);
    const v4 = field.computeVector(nodes[i + 2].position.x, nodes[i + 2].position.y);

    const fourthDerivX = Math.abs(v4.x - 4 * v3.x + 6 * v2.x - 4 * v1.x + v0.x);
    const fourthDerivY = Math.abs(v4.y - 4 * v3.y + 6 * v2.y - 4 * v1.y + v0.y);
    maxFourthDerivative = Math.max(maxFourthDerivative, fourthDerivX, fourthDerivY);
  }

  const pathLength = getPathLength(path.nodes);
  const h = pathLength / (nodes.length - 1);

  return (pathLength * Math.pow(h, 4) * maxFourthDerivative) / 180;
}

export function convergenceAnalysis(
  path: Path,
  field: VectorField,
  method: 'trapezoidal' | 'simpson',
  stepSizes: number[]
): { step: number; value: number; error: number }[] {
  const results: { step: number; value: number; error: number }[] = [];
  const compute =
    method === 'trapezoidal'
      ? computeLineIntegralTrapezoidal
      : computeLineIntegralSimpson;

  const finestResult = compute(path, field, stepSizes[0]);

  for (const step of stepSizes) {
    const result = compute(path, field, step);
    results.push({
      step,
      value: result.value,
      error: Math.abs(result.value - finestResult.value),
    });
  }

  return results;
}

export function directionSensitivity(
  path: Path,
  field: VectorField,
  method: 'trapezoidal' | 'simpson' = 'trapezoidal'
): { forward: number; backward: number; ratio: number } {
  const compute =
    method === 'trapezoidal'
      ? computeLineIntegralTrapezoidal
      : computeLineIntegralSimpson;

  const forwardPath = { ...path, direction: 1 as const };
  const backwardPath = { ...path, direction: -1 as const };

  const forwardResult = compute(forwardPath, field);
  const backwardResult = compute(backwardPath, field);

  return {
    forward: forwardResult.value,
    backward: backwardResult.value,
    ratio: Math.abs(backwardResult.value / forwardResult.value),
  };
}

export function generateIntegrationExplanation(
  method: 'trapezoidal' | 'simpson'
): { formula: string; description: string; steps: string[] } {
  if (method === 'trapezoidal') {
    return {
      formula: '\\int_C F \\cdot dr \\approx \\sum_{i=0}^{n-1} \\frac{F_i \\cdot T_i + F_{i+1} \\cdot T_{i+1}}{2} \\Delta s_i',
      description: '梯形法通过将曲线分割为若干段，每段用梯形面积近似积分值。该方法二阶收敛，适用于一般光滑曲线。',
      steps: [
        '将路径按步长离散化为采样点',
        '计算每个采样点的向量 F(x,y)',
        '计算每个点的切向量 T（路径方向）',
        '计算点积 F · T 表示向量场在路径方向上的投影',
        '对相邻两点的点积取平均，乘以弧长 Δs',
        '累加所有段的贡献得到积分近似值'
      ]
    };
  } else {
    return {
      formula: '\\int_C F \\cdot dr \\approx \\sum_{i=0}^{n/2-1} \\frac{F_{2i} \\cdot T_{2i} + 4F_{2i+1} \\cdot T_{2i+1} + F_{2i+2} \\cdot T_{2i+2}}{3} \\Delta s_i',
      description: '辛普森法使用二次多项式拟合，精度高于梯形法，四阶收敛。要求采样点数为奇数。',
      steps: [
        '将路径按步长离散化，确保采样点数为奇数',
        '计算每个采样点的向量 F(x,y) 和切向量 T',
        '每三个点为一组，使用抛物线拟合',
        '应用 Simpson 权重：端点权重 1，中间点权重 4',
        '加权平均后乘以弧长 Δs/3',
        '累加所有组的贡献得到积分近似值'
      ]
    };
  }
}
