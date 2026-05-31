import { compile, evaluate } from 'mathjs';
import type { MathNode, EvalFunction } from 'mathjs';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export class ImplicitFunction {
  private compiled: EvalFunction | null = null;
  private expression: string = '';
  private lastError: string | null = null;

  compile(expression: string): boolean {
    try {
      this.expression = expression;
      this.compiled = compile(expression);
      this.lastError = null;
      return true;
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : 'Unknown error';
      this.compiled = null;
      return false;
    }
  }

  evaluate(
    x: number,
    y: number,
    z: number,
    parameters: Record<string, number> = {}
  ): number {
    if (!this.compiled) {
      return NaN;
    }
    try {
      return this.compiled.evaluate({ x, y, z, ...parameters }) as number;
    } catch {
      return NaN;
    }
  }

  evaluateGradient(
    x: number,
    y: number,
    z: number,
    parameters: Record<string, number> = {},
    eps: number = 1e-4
  ): Point3D {
    const fx = this.evaluate(x + eps, y, z, parameters);
    const fx_ = this.evaluate(x - eps, y, z, parameters);
    const fy = this.evaluate(x, y + eps, z, parameters);
    const fy_ = this.evaluate(x, y - eps, z, parameters);
    const fz = this.evaluate(x, y, z + eps, parameters);
    const fz_ = this.evaluate(x, y, z - eps, parameters);

    return {
      x: (fx - fx_) / (2 * eps),
      y: (fy - fy_) / (2 * eps),
      z: (fz - fz_) / (2 * eps),
    };
  }

  evaluateCurvature(
    x: number,
    y: number,
    z: number,
    parameters: Record<string, number> = {},
    eps: number = 1e-3
  ): number {
    const grad = this.evaluateGradient(x, y, z, parameters, eps);
    const gradMag = Math.sqrt(grad.x ** 2 + grad.y ** 2 + grad.z ** 2);

    if (gradMag < 1e-10) return 0;

    const f = this.evaluate(x, y, z, parameters);
    const fxx =
      (this.evaluate(x + eps, y, z, parameters) -
        2 * f +
        this.evaluate(x - eps, y, z, parameters)) /
      (eps * eps);
    const fyy =
      (this.evaluate(x, y + eps, z, parameters) -
        2 * f +
        this.evaluate(x, y - eps, z, parameters)) /
      (eps * eps);
    const fzz =
      (this.evaluate(x, y, z + eps, parameters) -
        2 * f +
        this.evaluate(x, y, z - eps, parameters)) /
      (eps * eps);
    const fxy =
      (this.evaluate(x + eps, y + eps, z, parameters) -
        this.evaluate(x + eps, y - eps, z, parameters) -
        this.evaluate(x - eps, y + eps, z, parameters) +
        this.evaluate(x - eps, y - eps, z, parameters)) /
      (4 * eps * eps);
    const fxz =
      (this.evaluate(x + eps, y, z + eps, parameters) -
        this.evaluate(x + eps, y, z - eps, parameters) -
        this.evaluate(x - eps, y, z + eps, parameters) +
        this.evaluate(x - eps, y, z - eps, parameters)) /
      (4 * eps * eps);
    const fyz =
      (this.evaluate(x, y + eps, z + eps, parameters) -
        this.evaluate(x, y + eps, z - eps, parameters) -
        this.evaluate(x, y - eps, z + eps, parameters) +
        this.evaluate(x, y - eps, z - eps, parameters)) /
      (4 * eps * eps);

    const trace = fxx + fyy + fzz;
    const gradDotHessian = grad.x * fxx + grad.y * fxy + grad.z * fxz;
    const meanCurvature =
      (trace * gradMag * gradMag - gradDotHessian) /
      (2 * Math.pow(gradMag, 3));

    return meanCurvature;
  }

  getExpression(): string {
    return this.expression;
  }

  getError(): string | null {
    return this.lastError;
  }

  isValid(): boolean {
    return this.compiled !== null;
  }
}

export function findSurfacePoints(
  func: ImplicitFunction,
  parameters: Record<string, number>,
  bounds: { min: Point3D; max: Point3D },
  numPoints: number = 1000
): Point3D[] {
  const points: Point3D[] = [];
  const stepX = (bounds.max.x - bounds.min.x) / Math.cbrt(numPoints);
  const stepY = (bounds.max.y - bounds.min.y) / Math.cbrt(numPoints);
  const stepZ = (bounds.max.z - bounds.min.z) / Math.cbrt(numPoints);

  for (let x = bounds.min.x; x <= bounds.max.x; x += stepX) {
    for (let y = bounds.min.y; y <= bounds.max.y; y += stepY) {
      for (let z = bounds.min.z; z <= bounds.max.z; z += stepZ) {
        const val = func.evaluate(x, y, z, parameters);
        if (Math.abs(val) < 0.1) {
          points.push({ x, y, z });
        }
      }
    }
  }

  return points;
}

export function detectSingularities(
  func: ImplicitFunction,
  parameters: Record<string, number>,
  bounds: { min: Point3D; max: Point3D },
  resolution: number = 32
): Point3D[] {
  const singularities: Point3D[] = [];
  const stepX = (bounds.max.x - bounds.min.x) / resolution;
  const stepY = (bounds.max.y - bounds.min.y) / resolution;
  const stepZ = (bounds.max.z - bounds.min.z) / resolution;

  for (let x = bounds.min.x; x <= bounds.max.x; x += stepX) {
    for (let y = bounds.min.y; y <= bounds.max.y; y += stepY) {
      for (let z = bounds.min.z; z <= bounds.max.z; z += stepZ) {
        const val = func.evaluate(x, y, z, parameters);
        if (Math.abs(val) < 0.05) {
          const grad = func.evaluateGradient(x, y, z, parameters);
          const gradMag = Math.sqrt(grad.x ** 2 + grad.y ** 2 + grad.z ** 2);
          if (gradMag < 0.1) {
            singularities.push({ x, y, z });
          }
        }
      }
    }
  }

  return singularities;
}
