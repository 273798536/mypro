import type {
  ConfidenceInterval,
  EvaluationSample,
  GroupedCI,
  HistogramBin,
} from '@/types';

function getEffectiveScore(sample: EvaluationSample): number {
  if (sample.afterScore !== undefined) return sample.afterScore;
  if (sample.humanCorrectedScore !== undefined) return sample.humanCorrectedScore;
  return sample.modelScore;
}

function getBeforeScore(sample: EvaluationSample): number {
  if (sample.beforeScore !== undefined) return sample.beforeScore;
  return sample.modelScore;
}

function isSampleCorrected(sample: EvaluationSample): boolean {
  if (sample.isCorrected !== undefined) return sample.isCorrected;
  return sample.humanCorrectedScore !== undefined;
}

export function calculateConfidenceInterval(scores: number[]): ConfidenceInterval {
  const n = scores.length;

  if (n === 0) {
    return { mean: 0, lower: 0, upper: 0, std: 0, n: 0 };
  }

  const mean = scores.reduce((sum, s) => sum + s, 0) / n;

  const variance =
    n === 1
      ? 0
      : scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / (n - 1);
  const std = Math.sqrt(variance);

  const marginOfError = n === 1 ? 0 : (1.96 * std) / Math.sqrt(n);

  return {
    mean,
    lower: mean - marginOfError,
    upper: mean + marginOfError,
    std,
    n,
  };
}

export function buildHistogram(scores: number[], binCount: number = 10): HistogramBin[] {
  const min = 0;
  const max = 100;
  const binWidth = (max - min) / binCount;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    bin: i,
    range: [min + i * binWidth, min + (i + 1) * binWidth],
    count: 0,
  }));

  for (const score of scores) {
    const clampedScore = Math.max(min, Math.min(max, score));
    let binIndex = Math.floor((clampedScore - min) / binWidth);
    if (binIndex >= binCount) binIndex = binCount - 1;
    if (binIndex < 0) binIndex = 0;
    bins[binIndex].count++;
  }

  return bins;
}

export function calculateGroupedCI(
  samples: EvaluationSample[],
  dimension: keyof EvaluationSample
): GroupedCI[] {
  const groups = new Map<string, number[]>();

  for (const sample of samples) {
    const key = String(sample[dimension] ?? '未分组');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(getEffectiveScore(sample));
  }

  const result: GroupedCI[] = [];

  for (const [group, scores] of groups.entries()) {
    result.push({
      group,
      ci: calculateConfidenceInterval(scores),
      histogram: buildHistogram(scores, 10),
    });
  }

  return result.sort((a, b) => a.group.localeCompare(b.group));
}

export function compareBeforeAfterCorrection(samples: EvaluationSample[]): {
  before: ConfidenceInterval;
  after: ConfidenceInterval;
  changedCount: number;
} {
  const beforeScores = samples.map((s) => getBeforeScore(s));
  const afterScores = samples.map((s) => getEffectiveScore(s));
  const changedCount = samples.filter((s) => isSampleCorrected(s)).length;

  return {
    before: calculateConfidenceInterval(beforeScores),
    after: calculateConfidenceInterval(afterScores),
    changedCount,
  };
}

export function checkSignificantDifference(
  ciA: ConfidenceInterval,
  ciB: ConfidenceInterval
): 'significant' | 'not_significant' | 'insufficient_data' {
  if (ciA.n < 2 || ciB.n < 2) {
    return 'insufficient_data';
  }

  const overlap = ciA.upper >= ciB.lower && ciB.upper >= ciA.lower;

  return overlap ? 'not_significant' : 'significant';
}
