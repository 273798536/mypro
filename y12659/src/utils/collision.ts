import type { SlopePoint, RiskLevel } from '@/types';
import { THRESHOLD_CONFIG } from '@/data/mockData';

export function pointToPlaneDistance(
  px: number, py: number, pz: number,
  planeX: number
): number {
  return Math.abs(px - planeX);
}

export function getRiskLevelByDistance(distance: number): RiskLevel {
  if (isNaN(distance)) return 'warning';
  if (distance < THRESHOLD_CONFIG.dangerDistance) return 'danger';
  if (distance < THRESHOLD_CONFIG.safeDistance) return 'warning';
  return 'safe';
}

export function computeMinDistance(
  points: SlopePoint[],
  planePosition: number
): { minDistance: number; closestPointId: string | null; nearbyCount: number } {
  let minDist = Infinity;
  let closestId: string | null = null;
  let nearbyCount = 0;

  for (const p of points) {
    const d = pointToPlaneDistance(p.x, p.y, p.z, planePosition);
    if (d < minDist) {
      minDist = d;
      closestId = p.id;
    }
    if (d < THRESHOLD_CONFIG.safeDistance) {
      nearbyCount++;
    }
  }

  return {
    minDistance: minDist === Infinity ? NaN : parseFloat(minDist.toFixed(4)),
    closestPointId: closestId,
    nearbyCount,
  };
}

export function checkOutOfBounds(
  distanceHistory: { distance: number }[]
): boolean {
  if (distanceHistory.length < THRESHOLD_CONFIG.consecutiveFrames) return false;
  const recent = distanceHistory.slice(-THRESHOLD_CONFIG.consecutiveFrames);
  return recent.every((h) => !isNaN(h.distance) && h.distance < THRESHOLD_CONFIG.dangerDistance);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

export function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'safe': return '安全';
    case 'warning': return '预警';
    case 'danger': return '越界/危险';
  }
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'safe': return '#2E7D32';
    case 'warning': return '#F59E0B';
    case 'danger': return '#D7263D';
  }
}
