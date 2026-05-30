import type { SamplingPoint, FunctionType, NoiseConfig, InterpolationResult, ErrorPoint, Warning } from '@/types';

export function evaluateFunction(fn: FunctionType, x: number, customExpr?: string): number {
  switch (fn) {
    case 'runge':
      return 1 / (1 + 25 * x * x);
    case 'sin':
      return Math.sin(Math.PI * x);
    case 'exp':
      return Math.exp(-x * x);
    case 'custom': {
      if (!customExpr) return 0;
      try {
        const fn2 = new Function('x', `return ${customExpr}`);
        return fn2(x);
      } catch {
        return 0;
      }
    }
    default:
      return 0;
  }
}

export function detectDuplicateX(points: SamplingPoint[]): { clean: SamplingPoint[]; duplicates: SamplingPoint[] } {
  const seen = new Map<number, number>();
  const clean: SamplingPoint[] = [];
  const duplicates: SamplingPoint[] = [];

  for (const p of points) {
    const count = seen.get(p.x) ?? 0;
    if (count > 0) {
      duplicates.push({ ...p, duplicate: true });
    } else {
      clean.push({ ...p, duplicate: false });
    }
    seen.set(p.x, count + 1);
  }

  return { clean, duplicates };
}

export function addNoise(points: SamplingPoint[], config: NoiseConfig): SamplingPoint[] {
  const rng = seededRandom(config.seed);
  return points.map(p => {
    let noise: number;
    if (config.type === 'gaussian') {
      noise = boxMullerRandom(rng) * config.amplitude;
    } else {
      noise = (rng() * 2 - 1) * config.amplitude;
    }
    return { ...p, y: p.y + noise };
  });
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function boxMullerRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

export function lagrangeInterpolation(points: SamplingPoint[], x: number): number {
  const n = points.length;
  let result = 0;
  for (let i = 0; i < n; i++) {
    let basis = points[i].y;
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const denom = points[i].x - points[j].x;
        if (Math.abs(denom) < 1e-14) return NaN;
        basis *= (x - points[j].x) / denom;
      }
    }
    result += basis;
  }
  return result;
}

export function computeInterpolation(
  points: SamplingPoint[],
  fn: FunctionType,
  customExpr?: string,
  noiseConfig?: NoiseConfig | null
): InterpolationResult {
  const { clean, duplicates } = detectDuplicateX(points);

  const warnings: Warning[] = [];

  if (duplicates.length > 0) {
    const dupXs = duplicates.map(p => p.x);
    warnings.push({
      type: 'duplicate_x',
      message: `检测到重复 x 值: [${dupXs.join(', ')}]。Lagrange 插值要求所有 x 值互不相同，重复值已被排除。原因：插值基函数 L_i(x) = ∏(x-x_j)/(x_i-x_j) 在 x_i = x_j 时分母为零，无法定义。`,
      severity: 'error',
    });
  }

  let workingPoints = [...clean];

  if (noiseConfig && noiseConfig.amplitude > 0) {
    workingPoints = addNoise(workingPoints, noiseConfig);
  }

  if (workingPoints.length < 2) {
    return {
      points: workingPoints,
      evaluatedCurve: [],
      errorCurve: [],
      maxError: 0,
      rmse: 0,
      warnings: [...warnings, {
        type: 'duplicate_x' as const,
        message: '有效采样点不足 2 个，无法进行插值',
        severity: 'error' as const,
      }],
    };
  }

  const xMin = Math.min(...workingPoints.map(p => p.x));
  const xMax = Math.max(...workingPoints.map(p => p.x));
  const range = xMax - xMin;
  const xMinExt = xMin - range * 0.15;
  const xMaxExt = xMax + range * 0.15;
  const steps = 500;
  const dx = (xMaxExt - xMinExt) / steps;

  const evaluatedCurve: { x: number; y: number }[] = [];
  const errorCurve: ErrorPoint[] = [];
  let maxError = 0;
  let sumSqError = 0;

  for (let i = 0; i <= steps; i++) {
    const x = xMinExt + i * dx;
    const yInterp = lagrangeInterpolation(workingPoints, x);
    const yTrue = evaluateFunction(fn, x, customExpr);

    evaluatedCurve.push({ x, y: yInterp });

    if (!isNaN(yInterp) && isFinite(yInterp) && !isNaN(yTrue) && isFinite(yTrue)) {
      const err = Math.abs(yInterp - yTrue);
      errorCurve.push({ x, error: err });
      if (err > maxError) maxError = err;
      sumSqError += err * err;
    } else {
      errorCurve.push({ x, error: NaN });
    }
  }

  const rmse = Math.sqrt(sumSqError / (steps + 1));

  if (workingPoints.length > 10) {
    const boundaryRegion = range * 0.2;
    const boundaryErrors = errorCurve.filter(p => p.x < xMin + boundaryRegion || p.x > xMax - boundaryRegion);
    const innerErrors = errorCurve.filter(p => p.x >= xMin + boundaryRegion && p.x <= xMax - boundaryRegion && !isNaN(p.error));
    const validBoundaryErrors = boundaryErrors.filter(p => !isNaN(p.error));

    if (validBoundaryErrors.length > 0 && innerErrors.length > 0) {
      const avgBoundaryErr = validBoundaryErrors.reduce((s, p) => s + p.error, 0) / validBoundaryErrors.length;
      const avgInnerErr = innerErrors.reduce((s, p) => s + p.error, 0) / innerErrors.length;

      if (avgBoundaryErr > avgInnerErr * 5 && avgBoundaryErr > 0.1) {
        warnings.push({
          type: 'boundary_oscillation',
          message: `边界震荡检测：边界区域平均误差 (${avgBoundaryErr.toFixed(4)}) 是内部区域 (${avgInnerErr.toFixed(4)}) 的 ${(avgBoundaryErr / avgInnerErr).toFixed(1)} 倍。这是高阶多项式插值的 Runge 现象——等距节点增多时，插值多项式在边界处剧烈震荡，而非收敛到原函数。`,
          severity: 'warning',
        });
      }
    }
  }

  if (noiseConfig && noiseConfig.amplitude > 0 && workingPoints.length > 5) {
    const noiseNoAmp: NoiseConfig = { ...noiseConfig, amplitude: 0 };
    const cleanResult = computeInterpolation(clean, fn, customExpr, noiseNoAmp);
    if (cleanResult.rmse > 0 && rmse > cleanResult.rmse * 3) {
      warnings.push({
        type: 'noise_amplification',
        message: `噪声放大检测：加入噪声 (振幅=${noiseConfig.amplitude}) 后，RMSE 从 ${cleanResult.rmse.toFixed(4)} 增至 ${rmse.toFixed(4)}（${(rmse / cleanResult.rmse).toFixed(1)} 倍）。高阶插值多项式对数据中的微小扰动极为敏感，噪声被放大而非被平滑。`,
        severity: 'warning',
      });
    }
  }

  return {
    points: workingPoints,
    evaluatedCurve,
    errorCurve,
    maxError,
    rmse,
    warnings,
  };
}

export function generateEquidistantPoints(fn: FunctionType, n: number, xMin: number, xMax: number, customExpr?: string): SamplingPoint[] {
  const points: SamplingPoint[] = [];
  const dx = (xMax - xMin) / (n - 1);
  for (let i = 0; i < n; i++) {
    const x = xMin + i * dx;
    points.push({ x: parseFloat(x.toFixed(6)), y: parseFloat(evaluateFunction(fn, x, customExpr).toFixed(6)) });
  }
  return points;
}

export function generateDuplicateXExample(): SamplingPoint[] {
  return [
    { x: -1.0, y: 0.0385 },
    { x: -0.6, y: 0.1 },
    { x: -0.2, y: 0.5 },
    { x: 0.0, y: 1.0 },
    { x: 0.2, y: 0.5 },
    { x: 0.2, y: 0.52 },
    { x: 0.6, y: 0.1 },
    { x: 1.0, y: 0.0385 },
  ];
}

export function generateBoundaryOscillationExample(): SamplingPoint[] {
  return generateEquidistantPoints('runge', 15, -1, 1);
}

export function generateNoiseAmplificationExample(): SamplingPoint[] {
  const basePoints = generateEquidistantPoints('sin', 8, -1, 1);
  return basePoints.map(p => ({
    ...p,
    y: parseFloat((p.y + (Math.random() * 2 - 1) * 0.05).toFixed(6)),
  }));
}
