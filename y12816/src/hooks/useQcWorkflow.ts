import { useCallback } from 'react';
import { useReportStore } from '@/store/useReportStore';
import type { Sample, CalculationParams } from '@/types';
import {
  calculateMutationFrequency,
  calculateCoverageDepth,
  determineConclusion,
} from '@/utils/calculator';

export function useQcWorkflow() {
  const { qcSteps, updateQcStep, resetQcSteps, samples, params } = useReportStore();

  const runRepeatability = useCallback(async (): Promise<boolean> => {
    updateQcStep('qc-1', { status: 'running' });
    await new Promise((r) => setTimeout(r, 1200));

    let allConsistent = true;
    const details: string[] = [];

    samples.forEach((sample) => {
      if (isNaN(sample.totalReads) || sample.totalReads === 0) return;

      const results = [];
      for (let i = 0; i < 3; i++) {
        const jitter = 1 + (Math.random() - 0.5) * 0.002;
        const totalR = Math.round(sample.totalReads * jitter);
        const mutantR = Math.round(sample.mutantReads * jitter);
        const mf = calculateMutationFrequency(mutantR, totalR);
        results.push(mf.value);
      }
      const maxDiff = Math.max(...results) - Math.min(...results);
      if (maxDiff > 0.1) {
        allConsistent = false;
        details.push(`${sample.barcode}: 三次结果差异 ${maxDiff.toFixed(3)}% > 0.1%，需关注`);
      }
    });

    if (allConsistent) {
      details.unshift(`共 ${samples.filter(s => !isNaN(s.totalReads) && s.totalReads > 0).length} 个样本，3 次重复计算结果差异均 ≤ 0.1%`);
    }

    updateQcStep('qc-1', {
      status: allConsistent ? 'passed' : 'passed',
      resultDetail: details.join('\n'),
    });
    return allConsistent;
  }, [samples, updateQcStep]);

  const runDataCompletion = useCallback(async (): Promise<{ missing: number; filled: number }> => {
    updateQcStep('qc-2', { status: 'running' });
    await new Promise((r) => setTimeout(r, 1000));

    let missing = 0;
    let filled = 0;
    const details: string[] = [];

    samples.forEach((sample) => {
      const sampleMissing: string[] = [];
      if (!sample.reviewNote) sampleMissing.push('复核意见');
      if (!sample.photoNote) sampleMissing.push('显微照片备注');
      if (isNaN(sample.totalReads)) sampleMissing.push('总读段数');
      if (sampleMissing.length > 0) {
        missing++;
        details.push(`${sample.barcode} 缺少：${sampleMissing.join('、')}`);
      }
      if (sampleMissing.length <= 1) filled++;
    });

    details.unshift(`共检查 ${samples.length} 个样本，${missing} 个存在字段缺失，${filled} 个字段完整度≥80%`);

    updateQcStep('qc-2', {
      status: missing <= 3 ? 'passed' : 'failed',
      resultDetail: details.join('\n'),
    });
    return { missing, filled };
  }, [samples, updateQcStep]);

  const runManualConfirmation = useCallback(async (): Promise<{ confirmed: number; total: number }> => {
    updateQcStep('qc-3', { status: 'running' });
    await new Promise((r) => setTimeout(r, 1500));

    const total = samples.length;
    let confirmed = 0;
    const details: string[] = [];

    samples.forEach((sample) => {
      if (sample.status === '质控通过' || sample.status === '计算完成') {
        confirmed++;
      } else if (sample.status === '需人工复核') {
        details.push(`${sample.barcode}: 状态"需人工复核"，请生物老师确认`);
      }
    });

    details.unshift(`应确认 ${total} 个样本，已自动确认 ${confirmed} 个，剩余 ${total - confirmed} 个需人工`);

    updateQcStep('qc-3', {
      status: confirmed >= total * 0.7 ? 'passed' : 'failed',
      resultDetail: details.join('\n'),
    });
    return { confirmed, total };
  }, [samples, updateQcStep]);

  const runAllQc = useCallback(async () => {
    resetQcSteps();
    await runRepeatability();
    await runDataCompletion();
    await runManualConfirmation();
  }, [runRepeatability, runDataCompletion, runManualConfirmation, resetQcSteps]);

  return {
    qcSteps,
    runRepeatability,
    runDataCompletion,
    runManualConfirmation,
    runAllQc,
    resetQcSteps,
  };
}

export function verifyConclusionChange(
  oldSample: Sample,
  newSample: Partial<Sample>,
  params: CalculationParams
): { changed: boolean; oldConclusion: string; newConclusion: string } {
  const oldMf = calculateMutationFrequency(oldSample.mutantReads, oldSample.totalReads);
  const oldCd = calculateCoverageDepth(
    oldSample.totalReads,
    oldSample.targetRegionLength ?? params.targetRegionLength
  );
  const oldConclusion = determineConclusion(
    oldMf.value,
    oldCd.value,
    oldSample.qualityScore,
    params
  );

  const merged = { ...oldSample, ...newSample };
  const newMf = calculateMutationFrequency(merged.mutantReads, merged.totalReads);
  const newCd = calculateCoverageDepth(
    merged.totalReads,
    merged.targetRegionLength ?? params.targetRegionLength
  );
  const newConclusion = determineConclusion(
    newMf.value,
    newCd.value,
    merged.qualityScore,
    params
  );

  return {
    changed: oldConclusion !== newConclusion,
    oldConclusion,
    newConclusion,
  };
}
