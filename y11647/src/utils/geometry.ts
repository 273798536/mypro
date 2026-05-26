import type { Point } from '../engine/types';

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

export function lerp(p1: Point, p2: Point, t: number): Point {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}

export function getPointOnPath(points: Point[], progress: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  if (progress <= 0) return points[0];
  if (progress >= 1) return points[points.length - 1];

  const totalLen = pathLength(points);
  const targetLen = totalLen * progress;
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    const segLen = distance(points[i - 1], points[i]);
    if (accumulated + segLen >= targetLen) {
      const segProgress = (targetLen - accumulated) / segLen;
      return lerp(points[i - 1], points[i], segProgress);
    }
    accumulated += segLen;
  }
  return points[points.length - 1];
}

export function lineIntersectsRect(
  p1: Point,
  p2: Point,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  if (
    (p1.x >= left && p1.x <= right && p1.y >= top && p1.y <= bottom) ||
    (p2.x >= left && p2.x <= right && p2.y >= top && p2.y <= bottom)
  ) {
    return true;
  }

  return (
    lineIntersectsLine(p1, p2, { x: left, y: top }, { x: right, y: top }) ||
    lineIntersectsLine(p1, p2, { x: right, y: top }, { x: right, y: bottom }) ||
    lineIntersectsLine(p1, p2, { x: right, y: bottom }, { x: left, y: bottom }) ||
    lineIntersectsLine(p1, p2, { x: left, y: bottom }, { x: left, y: top })
  );
}

export function lineIntersectsLine(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): boolean {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;

  return false;
}

function direction(p1: Point, p2: Point, p3: Point): number {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

function onSegment(p1: Point, p2: Point, p: Point): boolean {
  return (
    Math.min(p1.x, p2.x) <= p.x &&
    p.x <= Math.max(p1.x, p2.x) &&
    Math.min(p1.y, p2.y) <= p.y &&
    p.y <= Math.max(p1.y, p2.y)
  );
}

export function circleIntersectsRect(
  circle: { x: number; y: number; radius: number },
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

export function pointInRect(
  p: Point,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    p.x >= rect.x &&
    p.x <= rect.x + rect.width &&
    p.y >= rect.y &&
    p.y <= rect.y + rect.height
  );
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
