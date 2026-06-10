import { useMemo } from 'react';
import type { Sample, CalculationParams, CalculationResult } from '@/types';
import {
  calculateMutationFrequency,
  calculateAlleleFrequency,
  calculateCoverageDepth,
  determineConclusion,
  formatNumber,
} from '@/utils/calculator';

export function useMutationCalculator(sample: Sample | undefined, params: CalculationParams) {
  return useMemo<CalculationResult | null>(() => {
    if (!sample) return null;

    const safeTotalReads = isNaN(sample.totalReads) ? 0 : sample.totalReads;
    const safeMutantReads = isNaN(sample.mutantReads) ? 0 : sample.mutantReads;
    const targetLength = sample.targetRegionLength ?? params.targetRegionLength;

    const mf = calculateMutationFrequency(safeMutantReads, safeTotalReads);
    const af = calculateAlleleFrequency(safeMutantReads, safeTotalReads);
    const cd = calculateCoverageDepth(safeTotalReads, targetLength);

    const allPass = mf.pass && af.pass && cd.pass;
    const failureReason = [
      !mf.pass ? mf.reason : null,
      !af.pass ? af.reason : null,
      !cd.pass ? cd.reason : null,
    ]
      .filter(Boolean)
      .join('；');

    const conclusion = determineConclusion(mf.value, cd.value, sample.qualityScore, params);

    return {
      sampleBarcode: sample.barcode,
      mutationFrequency: parseFloat(formatNumber(mf.value)),
      alleleFrequency: parseFloat(formatNumber(af.value)),
      coverageDepth: parseFloat(formatNumber(cd.value)),
      formula:
        'MF = 突变读段数/总读段数×100%；AF = 突变读段数/(2×总读段数)×100%；CD = 总读段数/目标区域长度',
      unit: 'MF: %, AF: %, CD: ×',
      applicableRange:
        '总读段数 ≥ 100、覆盖深度 ≥ 100×、质量分 ≥ Q20 时结果用于临床参考',
      failureReason: allPass ? undefined : failureReason,
      isPass: allPass && conclusion !== '不确定',
    };
  }, [sample, params]);
}
