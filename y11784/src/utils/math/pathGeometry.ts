import type { Point2D, PathNode } from '@/types';

export function distance(p1: Point2D, p2: Point2D): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

export function pathLength(nodes: Point2D[]): number {
  if (nodes.length < 2) return 0;
  let length = 0;
  for (let i = 1; i < nodes.length; i++) {
    length += distance(nodes[i - 1], nodes[i]);
  }
  return length;
}

export function interpolatePath(
  nodes: Point2D[],
  stepSize: number
): Point2D[] {
  if (nodes.length < 2) return nodes;

  const points: Point2D[] = [{ ...nodes[0] }];
  let remainingStep = stepSize;

  for (let i = 1; i < nodes.length; i++) {
    const start = nodes[i - 1];
    const end = nodes[i];
    const segLength = distance(start, end);

    if (segLength === 0) continue;

    const direction = {
      x: (end.x - start.x) / segLength,
      y: (end.y - start.y) / segLength,
    };

    let currentDist = remainingStep;
    while (currentDist < segLength) {
      points.push({
        x: start.x + direction.x * currentDist,
        y: start.y + direction.y * currentDist,
      });
      currentDist += stepSize;
    }

    remainingStep = currentDist - segLength;
    points.push({ ...end });
  }

  return points;
}

export function segmentIntersection(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): Point2D | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;

  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return null;

  const dx = p3.x - p1.x;
  const dy = p3.y - p1.y;

  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;

  if (t > 0 && t < 1 && u > 0 && u < 1) {
    return {
      x: p1.x + t * d1x,
      y: p1.y + t * d1y,
    };
  }

  return null;
}

export function findSelfIntersections(nodes: Point2D[]): Array<{
  intersection: Point2D;
  segment1: [number, number];
  segment2: [number, number];
}> {
  const intersections: Array<{
    intersection: Point2D;
    segment1: [number, number];
    segment2: [number, number];
  }> = [];

  for (let i = 0; i < nodes.length - 1; i++) {
    for (let j = i + 2; j < nodes.length - 1; j++) {
      if (i === 0 && j === nodes.length - 2) continue;

      const intersection = segmentIntersection(
        nodes[i],
        nodes[i + 1],
        nodes[j],
        nodes[j + 1]
      );

      if (intersection) {
        intersections.push({
          intersection,
          segment1: [i, i + 1],
          segment2: [j, j + 1],
        });
      }
    }
  }

  return intersections;
}

export function directionAngle(p1: Point2D, p2: Point2D): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

export function angleDifference(angle1: number, angle2: number): number {
  let diff = angle2 - angle1;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return Math.abs(diff) * (180 / Math.PI);
}

export function findDirectionReversals(
  nodes: Point2D[],
  thresholdDegrees: number
): Array<{ index: number; point: Point2D; angle: number }> {
  if (nodes.length < 3) return [];

  const reversals: Array<{ index: number; point: Point2D; angle: number }> = [];

  for (let i = 1; i < nodes.length - 1; i++) {
    const angle1 = directionAngle(nodes[i - 1], nodes[i]);
    const angle2 = directionAngle(nodes[i], nodes[i + 1]);
    const diff = angleDifference(angle1, angle2);

    if (diff > thresholdDegrees) {
      reversals.push({
        index: i,
        point: nodes[i],
        angle: diff,
      });
    }
  }

  return reversals;
}

export function tangentialComponent(
  vector: { x: number; y: number },
  direction: { x: number; y: number }
): number {
  const dirLength = Math.sqrt(direction.x ** 2 + direction.y ** 2);
  if (dirLength === 0) return 0;
  return (vector.x * direction.x + vector.y * direction.y) / dirLength;
}

export function sortPathNodes(nodes: PathNode[]): PathNode[] {
  return [...nodes].sort((a, b) => a.order - b.order);
}
