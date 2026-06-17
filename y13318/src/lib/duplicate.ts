import type { Sample, DuplicateGroup } from '@/types';

export function buildDuplicateGroups(samples: Sample[]): DuplicateGroup[] {
  const map = new Map<string, Sample[]>();
  for (const s of samples) {
    if (!s.dupGroup) continue;
    const arr = map.get(s.dupGroup) ?? [];
    arr.push(s);
    map.set(s.dupGroup, arr);
  }
  return Array.from(map.entries()).map(([id, arr]) => ({
    id,
    count: arr.length,
    crossVersion: new Set(arr.map((s) => s.version)).size > 1,
    sampleIds: Array.from(new Set(arr.map((s) => s.id))),
  }));
}

export function recordsInGroup(samples: Sample[], dupGroup: string): Sample[] {
  return samples
    .filter((s) => s.dupGroup === dupGroup)
    .sort((a, b) => (a.version > b.version ? 1 : -1));
}
