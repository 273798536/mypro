import type { Point } from '../types';

export const HIT_THRESHOLD = 30;

export function calculateDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isHit(
  userClick: Point,
  actualCoords: Point,
  threshold: number = HIT_THRESHOLD
): boolean {
  const distance = calculateDistance(userClick, actualCoords);
  return distance <= threshold;
}

export function calculateScore(
  distance: number,
  threshold: number,
  isFlipped: boolean,
  userSuspectedFlipped: boolean
): number {
  if (distance > threshold) {
    return 0;
  }

  const baseScore = 100 - (distance / threshold) * 50;
  let finalScore = Math.max(baseScore, 50);

  if (isFlipped && userSuspectedFlipped) {
    finalScore += 20;
  }

  return Math.round(finalScore);
}

export function getOffsetDirection(
  userClick: Point,
  actualCoords: Point
): { direction: string; dx: number; dy: number } {
  const dx = userClick.x - actualCoords.x;
  const dy = userClick.y - actualCoords.y;

  let direction = '';
  if (Math.abs(dy) > 5) {
    direction += dy > 0 ? '下' : '上';
  }
  if (Math.abs(dx) > 5) {
    direction += dx > 0 ? '右' : '左';
  }

  return { direction: direction || '正中', dx, dy };
}
