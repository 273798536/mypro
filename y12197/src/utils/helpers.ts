let counter = 0;
export function generateId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function getDecade(year: number): string {
  const start = Math.floor(year / 10) * 10;
  return `${start}s`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
