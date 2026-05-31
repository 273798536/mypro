import { Point, TrigonometryValues, UnitType } from '@/types';

export const calculateTrigonometry = (angle: number): TrigonometryValues => {
  const rad = (angle * Math.PI) / 180;
  return {
    sin: Number(Math.sin(rad).toFixed(4)),
    cos: Number(Math.cos(rad).toFixed(4)),
    tan: Number(Math.tan(rad).toFixed(4)),
  };
};

export const calculateDistance = (
  p1: Point,
  p2: Point,
  unit: UnitType,
  scale: number = 1
): number => {
  const pixelDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  const meters = pixelDist * scale;
  switch (unit) {
    case 'km':
      return Number((meters / 1000).toFixed(4));
    case 'cm':
      return Number((meters * 100).toFixed(2));
    default:
      return Number(meters.toFixed(2));
  }
};

export const calculateAngle = (vertex: Point, p1: Point, p2: Point): number => {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = dot / (mag1 * mag2);
  const angle = (Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180) / Math.PI;

  return Number(angle.toFixed(2));
};

export const validateAngleRange = (angle: number, min: number, max: number): boolean => {
  return angle >= min && angle <= max;
};

export const doLineSegmentsIntersect = (
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): boolean => {
  const ccw = (A: Point, B: Point, C: Point): boolean => {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  };

  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
};

export const doesLineIntersectPolygon = (
  line: { p1: Point; p2: Point },
  polygon: Point[]
): boolean => {
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    if (doLineSegmentsIntersect(line.p1, line.p2, polygon[i], polygon[j])) {
      return true;
    }
  }
  return false;
};

export const doesPathIntersectObstacle = (path: Point[], obstacle: Point[]): boolean => {
  for (let i = 0; i < path.length - 1; i++) {
    if (doesLineIntersectPolygon({ p1: path[i], p2: path[i + 1] }, obstacle)) {
      return true;
    }
  }
  return false;
};

export const getUnitLabel = (unit: UnitType): string => {
  const labels: Record<UnitType, string> = {
    m: '米',
    km: '千米',
    cm: '厘米',
  };
  return labels[unit];
};

export const convertDistance = (
  value: number,
  fromUnit: UnitType,
  toUnit: UnitType
): number => {
  const toMeters: Record<UnitType, number> = {
    m: 1,
    km: 1000,
    cm: 0.01,
  };

  const meters = value * toMeters[fromUnit];
  return Number((meters / toMeters[toUnit]).toFixed(4));
};
