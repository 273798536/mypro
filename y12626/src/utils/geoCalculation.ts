import { Boundary, CollisionType, MapBounds } from '../types';

export function haversineDistance(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function pointInPolygon(lng: number, lat: number, polygon: [number, number][]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

export function distanceToPolygon(lng: number, lat: number, polygon: [number, number][]): { distance: number; closestPoint: [number, number] } {
  let minDistance = Infinity;
  let closestPoint: [number, number] = [0, 0];

  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];

    const { distance, point } = distanceToSegment(lng, lat, x1, y1, x2, y2);

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  }

  return { distance: minDistance, closestPoint };
}

export function distanceToSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): { distance: number; point: [number, number] } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  let t = 0;
  if (lenSq !== 0) {
    t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  }

  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;

  const distance = haversineDistance(px, py, nearestX, nearestY);

  return {
    distance,
    point: [nearestX, nearestY]
  };
}

export interface BoundaryCheckResult {
  isInside: boolean;
  distance: number;
  collisionType: CollisionType;
  closestPoint: [number, number];
}

export function checkBoundaryCollision(
  lng: number,
  lat: number,
  boundary: Boundary,
  threshold: number = 50
): BoundaryCheckResult {
  const isInside = pointInPolygon(lng, lat, boundary.coordinates);
  const { distance, closestPoint } = distanceToPolygon(lng, lat, boundary.coordinates);

  let collisionType: CollisionType = 'outside';

  if (isInside) {
    collisionType = 'inside';
  } else if (distance < threshold) {
    collisionType = 'crossing';
  }

  const signedDistance = isInside ? -distance : distance;

  return {
    isInside,
    distance: signedDistance,
    collisionType,
    closestPoint
  };
}

export function checkAllBoundaries(
  lng: number,
  lat: number,
  boundaries: Boundary[],
  threshold: number = 50
): { boundary: Boundary; result: BoundaryCheckResult }[] {
  return boundaries
    .map(boundary => ({
      boundary,
      result: checkBoundaryCollision(lng, lat, boundary, threshold)
    }))
    .filter(item => item.result.collisionType !== 'outside')
    .sort((a, b) => Math.abs(a.result.distance) - Math.abs(b.result.distance));
}

export function getBounds(coordinates: [number, number][]): MapBounds {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  const paddingLng = (maxLng - minLng) * 0.1;
  const paddingLat = (maxLat - minLat) * 0.1;

  return {
    minLng: minLng - paddingLng,
    maxLng: maxLng + paddingLng,
    minLat: minLat - paddingLat,
    maxLat: maxLat + paddingLat
  };
}

export function mergeBounds(boundsList: MapBounds[]): MapBounds {
  return boundsList.reduce((merged, bounds) => ({
    minLng: Math.min(merged.minLng, bounds.minLng),
    maxLng: Math.max(merged.maxLng, bounds.maxLng),
    minLat: Math.min(merged.minLat, bounds.minLat),
    maxLat: Math.max(merged.maxLat, bounds.maxLat)
  }), {
    minLng: Infinity,
    maxLng: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity
  });
}

export function lngLatToScreen(
  lng: number,
  lat: number,
  bounds: MapBounds,
  width: number,
  height: number
): { x: number; y: number } {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
  const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * height;
  return { x, y };
}

export function screenToLngLat(
  x: number,
  y: number,
  bounds: MapBounds,
  width: number,
  height: number
): { lng: number; lat: number } {
  const lng = (x / width) * (bounds.maxLng - bounds.minLng) + bounds.minLng;
  const lat = bounds.maxLat - (y / height) * (bounds.maxLat - bounds.minLat);
  return { lng, lat };
}

export function generateContourElevations(minElevation: number, maxElevation: number, interval: number): number[] {
  const elevations: number[] = [];
  for (let e = Math.ceil(minElevation / interval) * interval; e <= maxElevation; e += interval) {
    elevations.push(e);
  }
  return elevations;
}

export function simplifyPolygon(polygon: [number, number][], tolerance: number = 0.0001): [number, number][] {
  if (polygon.length < 3) return polygon;

  const result: [number, number][] = [polygon[0]];

  for (let i = 1; i < polygon.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = polygon[i];
    const next = polygon[i + 1];

    const dist = perpendicularDistance(curr, prev, next);

    if (dist > tolerance) {
      result.push(curr);
    }
  }

  result.push(polygon[polygon.length - 1]);

  return result;
}

function perpendicularDistance(point: [number, number], lineStart: [number, number], lineEnd: [number, number]): number {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

export function calculatePathLength(points: [number, number][]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const [lng1, lat1] = points[i - 1];
    const [lng2, lat2] = points[i];
    length += haversineDistance(lng1, lat1, lng2, lat2);
  }
  return length;
}

export function calculateElevationGain(elevations: number[]): number {
  let gain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) {
      gain += diff;
    }
  }
  return gain;
}
