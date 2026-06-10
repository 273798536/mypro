import type { QualityMetrics, QCThresholds, SampleStatus, ContaminationResult } from '@/types';

export interface QCCheckResult {
  passed: boolean;
  failedMetrics: string[];
  warnings: string[];
}

export function runQCCheck(
  metrics: QualityMetrics,
  thresholds: QCThresholds
): QCCheckResult {
  const failed: string[] = [];
  const warnings: string[] = [];

  if (metrics.proteinConcentration < thresholds.minProteinConcentration) {
    failed.push('蛋白浓度低于阈值');
  } else if (metrics.proteinConcentration < thresholds.minProteinConcentration * 1.2) {
    warnings.push('蛋白浓度接近阈值下限');
  }

  if (metrics.purity < thresholds.minPurity) {
    failed.push('纯度低于阈值');
  } else if (metrics.purity < thresholds.minPurity + 5) {
    warnings.push('纯度接近阈值下限');
  }

  if (metrics.integrity < thresholds.minIntegrity) {
    failed.push('完整性低于阈值');
  } else if (metrics.integrity < thresholds.minIntegrity + 5) {
    warnings.push('完整性接近阈值下限');
  }

  if (metrics.backgroundNoise > thresholds.maxBackgroundNoise) {
    failed.push('背景噪声超过阈值');
  } else if (metrics.backgroundNoise > thresholds.maxBackgroundNoise * 0.8) {
    warnings.push('背景噪声接近阈值上限');
  }

  return {
    passed: failed.length === 0,
    failedMetrics: failed,
    warnings,
  };
}

export function determineSampleStatus(
  qcResult: QCCheckResult,
  contamination: ContaminationResult,
  threshold: number
): SampleStatus {
  if (contamination.detected && contamination.confidence >= 0.8) {
    return 'contaminated';
  }
  if (!qcResult.passed || (contamination.detected && contamination.confidence >= threshold)) {
    return 'warning';
  }
  if (qcResult.warnings.length > 0) {
    return 'warning';
  }
  return 'normal';
}

export function generateNewMetrics(baseMetrics: QualityMetrics, variance: number = 0.05): QualityMetrics {
  const vary = (value: number) => {
    const change = value * variance * (Math.random() * 2 - 1);
    return Math.round((value + change) * 100) / 100;
  };

  return {
    proteinConcentration: vary(baseMetrics.proteinConcentration),
    purity: vary(baseMetrics.purity),
    integrity: vary(baseMetrics.integrity),
    backgroundNoise: vary(baseMetrics.backgroundNoise),
    particleCount: Math.round(vary(baseMetrics.particleCount)),
  };
}

export function reEvaluateContamination(
  metrics: QualityMetrics,
  baseContamination: ContaminationResult
): ContaminationResult {
  const noiseFactor = metrics.backgroundNoise / 25;
  const purityFactor = (100 - metrics.purity) / 20;
  const newConfidence = Math.min(
    0.98,
    Math.max(0.02, baseContamination.confidence + (noiseFactor + purityFactor - 1) * 0.1)
  );

  return {
    ...baseContamination,
    confidence: Math.round(newConfidence * 100) / 100,
    detected: newConfidence >= 0.5,
  };
}
