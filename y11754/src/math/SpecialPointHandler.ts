import { evaluate } from 'mathjs';
import { isDifferentiableAt, isFunctionDefinedAt, calculateDerivative, evaluateDerivativeAtPoint } from './DerivativeCalculator';
import type { SpecialPoint, SpecialPointType } from '../types';

export function findNonDifferentiablePoints(
  expression: string,
  domain: [number, number],
  steps: number = 500
): SpecialPoint[] {
  const points: SpecialPoint[] = [];
  const [start, end] = domain;
  const stepSize = (end - start) / steps;

  const derivExpr = calculateDerivative(expression);

  for (let i = 0; i <= steps; i++) {
    const x = start + i * stepSize;

    if (isFunctionDefinedAt(expression, x)) {
      const isDiff = isDifferentiableAt(expression, x);
      const y = evaluate(expression, { x }) as number;

      if (!isDiff && isFinite(y)) {
        const derivLeft = derivExpr ? evaluateDerivativeAtPoint(derivExpr, x - stepSize * 0.5) : null;
        const derivRight = derivExpr ? evaluateDerivativeAtPoint(derivExpr, x + stepSize * 0.5) : null;

        let description = `不可导点：函数在 x = ${x.toFixed(2)} 处不可导`;
        if (derivLeft !== null && derivRight !== null) {
          if (derivLeft > 0 && derivRight < 0) {
            description = `尖点（极大值）：函数在 x = ${x.toFixed(2)} 处左导数为正，右导数为负，形成尖点`;
          } else if (derivLeft < 0 && derivRight > 0) {
            description = `尖点（极小值）：函数在 x = ${x.toFixed(2)} 处左导数为负，右导数为正，形成尖点`;
          } else {
            description = `不可导点：函数在 x = ${x.toFixed(2)} 处导数不存在，左导数 ≈ ${derivLeft.toFixed(2)}，右导数 ≈ ${derivRight.toFixed(2)}`;
          }
        }

        const exists = points.some(p => Math.abs(p.x - x) < 0.1);
        if (!exists) {
          points.push({
            x,
            y,
            type: 'non_differentiable',
            description
          });
        }
      }
    }
  }

  return points;
}

export function findDiscontinuityPoints(
  expression: string,
  domain: [number, number],
  steps: number = 500
): SpecialPoint[] {
  const points: SpecialPoint[] = [];
  const [start, end] = domain;
  const stepSize = (end - start) / steps;

  let prevY: number | null = null;
  let prevX: number | null = null;

  for (let i = 0; i <= steps; i++) {
    const x = start + i * stepSize;
    const y = isFunctionDefinedAt(expression, x) ? (evaluate(expression, { x }) as number) : null;

    if (prevY !== null && y !== null && prevX !== null) {
      const jump = Math.abs(y - prevY);
      const expectedStep = stepSize * 10;

      if (jump > expectedStep * 10) {
        const exists = points.some(p => Math.abs(p.x - x) < 0.1 || Math.abs(p.x - prevX) < 0.1);
        if (!exists) {
          points.push({
            x: (x + prevX) / 2,
            y: (y + prevY) / 2,
            type: 'discontinuity',
            description: `跳跃间断点：函数在 x ≈ ${((x + prevX) / 2).toFixed(2)} 附近发生跳跃，跳跃幅度 ≈ ${jump.toFixed(2)}`
          });
        }
      }
    }

    if (y === null && prevY !== null && prevX !== null) {
      const exists = points.some(p => Math.abs(p.x - x) < 0.1);
      if (!exists) {
        points.push({
          x,
          y: prevY,
          type: 'discontinuity',
          description: `无穷间断点：函数在 x = ${x.toFixed(2)} 处无定义，可能存在垂直渐近线`
        });
      }
    }

    prevY = y;
    prevX = x;
  }

  return points;
}

export function findAllSpecialPoints(
  expression: string,
  domain: [number, number]
): SpecialPoint[] {
  const nonDifferentiable = findNonDifferentiablePoints(expression, domain);
  const discontinuities = findDiscontinuityPoints(expression, domain);

  return [...nonDifferentiable, ...discontinuities];
}

export function isNearSpecialPoint(
  x: number,
  specialPoints: SpecialPoint[],
  threshold: number = 0.1
): SpecialPoint | null {
  for (const point of specialPoints) {
    if (Math.abs(point.x - x) < threshold) {
      return point;
    }
  }
  return null;
}

export function getSpecialPointWarning(type: SpecialPointType): {
  warning: string;
  instruction: string;
  severity: 'warning' | 'error' | 'info';
} {
  switch (type) {
    case 'non_differentiable':
      return {
        warning: '⚠️ 不可导点警告',
        instruction: '此点处函数不可导，斜率不存在。请选择"斜率不存在"选项。',
        severity: 'warning'
      };
    case 'discontinuity':
      return {
        warning: '⚠️ 间断点警告',
        instruction: '此点处函数不连续，无法进行正常的斜率或极值判断。系统将跳过此判断点。',
        severity: 'error'
      };
    case 'extremum_max':
      return {
        warning: '⭐ 极大值点',
        instruction: '此点是极大值点，斜率为0。请确认是否标记为极值点。',
        severity: 'info'
      };
    case 'extremum_min':
      return {
        warning: '⭐ 极小值点',
        instruction: '此点是极小值点，斜率为0。请确认是否标记为极值点。',
        severity: 'info'
      };
    default:
      return {
        warning: '特殊点',
        instruction: '请仔细判断此点的性质。',
        severity: 'info'
      };
  }
}

export function validateJudgementAtSpecialPoint(
  point: SpecialPoint,
  judgementType: 'slope' | 'extremum',
  playerAnswer: string
): { isValid: boolean; expectedAnswer: string; reason: string } {
  if (point.type === 'non_differentiable') {
    if (judgementType === 'slope') {
      return {
        isValid: playerAnswer === 'undefined',
        expectedAnswer: 'undefined',
        reason: '不可导点处斜率不存在，应选择"斜率不存在"'
      };
    }
  }

  if (point.type === 'discontinuity') {
    return {
      isValid: false,
      expectedAnswer: 'skip',
      reason: '间断点处无法进行正常判断，应跳过此点'
    };
  }

  if (point.type === 'extremum_max' || point.type === 'extremum_min') {
    if (judgementType === 'extremum') {
      return {
        isValid: playerAnswer === 'true',
        expectedAnswer: 'true',
        reason: `此点是${point.type === 'extremum_max' ? '极大' : '极小'}值点，应标记为极值点`
      };
    }
    if (judgementType === 'slope') {
      return {
        isValid: playerAnswer === 'zero',
        expectedAnswer: 'zero',
        reason: '极值点处斜率为0'
      };
    }
  }

  return {
    isValid: true,
    expectedAnswer: playerAnswer,
    reason: '正常判断点'
  };
}
