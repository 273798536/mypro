import { evaluate, derivative, parse } from 'mathjs';
import type { MathFunction, Interval } from '@/types';

export function parseExpression(expression: string): MathFunction {
  const cleanExpr = expression.trim();
  
  const evaluateFn = (x: number): number => {
    try {
      const scope = { x, e: Math.E, pi: Math.PI };
      return Number(evaluate(cleanExpr, scope));
    } catch {
      return NaN;
    }
  };

  let derivativeExpr = '';
  let secondDerivativeExpr = '';

  try {
    const node = parse(cleanExpr);
    const derivativeNode = derivative(node, 'x');
    derivativeExpr = derivativeNode.toString();
    
    const secondDerivativeNode = derivative(derivativeNode, 'x');
    secondDerivativeExpr = secondDerivativeNode.toString();
  } catch {
    derivativeExpr = '';
    secondDerivativeExpr = '';
  }

  const derivativeFn = derivativeExpr 
    ? (x: number): number => {
        try {
          const scope = { x, e: Math.E, pi: Math.PI };
          return Number(evaluate(derivativeExpr, scope));
        } catch {
          return NaN;
        }
      }
    : undefined;

  const secondDerivativeFn = secondDerivativeExpr
    ? (x: number): number => {
        try {
          const scope = { x, e: Math.E, pi: Math.PI };
          return Number(evaluate(secondDerivativeExpr, scope));
        } catch {
          return NaN;
        }
      }
    : undefined;

  return {
    evaluate: evaluateFn,
    derivative: derivativeFn,
    secondDerivative: secondDerivativeFn
  };
}

export function getDerivativeExpression(expression: string): string {
  try {
    const node = parse(expression.trim());
    const derivativeNode = derivative(node, 'x');
    return derivativeNode.toString();
  } catch {
    return '';
  }
}

export function getSecondDerivativeExpression(expression: string): string {
  try {
    const node = parse(expression.trim());
    const firstDerivative = derivative(node, 'x');
    const secondDerivative = derivative(firstDerivative, 'x');
    return secondDerivative.toString();
  } catch {
    return '';
  }
}

export function validateExpression(expression: string): boolean {
  try {
    const scope = { x: 1, e: Math.E, pi: Math.PI };
    evaluate(expression.trim(), scope);
    return true;
  } catch {
    return false;
  }
}

export function getExpressionError(expression: string): string | null {
  try {
    const scope = { x: 1, e: Math.E, pi: Math.PI };
    evaluate(expression.trim(), scope);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : '表达式解析错误';
  }
}

export function isPointInDomain(x: number, domain: Interval[]): boolean {
  return domain.some(interval => {
    const afterStart = interval.startInclusive ? x >= interval.start : x > interval.start;
    const beforeEnd = interval.endInclusive ? x <= interval.end : x < interval.end;
    return afterStart && beforeEnd;
  });
}

export function generateXValues(domain: Interval[], steps: number = 200): number[] {
  const values: number[] = [];
  
  domain.forEach(interval => {
    const range = interval.end - interval.start;
    const stepSize = range / steps;
    
    for (let i = 0; i <= steps; i++) {
      const x = interval.start + i * stepSize;
      if (isFinite(x) && !isNaN(x)) {
        values.push(x);
      }
    }
  });
  
  return values.sort((a, b) => a - b);
}
