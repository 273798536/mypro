import { Level, Point, GameError, ErrorType } from '../types';

export const calculateY = (
  x: number,
  functionType: Level['functionType'],
  params: Record<string, number>
): number => {
  switch (functionType) {
    case 'polynomial':
      return params.a * x * x + params.b * x + params.c;
    case 'trigonometric':
      return params.a * Math.sin(params.b * x) + params.c;
    case 'piecewise':
      if (x < 400) {
        return params.a * x + params.b;
      } else {
        return params.c * x + params.d;
      }
    case 'composite':
      return params.a * x * x + params.b * Math.sin(params.c * x) + params.d;
    default:
      return params.a * x + params.b;
  }
};

export const calculateDerivative = (
  x: number,
  functionType: Level['functionType'],
  params: Record<string, number>,
  h: number = 0.001
): number => {
  const y1 = calculateY(x - h, functionType, params);
  const y2 = calculateY(x + h, functionType, params);
  return (y2 - y1) / (2 * h);
};

export const generateTrajectory = (
  level: Level,
  params: Record<string, number>,
  startX: number,
  endX: number,
  step: number = 2
): Point[] => {
  const points: Point[] = [];
  for (let x = startX; x <= endX; x += step) {
    const y = calculateY(x, level.functionType, params);
    points.push({ x, y });
  }
  return points;
};

export const checkOutOfBounds = (
  point: Point,
  bounds: Level['bounds'],
  margin: number = 20
): GameError | null => {
  const { minX, maxX, minY, maxY } = bounds;
  if (point.y < minY + margin || point.y > maxY - margin) {
    return {
      type: 'out_of_bounds',
      position: point,
      message: `赛车越界！y=${point.y.toFixed(1)} 超出范围 [${minY + margin}, ${maxY - margin}]`,
      severity: point.y < minY || point.y > maxY ? 'critical' : 'warning',
      stepIndex: 0,
      timestamp: Date.now(),
    };
  }
  return null;
};

export const checkCurveBreak = (
  prevPoint: Point,
  currPoint: Point,
  threshold: number = 50
): GameError | null => {
  const distance = Math.abs(currPoint.y - prevPoint.y);
  if (distance > threshold) {
    return {
      type: 'curve_break',
      position: currPoint,
      message: `曲线断裂！突变距离 ${distance.toFixed(1)} 超过阈值 ${threshold}`,
      severity: distance > threshold * 1.5 ? 'critical' : 'warning',
      stepIndex: 0,
      timestamp: Date.now(),
    };
  }
  return null;
};

export const checkSpeedMismatch = (
  x: number,
  functionType: Level['functionType'],
  params: Record<string, number>,
  maxSlope: number = 0.8
): GameError | null => {
  const slope = calculateDerivative(x, functionType, params);
  const absSlope = Math.abs(slope);
  if (absSlope > maxSlope) {
    return {
      type: 'speed_mismatch',
      position: { x, y: calculateY(x, functionType, params) },
      message: `速度失控！斜率 ${absSlope.toFixed(3)} 超过安全值 ${maxSlope}`,
      severity: absSlope > maxSlope * 1.5 ? 'critical' : 'warning',
      stepIndex: 0,
      timestamp: Date.now(),
    };
  }
  return null;
};

export const checkAllErrors = (
  trajectory: Point[],
  level: Level,
  params: Record<string, number>
): GameError[] => {
  const errors: GameError[] = [];
  let stepIndex = 0;

  for (let i = 0; i < trajectory.length; i++) {
    const point = trajectory[i];

    const outOfBounds = checkOutOfBounds(point, level.bounds);
    if (outOfBounds) {
      errors.push({ ...outOfBounds, stepIndex });
    }

    if (i > 0) {
      const curveBreak = checkCurveBreak(trajectory[i - 1], point);
      if (curveBreak) {
        errors.push({ ...curveBreak, stepIndex });
      }
    }

    const speedError = checkSpeedMismatch(point.x, level.functionType, params);
    if (speedError) {
      errors.push({ ...speedError, stepIndex });
    }

    stepIndex++;
  }

  return errors;
};

export const calculateScore = (
  errors: GameError[],
  reachedGoal: boolean,
  totalSteps: number
): number => {
  let score = 1000;

  const criticalErrors = errors.filter((e) => e.severity === 'critical').length;
  const warningErrors = errors.filter((e) => e.severity === 'warning').length;

  score -= criticalErrors * 100;
  score -= warningErrors * 30;

  if (reachedGoal) {
    score += 500;
  }

  score -= totalSteps * 2;

  return Math.max(0, score);
};

export const getErrorColor = (type: ErrorType): string => {
  switch (type) {
    case 'out_of_bounds':
      return '#ef4444';
    case 'curve_break':
      return '#f59e0b';
    case 'speed_mismatch':
      return '#f97316';
    default:
      return '#6b7280';
  }
};

export const getErrorLabel = (type: ErrorType): string => {
  switch (type) {
    case 'out_of_bounds':
      return '参数越界';
    case 'curve_break':
      return '曲线断裂';
    case 'speed_mismatch':
      return '速度误判';
    default:
      return '未知错误';
  }
};

export const getErrorIcon = (type: ErrorType): string => {
  switch (type) {
    case 'out_of_bounds':
      return '⚠️';
    case 'curve_break':
      return '💔';
    case 'speed_mismatch':
      return '⚡';
    default:
      return '❓';
  }
};
