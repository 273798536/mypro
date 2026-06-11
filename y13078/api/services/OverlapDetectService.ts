import type { Point, OverlapPair } from '../../shared/types';

const OVERLAP_THRESHOLD = 30;
const HIGH_SEVERITY_MAX = 15;
const MEDIUM_SEVERITY_MAX = 22;

export class OverlapDetectService {
  static detectPairs(points: Point[]): OverlapPair[] {
    const pairs: OverlapPair[] = [];
    const byCabinet = new Map<string, Point[]>();
    for (const p of points) {
      if (p.withdrawn) continue;
      const arr = byCabinet.get(p.cabinetId) ?? [];
      arr.push(p);
      byCabinet.set(p.cabinetId, arr);
    }

    for (const [, group] of byCabinet) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < OVERLAP_THRESHOLD) {
            let severity: 'high' | 'medium' | 'low' = 'low';
            if (distance < HIGH_SEVERITY_MAX) severity = 'high';
            else if (distance < MEDIUM_SEVERITY_MAX) severity = 'medium';
            pairs.push({
              pointIds: [a.id, b.id],
              distance: Math.round(distance * 100) / 100,
              threshold: OVERLAP_THRESHOLD,
              severity,
            });
          }
        }
      }
    }
    pairs.sort((a, b) => a.distance - b.distance);
    return pairs;
  }
}
