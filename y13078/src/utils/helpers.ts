import type { Point } from '../../shared/types';

export const typeLabel: Record<Point['type'], string> = {
  sensor: '传感器',
  outlet: '电源插座',
  switch: '交换机',
  cable: '走线/光缆',
};

export const statusLabel: Record<Point['status'], { text: string; color: string; dot: string }> = {
  normal: { text: '正常', color: 'text-cold-success', dot: 'bg-cold-success' },
  warning: { text: '预警', color: 'text-cold-warning', dot: 'bg-cold-warning' },
  error: { text: '故障', color: 'text-cold-danger', dot: 'bg-cold-danger' },
};

export const severityLabel: Record<'high' | 'medium' | 'low', { text: string; className: string }> = {
  high: { text: '高风险', className: 'bg-cold-danger/20 text-cold-danger border-cold-danger/50' },
  medium: { text: '中风险', className: 'bg-cold-warning/20 text-cold-warning border-cold-warning/50' },
  low: { text: '低风险', className: 'bg-cold-accent/20 text-cold-accent border-cold-accent/50' },
};

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function regionOfCabinet(cabinetId: string): 'A' | 'B' | 'C' {
  const m = cabinetId.match(/-([ABC])-/);
  return (m ? m[1] : 'A') as 'A' | 'B' | 'C';
}

export function regionLabel(r: string): string {
  return `冷通道${r}区`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, wait = 500) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>) {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

export function getPointColor(p: Point): string {
  if (p.withdrawn) return '#64748B';
  if (p.status === 'error') return '#EF4444';
  if (p.status === 'warning') return '#F59E0B';
  if (p.type === 'sensor') return '#10B981';
  if (p.type === 'outlet') return '#06B6D4';
  if (p.type === 'switch') return '#3B82F6';
  return '#A855F7';
}

export function isPointInOverlap(pointId: string, overlaps: { pointIds: [string, string] }[]): boolean {
  return overlaps.some(o => o.pointIds.includes(pointId));
}

export function pointMatchesFilters(
  p: Point,
  filters: { regions: string[]; types: Point['type'][]; statuses: Point['status'][]; showWithdrawn: boolean },
): boolean {
  if (p.withdrawn && !filters.showWithdrawn) return false;
  const region = regionOfCabinet(p.cabinetId);
  if (filters.regions.length && !filters.regions.includes(region)) return false;
  if (filters.types.length && !filters.types.includes(p.type)) return false;
  if (filters.statuses.length && !p.withdrawn && !filters.statuses.includes(p.status)) return false;
  return true;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
