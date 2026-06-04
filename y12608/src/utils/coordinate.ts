import { Point } from '../types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function flipCoordinates(points: Point[]): Point[] {
  return points.map(p => ({
    ...p,
    x: 1 - p.x,
    y: 1 - p.y
  }));
}

export function detectFlipped(points: Point[]): boolean {
  if (points.length < 2) return false;
  
  const firstPoint = points[0];
  
  if (firstPoint.x < 0 || firstPoint.x > 1 || firstPoint.y < 0 || firstPoint.y > 1) {
    return true;
  }
  
  const outOfBoundsCount = points.filter(p => 
    p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1
  ).length;
  
  return outOfBoundsCount > points.length * 0.3;
}

export function normalizeCoordinates(points: Point[], width: number, height: number): Point[] {
  return points.map(p => ({
    ...p,
    x: p.x * width,
    y: p.y * height
  }));
}

export function denormalizeCoordinates(points: Point[], width: number, height: number): Point[] {
  return points.map(p => ({
    ...p,
    x: p.x / width,
    y: p.y / height
  }));
}

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  canvasRect: DOMRect,
  zoom: number,
  pan: { x: number; y: number }
): Point {
  return {
    x: (screenX - canvasRect.left - pan.x) / zoom,
    y: (screenY - canvasRect.top - pan.y) / zoom
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  _canvasRect: DOMRect,
  zoom: number,
  pan: { x: number; y: number }
): Point {
  return {
    x: canvasX * zoom + pan.x,
    y: canvasY * zoom + pan.y
  };
}
