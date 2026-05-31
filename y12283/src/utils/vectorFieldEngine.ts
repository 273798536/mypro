import { Vector3, StreamlineData, ExplosionRegion, DataGapRegion } from '../types';

export interface VectorFieldFormula {
  x: string;
  y: string;
  z: string;
  parameters: Record<string, number>;
}

const EXPLOSION_DIVERGENCE_THRESHOLD = 100;
const MAX_STEP_COUNT = 500;
const STEP_SIZE = 0.05;
const BOUNDARY_LIMIT = 10;

class SafeFormulaEvaluator {
  private formula: VectorFieldFormula;
  private paramNames: string[];

  constructor(formula: VectorFieldFormula) {
    this.formula = formula;
    this.paramNames = Object.keys(formula.parameters);
  }

  evaluate(x: number, y: number, z: number): Vector3 {
    const params: Record<string, unknown> = {
      x,
      y,
      z,
      ...this.formula.parameters,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      sqrt: Math.sqrt,
      abs: Math.abs,
      exp: Math.exp,
      log: Math.log,
      PI: Math.PI,
      E: Math.E,
    };

    try {
      const createEvaluator = (expr: string) => {
        const safeExpr = expr.replace(/\^/g, '**');
        const paramList = this.paramNames.length > 0
          ? `x, y, z, ${this.paramNames.join(', ')}, sin, cos, tan, sqrt, abs, exp, log, PI, E`
          : 'x, y, z, sin, cos, tan, sqrt, abs, exp, log, PI, E';
        return new Function(paramList, `return ${safeExpr};`);
      };

      const evaluatorX = createEvaluator(this.formula.x);
      const evaluatorY = createEvaluator(this.formula.y);
      const evaluatorZ = createEvaluator(this.formula.z);

      const paramValues = this.paramNames.map((name) => this.formula.parameters[name]);
      const args = [x, y, z, ...paramValues, Math.sin, Math.cos, Math.tan, Math.sqrt, Math.abs, Math.exp, Math.log, Math.PI, Math.E];

      return {
        x: evaluatorX.apply(null, args) as number,
        y: evaluatorY.apply(null, args) as number,
        z: evaluatorZ.apply(null, args) as number,
      };
    } catch {
      return { x: 0, y: 0, z: 0 };
    }
  }
}

function rungeKutta4(
  evaluator: SafeFormulaEvaluator,
  pos: Vector3,
  dt: number
): Vector3 {
  const k1 = evaluator.evaluate(pos.x, pos.y, pos.z);
  const k2 = evaluator.evaluate(
    pos.x + 0.5 * dt * k1.x,
    pos.y + 0.5 * dt * k1.y,
    pos.z + 0.5 * dt * k1.z
  );
  const k3 = evaluator.evaluate(
    pos.x + 0.5 * dt * k2.x,
    pos.y + 0.5 * dt * k2.y,
    pos.z + 0.5 * dt * k2.z
  );
  const k4 = evaluator.evaluate(
    pos.x + dt * k3.x,
    pos.y + dt * k3.y,
    pos.z + dt * k3.z
  );

  return {
    x: pos.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: pos.y + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    z: pos.z + (dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
  };
}

function computeDivergence(evaluator: SafeFormulaEvaluator, pos: Vector3, eps: number = 0.001): number {
  const v0 = evaluator.evaluate(pos.x, pos.y, pos.z);
  const vx = evaluator.evaluate(pos.x + eps, pos.y, pos.z);
  const vy = evaluator.evaluate(pos.x, pos.y + eps, pos.z);
  const vz = evaluator.evaluate(pos.x, pos.y, pos.z + eps);

  return (vx.x - v0.x) / eps + (vy.y - v0.y) / eps + (vz.z - v0.z) / eps;
}

function isOutOfBounds(pos: Vector3): boolean {
  return (
    Math.abs(pos.x) > BOUNDARY_LIMIT ||
    Math.abs(pos.y) > BOUNDARY_LIMIT ||
    Math.abs(pos.z) > BOUNDARY_LIMIT
  );
}

function isNaNVector(v: Vector3): boolean {
  return isNaN(v.x) || isNaN(v.y) || isNaN(v.z);
}

function isInfiniteVector(v: Vector3): boolean {
  return !isFinite(v.x) || !isFinite(v.y) || !isFinite(v.z);
}

function vectorMagnitude(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function computeStreamline(
  formula: VectorFieldFormula,
  seedPosition: Vector3,
  seedId: string
): StreamlineData {
  const evaluator = new SafeFormulaEvaluator(formula);
  const points: Vector3[] = [{ ...seedPosition }];
  const explosionRegions: ExplosionRegion[] = [];
  const dataGapRegions: DataGapRegion[] = [];

  let currentPos = { ...seedPosition };
  let maxDivergence = 0;
  let inExplosion = false;
  let explosionStart = -1;
  let stepCount = 0;
  let directionReversalCount = 0;
  let prevDirection: Vector3 | null = null;

  while (stepCount < MAX_STEP_COUNT) {
    const nextPos = rungeKutta4(evaluator, currentPos, STEP_SIZE);

    if (isNaNVector(nextPos) || isInfiniteVector(nextPos)) {
      dataGapRegions.push({
        startIndex: points.length - 1,
        endIndex: points.length,
        reason: '数值溢出：计算结果包含NaN或Infinity',
      });
      break;
    }

    if (isOutOfBounds(nextPos)) {
      dataGapRegions.push({
        startIndex: points.length - 1,
        endIndex: points.length,
        reason: `超出边界限制 (±${BOUNDARY_LIMIT})`,
      });
      break;
    }

    const currentDirection = {
      x: nextPos.x - currentPos.x,
      y: nextPos.y - currentPos.y,
      z: nextPos.z - currentPos.z,
    };

    if (prevDirection) {
      const dotProduct =
        currentDirection.x * prevDirection.x +
        currentDirection.y * prevDirection.y +
        currentDirection.z * prevDirection.z;
      if (dotProduct < 0) {
        directionReversalCount++;
        if (directionReversalCount > 5) {
          dataGapRegions.push({
            startIndex: points.length - 1,
            endIndex: points.length,
            reason: `方向反转次数过多 (${directionReversalCount}次)，疑似数值不稳定`,
          });
          break;
        }
      }
    }
    prevDirection = currentDirection;

    const divergence = computeDivergence(evaluator, nextPos);
    if (Math.abs(divergence) > maxDivergence) {
      maxDivergence = Math.abs(divergence);
    }

    if (Math.abs(divergence) > EXPLOSION_DIVERGENCE_THRESHOLD) {
      if (!inExplosion) {
        inExplosion = true;
        explosionStart = points.length;
      }
    } else {
      if (inExplosion) {
        explosionRegions.push({
          startIndex: explosionStart,
          endIndex: points.length,
          maxDivergence: maxDivergence,
        });
        inExplosion = false;
      }
    }

    const mag = vectorMagnitude(currentDirection);
    if (mag < 1e-10) {
      dataGapRegions.push({
        startIndex: points.length - 1,
        endIndex: points.length,
        reason: '向量场消失：矢量大小趋近于零',
      });
      break;
    }

    points.push(nextPos);
    currentPos = nextPos;
    stepCount++;
  }

  if (inExplosion) {
    explosionRegions.push({
      startIndex: explosionStart,
      endIndex: points.length - 1,
      maxDivergence: maxDivergence,
    });
  }

  return {
    id: `streamline-${seedId}-${Date.now()}`,
    seedId,
    points,
    hasExplosion: explosionRegions.length > 0,
    explosionRegions,
    maxDivergence,
    dataGapRegions,
  };
}

export const presetVectorFields: { name: string; formula: VectorFieldFormula }[] = [
  {
    name: '洛伦兹吸引子 (含爆炸区域)',
    formula: {
      x: '10 * (y - x)',
      y: 'x * (28 - z) - y',
      z: 'x * y - 2.667 * z',
      parameters: {},
    },
  },
  {
    name: '螺旋漩涡场',
    formula: {
      x: '-y + 0.5 * x * z',
      y: 'x + 0.5 * y * z',
      z: '-z + 0.1 * (x * x + y * y)',
      parameters: {},
    },
  },
  {
    name: '扩展鞍点场 (易采样爆炸)',
    formula: {
      x: 'x + 0.1 * x * y * z',
      y: '-y + 0.1 * x * y',
      z: '0.5 * z + 0.05 * x * x',
      parameters: {},
    },
  },
];
