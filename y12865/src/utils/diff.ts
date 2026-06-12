import type { WaterQuality } from '@/types';

export function diffWaterQuality(before: WaterQuality, after: WaterQuality): Partial<WaterQuality> {
  const diff: Partial<WaterQuality> = {};
  const keys = Object.keys(before) as (keyof WaterQuality)[];
  for (const key of keys) {
    if (before[key] !== after[key]) {
      diff[key] = after[key];
    }
  }
  return diff;
}

export function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
