import type { Point2D, IntegrationMethod, IntegrationConfig } from '@/types';
import type { VectorFieldFunction } from './expressionParser';
import { tangentialComponent } from './pathGeometry';

const GAUSS_LEGENDRE_NODES: Record<number, number[]> = {
  2: [-1 / Math.sqrt(3), 1 / Math.sqrt(3)],
  3: [-Math.sqrt(3 / 5), 0, Math.sqrt(3 / 5)],
  4: [
    -Math.sqrt((3 + 2 * Math.sqrt(6 / 5)) / 7),
    -Math.sqrt((3 - 2 * Math.sqrt(6 / 5)) / 7),
    Math.sqrt((3 - 2 * Math.sqrt(6 / 5)) / 7),
    Math.sqrt((3 + 2 * Math.sqrt(6 / 5)) / 7),
  ],
  5: [
    -Math.sqrt(5 + 2 * Math.sqrt(10 / 7)) / 3,
    -Math.sqrt(5 - 2 * Math.sqrt(10 / 7)) / 3,
    0,
    Math.sqrt(5 - 2 * Math.sqrt(10 / 7)) / 3,
    Math.sqrt(5 + 2 * Math.sqrt(10 / 7)) / 3,
  ],
};

const GAUSS_LEGENDRE_WEIGHTS: Record<number, number[]> = {
  2: [1, 1],
  3: [5 / 9, 8 / 9, 5 / 9],
  4: [
    (18 - Math.sqrt(30)) / 36,
    (18 + Math.sqrt(30)) / 36,
    (18 + Math.sqrt(30)) / 36,
    (18 - Math.sqrt(30)) / 36,
  ],
  5: [
    (322 - 13 * Math.sqrt(70)) / 900,
    (322 + 13 * Math.sqrt(70)) / 900,
    128 / 225,
    (322 + 13 * Math.sqrt(70)) / 900,
    (322 - 13 * Math.sqrt(70)) / 900,
  ],
};

export interface IntegrationResultData {
  value: number;
  errorEstimate: number;
  sampledPoints: Point2D[];
}

function trapezoidalRule(
  vectorField: VectorFieldFunction,
  points: Point2D[]
): IntegrationResultData {
  if (points.length < 2) {
    return { value: 0, errorEstimate: 0, sampledPoints: points };
  }

  let integral = 0;
  const sampledPoints: Point2D[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segLength = Math.sqrt(dx * dx + dy * dy);

    if (segLength === 0) continue;

    const v1 = vectorField(p1);
    const v2 = vectorField(p2);

    const t1 = tangentialComponent(v1, { x: dx, y: dy });
    const t2 = tangentialComponent(v2, { x: dx, y: dy });

    integral += ((t1 + t2) / 2) * segLength;
    sampledPoints.push(p1);
  }
  sampledPoints.push(points[points.length - 1]);

  const h = points.length > 1 ? 1 / (points.length - 1) : 1;
  const errorEstimate = Math.abs(integral) * h * h * 0.1;

  return { value: integral, errorEstimate, sampledPoints };
}

function simpsonRule(
  vectorField: VectorFieldFunction,
  points: Point2D[]
): IntegrationResultData {
  if (points.length < 3) {
    return trapezoidalRule(vectorField, points);
  }

  const n = points.length - 1;
  const evenN = n % 2 === 0 ? n : n - 1;

  let integral = 0;
  const sampledPoints: Point2D[] = [];

  for (let i = 0; i < evenN; i += 2) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const p2 = points[i + 2];

    const dx1 = p1.x - p0.x;
    const dy1 = p1.y - p0.y;
    const dx2 = p2.x - p1.x;
    const dy2 = p2.y - p1.y;

    const segLength1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const segLength2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    const h = (segLength1 + segLength2) / 2;

    if (h === 0) continue;

    const v0 = vectorField(p0);
    const v1 = vectorField(p1);
    const v2 = vectorField(p2);

    const dir = { x: dx1 + dx2, y: dy1 + dy2 };
    const t0 = tangentialComponent(v0, dir);
    const t1 = tangentialComponent(v1, dir);
    const t2 = tangentialComponent(v2, dir);

    integral += (h / 3) * (t0 + 4 * t1 + t2);
    sampledPoints.push(p0, p1);
  }

  if (evenN < n) {
    const p0 = points[evenN];
    const p1 = points[evenN + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const segLength = Math.sqrt(dx * dx + dy * dy);

    const v0 = vectorField(p0);
    const v1 = vectorField(p1);
    const t0 = tangentialComponent(v0, { x: dx, y: dy });
    const t1 = tangentialComponent(v1, { x: dx, y: dy });

    integral += ((t0 + t1) / 2) * segLength;
  }

  sampledPoints.push(points[points.length - 1]);

  const h = points.length > 1 ? 1 / (points.length - 1) : 1;
  const errorEstimate = Math.abs(integral) * h * h * h * h * 0.05;

  return { value: integral, errorEstimate, sampledPoints };
}

function adaptiveSimpsonHelper(
  vectorField: VectorFieldFunction,
  a: Point2D,
  b: Point2D,
  tolerance: number,
  depth: number,
  maxDepth: number
): { value: number; sampledPoints: Point2D[] } {
  if (depth >= maxDepth) {
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const result = trapezoidalRule(vectorField, [a, mid, b]);
    return { value: result.value, sampledPoints: [a, mid, b] };
  }

  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

  const result1 = simpsonRule(vectorField, [a, mid, b]);
  const result2 = simpsonRule(vectorField, [a, { x: (a.x + mid.x) / 2, y: (a.y + mid.y) / 2 }, mid, { x: (mid.x + b.x) / 2, y: (mid.y + b.y) / 2 }, b]);

  const error = Math.abs(result2.value - result1.value) / 15;

  if (error < tolerance) {
    return { value: result2.value, sampledPoints: [a, mid, b] };
  }

  const left = adaptiveSimpsonHelper(vectorField, a, mid, tolerance / 2, depth + 1, maxDepth);
  const right = adaptiveSimpsonHelper(vectorField, mid, b, tolerance / 2, depth + 1, maxDepth);

  return {
    value: left.value + right.value,
    sampledPoints: [...left.sampledPoints, ...right.sampledPoints.slice(1)],
  };
}

function adaptiveSimpsonRule(
  vectorField: VectorFieldFunction,
  points: Point2D[],
  tolerance: number
): IntegrationResultData {
  let integral = 0;
  let allSampledPoints: Point2D[] = [points[0]];
  const maxDepth = 10;

  for (let i = 0; i < points.length - 1; i++) {
    const result = adaptiveSimpsonHelper(
      vectorField,
      points[i],
      points[i + 1],
      tolerance,
      0,
      maxDepth
    );
    integral += result.value;
    allSampledPoints = [...allSampledPoints, ...result.sampledPoints.slice(1)];
  }

  return {
    value: integral,
    errorEstimate: tolerance * points.length,
    sampledPoints: allSampledPoints,
  };
}

function gaussLegendreRule(
  vectorField: VectorFieldFunction,
  points: Point2D[],
  order: number
): IntegrationResultData {
  const nodes = GAUSS_LEGENDRE_NODES[order] || GAUSS_LEGENDRE_NODES[4];
  const weights = GAUSS_LEGENDRE_WEIGHTS[order] || GAUSS_LEGENDRE_WEIGHTS[4];

  let integral = 0;
  const sampledPoints: Point2D[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLength = Math.sqrt(dx * dx + dy * dy);

    if (segLength === 0) continue;

    sampledPoints.push(a);

    for (let j = 0; j < nodes.length; j++) {
      const t = (nodes[j] + 1) / 2;
      const point = {
        x: a.x + dx * t,
        y: a.y + dy * t,
      };

      const v = vectorField(point);
      const tComponent = tangentialComponent(v, { x: dx, y: dy });
      integral += weights[j] * tComponent * (segLength / 2);

      sampledPoints.push(point);
    }
  }

  sampledPoints.push(points[points.length - 1]);

  const errorEstimate = Math.abs(integral) * Math.pow(0.5, 2 * order) * 0.1;

  return { value: integral, errorEstimate, sampledPoints };
}

export function computeLineIntegral(
  vectorField: VectorFieldFunction,
  points: Point2D[],
  config: IntegrationConfig
): IntegrationResultData {
  const startTime = performance.now();
  
  let result: IntegrationResultData;

  switch (config.method) {
    case 'trapezoidal':
      result = trapezoidalRule(vectorField, points);
      break;
    case 'simpson':
      result = simpsonRule(vectorField, points);
      break;
    case 'adaptiveSimpson':
      result = adaptiveSimpsonRule(
        vectorField,
        points,
        config.adaptiveTolerance || 1e-6
      );
      break;
    case 'gaussLegendre':
      result = gaussLegendreRule(
        vectorField,
        points,
        config.gaussOrder || 4
      );
      break;
    default:
      result = trapezoidalRule(vectorField, points);
  }

  void startTime;

  return result;
}

export function getMethodLabel(method: IntegrationMethod): string {
  const labels: Record<IntegrationMethod, string> = {
    trapezoidal: '梯形法',
    simpson: 'Simpson 法',
    adaptiveSimpson: '自适应 Simpson 法',
    gaussLegendre: '高斯-勒让德',
  };
  return labels[method];
}
