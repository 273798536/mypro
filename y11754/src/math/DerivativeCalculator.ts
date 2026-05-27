import { derivative, evaluate, parse } from 'mathjs';
import type { SlopeType } from '../types';

export function calculateDerivative(expression: string, variable: string = 'x'): string {
  try {
    const deriv = derivative(expression, variable);
    return deriv.toString();
  } catch (error) {
    console.error('计算导数失败:', error);
    return '';
  }
}

export function evaluateDerivativeAtPoint(
  derivativeExpr: string,
  x: number,
  variable: string = 'x'
): number | null {
  try {
    const result = evaluate(derivativeExpr, { [variable]: x });
    if (typeof result === 'number' && isFinite(result)) {
      return result;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function determineSlopeType(derivativeValue: number | null): SlopeType {
  if (derivativeValue === null) {
    return 'undefined';
  }

  const epsilon = 1e-6;

  if (Math.abs(derivativeValue) < epsilon) {
    return 'zero';
  } else if (derivativeValue > 0) {
    return 'positive';
  } else {
    return 'negative';
  }
}

export function calculateSlopeTypeAtPoint(
  expression: string,
  x: number,
  variable: string = 'x'
): SlopeType {
  try {
    const derivExpr = calculateDerivative(expression, variable);
    if (!derivExpr) {
      return 'undefined';
    }
    const derivValue = evaluateDerivativeAtPoint(derivExpr, x, variable);
    return determineSlopeType(derivValue);
  } catch (error) {
    return 'undefined';
  }
}

export function evaluateFunctionAtPoint(
  expression: string,
  x: number,
  variable: string = 'x'
): number | null {
  try {
    const result = evaluate(expression, { [variable]: x });
    if (typeof result === 'number' && isFinite(result)) {
      return result;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function generateCurvePoints(
  expression: string,
  domain: [number, number],
  steps: number = 200,
  variable: string = 'x'
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const [start, end] = domain;
  const stepSize = (end - start) / steps;

  for (let i = 0; i <= steps; i++) {
    const x = start + i * stepSize;
    const y = evaluateFunctionAtPoint(expression, x, variable);
    if (y !== null) {
      points.push({ x, y });
    }
  }

  return points;
}

export function isFunctionDefinedAt(
  expression: string,
  x: number,
  variable: string = 'x'
): boolean {
  return evaluateFunctionAtPoint(expression, x, variable) !== null;
}

export function isDifferentiableAt(
  expression: string,
  x: number,
  variable: string = 'x'
): boolean {
  try {
    const derivExpr = calculateDerivative(expression, variable);
    if (!derivExpr) return false;
    const derivValue = evaluateDerivativeAtPoint(derivExpr, x, variable);
    return derivValue !== null;
  } catch (error) {
    return false;
  }
}

export function parseExpression(expression: string): boolean {
  try {
    parse(expression);
    return true;
  } catch (error) {
    return false;
  }
}
