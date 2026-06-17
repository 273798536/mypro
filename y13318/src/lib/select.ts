import type { Sample, FilterKey, ConfusionType } from '@/types';
import { isMisjudged } from './confusion';
import { computeSkew } from './impact';

export interface FilterInput {
  version: string;
  filter: FilterKey;
  material: string;
  search: string;
}

export const SKEW_TOP = 8;

export function selectSamples(all: Sample[], inp: FilterInput): Sample[] {
  let base = all;
  if (inp.version !== 'all') base = base.filter((s) => s.version === inp.version);
  if (inp.material !== 'all') base = base.filter((s) => s.materialType === inp.material);
  const q = inp.search.trim().toLowerCase();
  if (q) {
    base = base.filter(
      (s) => s.id.toLowerCase().includes(q) || s.materialType.toLowerCase().includes(q),
    );
  }
  switch (inp.filter) {
    case 'duplicate':
      return base.filter((s) => s.dupGroup);
    case 'misjudged':
      return base.filter((s) => isMisjudged(s));
    case 'skewed': {
      const ids = new Set(
        computeSkew(base)
          .filter((i) => i.direction === '拉高误判')
          .slice(0, SKEW_TOP)
          .map((i) => i.sample.id),
      );
      return base.filter((s) => ids.has(s.id));
    }
    default:
      return base;
  }
}

export function topSkew(scope: Sample[], allSamples: Sample[] = scope): SkewLite[] {
  return computeSkew(scope, allSamples)
    .filter((i) => i.direction === '拉高误判')
    .slice(0, SKEW_TOP)
    .map((i) => ({
      id: i.sample.id,
      materialType: i.sample.materialType,
      confidence: i.sample.confidence,
      contribution: i.contribution,
      dupCount: i.dupCount,
      confusion: i.confusion,
      version: i.sample.version,
    }));
}

export interface SkewLite {
  id: string;
  materialType: string;
  confidence: number;
  contribution: number;
  dupCount: number;
  confusion: ConfusionType;
  version: string;
}
