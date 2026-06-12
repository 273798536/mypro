import type { ResultItem, TidalHarmonic } from '@/types';

export function linkResultToSources(results: ResultItem[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  results.forEach(r => {
    if (r.sourceRefs?.length) m.set(r.id, r.sourceRefs);
  });
  return m;
}

export function getTideSourceByConstituent(
  harmonics: TidalHarmonic[],
  name: string
): string | null {
  return harmonics.find(h => h.constituent === name)?.sourceMaterial || null;
}

export function renderSourceBackLinks(refs: string[]): string {
  return refs.map(r => `《${r}》`).join(' · ');
}
