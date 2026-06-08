import type { Vector3, Obstacle, CollisionResult } from '../types';

function vecSub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vecAdd(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vecScale(a: Vector3, s: number): Vector3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function vecDot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vecLength(a: Vector3): number {
  return Math.sqrt(vecDot(a, a));
}

export function distancePointToSegment(
  p: Vector3,
  segStart: Vector3,
  segEnd: Vector3,
): { distance: number; closest: Vector3 } {
  const v = vecSub(segEnd, segStart);
  const w = vecSub(p, segStart);
  const c1 = vecDot(w, v);
  if (c1 <= 0) {
    return { distance: vecLength(w), closest: segStart };
  }
  const c2 = vecDot(v, v);
  if (c2 <= c1) {
    return { distance: vecLength(vecSub(p, segEnd)), closest: segEnd };
  }
  const t = c1 / c2;
  const closest = vecAdd(segStart, vecScale(v, t));
  return { distance: vecLength(vecSub(p, closest)), closest };
}

function obstacleBoundingRadius(o: Obstacle): number {
  return Math.max(o.size.x, o.size.y, o.size.z) / 2;
}

export function checkCollisions(
  pipeStart: Vector3,
  pipeEnd: Vector3,
  obstacles: Obstacle[],
  safeDistance: number,
): CollisionResult[] {
  const results: CollisionResult[] = [];

  for (const obstacle of obstacles) {
    const obsPos = obstacle.position;
    const radius = obstacleBoundingRadius(obstacle);
    const { distance, closest } = distancePointToSegment(obsPos, pipeStart, pipeEnd);
    const clearDistance = distance - radius;
    const isViolation = clearDistance < safeDistance;

    results.push({
      obstacleId: obstacle.id,
      obstacleName: obstacle.name,
      distance: clearDistance,
      safeDistance,
      isViolation,
      closestPoint: closest,
    });
  }

  return results;
}
