import { useMemo } from 'react';
import { useReviewStore } from '@/store/useReviewStore';
import { selectSamples, topSkew } from '@/lib/select';
import { computeMetrics, dedupLatest } from '@/lib/metrics';
import { buildDuplicateGroups } from '@/lib/duplicate';
import type { Sample, Metrics, SkewItem, DuplicateGroup } from '@/types';

export interface ReviewData {
  visible: Sample[];
  metrics: Metrics;
  dedupMetrics: Metrics;
  skew: SkewItem[];
  topSkewList: ReturnType<typeof topSkew>;
  dupGroups: DuplicateGroup[];
}

export function useReviewData(): ReviewData {
  const samples = useReviewStore((s) => s.samples);
  const version = useReviewStore((s) => s.version);
  const filter = useReviewStore((s) => s.filter);
  const material = useReviewStore((s) => s.material);
  const search = useReviewStore((s) => s.search);

  return useMemo(() => {
    const visible = selectSamples(samples, { version, filter, material, search });
    const metrics = computeMetrics(visible);
    const dedupMetrics = computeMetrics(dedupLatest(visible));
    const skew = computeSkew(visible, samples);
    const topSkewList = topSkew(visible, samples);
    const dupGroups = buildDuplicateGroups(visible);
    return { visible, metrics, dedupMetrics, skew, topSkewList, dupGroups };
  }, [samples, version, filter, material, search]);
}
