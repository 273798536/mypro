export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function now(): number {
  return Date.now();
}

export function normalizeString(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。！？、；：""''（）【】《》!?,.;:\'\"()\[\]<>]/g, '');
}

export function isEmpty(s: string | null | undefined): boolean {
  return s == null || String(s).trim().length === 0;
}

export function formatDate(ts: number | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
