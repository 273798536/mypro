import type { Sample, Metrics } from '@/types';

export function computeMetrics(samples: Sample[]): Metrics {
  const total = samples.length;
  let ok = 0;
  let ng = 0;
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;
  for (const s of samples) {
    if (s.groundTruth === 'OK') ok += 1;
    else ng += 1;
    if (s.groundTruth === 'NG' && s.prediction === 'NG') tp += 1;
    else if (s.groundTruth === 'OK' && s.prediction === 'OK') tn += 1;
    else if (s.groundTruth === 'OK' && s.prediction === 'NG') fp += 1;
    else fn += 1;
  }
  const accuracy = total ? (tp + tn) / total : 0;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const misjudgedCount = fp + fn;
  const misjudgedRate = total ? misjudgedCount / total : 0;
  const duplicateCount = samples.filter((s) => s.dupGroup).length;
  return {
    total,
    ok,
    ng,
    tp,
    tn,
    fp,
    fn,
    accuracy,
    precision,
    recall,
    misjudgedCount,
    misjudgedRate,
    duplicateCount,
  };
}

export function dedupLatest(samples: Sample[]): Sample[] {
  const map = new Map<string, Sample>();
  for (const s of samples) {
    const prev = map.get(s.id);
    if (!prev || s.version > prev.version || (s.version === prev.version && s.timestamp > prev.timestamp)) {
      map.set(s.id, s);
    }
  }
  return Array.from(map.values());
}
