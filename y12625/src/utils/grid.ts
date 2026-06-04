import { Point } from '@/types';

export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
}

export function canvasToGrid(
  canvasPoint: Point,
  gridSize: number,
  canvasWidth: number,
  canvasHeight: number
): Point {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  return {
    x: Math.round((canvasPoint.x - centerX) / gridSize),
    y: Math.round((centerY - canvasPoint.y) / gridSize)
  };
}

export function gridToCanvas(
  gridPoint: Point,
  gridSize: number,
  canvasWidth: number,
  canvasHeight: number
): Point {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  return {
    x: centerX + gridPoint.x * gridSize,
    y: centerY - gridPoint.y * gridSize
  };
}

export function isWithinBoundary(
  gridPoint: Point,
  boundary: { x: number; y: number }
): boolean {
  return (
    Math.abs(gridPoint.x) <= boundary.x &&
    Math.abs(gridPoint.y) <= boundary.y
  );
}

export function getDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
