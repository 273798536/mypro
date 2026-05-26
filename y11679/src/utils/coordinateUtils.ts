import { BoundingBox, Point, CoordinateOffsetResult, OverlapResult } from '../types';
import { COORDINATE_OFFSET_THRESHOLD, OVERLAP_THRESHOLD } from './constants';

export function calculateBounds(points: Point[]): {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
} {
  if (points.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    minZ = Math.min(minZ, p.z);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
    maxZ = Math.max(maxZ, p.z);
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

export function getBoxCenter(box: BoundingBox): { x: number; y: number; z: number } {
  return {
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2,
    z: (box.min.z + box.max.z) / 2,
  };
}

export function getBoxSize(box: BoundingBox): { x: number; y: number; z: number } {
  return {
    x: box.max.x - box.min.x,
    y: box.max.y - box.min.y,
    z: box.max.z - box.min.z,
  };
}

export function getBoxVolume(box: BoundingBox): number {
  const size = getBoxSize(box);
  return size.x * size.y * size.z;
}

export function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  );
}

export function calculateOverlapVolume(a: BoundingBox, b: BoundingBox): number {
  if (!boxesIntersect(a, b)) return 0;

  const overlapMin = {
    x: Math.max(a.min.x, b.min.x),
    y: Math.max(a.min.y, b.min.y),
    z: Math.max(a.min.z, b.min.z),
  };
  const overlapMax = {
    x: Math.min(a.max.x, b.max.x),
    y: Math.min(a.max.y, b.max.y),
    z: Math.min(a.max.z, b.max.z),
  };

  return (
    (overlapMax.x - overlapMin.x) *
    (overlapMax.y - overlapMin.y) *
    (overlapMax.z - overlapMin.z)
  );
}

export function calculateOverlapPercentage(a: BoundingBox, b: BoundingBox): number {
  const overlapVolume = calculateOverlapVolume(a, b);
  const minVolume = Math.min(getBoxVolume(a), getBoxVolume(b));
  if (minVolume === 0) return 0;
  return overlapVolume / minVolume;
}

export function checkOverlap(a: BoundingBox, b: BoundingBox): OverlapResult {
  const percentage = calculateOverlapPercentage(a, b);
  return {
    hasOverlap: percentage > OVERLAP_THRESHOLD,
    overlapPercentage: percentage,
    annotationIds: ['', ''],
  };
}

export function calculateDistance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function detectCoordinateOffset(
  bounds1: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } },
  bounds2: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }
): CoordinateOffsetResult {
  const center1 = getBoxCenter({ min: bounds1.min, max: bounds1.max });
  const center2 = getBoxCenter({ min: bounds2.min, max: bounds2.max });
  const distance = calculateDistance(center1, center2);

  return {
    hasOffset: distance > COORDINATE_OFFSET_THRESHOLD,
    offsetDistance: distance,
    threshold: COORDINATE_OFFSET_THRESHOLD,
    pointcloudIds: ['', ''],
  };
}

export function normalizePoints(
  points: Point[],
  offset: { x: number; y: number; z: number }
): Point[] {
  return points.map((p) => ({
    ...p,
    x: p.x - offset.x,
    y: p.y - offset.y,
    z: p.z - offset.z,
  }));
}

export function scalePointsToRange(
  points: Point[],
  targetRange: number = 100
): Point[] {
  if (points.length === 0) return points;

  const bounds = calculateBounds(points);
  const size = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };
  const maxSize = Math.max(size.x, size.y, size.z);
  if (maxSize === 0) return points;

  const scale = targetRange / maxSize;
  return points.map((p) => ({
    ...p,
    x: p.x * scale,
    y: p.y * scale,
    z: p.z * scale,
  }));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}
