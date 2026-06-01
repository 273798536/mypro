import { evaluate, parse } from 'mathjs';
import type { FunctionConfig, RotationAxis, CurvePoint, Issues } from '@/types';

export function evaluateFunction(
  expression: string,
  variable: 'x' | 'y',
  value: number
): number {
  try {
    const result = evaluate(expression, { [variable]: value });
    return typeof result === 'number' ? result : NaN;
  } catch {
    return NaN;
  }
}

export function generateCurvePoints(
  fn: FunctionConfig,
  precision: number = 100
): CurvePoint[] {
  const points: CurvePoint[] = [];
  const { start, end, isReversed } = fn.domain;
  const actualStart = isReversed ? end : start;
  const actualEnd = isReversed ? start : end;
  const step = (actualEnd - actualStart) / precision;

  for (let i = 0; i <= precision; i++) {
    const t = actualStart + i * step;
    const value = evaluateFunction(fn.expression, fn.variable, t);
    
    if (!isNaN(value) && isFinite(value)) {
      if (fn.variable === 'x') {
        points.push({ x: t, y: value });
      } else {
        points.push({ x: value, y: t });
      }
    }
  }

  return points;
}

export function calculateVolume(
  fn: FunctionConfig,
  axis: RotationAxis,
  precision: number = 1000
): number {
  const { start, end, isReversed } = fn.domain;
  const actualStart = isReversed ? end : start;
  const actualEnd = isReversed ? start : end;
  
  if (actualStart === actualEnd) return 0;

  const step = (actualEnd - actualStart) / precision;
  let volume = 0;

  if (axis.axis === 'x') {
    for (let i = 0; i < precision; i++) {
      const x = actualStart + i * step;
      const y = evaluateFunction(fn.expression, 'x', x) - axis.offset;
      if (!isNaN(y) && isFinite(y)) {
        volume += Math.PI * y * y * step;
      }
    }
  } else {
    for (let i = 0; i < precision; i++) {
      const y = actualStart + i * step;
      const x = evaluateFunction(fn.expression, 'y', y) - axis.offset;
      if (!isNaN(x) && isFinite(x)) {
        volume += Math.PI * x * x * step;
      }
    }
  }

  return Math.abs(volume);
}

export function validateExpression(expression: string): boolean {
  try {
    parse(expression);
    return true;
  } catch {
    return false;
  }
}

export function checkIssues(
  fn: FunctionConfig,
  axis: RotationAxis,
  slices: number
): Issues {
  return {
    reversedInterval: fn.domain.start > fn.domain.end,
    axisConfusion: false,
    insufficientSlices: slices < 16
  };
}

export function formatVolume(volume: number): string {
  if (volume < 0.001) return volume.toExponential(4);
  if (volume > 10000) return volume.toExponential(4);
  return volume.toFixed(4);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
