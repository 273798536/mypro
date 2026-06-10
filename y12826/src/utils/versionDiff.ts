import type { SampleVersion, QualityMetrics, ContaminationResult } from '@/types';

export interface MetricDiff {
  metric: string;
  oldValue: number;
  newValue: number;
  change: number;
  changePercent: number;
  unit: string;
}

export interface VersionDiffResult {
  metrics: MetricDiff[];
  statusChanged: boolean;
  oldStatus: string;
  newStatus: string;
  contaminationChanged: boolean;
  oldContamination: ContaminationResult;
  newContamination: ContaminationResult;
}

const metricLabels: Record<string, string> = {
  proteinConcentration: '蛋白浓度',
  purity: '纯度',
  integrity: '完整性',
  backgroundNoise: '背景噪声',
  particleCount: '颗粒计数',
};

const metricUnits: Record<string, string> = {
  proteinConcentration: 'μg/mL',
  purity: '%',
  integrity: '%',
  backgroundNoise: 'dB',
  particleCount: '个',
};

export function compareVersions(
  oldVersion: SampleVersion,
  newVersion: SampleVersion
): VersionDiffResult {
  const metrics: MetricDiff[] = [];
  const keys = Object.keys(oldVersion.qualityMetrics) as (keyof QualityMetrics)[];

  for (const key of keys) {
    const oldVal = oldVersion.qualityMetrics[key];
    const newVal = newVersion.qualityMetrics[key];
    const change = newVal - oldVal;
    const changePercent = oldVal !== 0 ? (change / oldVal) * 100 : 0;

    metrics.push({
      metric: metricLabels[key] || key,
      oldValue: oldVal,
      newValue: newVal,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      unit: metricUnits[key] || '',
    });
  }

  return {
    metrics,
    statusChanged: oldVersion.status !== newVersion.status,
    oldStatus: oldVersion.status,
    newStatus: newVersion.status,
    contaminationChanged:
      oldVersion.contamination.detected !== newVersion.contamination.detected ||
      Math.abs(oldVersion.contamination.confidence - newVersion.contamination.confidence) > 0.05,
    oldContamination: oldVersion.contamination,
    newContamination: newVersion.contamination,
  };
}

export function formatChange(change: number, percent: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(1)}%)`;
}
