import type { MonitoringPoint } from '@/types';

export function detectMergeErrors(points: MonitoringPoint[], threshold = 2): MonitoringPoint[] {
  const result = points.map((p) => ({ ...p, flags: [...p.flags] }));
  const sorted = [...result].sort((a, b) => a.x - b.x);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const dist = Math.abs(a.x - b.x);
    if (dist < threshold && Math.abs(a.depth - b.depth) < threshold) {
      if (!a.flags.includes('merge_error')) a.flags.push('merge_error');
      if (!b.flags.includes('merge_error')) b.flags.push('merge_error');
    }
  }
  return result;
}

export function flagSummary(point: MonitoringPoint): string {
  if (point.flags.length === 0) return '正常';
  return point.flags.join(' | ');
}
