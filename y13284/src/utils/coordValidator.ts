import type { StandardComplaint, CoordIssue, Park } from '@/shared/types';

export const COORD_OFFSET_THRESHOLD = 150;

const EARTH_RADIUS_METERS = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return haversineDistance(px, py, ax, ay);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return haversineDistance(px, py, projX, projY);
}

function pointToPolygonDistance(
  lng: number,
  lat: number,
  polygon: { lng: number; lat: number }[]
): { distance: number; inside: boolean } {
  if (polygon.length < 3) {
    return { distance: Infinity, inside: false };
  }

  let minDist = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const dist = pointToSegmentDistance(lng, lat, a.lng, a.lat, b.lng, b.lat);
    if (dist < minDist) {
      minDist = dist;
    }
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat;
    const xj = polygon[j].lng,
      yj = polygon[j].lat;

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }

  return { distance: minDist, inside };
}

function findNearestParkAndDistance(
  lng: number,
  lat: number,
  parks: Park[]
): { park: Park; distance: number; inside: boolean } | null {
  let best: { park: Park; distance: number; inside: boolean } | null = null;

  for (const park of parks) {
    const { distance, inside } = pointToPolygonDistance(lng, lat, park.boundary);
    if (!best || distance < best.distance) {
      best = { park, distance, inside };
    }
  }

  return best;
}

function findNearestGate(
  lng: number,
  lat: number,
  park: Park
): { gate: { name: string; lng: number; lat: number }; distance: number } | null {
  let best: { gate: { name: string; lng: number; lat: number }; distance: number } | null = null;
  for (const gate of park.gates) {
    const d = haversineDistance(lng, lat, gate.lng, gate.lat);
    if (!best || d < best.distance) {
      best = { gate, distance: d };
    }
  }
  return best;
}

function determineDirection(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number
): string {
  const dLng = toLng - fromLng;
  const dLat = toLat - fromLat;

  const parts: string[] = [];
  if (dLat > 0.0001) parts.push('北');
  else if (dLat < -0.0001) parts.push('南');
  if (dLng > 0.0001) parts.push('东');
  else if (dLng < -0.0001) parts.push('西');

  return parts.length > 0 ? parts.join('') : '附近';
}

export function validateCoord(
  complaint: StandardComplaint,
  parks: Park[]
): CoordIssue | null {
  const nearest = findNearestParkAndDistance(complaint.lng, complaint.lat, parks);

  if (!nearest) return null;

  const { park, distance, inside } = nearest;

  if (inside) {
    if (distance > COORD_OFFSET_THRESHOLD * 0.5) {
      const nearestGate = findNearestGate(complaint.lng, complaint.lat, park);
      if (nearestGate && nearestGate.distance > COORD_OFFSET_THRESHOLD) {
        const centerLng =
          park.boundary.reduce((s, p) => s + p.lng, 0) / park.boundary.length;
        const centerLat =
          park.boundary.reduce((s, p) => s + p.lat, 0) / park.boundary.length;
        const dir = determineDirection(centerLng, centerLat, complaint.lng, complaint.lat);

        return {
          offsetMeters: Math.round(distance),
          suspectedIntersection: nearestGate.gate.name,
          affectedParkIds: [park.id],
          reason: `坐标偏至${park.name}${dir}约${Math.round(distance)}m，疑似定位漂移`
        };
      }
    }
    return null;
  }

  if (distance <= COORD_OFFSET_THRESHOLD) {
    return null;
  }

  const nearestGate = findNearestGate(complaint.lng, complaint.lat, park);
  const centerLng =
    park.boundary.reduce((s, p) => s + p.lng, 0) / park.boundary.length;
  const centerLat =
    park.boundary.reduce((s, p) => s + p.lat, 0) / park.boundary.length;
  const dir = determineDirection(centerLng, centerLat, complaint.lng, complaint.lat);

  const affectedParkIds = [park.id];
  for (const otherPark of parks) {
    if (otherPark.id === park.id) continue;
    const otherRes = pointToPolygonDistance(complaint.lng, complaint.lat, otherPark.boundary);
    if (otherRes.distance < distance * 1.5) {
      affectedParkIds.push(otherPark.id);
    }
  }

  const suspectedIntersection = nearestGate
    ? nearestGate.gate.name
    : complaint.intersection || `${park.name}附近`;

  return {
    offsetMeters: Math.round(distance),
    suspectedIntersection,
    affectedParkIds,
    reason: `坐标偏至${park.name}${dir}约${Math.round(distance)}m，疑似定位漂移`
  };
}
