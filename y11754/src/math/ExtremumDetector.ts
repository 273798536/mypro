import { evaluate } from 'mathjs';
import { calculateDerivative, evaluateDerivativeAtPoint } from './DerivativeCalculator';
import type { SpecialPoint, SpecialPointType } from '../types';

export function findCriticalPoints(
  expression: string,
  domain: [number, number],
  steps: number = 500
): Array<{ x: number; y: number; derivativeValue: number | null }> {
  const criticalPoints: Array<{ x: number; y: number; derivativeValue: number | null }> = [];
  const [start, end] = domain;
  const stepSize = (end - start) / steps;
  const derivExpr = calculateDerivative(expression);

  if (!derivExpr) {
    return criticalPoints;
  }

  let prevDeriv: number | null = null;
  let prevX: number | null = null;

  for (let i = 0; i <= steps; i++) {
    const x = start + i * stepSize;
    const derivValue = evaluateDerivativeAtPoint(derivExpr, x);

    if (prevDeriv !== null && derivValue !== null && prevX !== null) {
      if (prevDeriv * derivValue < 0) {
        const criticalX = prevX + Math.abs(prevDeriv) / (Math.abs(prevDeriv) + Math.abs(derivValue)) * (x - prevX);
        const criticalY = evaluate(expression, { x: criticalX }) as number;
        if (isFinite(criticalY)) {
          criticalPoints.push({
            x: criticalX,
            y: criticalY,
            derivativeValue: 0
          });
        }
      }
    }

    if (derivValue !== null && Math.abs(derivValue) < 1e-4) {
      const y = evaluate(expression, { x }) as number;
      if (isFinite(y)) {
        const exists = criticalPoints.some(p => Math.abs(p.x - x) < 0.1);
        if (!exists) {
          criticalPoints.push({ x, y, derivativeValue: derivValue });
        }
      }
    }

    prevDeriv = derivValue;
    prevX = x;
  }

  return criticalPoints;
}

export function determineExtremumType(
  expression: string,
  x: number,
  epsilon: number = 0.01
): 'max' | 'min' | 'inflection' | null {
  const derivExpr = calculateDerivative(expression);
  if (!derivExpr) return null;

  const leftX = x - epsilon;
  const rightX = x + epsilon;

  const leftDeriv = evaluateDerivativeAtPoint(derivExpr, leftX);
  const rightDeriv = evaluateDerivativeAtPoint(derivExpr, rightX);

  if (leftDeriv === null || rightDeriv === null) {
    return null;
  }

  if (leftDeriv > 0 && rightDeriv < 0) {
    return 'max';
  } else if (leftDeriv < 0 && rightDeriv > 0) {
    return 'min';
  } else if ((leftDeriv > 0 && rightDeriv > 0) || (leftDeriv < 0 && rightDeriv < 0)) {
    return 'inflection';
  }

  return null;
}

export function findExtremumPoints(
  expression: string,
  domain: [number, number]
): SpecialPoint[] {
  const extrema: SpecialPoint[] = [];
  const criticalPoints = findCriticalPoints(expression, domain);

  for (const point of criticalPoints) {
    const type = determineExtremumType(expression, point.x);
    if (type === 'max') {
      extrema.push({
        x: point.x,
        y: point.y,
        type: 'extremum_max',
        description: `极大值点：函数在 x = ${point.x.toFixed(2)} 处取得极大值 ${point.y.toFixed(2)}`
      });
    } else if (type === 'min') {
      extrema.push({
        x: point.x,
        y: point.y,
        type: 'extremum_min',
        description: `极小值点：函数在 x = ${point.x.toFixed(2)} 处取得极小值 ${point.y.toFixed(2)}`
      });
    }
  }

  return extrema;
}

export function isExtremumAt(
  expression: string,
  x: number,
  epsilon: number = 0.05
): boolean {
  const type = determineExtremumType(expression, x, epsilon);
  return type === 'max' || type === 'min';
}

export function checkIsExtremum(
  expression: string,
  x: number,
  epsilon: number = 0.1
): { isExtremum: boolean; type: SpecialPointType | null } {
  const criticalPoints = findCriticalPoints(expression, [x - epsilon, x + epsilon], 50);
  
  for (const point of criticalPoints) {
    if (Math.abs(point.x - x) < epsilon) {
      const type = determineExtremumType(expression, point.x);
      if (type === 'max') {
        return { isExtremum: true, type: 'extremum_max' };
      } else if (type === 'min') {
        return { isExtremum: true, type: 'extremum_min' };
      }
    }
  }
  
  return { isExtremum: false, type: null };
}
