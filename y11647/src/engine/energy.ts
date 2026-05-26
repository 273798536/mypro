import type { Point, Path } from './types';
import { pathLength, distance } from '../utils/geometry';
import { ENERGY_PER_UNIT, ROBOT_SPEED } from './types';

export function calculateEnergyConsumption(
  path: Path,
  startEnergy: number
): {
  totalConsumption: number;
  remainingEnergy: number;
  willRunOut: boolean;
  runOutPosition?: Point;
  runOutDistance?: number;
} {
  const totalLen = pathLength(pointsWithStart(path));
  const totalConsumption = totalLen * ENERGY_PER_UNIT;
  const remainingEnergy = Math.max(0, startEnergy - totalConsumption);
  const willRunOut = startEnergy < totalConsumption;

  let runOutPosition: Point | undefined;
  let runOutDistance: number | undefined;

  if (willRunOut) {
    const maxDistance = startEnergy / ENERGY_PER_UNIT;
    runOutDistance = maxDistance;
    runOutPosition = getPositionAtDistance(pointsWithStart(path), maxDistance);
  }

  return {
    totalConsumption,
    remainingEnergy,
    willRunOut,
    runOutPosition,
    runOutDistance,
  };
}

export function calculateEnergyAtProgress(
  path: Path,
  startEnergy: number,
  progress: number
): number {
  const totalLen = pathLength(pointsWithStart(path));
  const traveled = totalLen * progress;
  const consumed = traveled * ENERGY_PER_UNIT;
  return Math.max(0, startEnergy - consumed);
}

export function calculateEnergyAtDistance(
  startEnergy: number,
  distance: number
): number {
  const consumed = distance * ENERGY_PER_UNIT;
  return Math.max(0, startEnergy - consumed);
}

export function getMaxDistanceWithEnergy(energy: number): number {
  return energy / ENERGY_PER_UNIT;
}

function pointsWithStart(path: Path): Point[] {
  return path.points;
}

function getPositionAtDistance(points: Point[], targetDistance: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  let accumulated = 0;
  for (let i = 1; i < points.length; i++) {
    const segLen = distance(points[i - 1], points[i]);
    if (accumulated + segLen >= targetDistance) {
      const t = (targetDistance - accumulated) / segLen;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
      };
    }
    accumulated += segLen;
  }
  return points[points.length - 1];
}

export function getTimeForPath(path: Path): number {
  const totalLen = pathLength(pointsWithStart(path));
  return totalLen / ROBOT_SPEED;
}
