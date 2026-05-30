import { QuadraticParams, CANVAS_CONFIG } from '../types/game';

export const calculateY = (x: number, params: QuadraticParams): number => {
  const { a, b, c } = params;
  return a * x * x + b * x + c;
};

export const calculateSlope = (x: number, params: QuadraticParams): number => {
  const { a, b } = params;
  return 2 * a * x + b;
};

export const calculateVelocity = (
  x: number,
  params: QuadraticParams,
  baseSpeed: number = 2,
  speedFactor: number = 0.3
): number => {
  const slope = calculateSlope(x, params);
  return baseSpeed * (1 + Math.abs(slope) * speedFactor);
};

export const calculateAngle = (x: number, params: QuadraticParams): number => {
  const slope = calculateSlope(x, params);
  return Math.atan(slope) * (180 / Math.PI);
};

export const mathToCanvasY = (mathY: number, canvasHeight: number): number => {
  const centerY = canvasHeight / 2;
  return centerY - mathY * 20;
};

export const canvasToMathY = (canvasY: number, canvasHeight: number): number => {
  const centerY = canvasHeight / 2;
  return (centerY - canvasY) / 20;
};

export const mathToCanvasX = (mathX: number, canvasWidth: number): number => {
  const centerX = canvasWidth / 2;
  return centerX + mathX * 20;
};

export const canvasToMathX = (canvasX: number, canvasWidth: number): number => {
  const centerX = canvasWidth / 2;
  return (canvasX - centerX) / 20;
};

export const generateCurvePoints = (
  params: QuadraticParams,
  canvasWidth: number,
  canvasHeight: number,
  startX: number = CANVAS_CONFIG.startX,
  endX: number = CANVAS_CONFIG.endX
): { x: number; y: number }[] => {
  const points: { x: number; y: number }[] = [];
  const step = 2;

  for (let canvasX = startX; canvasX <= endX; canvasX += step) {
    const mathX = canvasToMathX(canvasX, canvasWidth);
    const mathY = calculateY(mathX, params);
    const canvasY = mathToCanvasY(mathY, canvasHeight);
    points.push({ x: canvasX, y: canvasY });
  }

  return points;
};

export const getYAtCanvasX = (
  canvasX: number,
  params: QuadraticParams,
  canvasWidth: number,
  canvasHeight: number
): number => {
  const mathX = canvasToMathX(canvasX, canvasWidth);
  const mathY = calculateY(mathX, params);
  return mathToCanvasY(mathY, canvasHeight);
};

export const getFunctionExpression = (params: QuadraticParams): string => {
  const { a, b, c } = params;
  let expr = 'y = ';

  if (Math.abs(a) > 0.0001) {
    const aStr = Math.abs(a) === 1 ? '' : a.toFixed(2).replace(/\.?0+$/, '');
    expr += `${a < 0 ? '-' : ''}${aStr}x²`;
  }

  if (Math.abs(b) > 0.0001) {
    const bStr = Math.abs(b) === 1 ? '' : Math.abs(b).toFixed(2).replace(/\.?0+$/, '');
    expr += ` ${b < 0 ? '-' : '+'} ${bStr}x`;
  }

  if (Math.abs(c) > 0.0001 || (Math.abs(a) < 0.0001 && Math.abs(b) < 0.0001)) {
    expr += ` ${c < 0 ? '-' : '+'} ${Math.abs(c).toFixed(2).replace(/\.?0+$/, '')}`;
  }

  return expr.replace(/\+ -/g, '- ').replace(/^y = \+/, 'y = ');
};

export const analyzeParams = (params: QuadraticParams): {
  openingDirection: string;
  vertex: { x: number; y: number };
  axisOfSymmetry: number;
  yIntercept: number;
} => {
  const { a, b, c } = params;
  
  const openingDirection = a > 0 ? '向上' : a < 0 ? '向下' : '直线（无开口）';
  const axisOfSymmetry = a !== 0 ? -b / (2 * a) : 0;
  const vertexY = a !== 0 ? calculateY(axisOfSymmetry, params) : c;
  
  return {
    openingDirection,
    vertex: { x: axisOfSymmetry, y: vertexY },
    axisOfSymmetry,
    yIntercept: c,
  };
};

export const checkPointCollision = (
  px: number,
  py: number,
  rect: { x: number; y: number; width: number; height: number },
  padding: number = 5
): boolean => {
  return (
    px >= rect.x - padding &&
    px <= rect.x + rect.width + padding &&
    py >= rect.y - padding &&
    py <= rect.y + rect.height + padding
  );
};
