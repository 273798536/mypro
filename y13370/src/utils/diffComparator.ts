import type { CompareDiffItem, ChangeType, VersionCompareReport, ModelVersion, SampleRecord, ManualCorrection } from '@/types';

function compareRecord<T>(
  prev: Record<string, T> | undefined,
  curr: Record<string, T> | undefined
): CompareDiffItem<T>[] {
  const keys = new Set<string>();
  if (prev) Object.keys(prev).forEach(k => keys.add(k));
  if (curr) Object.keys(curr).forEach(k => keys.add(k));

  const items: CompareDiffItem<T>[] = [];
  keys.forEach(key => {
    const p = prev?.[key] ?? null;
    const c = curr?.[key] ?? null;
    let changeType: ChangeType;
    let deltaPercent: number | undefined;

    if (p === null && c !== null) changeType = 'added';
    else if (p !== null && c === null) changeType = 'removed';
    else if (p === c) changeType = 'unchanged';
    else changeType = 'modified';

    if (typeof p === 'number' && typeof c === 'number' && p !== 0) {
      deltaPercent = Number((((c as number) - (p as number)) / Math.abs(p as number) * 100).toFixed(2));
    }

    items.push({ key, previous: p, current: c, changeType, deltaPercent });
  });

  return items.sort((a, b) => {
    const order: Record<ChangeType, number> = { modified: 0, added: 1, removed: 2, unchanged: 3 };
    return order[a.changeType] - order[b.changeType];
  });
}

export function buildCompareReport(
  prevVersion: ModelVersion,
  currVersion: ModelVersion,
  prevSamples: SampleRecord[],
  currSamples: SampleRecord[],
  prevCorrections: ManualCorrection[],
  currCorrections: ManualCorrection[]
): VersionCompareReport {
  const samplesPrev: Record<string, number> = {};
  prevSamples.forEach(s => { samplesPrev[s.batchId] = s.count; });
  const samplesCurr: Record<string, number> = {};
  currSamples.forEach(s => { samplesCurr[s.batchId] = s.count; });

  const correctionsPrev: Record<string, string> = {};
  prevCorrections.forEach(c => { correctionsPrev[c.id] = `${c.originalJudgment}→${c.newJudgment}`; });
  const correctionsCurr: Record<string, string> = {};
  currCorrections.forEach(c => { correctionsCurr[c.id] = `${c.originalJudgment}→${c.newJudgment}`; });

  return {
    versionPair: { previous: prevVersion.versionCode, current: currVersion.versionCode },
    samples: compareRecord(samplesPrev, samplesCurr),
    thresholds: compareRecord(prevVersion.thresholdConfig, currVersion.thresholdConfig),
    corrections: compareRecord(correctionsPrev, correctionsCurr),
    metrics: compareRecord(prevVersion.metrics, currVersion.metrics)
  };
}
