import type { SignInterval, Interval, Sign } from '@/types';
import { parseExpression, isPointInDomain, generateXValues } from './expressionParser';

const EPSILON = 1e-6;

export function analyzeSignIntervals(
  expression: string,
  domain: Interval[],
  criticalPoints: number[],
  derivativeLevel: 1 | 2 = 1
): SignInterval[] {
  const mathFn = parseExpression(expression);
  const fn = derivativeLevel === 1 ? mathFn.derivative : mathFn.secondDerivative;
  
  if (!fn) return [];

  const allPoints = [...criticalPoints];
  
  domain.forEach(interval => {
    allPoints.push(interval.start, interval.end);
  });

  const sortedPoints = allPoints
    .filter(x => isFinite(x) && isPointInDomain(x, domain))
    .sort((a, b) => a - b);

  const intervals: SignInterval[] = [];

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const start = sortedPoints[i];
    const end = sortedPoints[i + 1];
    
    if (Math.abs(end - start) < EPSILON) continue;

    const midPoint = (start + end) / 2;
    const value = fn(midPoint);
    
    if (isNaN(value) || !isFinite(value)) continue;

    let sign: Sign;
    if (Math.abs(value) < EPSILON) {
      sign = 'zero';
    } else if (value > 0) {
      sign = 'positive';
    } else {
      sign = 'negative';
    }

    const lastInterval = intervals[intervals.length - 1];
    if (lastInterval && lastInterval.sign === sign) {
      lastInterval.interval.end = end;
    } else {
      intervals.push({
        interval: {
          start,
          end,
          startInclusive: false,
          endInclusive: false
        },
        sign,
        derivativeLevel
      });
    }
  }

  return mergeAdjacentIntervals(intervals);
}

function mergeAdjacentIntervals(intervals: SignInterval[]): SignInterval[] {
  if (intervals.length === 0) return [];

  const merged: SignInterval[] = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const last = merged[merged.length - 1];

    if (
      last.sign === current.sign &&
      last.derivativeLevel === current.derivativeLevel &&
      Math.abs(last.interval.end - current.interval.start) < EPSILON
    ) {
      last.interval.end = current.interval.end;
    } else {
      merged.push(current);
    }
  }

  return merged;
}

export function getSignSummary(intervals: SignInterval[]): {
  increasing: Interval[];
  decreasing: Interval[];
  constant: Interval[];
} {
  return {
    increasing: intervals.filter(i => i.sign === 'positive').map(i => i.interval),
    decreasing: intervals.filter(i => i.sign === 'negative').map(i => i.interval),
    constant: intervals.filter(i => i.sign === 'zero').map(i => i.interval)
  };
}

export function getConcavitySummary(intervals: SignInterval[]): {
  concaveUp: Interval[];
  concaveDown: Interval[];
  linear: Interval[];
} {
  return {
    concaveUp: intervals.filter(i => i.sign === 'positive').map(i => i.interval),
    concaveDown: intervals.filter(i => i.sign === 'negative').map(i => i.interval),
    linear: intervals.filter(i => i.sign === 'zero').map(i => i.interval)
  };
}

export function formatInterval(interval: Interval): string {
  const leftBracket = interval.startInclusive ? '[' : '(';
  const rightBracket = interval.endInclusive ? ']' : ')';
  return `${leftBracket}${formatNumber(interval.start)}, ${formatNumber(interval.end)}${rightBracket}`;
}

function formatNumber(num: number): string {
  if (!isFinite(num)) {
    return num > 0 ? '+∞' : '-∞';
  }
  return Number(num.toFixed(4)).toString();
}

export function validateDomain(domain: Interval[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (domain.length === 0) {
    errors.push('定义域不能为空');
    return { valid: false, errors };
  }

  domain.forEach((interval, index) => {
    if (interval.start >= interval.end) {
      errors.push(`区间 ${index + 1}: 起始值必须小于结束值`);
    }
    if (!isFinite(interval.start) && interval.startInclusive) {
      errors.push(`区间 ${index + 1}: 无穷大端点不能包含等号`);
    }
    if (!isFinite(interval.end) && interval.endInclusive) {
      errors.push(`区间 ${index + 1}: 无穷大端点不能包含等号`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function checkDomainCoverage(
  criticalPoints: number[],
  domain: Interval[]
): {
  covered: boolean;
  uncoveredPoints: number[];
} {
  const uncoveredPoints = criticalPoints.filter(x => !isPointInDomain(x, domain));
  return {
    covered: uncoveredPoints.length === 0,
    uncoveredPoints
  };
}

export function generateSignChartData(
  expression: string,
  domain: Interval[],
  criticalPoints: number[]
): {
  x: number;
  sign: number;
  value: number;
}[] {
  const mathFn = parseExpression(expression);
  if (!mathFn.derivative) return [];

  const data: { x: number; sign: number; value: number }[] = [];
  const xValues = generateXValues(domain, 100);

  criticalPoints.forEach(cp => {
    const value = mathFn.derivative!(cp);
    data.push({
      x: cp,
      sign: Math.abs(value) < EPSILON ? 0 : (value > 0 ? 1 : -1),
      value
    });
  });

  xValues.forEach(x => {
    if (criticalPoints.some(cp => Math.abs(cp - x) < 0.01)) return;
    
    const value = mathFn.derivative!(x);
    if (isFinite(value)) {
      data.push({
        x,
        sign: Math.abs(value) < EPSILON ? 0 : (value > 0 ? 1 : -1),
        value
      });
    }
  });

  return data.sort((a, b) => a.x - b.x);
}
