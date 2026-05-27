import type { CriticalPoint, Sign, Interval } from '@/types';
import { PointType } from '@/types';
import { parseExpression, isPointInDomain, generateXValues } from './expressionParser';

const EPSILON = 1e-6;

export function findCriticalPoints(
  expression: string,
  domain: Interval[],
  nonDifferentiablePoints: number[] = []
): CriticalPoint[] {
  const mathFn = parseExpression(expression);
  const criticalPoints: CriticalPoint[] = [];

  if (!mathFn.derivative) {
    return criticalPoints;
  }

  const xValues = generateXValues(domain, 500);
  
  for (let i = 0; i < xValues.length - 1; i++) {
    const x1 = xValues[i];
    const x2 = xValues[i + 1];
    
    const d1 = mathFn.derivative(x1);
    const d2 = mathFn.derivative(x2);
    
    if (isNaN(d1) || isNaN(d2)) continue;
    
    if (Math.abs(d1) < EPSILON) {
      const point = createCriticalPoint(x1, mathFn, domain, nonDifferentiablePoints);
      if (point && !isDuplicatePoint(criticalPoints, point)) {
        criticalPoints.push(point);
      }
    } else if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) {
      const xZero = findRootByBisection(mathFn.derivative, x1, x2);
      if (xZero !== null) {
        const point = createCriticalPoint(xZero, mathFn, domain, nonDifferentiablePoints);
        if (point && !isDuplicatePoint(criticalPoints, point)) {
          criticalPoints.push(point);
        }
      }
    }
  }

  nonDifferentiablePoints.forEach(x => {
    if (isPointInDomain(x, domain)) {
      const y = mathFn.evaluate(x);
      if (isFinite(y)) {
        criticalPoints.push({
          x,
          y,
          type: 'non_differentiable' as PointType,
          isConfirmed: false
        });
      }
    }
  });

  return criticalPoints.sort((a, b) => a.x - b.x);
}

function createCriticalPoint(
  x: number,
  mathFn: ReturnType<typeof parseExpression>,
  domain: Interval[],
  nonDifferentiablePoints: number[]
): CriticalPoint | null {
  if (!isPointInDomain(x, domain)) return null;
  if (nonDifferentiablePoints.some(nd => Math.abs(nd - x) < EPSILON)) return null;

  const y = mathFn.evaluate(x);
  if (!isFinite(y)) return null;

  const derivativeSign = mathFn.derivative ? getSign(mathFn.derivative, x) : undefined;
  const secondDerivativeSign = mathFn.secondDerivative ? getSign(mathFn.secondDerivative, x) : undefined;

  let type: PointType = PointType.CRITICAL;
  
  if (mathFn.secondDerivative) {
    const sd = mathFn.secondDerivative(x);
    if (sd > EPSILON) {
      type = PointType.MINIMUM;
    } else if (sd < -EPSILON) {
      type = PointType.MAXIMUM;
    }
  }

  return {
    x,
    y,
    type,
    derivativeSign,
    secondDerivativeSign,
    isConfirmed: false
  };
}

function getSign(
  fn: (x: number) => number,
  x: number,
  delta: number = 0.01
): Sign | undefined {
  const left = fn(x - delta);
  const right = fn(x + delta);
  
  if (!isFinite(left) || !isFinite(right)) return undefined;
  if (Math.abs(left) < EPSILON && Math.abs(right) < EPSILON) return 'zero';
  if (left > 0 || right > 0) return 'positive';
  if (left < 0 || right < 0) return 'negative';
  return 'zero';
}

function findRootByBisection(
  fn: (x: number) => number,
  a: number,
  b: number,
  tolerance: number = 1e-8,
  maxIterations: number = 100
): number | null {
  let fa = fn(a);
  let fb = fn(b);
  
  if (fa * fb > 0) return null;
  
  for (let i = 0; i < maxIterations; i++) {
    const c = (a + b) / 2;
    const fc = fn(c);
    
    if (Math.abs(fc) < tolerance) return c;
    
    if (fa * fc < 0) {
      b = c;
      fb = fc;
    } else {
      a = c;
      fa = fc;
    }
  }
  
  return (a + b) / 2;
}

function isDuplicatePoint(points: CriticalPoint[], newPoint: CriticalPoint): boolean {
  return points.some(p => Math.abs(p.x - newPoint.x) < EPSILON);
}

export function findInflectionPoints(
  expression: string,
  domain: Interval[]
): CriticalPoint[] {
  const mathFn = parseExpression(expression);
  const inflectionPoints: CriticalPoint[] = [];

  if (!mathFn.secondDerivative) {
    return inflectionPoints;
  }

  const xValues = generateXValues(domain, 500);
  
  for (let i = 0; i < xValues.length - 1; i++) {
    const x1 = xValues[i];
    const x2 = xValues[i + 1];
    
    const sd1 = mathFn.secondDerivative(x1);
    const sd2 = mathFn.secondDerivative(x2);
    
    if (isNaN(sd1) || isNaN(sd2)) continue;
    
    if (Math.abs(sd1) < EPSILON) {
      const point = createInflectionPoint(x1, mathFn, domain);
      if (point && !isDuplicatePoint(inflectionPoints, point)) {
        inflectionPoints.push(point);
      }
    } else if ((sd1 > 0 && sd2 < 0) || (sd1 < 0 && sd2 > 0)) {
      const xZero = findRootByBisection(mathFn.secondDerivative, x1, x2);
      if (xZero !== null) {
        const point = createInflectionPoint(xZero, mathFn, domain);
        if (point && !isDuplicatePoint(inflectionPoints, point)) {
          inflectionPoints.push(point);
        }
      }
    }
  }

  return inflectionPoints.sort((a, b) => a.x - b.x);
}

function createInflectionPoint(
  x: number,
  mathFn: ReturnType<typeof parseExpression>,
  domain: Interval[]
): CriticalPoint | null {
  if (!isPointInDomain(x, domain)) return null;

  const y = mathFn.evaluate(x);
  if (!isFinite(y)) return null;

  return {
    x,
    y,
    type: 'inflection' as PointType,
    secondDerivativeSign: 'zero',
    isConfirmed: false
  };
}

export function classifyCriticalPoints(
  criticalPoints: CriticalPoint[],
  expression: string,
  domain: Interval[]
): CriticalPoint[] {
  const mathFn = parseExpression(expression);
  if (!mathFn.derivative) return criticalPoints;

  return criticalPoints.map(point => {
    if (point.type !== 'critical') return point;
    
    const { x } = point;
    const delta = 0.01;
    
    const leftX = x - delta;
    const rightX = x + delta;
    
    if (!isPointInDomain(leftX, domain) || !isPointInDomain(rightX, domain)) {
      return point;
    }
    
    const leftDerivative = mathFn.derivative(leftX);
    const rightDerivative = mathFn.derivative(rightX);
    
    if (isNaN(leftDerivative) || isNaN(rightDerivative)) return point;
    
    let type: PointType = PointType.CRITICAL;
    
    if (leftDerivative > EPSILON && rightDerivative < -EPSILON) {
      type = PointType.MAXIMUM;
    } else if (leftDerivative < -EPSILON && rightDerivative > EPSILON) {
      type = PointType.MINIMUM;
    }
    
    return { ...point, type };
  });
}
