import { compile } from 'mathjs';
import type { SurfaceConfig, SurfaceData, ExtremumPoint, CrossSection, CrossSectionDirection, ParseError, ExtremumType, ResultStatus } from '@/types';

const GRADIENT_THRESHOLD = 0.5;
const HESSIAN_DEGENERATE_THRESHOLD = 0.1;
const COARSE_SAMPLING_THRESHOLD = 50;

export function parseExpression(expr: string): { fn: (x: number, y: number) => number } | ParseError {
  try {
    const compiled = compile(expr);
    const testResult = compiled.evaluate({ x: 0, y: 0 });
    if (typeof testResult !== 'number' || !isFinite(testResult)) {
      return {
        message: `表达式在 (0,0) 处求值结果无效: ${testResult}`,
        suggestion: '请检查表达式语法，确保变量为 x 和 y，且结果为有限数值',
      };
    }
    return {
      fn: (x: number, y: number) => {
        try {
          const result = compiled.evaluate({ x, y });
          if (typeof result !== 'number' || !isFinite(result)) return NaN;
          return result;
        } catch {
          return NaN;
        }
      },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      message: `表达式解析失败: ${msg}`,
      suggestion: '请检查语法，支持运算符: +, -, *, /, ^, sin, cos, tan, exp, log, sqrt, abs, pi, e',
    };
  }
}

export function sampleSurface(
  config: SurfaceConfig
): { data: SurfaceData; parseError?: undefined } | { data?: undefined; parseError: ParseError } {
  const parseResult = parseExpression(config.expression);
  if ('message' in parseResult) return { parseError: parseResult };

  const { fn } = parseResult;
  const [xMin, xMax] = config.xRange;
  const [yMin, yMax] = config.yRange;
  const n = config.samplingDensity;
  const dx = (xMax - xMin) / (n - 1);
  const dy = (yMax - yMin) / (n - 1);

  const totalVerts = n * n;
  const vertices = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);

  const zValues: number[][] = [];
  let zMin = Infinity;
  let zMax = -Infinity;

  for (let j = 0; j < n; j++) {
    zValues[j] = [];
    for (let i = 0; i < n; i++) {
      const x = xMin + i * dx;
      const y = yMin + j * dy;
      const z = fn(x, y);
      zValues[j][i] = z;
      if (isFinite(z)) {
        zMin = Math.min(zMin, z);
        zMax = Math.max(zMax, z);
      }
    }
  }

  if (!isFinite(zMin) || !isFinite(zMax)) {
    zMin = config.zRange[0];
    zMax = config.zRange[1];
  }

  const zRange = zMax - zMin || 1;

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const idx = (j * n + i) * 3;
      const x = xMin + i * dx;
      const y = yMin + j * dy;
      let z = zValues[j][i];
      if (!isFinite(z)) z = 0;

      vertices[idx] = x;
      vertices[idx + 1] = z;
      vertices[idx + 2] = y;

      const t = isFinite(zValues[j][i]) ? (z - zMin) / zRange : 0.5;
      const r = 0.05 + t * 0.85;
      const g = 0.4 + (1 - Math.abs(2 * t - 1)) * 0.5;
      const b = 0.9 - t * 0.75;
      colors[idx] = r;
      colors[idx + 1] = g;
      colors[idx + 2] = b;
    }
  }

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const idx = (j * n + i) * 3;
      const x0 = xMin + i * dx;
      const y0 = yMin + j * dy;
      const z0 = zValues[j][i];

      const xp = i < n - 1 ? zValues[j][i + 1] : z0;
      const xm = i > 0 ? zValues[j][i - 1] : z0;
      const yp = j < n - 1 ? zValues[j + 1][i] : z0;
      const ym = j > 0 ? zValues[j - 1][i] : z0;

      let dzdx = (isFinite(xp) && isFinite(xm)) ? (xp - xm) / (2 * dx) : 0;
      let dzdy = (isFinite(yp) && isFinite(ym)) ? (yp - ym) / (2 * dy) : 0;

      if (!isFinite(dzdx)) dzdx = 0;
      if (!isFinite(dzdy)) dzdy = 0;

      const len = Math.sqrt(dzdx * dzdx + 1 + dzdy * dzdy) || 1;
      normals[idx] = -dzdx / len;
      normals[idx + 1] = 1 / len;
      normals[idx + 2] = -dzdy / len;
    }
  }

  const indices: number[] = [];
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return {
    data: {
      vertices,
      indices: new Uint32Array(indices),
      normals,
      colors,
      xMin,
      xMax,
      yMin,
      yMax,
      zMin,
      zMax,
    },
  };
}

function numericalGradient(
  fn: (x: number, y: number) => number,
  x: number,
  y: number,
  h: number = 1e-5
): [number, number] {
  const dfdx = (fn(x + h, y) - fn(x - h, y)) / (2 * h);
  const dfdy = (fn(x, y + h) - fn(x, y - h)) / (2 * h);
  return [dfdx, dfdy];
}

function numericalHessian(
  fn: (x: number, y: number) => number,
  x: number,
  y: number,
  h: number = 1e-4
): [[number, number], [number, number]] {
  const f00 = fn(x, y);
  const f10 = fn(x + h, y);
  const fm10 = fn(x - h, y);
  const f01 = fn(x, y + h);
  const f0m1 = fn(x, y - h);
  const f11 = fn(x + h, y + h);

  const d2fdx2 = (f10 - 2 * f00 + fm10) / (h * h);
  const d2fdy2 = (f01 - 2 * f00 + f0m1) / (h * h);
  const d2fdxdy = (f11 - f10 - f01 + f00) / (h * h);

  return [[d2fdx2, d2fdxdy], [d2fdxdy, d2fdy2]];
}

function hessianEigenvalues(H: [[number, number], [number, number]]): [number, number] {
  const a = H[0][0];
  const b = H[0][1];
  const d = H[1][1];
  const trace = a + d;
  const det = a * d - b * b;
  const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));
  const l1 = (trace + disc) / 2;
  const l2 = (trace - disc) / 2;
  return [l1, l2];
}

function classifyExtremum(eigenvalues: [number, number]): ExtremumType {
  const [l1, l2] = eigenvalues;
  if (l1 > HESSIAN_DEGENERATE_THRESHOLD && l2 > HESSIAN_DEGENERATE_THRESHOLD) return 'minimum';
  if (l1 < -HESSIAN_DEGENERATE_THRESHOLD && l2 < -HESSIAN_DEGENERATE_THRESHOLD) return 'maximum';
  if ((l1 > HESSIAN_DEGENERATE_THRESHOLD && l2 < -HESSIAN_DEGENERATE_THRESHOLD) ||
      (l1 < -HESSIAN_DEGENERATE_THRESHOLD && l2 > HESSIAN_DEGENERATE_THRESHOLD)) return 'saddle';
  return 'saddle';
}

function determineStatus(
  gradientMag: number,
  eigenvalues: [number, number],
  samplingDensity: number,
  fn: (x: number, y: number) => number,
  x: number,
  y: number
): { status: ResultStatus; message?: string } {
  if (!isFinite(gradientMag)) {
    return { status: 'error', message: '梯度计算结果为 NaN/Infinity，表达式在该点附近可能无定义' };
  }

  const [l1, l2] = eigenvalues;
  if (!isFinite(l1) || !isFinite(l2)) {
    return { status: 'error', message: 'Hessian 矩阵特征值计算失败，表达式在该点附近可能无定义' };
  }

  const nearDegenerate = Math.abs(l1) < HESSIAN_DEGENERATE_THRESHOLD || Math.abs(l2) < HESSIAN_DEGENERATE_THRESHOLD;
  const nearThreshold = gradientMag > GRADIENT_THRESHOLD * 0.5;

  if (nearDegenerate) {
    return {
      status: 'needs_review',
      message: 'Hessian 接近退化（特征值接近零），极值类型判断不确定。建议：检查该点是否为退化临界点，可尝试更换函数表达式或在更大范围内分析',
    };
  }

  if (samplingDensity < COARSE_SAMPLING_THRESHOLD) {
    const h = 0.01;
    const v1 = fn(x - h, y - h);
    const v2 = fn(x + h, y + h);
    if (isFinite(v1) && isFinite(v2) && Math.abs(v2 - v1) > 0.5) {
      return {
        status: 'needs_review',
        message: `采样密度仅为 ${samplingDensity}×${samplingDensity}，相邻采样点函数值变化较大，可能遗漏细节极值。建议：提高采样密度至 80 以上`,
      };
    }
  }

  if (nearThreshold) {
    return {
      status: 'needs_review',
      message: `梯度模 ${gradientMag.toFixed(4)} 接近阈值边界，该点可能不是严格临界点。建议：缩小参数范围以获得更精确的局部采样`,
    };
  }

  return { status: 'confirmed' };
}

export function detectExtrema(config: SurfaceConfig): ExtremumPoint[] | ParseError {
  const parseResult = parseExpression(config.expression);
  if ('message' in parseResult) return parseResult;

  const { fn } = parseResult;
  const [xMin, xMax] = config.xRange;
  const [yMin, yMax] = config.yRange;
  const n = config.samplingDensity;
  const dx = (xMax - xMin) / (n - 1);
  const dy = (yMax - yMin) / (n - 1);

  const candidates: { x: number; y: number; z: number; gradMag: number }[] = [];

  const searchN = Math.min(n, 100);
  const searchDx = (xMax - xMin) / (searchN - 1);
  const searchDy = (yMax - yMin) / (searchN - 1);

  for (let j = 2; j < searchN - 2; j++) {
    for (let i = 2; i < searchN - 2; i++) {
      const x = xMin + i * searchDx;
      const y = yMin + j * searchDy;
      const [gx, gy] = numericalGradient(fn, x, y);
      const gradMag = Math.sqrt(gx * gx + gy * gy);
      const z = fn(x, y);

      if (!isFinite(gradMag) || !isFinite(z)) continue;

      if (gradMag < GRADIENT_THRESHOLD) {
        const isLocalMin = (i > 0 && i < searchN - 1 && j > 0 && j < searchN - 1) &&
          z <= fn(x - searchDx, y) && z <= fn(x + searchDx, y) &&
          z <= fn(x, y - searchDy) && z <= fn(x, y + searchDy);
        const isLocalMax = (i > 0 && i < searchN - 1 && j > 0 && j < searchN - 1) &&
          z >= fn(x - searchDx, y) && z >= fn(x + searchDx, y) &&
          z >= fn(x, y - searchDy) && z >= fn(x, y + searchDy);

        if (isLocalMin || isLocalMax || gradMag < GRADIENT_THRESHOLD * 0.3) {
          candidates.push({ x, y, z, gradMag });
        }
      }
    }
  }

  const merged: typeof candidates = [];
  const MERGE_DIST = Math.max(dx, dy) * 2;

  for (const c of candidates) {
    let found = false;
    for (const m of merged) {
      const dist = Math.sqrt((c.x - m.x) ** 2 + (c.y - m.y) ** 2);
      if (dist < MERGE_DIST) {
        if (c.gradMag < m.gradMag) {
          m.x = c.x; m.y = c.y; m.z = c.z; m.gradMag = c.gradMag;
        }
        found = true;
        break;
      }
    }
    if (!found) merged.push({ ...c });
  }

  const extrema: ExtremumPoint[] = [];

  for (const c of merged) {
    const H = numericalHessian(fn, c.x, c.y);
    const eigenvalues = hessianEigenvalues(H);
    const type = classifyExtremum(eigenvalues);
    const { status, message } = determineStatus(c.gradMag, eigenvalues, config.samplingDensity, fn, c.x, c.y);

    extrema.push({
      x: c.x,
      y: c.y,
      z: c.z,
      type,
      status,
      trace: {
        expression: config.expression,
        xRange: config.xRange,
        yRange: config.yRange,
        samplingDensity: config.samplingDensity,
        gradientMagnitude: c.gradMag,
        hessianEigenvalues: eigenvalues,
      },
      message,
    });
  }

  return extrema;
}

export function computeCrossSection(
  config: SurfaceConfig,
  direction: CrossSectionDirection,
  position: number,
  resolution: number = 200
): CrossSection | ParseError {
  const parseResult = parseExpression(config.expression);
  if ('message' in parseResult) return parseResult;

  const { fn } = parseResult;
  const points: [number, number][] = [];

  if (direction === 'xy') {
    const [xMin, xMax] = config.xRange;
    const step = (xMax - xMin) / (resolution - 1);
    for (let i = 0; i < resolution; i++) {
      const x = xMin + i * step;
      const z = fn(x, position);
      if (isFinite(z)) points.push([x, z]);
    }
  } else if (direction === 'xz') {
    const [xMin, xMax] = config.xRange;
    const step = (xMax - xMin) / (resolution - 1);
    for (let i = 0; i < resolution; i++) {
      const x = xMin + i * step;
      const y = position;
      const z = fn(x, y);
      if (isFinite(z)) points.push([x, z]);
    }
  } else {
    const [yMin, yMax] = config.yRange;
    const step = (yMax - yMin) / (resolution - 1);
    for (let i = 0; i < resolution; i++) {
      const y = yMin + i * step;
      const z = fn(position, y);
      if (isFinite(z)) points.push([y, z]);
    }
  }

  return { direction, position, points };
}

export function getDefaultConfig(): SurfaceConfig {
  return {
    expression: 'x^2 - y^2',
    xRange: [-3, 3],
    yRange: [-3, 3],
    zRange: [-10, 10],
    samplingDensity: 50,
  };
}
