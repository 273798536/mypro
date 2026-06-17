import type { Sample, SkewItem } from '@/types';
import { confusion, isMisjudged } from './confusion';

export function computeSkew(samples: Sample[], allSamples: Sample[] = samples): SkewItem[] {
  const distinctIds = new Set(samples.map((s) => s.id));
  const dedupTotal = distinctIds.size || 1;
  const countById = new Map<string, number>();
  for (const s of allSamples) {
    countById.set(s.id, (countById.get(s.id) ?? 0) + 1);
  }
  const latest = new Map<string, Sample>();
  for (const s of samples) {
    const prev = latest.get(s.id);
    if (!prev || s.version > prev.version || (s.version === prev.version && s.timestamp > prev.timestamp)) {
      latest.set(s.id, s);
    }
  }
  const items: SkewItem[] = Array.from(latest.values()).map((s) => {
    const mis = isMisjudged(s);
    return {
      sample: s,
      contribution: mis ? 1 / dedupTotal : 0,
      direction: mis ? '拉高误判' : '无影响',
      confusion: confusion(s),
      dupCount: countById.get(s.id) ?? 1,
    };
  });
  return items.sort((a, b) => {
    const aMis = a.direction === '拉高误判' ? 1 : 0;
    const bMis = b.direction === '拉高误判' ? 1 : 0;
    if (aMis !== bMis) return bMis - aMis;
    if (aMis === 1) {
      if (b.sample.confidence !== a.sample.confidence) {
        return b.sample.confidence - a.sample.confidence;
      }
      return b.dupCount - a.dupCount;
    }
    return 0;
  });
}
