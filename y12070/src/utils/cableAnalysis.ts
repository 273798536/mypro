import type { CableRoute, CableCrossing } from '../data/types';

function segmentsIntersect(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  p4: [number, number]
): { point: [number, number]; t: number; u: number } | null {
  const d1x = p2[0] - p1[0];
  const d1y = p2[1] - p1[1];
  const d2x = p4[0] - p3[0];
  const d2y = p4[1] - p3[1];

  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((p3[0] - p1[0]) * d2y - (p3[1] - p1[1]) * d2x) / denom;
  const u = ((p3[0] - p1[0]) * d1y - (p3[1] - p1[1]) * d1x) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      point: [p1[0] + t * d1x, p1[1] + t * d1y],
      t,
      u,
    };
  }
  return null;
}

export function detectCableCrossings(cables: CableRoute[]): CableCrossing[] {
  const crossings: CableCrossing[] = [];

  for (let i = 0; i < cables.length; i++) {
    for (let j = i + 1; j < cables.length; j++) {
      const c1 = cables[i];
      const c2 = cables[j];

      for (let si = 0; si < c1.waypoints.length - 1; si++) {
        for (let sj = 0; sj < c2.waypoints.length - 1; sj++) {
          const result = segmentsIntersect(
            c1.waypoints[si],
            c1.waypoints[si + 1],
            c2.waypoints[sj],
            c2.waypoints[sj + 1]
          );
          if (result) {
            crossings.push({
              point: [Math.round(result.point[0]), Math.round(result.point[1])],
              cable1Id: c1.id,
              cable2Id: c2.id,
              segment1Index: si,
              segment2Index: sj,
            });
          }
        }
      }
    }
  }
  return crossings;
}
