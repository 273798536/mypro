import { Coordinate } from '../types';

export const CALCULATION_FORMULA = {
  euclidean: 'd = √[(x₂ - x₁)² + (y₂ - y₁)²]',
  manhattan: 'd = |x₂ - x₁| + |y₂ - y₁|',
  haversine: 'd = 2R × arcsin(√[sin²((lat₂-lat₁)/2) + cos(lat₁)cos(lat₂)sin²((lon₂-lon₁)/2)])'
};

export function euclideanDistance(a: Coordinate, b: Coordinate): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function manhattanDistance(a: Coordinate, b: Coordinate): number {
  return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
}

export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6371000;
  const lat1 = (a.y * Math.PI) / 180;
  const lat2 = (b.y * Math.PI) / 180;
  const dLat = ((b.y - a.y) * Math.PI) / 180;
  const dLon = ((b.x - a.x) * Math.PI) / 180;

  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

export type DistanceMetric = 'euclidean' | 'manhattan' | 'haversine' | 'network';

export function getDistanceCalculator(
  metric: DistanceMetric
): (a: Coordinate, b: Coordinate) => number {
  switch (metric) {
    case 'euclidean':
      return euclideanDistance;
    case 'manhattan':
      return manhattanDistance;
    case 'haversine':
      return haversineDistance;
    default:
      return euclideanDistance;
  }
}

export function findNearestPoint(
  target: Coordinate,
  candidates: Coordinate[]
): { index: number; distance: number } {
  let minDistance = Infinity;
  let nearestIndex = -1;

  for (let i = 0; i < candidates.length; i++) {
    const distance = euclideanDistance(target, candidates[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return { index: nearestIndex, distance: minDistance };
}
