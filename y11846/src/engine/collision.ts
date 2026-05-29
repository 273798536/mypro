import type { Point, NoFlyZone } from '@/types/game';

export function pointInPolygon(point: Point, vertices: Point[]): boolean {
  let inside = false;
  const n = vertices.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

export function isInNoFlyZone(
  point: Point,
  noFlyZones: NoFlyZone[],
): string | null {
  for (const zone of noFlyZones) {
    if (pointInPolygon(point, zone.vertices)) {
      return zone.id;
    }
  }
  return null;
}

export function pathCrossesNoFlyZone(
  from: Point,
  to: Point,
  noFlyZones: NoFlyZone[],
  steps: number = 20,
): string | null {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point: Point = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
    const zoneId = isInNoFlyZone(point, noFlyZones);
    if (zoneId) {
      return zoneId;
    }
  }
  return null;
}
