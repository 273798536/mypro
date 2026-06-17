import type { EvaluationSample, ModelVersion } from '@/types';

export function findSampleByTrace(
  samples: EvaluationSample[],
  query: { rowNumber?: number; imageName?: string; sourceNote?: string }
): EvaluationSample[] {
  return samples.filter((s) => {
    if (query.rowNumber !== undefined && s.originalRowNumber !== query.rowNumber) return false;
    if (query.imageName && s.imageName !== query.imageName) return false;
    if (query.sourceNote && !s.sourceNote?.includes(query.sourceNote)) return false;
    return true;
  });
}

export function buildTraceBreadcrumb(
  sample: EvaluationSample,
  versions: ModelVersion[]
): string[] {
  const version = versions.find((v) => v.id === sample.modelVersionId);
  return [
    version?.version ?? String(sample.modelVersionId ?? '未知版本'),
    sample.batchId ?? '未知批次',
    `#${sample.originalRowNumber ?? '-'}`,
  ];
}

export function checkTraceCompleteness(samples: EvaluationSample[]) {
  const requiredFields: (keyof EvaluationSample)[] = ['originalRowNumber', 'sourceFileName', 'batchId'];
  const missingFields: Record<string, string[]> = {};
  let complete = 0;
  for (const s of samples) {
    const missing: string[] = [];
    for (const f of requiredFields) {
      if (s[f] === undefined || s[f] === null || s[f] === '') missing.push(String(f));
    }
    if (missing.length === 0) complete++;
    else missingFields[s.id] = missing;
  }
  return {
    completeRate: samples.length > 0 ? complete / samples.length : 0,
    missingFields,
  };
}
