import type { Point } from '../types';

export function checkFlipped(displayed: Point, actual: Point): boolean {
  if (displayed.x === actual.y && displayed.y === actual.x) {
    return true;
  }

  if (displayed.x === -actual.x && displayed.y === -actual.y) {
    return true;
  }

  if (displayed.x === actual.y * -1 && displayed.y === actual.x * -1) {
    return true;
  }

  return false;
}

export function flipCoords(point: Point): Point {
  return { x: point.y, y: point.x };
}

export function negateCoords(point: Point): Point {
  return { x: -point.x, y: -point.y };
}

export function normalizeCoords(
  point: Point,
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 1
): Point {
  return {
    x: (point.x / scale) * canvasWidth,
    y: (point.y / scale) * canvasHeight,
  };
}

export function canvasToWorld(
  canvasPoint: Point,
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 1
): Point {
  return {
    x: (canvasPoint.x / canvasWidth) * scale,
    y: (canvasPoint.y / canvasHeight) * scale,
  };
}

export function formatCoord(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

export function getFlippedType(
  displayed: Point,
  actual: Point
): 'xy_swap' | 'negate' | 'both' | null {
  if (displayed.x === actual.y && displayed.y === actual.x) {
    return 'xy_swap';
  }
  if (displayed.x === -actual.x && displayed.y === -actual.y) {
    return 'negate';
  }
  if (displayed.x === actual.y * -1 && displayed.y === actual.x * -1) {
    return 'both';
  }
  return null;
}
