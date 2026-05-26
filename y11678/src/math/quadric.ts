import { QuadricEquation, Bounds, SurfaceVertex, ComputationWarning } from '../types';

const EPSILON = 1e-8;
const MAX_SINGULAR_VALUE = 1e10;

export function evaluateQuadric(
  equation: QuadricEquation,
  x: number,
  y: number,
  z: number
): number {
  const { A, B, C, D, E, F, G, H, I, J } = equation;
  return (
    A * x * x +
    B * y * y +
    C * z * z +
    D * x * y +
    E * y * z +
    F * z * x +
    G * x +
    H * y +
    I * z +
    J
  );
}

export function computeGradient(
  equation: QuadricEquation,
  x: number,
  y: number,
  z: number
): { x: number; y: number; z: number } {
  const { A, B, C, D, E, F, G, H, I } = equation;
  return {
    x: 2 * A * x + D * y + F * z + G,
    y: 2 * B * y + D * x + E * z + H,
    z: 2 * C * z + E * y + F * x + I,
  };
}

export function computeNormal(
  equation: QuadricEquation,
  x: number,
  y: number,
  z: number
): { x: number; y: number; z: number } {
  const grad = computeGradient(equation, x, y, z);
  const magnitude = Math.sqrt(grad.x * grad.x + grad.y * grad.y + grad.z * grad.z);
  if (magnitude < EPSILON) {
    return { x: 0, y: 0, z: 1 };
  }
  return {
    x: grad.x / magnitude,
    y: grad.y / magnitude,
    z: grad.z / magnitude,
  };
}

export function sampleSurface(
  equation: QuadricEquation,
  bounds: Bounds,
  density: number
): {
  vertices: SurfaceVertex[];
  indices: number[];
  warnings: ComputationWarning[];
} {
  const warnings: ComputationWarning[] = [];
  const vertices: SurfaceVertex[] = [];
  const indices: number[] = [];

  const xSteps = Math.max(10, Math.floor(density));
  const ySteps = Math.max(10, Math.floor(density));
  const xStep = (bounds.xMax - bounds.xMin) / xSteps;
  const yStep = (bounds.yMax - bounds.yMin) / ySteps;

  const vertexGrid: (number | null)[][] = [];

  for (let yi = 0; yi <= ySteps; yi++) {
    vertexGrid[yi] = [];
    for (let xi = 0; xi <= xSteps; xi++) {
      const x = bounds.xMin + xi * xStep;
      const y = bounds.yMin + yi * yStep;
      const z = solveZForXY(equation, x, y, bounds.zMin, bounds.zMax);

      if (z !== null && isFinite(z)) {
        const vertex: SurfaceVertex = {
          x,
          y,
          z,
          valid: true,
        };
        vertices.push(vertex);
        vertexGrid[yi][xi] = vertices.length - 1;
      } else {
        vertexGrid[yi][xi] = null;
      }
    }
  }

  for (let yi = 0; yi < ySteps; yi++) {
    for (let xi = 0; xi < xSteps; xi++) {
      const v00 = vertexGrid[yi][xi];
      const v10 = vertexGrid[yi][xi + 1];
      const v01 = vertexGrid[yi + 1][xi];
      const v11 = vertexGrid[yi + 1][xi + 1];

      if (v00 !== null && v10 !== null && v01 !== null) {
        indices.push(v00, v10, v01);
      }
      if (v10 !== null && v11 !== null && v01 !== null) {
        indices.push(v10, v11, v01);
      }

      if ((v00 === null) !== (v10 === null) ||
          (v10 === null) !== (v11 === null) ||
          (v11 === null) !== (v01 === null) ||
          (v01 === null) !== (v00 === null)) {
        const x = bounds.xMin + (xi + 0.5) * xStep;
        const y = bounds.yMin + (yi + 0.5) * yStep;
        warnings.push({
          id: `gap-${xi}-${yi}`,
          type: 'sampling_gap',
          severity: 'warning',
          message: `采样空洞检测: 区域 (${x.toFixed(2)}, ${y.toFixed(2)}) 附近存在采样边界`,
          location: { x, y, z: (bounds.zMin + bounds.zMax) / 2 },
          suggestion: '尝试增加采样密度或调整边界范围',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  const singularWarnings = checkSingularities(equation, bounds);
  warnings.push(...singularWarnings);

  return { vertices, indices, warnings };
}

function solveZForXY(
  equation: QuadricEquation,
  x: number,
  y: number,
  zMin: number,
  zMax: number
): number | null {
  const { A, B, C, D, E, F, G, H, I, J } = equation;

  const a = C;
  const b = E * y + F * x + I;
  const c = A * x * x + B * y * y + D * x * y + G * x + H * y + J;

  if (Math.abs(a) < EPSILON) {
    if (Math.abs(b) < EPSILON) {
      return null;
    }
    const z = -c / b;
    if (z >= zMin && z <= zMax) {
      return z;
    }
    return null;
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }

  const sqrtD = Math.sqrt(discriminant);
  const z1 = (-b + sqrtD) / (2 * a);
  const z2 = (-b - sqrtD) / (2 * a);

  const validZs: number[] = [];
  if (z1 >= zMin && z1 <= zMax) validZs.push(z1);
  if (z2 >= zMin && z2 <= zMax) validZs.push(z2);

  if (validZs.length === 0) return null;
  return validZs.reduce((a, b) => Math.abs(a) < Math.abs(b) ? a : b);
}

export function checkSingularities(
  equation: QuadricEquation,
  bounds: Bounds
): ComputationWarning[] {
  const warnings: ComputationWarning[] = [];
  const { A, B, C, D, E, F } = equation;

  const hessianDet = 
    4 * A * B * C + 
    2 * D * E * F - 
    A * E * E - 
    B * F * F - 
    C * D * D;

  if (Math.abs(hessianDet) < EPSILON) {
    warnings.push({
      id: 'singularity-hessian',
      type: 'singularity',
      severity: 'error',
      message: '参数奇异: Hessian行列式接近0，曲面可能退化',
      suggestion: '调整二次项系数A, B, C，避免曲面退化',
      timestamp: new Date().toISOString(),
    });
  }

  if (Math.abs(A) < EPSILON && Math.abs(B) < EPSILON && Math.abs(C) < EPSILON) {
    warnings.push({
      id: 'degenerate-linear',
      type: 'degenerate',
      severity: 'error',
      message: '退化曲面: 所有二次项系数为0，退化为平面',
      suggestion: '至少设置一个非零的二次项系数 (A, B, C)',
      timestamp: new Date().toISOString(),
    });
  }

  if (Math.abs(A) > MAX_SINGULAR_VALUE || 
      Math.abs(B) > MAX_SINGULAR_VALUE || 
      Math.abs(C) > MAX_SINGULAR_VALUE) {
    warnings.push({
      id: 'singularity-large',
      type: 'singularity',
      severity: 'warning',
      message: '参数值过大: 可能导致数值不稳定',
      suggestion: '将参数缩放至合理范围',
      timestamp: new Date().toISOString(),
    });
  }

  return warnings;
}

export function classifySurface(equation: QuadricEquation): string {
  const { A, B, C, D, E, F, G, H, I, J } = equation;

  if (Math.abs(A) < EPSILON && Math.abs(B) < EPSILON && Math.abs(C) < EPSILON &&
      Math.abs(D) < EPSILON && Math.abs(E) < EPSILON && Math.abs(F) < EPSILON) {
    return '平面';
  }

  if (Math.abs(D) < EPSILON && Math.abs(E) < EPSILON && Math.abs(F) < EPSILON) {
    const signs = [Math.sign(A), Math.sign(B), Math.sign(C)].filter(s => s !== 0);
    const nonZeroCount = signs.length;
    
    if (nonZeroCount === 3) {
      if (signs[0] === signs[1] && signs[1] === signs[2]) {
        return J * signs[0] < 0 ? '椭球面' : '虚椭球面';
      }
      return signs.filter(s => s > 0).length === 2 ? '单叶双曲面' : '双叶双曲面';
    }
    
    if (nonZeroCount === 2) {
      if (Math.abs(G) > EPSILON || Math.abs(H) > EPSILON || Math.abs(I) > EPSILON) {
        return '椭圆抛物面';
      }
      return signs[0] === signs[1] ? '椭圆柱面' : '双曲柱面';
    }
    
    if (nonZeroCount === 1) {
      return '抛物柱面';
    }
  }

  return '一般二次曲面';
}
