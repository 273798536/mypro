import type { ImportSampleInput, PerAnnotatorStat } from '../../shared/types.js';

interface ConsistencyResult {
  agreementRate: number;
  kappa: number;
  perAnnotator: PerAnnotatorStat[];
  conclusionText: string;
}

function kappaForPair(aLabels: string[], bLabels: string[]): number {
  const n = aLabels.length;
  if (n === 0) return 1;
  let agree = 0;
  for (let i = 0; i < n; i++) {
    if (aLabels[i] === bLabels[i]) agree++;
  }
  const po = agree / n;
  const aDist: Record<string, number> = {};
  const bDist: Record<string, number> = {};
  for (const l of aLabels) aDist[l] = (aDist[l] || 0) + 1;
  for (const l of bLabels) bDist[l] = (bDist[l] || 0) + 1;
  let pe = 0;
  const allLabels = new Set([...Object.keys(aDist), ...Object.keys(bDist)]);
  for (const l of allLabels) {
    pe += (aDist[l] || 0) / n * ((bDist[l] || 0) / n);
  }
  if (pe === 1) return 1;
  return (po - pe) / (1 - pe);
}

function majorityLabel(labels: string[]): string {
  const count: Record<string, number> = {};
  let best = labels[0], bestN = 0;
  for (const l of labels) {
    count[l] = (count[l] || 0) + 1;
    if (count[l] > bestN) {
      bestN = count[l];
      best = l;
    }
  }
  return best;
}

export function computeConsistency(samples: ImportSampleInput[]): ConsistencyResult {
  if (!samples.length) {
    return { agreementRate: 0, kappa: 0, perAnnotator: [], conclusionText: '本批无样本。' };
  }

  let agreeN = 0;
  const annotatorSet = new Set<string>();
  for (const s of samples) {
    for (const a of s.annotations) annotatorSet.add(a.annotator);
    const labels = s.annotations.map((a) => a.label);
    if (labels.length > 0 && labels.every((l) => l === labels[0])) agreeN++;
  }
  const agreementRate = agreeN / samples.length;

  const annotators = Array.from(annotatorSet).sort();
  const perAnnotator: PerAnnotatorStat[] = annotators.map((an) => {
    let agree = 0, total = 0;
    const labels: Record<string, number> = {};
    for (const s of samples) {
      const ann = s.annotations.find((a) => a.annotator === an);
      if (!ann) continue;
      total++;
      labels[ann.label] = (labels[ann.label] || 0) + 1;
      const others = s.annotations.filter((a) => a.annotator !== an).map((a) => a.label);
      if (others.length === 0) { agree++; continue; }
      if (ann.label === majorityLabel(others)) agree++;
    }
    return {
      annotator: an,
      agreeRate: total > 0 ? agree / total : 0,
      count: total,
      labels,
    };
  });

  const pairs: number[] = [];
  for (let i = 0; i < annotators.length; i++) {
    for (let j = i + 1; j < annotators.length; j++) {
      const aL: string[] = [];
      const bL: string[] = [];
      for (const s of samples) {
        const ai = s.annotations.find((a) => a.annotator === annotators[i]);
        const bj = s.annotations.find((a) => a.annotator === annotators[j]);
        if (ai && bj) {
          aL.push(ai.label);
          bL.push(bj.label);
        }
      }
      if (aL.length >= 2) {
        pairs.push(kappaForPair(aL, bL));
      }
    }
  }
  const kappa = pairs.length ? pairs.reduce((s, v) => s + v, 0) / pairs.length : 1;

  const kappaPct = Math.round(kappa * 100) / 100;
  let level = '偏低';
  if (kappa >= 0.81) level = '几乎完全一致';
  else if (kappa >= 0.61) level = '高度一致';
  else if (kappa >= 0.41) level = '中等一致';
  else if (kappa >= 0.21) level = '一般一致';
  const agreePct = Math.round(agreementRate * 100);
  const conclusionText =
    `本批共 ${samples.length} 条样本，标注员在 ${agreePct}% 的样本上达成一致；` +
    `整体一致性系数 Kappa=${kappaPct.toFixed(2)}，属于「${level}」。`;

  return { agreementRate, kappa, perAnnotator, conclusionText };
}
