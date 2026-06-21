export function formatDate(iso: string, withTime = true): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (!withTime) return `${y}-${m}-${day}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const target = new Date(iso).getTime();
  const diff = now - target;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return `${Math.max(1, Math.floor(diff / 1000))}秒前`;
  if (diff < hour) return `${Math.floor(diff / min)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;
  return formatDate(iso, false);
}

export function formatScore(n: number, digits = 3): string {
  return n.toFixed(digits);
}

export function formatPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatPctBar(value: number, max = 1): string {
  const pct = Math.max(0, Math.min(1, value / max));
  const chars = 20;
  const filled = Math.round(pct * chars);
  return "█".repeat(filled) + "░".repeat(chars - filled);
}

export function shortSampleId(id: string): string {
  const parts = id.split("-");
  if (parts.length >= 3) return parts.slice(-2).join("-");
  return id;
}
