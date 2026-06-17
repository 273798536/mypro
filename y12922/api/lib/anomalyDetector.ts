import type {
  ImportSampleInput,
  PerAnnotatorStat,
  AnomalyTrace,
  SplitItem,
  SplitTag,
  AnomalyType,
} from '../../shared/types.js';

interface DetectedAnomaly {
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  sampleKey: string;
  trace: AnomalyTrace;
}

interface SplitList {
  trainCount: number;
  evalCount: number;
  items: SplitItem[];
}

function majorityLabel(sample: ImportSampleInput): string {
  const counts: Record<string, number> = {};
  let best = sample.annotations[0]?.label ?? '';
  let bestN = 0;
  for (const a of sample.annotations) {
    counts[a.label] = (counts[a.label] || 0) + 1;
    if (counts[a.label] > bestN) {
      bestN = counts[a.label];
      best = a.label;
    }
  }
  return best;
}

function buildSplitList(samples: ImportSampleInput[]): SplitList {
  const items: SplitItem[] = samples.map((s) => ({
    sampleKey: s.sampleKey,
    splitTag: s.splitTag,
    label: s.annotations.length ? majorityLabel(s) : undefined,
  }));
  const trainCount = samples.filter((s) => s.splitTag === 'train').length;
  const evalCount = samples.filter((s) => s.splitTag === 'eval').length;
  return { trainCount, evalCount, items };
}

function labelCountBySplit(
  samples: ImportSampleInput[],
  splitTag: SplitTag,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of samples) {
    if (s.splitTag !== splitTag) continue;
    for (const a of s.annotations) {
      counts[a.label] = (counts[a.label] || 0) + 1;
    }
  }
  return counts;
}

export function detectAnomalies(
  samples: ImportSampleInput[],
  consistency: { agreementRate: number; perAnnotator: PerAnnotatorStat[] },
): DetectedAnomaly[] {
  const splitList = buildSplitList(samples);
  const anomalies: DetectedAnomaly[] = [];

  const sampleByKey = new Map<string, ImportSampleInput>();
  for (const s of samples) sampleByKey.set(s.sampleKey, s);

  function makeTrace(sample: ImportSampleInput, basis: string): AnomalyTrace {
    return {
      sample: { sampleKey: sample.sampleKey, content: sample.content, splitTag: sample.splitTag },
      splitList,
      annotations: sample.annotations.map((a) => ({ annotator: a.annotator, label: a.label })),
      conclusionBasis: basis,
    };
  }

  for (const s of samples) {
    if (s.annotations.length < 2) continue;
    const labels = s.annotations.map((a) => a.label);
    if (labels.every((l) => l === labels[0])) continue;
    const unique = new Set(labels);
    const severity = s.annotations.length >= 3 && unique.size >= s.annotations.length
      ? 'high'
      : 'medium';
    const maj = majorityLabel(s);
    const annotList = s.annotations.map((a) => `${a.annotator}=${a.label}`).join('、');
    const description =
      `标注员对该样本给出不同结论：${annotList}；` +
      `多数倾向「${maj}」，请确认以谁为准。`;
    const basis = `样本级一致率偏离整体 ${(consistency.agreementRate * 100).toFixed(0)}% 均值，` +
      `该样本被 ${labels.length - 1} 位标注员中的 ${unique.size} 种不同标签覆盖。`;
    anomalies.push({
      type: 'DISAGREEMENT',
      severity,
      title: `样本 ${s.sampleKey} 标注不一致`,
      description,
      sampleKey: s.sampleKey,
      trace: makeTrace(s, basis),
    });
  }

  for (const pa of consistency.perAnnotator) {
    if (pa.count < 3) continue;
    if (pa.agreeRate >= 0.7) continue;
    const firstBad = samples.find((s) => {
      const ann = s.annotations.find((a) => a.annotator === pa.annotator);
      if (!ann) return false;
      const others = s.annotations.filter((a) => a.annotator !== pa.annotator);
      if (others.length === 0) return false;
      return ann.label !== majorityLabel({ ...s, annotations: others } as ImportSampleInput);
    });
    const sample = firstBad || samples.find((s) =>
      s.annotations.some((a) => a.annotator === pa.annotator),
    );
    if (!sample) continue;
    const pct = Math.round(pa.agreeRate * 100);
    const severity = pa.agreeRate < 0.5 ? 'high' : 'medium';
    const description =
      `标注员 ${pa.annotator} 在 ${pa.count} 条样本中仅 ${pct}% 与多数意见一致，` +
      `明显偏离其他标注员，建议核查其标注口径。`;
    const basis =
      `整体一致性：${(consistency.agreementRate * 100).toFixed(0)}%；` +
      `标注员 ${pa.annotator} 仅 ${pct}%，相差 ${Math.round(
        (consistency.agreementRate - pa.agreeRate) * 100,
      )} 个百分点，属于显著离群。`;
    anomalies.push({
      type: 'OUTLIER',
      severity,
      title: `标注员 ${pa.annotator} 偏离多数`,
      description,
      sampleKey: sample.sampleKey,
      trace: makeTrace(sample, basis),
    });
  }

  const trainCounts = labelCountBySplit(samples, 'train');
  const evalCounts = labelCountBySplit(samples, 'eval');
  const trainTotal = Object.values(trainCounts).reduce((s, v) => s + v, 0);
  const evalTotal = Object.values(evalCounts).reduce((s, v) => s + v, 0);
  if (trainTotal > 0 && evalTotal > 0) {
    const allLabels = new Set([...Object.keys(trainCounts), ...Object.keys(evalCounts)]);
    for (const label of allLabels) {
      const trainPct = (trainCounts[label] || 0) / trainTotal;
      const evalPct = (evalCounts[label] || 0) / evalTotal;
      const diff = Math.abs(evalPct - trainPct);
      const evalDom = evalPct > 0.75;
      if (diff > 0.25 || evalDom) {
        const evalSample = samples.find(
          (s) => s.splitTag === 'eval' &&
            s.annotations.some((a) => a.label === label),
        );
        if (!evalSample) continue;
        const severity = diff > 0.4 ? 'high' : 'medium';
        const evalPP = Math.round(evalPct * 100);
        const trainPP = Math.round(trainPct * 100);
        const description =
          `评测集（eval）中「${label}」类样本占 ${evalPP}%，而训练集（train）仅占 ${trainPP}%，` +
          `相差 ${Math.abs(evalPP - trainPP)} 个百分点；` +
          `这会让模型在评测时更容易"答对"该类问题，评测分数偏乐观，无法反映真实水平。`;
        const basis =
          `训练集标签分布：${Object.entries(trainCounts)
            .map(([l, n]) => `${l} ${Math.round((n / trainTotal) * 100)}%`)
            .join('、')}；` +
          `评测集标签分布：${Object.entries(evalCounts)
            .map(([l, n]) => `${l} ${Math.round((n / evalTotal) * 100)}%`)
            .join('、')}；` +
          `「${label}」类在评测集中被过度代表，结论可能偏高。`;
        anomalies.push({
          type: 'DATASET_BIAS',
          severity,
          title: `评测集偏科：「${label}」类样本占比过高`,
          description,
          sampleKey: evalSample.sampleKey,
          trace: makeTrace(evalSample, basis),
        });
      }
    }
  }

  return anomalies;
}
