import { format } from 'date-fns';

export function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), 'yyyy-MM-dd HH:mm');
  } catch {
    return iso;
  }
}

export function formatCoordinate(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return v.toFixed(2);
}

export function formatCoordinatesTriple(c: { x: number | null; y: number | null; z: number | null }): string {
  return `(${formatCoordinate(c.x)}, ${formatCoordinate(c.y)}, ${formatCoordinate(c.z)})`;
}

export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
