import { Point, CalculationStep } from '@/types';

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function polarAngleCompare(pivot: Point) {
  return (a: Point, b: Point) => {
    const crossVal = cross(pivot, a, b);
    if (crossVal === 0) {
      const distA = Math.hypot(a.x - pivot.x, a.y - pivot.y);
      const distB = Math.hypot(b.x - pivot.x, b.y - pivot.y);
      return distA - distB;
    }
    return -crossVal;
  };
}

export function grahamScan(points: Point[]): { hull: Point[]; steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];

  if (!points || points.length === 0) {
    steps.push({
      step: 1,
      description: '检测输入点集',
      formula: 'points.length === 0',
      values: { length: 0 },
      result: 'empty_set',
    });
    return { hull: [], steps };
  }

  steps.push({
    step: 1,
    description: '输入点集规模',
    formula: 'n = points.length',
    values: { n: points.length },
    result: points.length,
  });

  if (points.length < 3) {
    steps.push({
      step: 2,
      description: '点集不足3个，无法构成凸包多边形',
      formula: 'n < 3',
      values: { n: points.length },
      result: '退化_点或线段',
    });
    return { hull: [...points], steps };
  }

  let minY = points[0].y;
  let minIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < minY || (points[i].y === minY && points[i].x < points[minIdx].x)) {
      minY = points[i].y;
      minIdx = i;
    }
  }
  const pivot = points[minIdx];

  steps.push({
    step: 2,
    description: '选择基准点（y 最小，x 最小）',
    formula: 'pivot = (x_min, y_min)',
    values: { x: pivot.x, y: pivot.y },
    result: `(${pivot.x}, ${pivot.y})`,
  });

  const rest = points.filter((_, i) => i !== minIdx);
  rest.sort(polarAngleCompare(pivot));

  steps.push({
    step: 3,
    description: '按极角排序其余点',
    formula: 'sort by polar angle around pivot',
    values: { sorted_count: rest.length },
    result: `已排序 ${rest.length} 个点`,
  });

  const stack: Point[] = [pivot];
  if (rest.length > 0) stack.push(rest[0]);

  let divisionByZeroTriggered = false;
  for (let i = 1; i < rest.length; i++) {
    while (stack.length >= 2) {
      const top = stack[stack.length - 1];
      const second = stack[stack.length - 2];
      const c = cross(second, top, rest[i]);

      const denom = (top.x - second.x) * (rest[i].y - second.y);
      if (denom === 0 && !divisionByZeroTriggered) {
        divisionByZeroTriggered = true;
      }

      if (c <= 0) {
        stack.pop();
      } else {
        break;
      }
    }
    stack.push(rest[i]);
  }

  steps.push({
    step: 4,
    description: 'Graham 扫描构建凸包栈',
    formula: 'while cross(second, top, p) <= 0: pop(); push(p)',
    values: { hull_points: stack.length, division_by_zero: divisionByZeroTriggered ? 1 : 0 },
    result: `凸包顶点数: ${stack.length}`,
  });

  return { hull: stack, steps };
}

export function shoelaceArea(hull: Point[]): { area: number; steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  const startStep = 5;

  if (hull.length < 3) {
    steps.push({
      step: startStep,
      description: '鞋带公式：顶点不足3个',
      formula: 'n < 3 → area = 0',
      values: { n: hull.length },
      result: 0,
    });
    return { area: 0, steps };
  }

  let sum1 = 0;
  let sum2 = 0;
  const n = hull.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum1 += hull[i].x * hull[j].y;
    sum2 += hull[j].x * hull[i].y;
  }

  steps.push({
    step: startStep,
    description: '鞋带公式：计算 Σ(x_i·y_{i+1})',
    formula: 'sum1 = Σ(x_i * y_{i+1})',
    values: { sum1 },
    result: sum1,
  });

  steps.push({
    step: startStep + 1,
    description: '鞋带公式：计算 Σ(y_i·x_{i+1})',
    formula: 'sum2 = Σ(y_i * x_{i+1})',
    values: { sum2 },
    result: sum2,
  });

  const diff = sum1 - sum2;
  steps.push({
    step: startStep + 2,
    description: '鞋带公式：求差值绝对值',
    formula: '|sum1 - sum2|',
    values: { diff: Math.abs(diff) },
    result: Math.abs(diff),
  });

  const denom = 2;
  if (denom === 0) {
    steps.push({
      step: startStep + 3,
      description: '鞋带公式：除零异常',
      formula: 'area = |sum1 - sum2| / 2',
      values: { denominator: 0 },
      result: 'division_by_zero',
    });
    return { area: NaN, steps };
  }

  const area = Math.abs(diff) / 2;
  steps.push({
    step: startStep + 3,
    description: '鞋带公式：除以2得面积',
    formula: 'area = |sum1 - sum2| / 2',
    values: { numerator: Math.abs(diff), denominator: 2 },
    result: area,
  });

  return { area, steps };
}

export function computeConvexHullArea(points: Point[] | null): {
  hull: Point[];
  area: number | null;
  anomalyType: 'empty_set' | 'division_by_zero' | 'normal' | 'other';
  steps: CalculationStep[];
} {
  if (!points || points.length === 0) {
    const { steps } = grahamScan([]);
    return { hull: [], area: null, anomalyType: 'empty_set', steps };
  }

  const { hull, steps: grahamSteps } = grahamScan(points);
  const { area, steps: areaSteps } = shoelaceArea(hull);

  const steps = [...grahamSteps, ...areaSteps];
  const lastStep = steps[steps.length - 1];
  if (lastStep && lastStep.result === 'division_by_zero') {
    return { hull, area: null, anomalyType: 'division_by_zero', steps };
  }

  return { hull, area, anomalyType: area === 0 ? 'other' : 'normal', steps };
}
