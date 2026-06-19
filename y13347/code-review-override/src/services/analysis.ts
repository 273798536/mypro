import type { ThresholdConfig, GrayBreakdown } from '../types'

export function detectThresholdDrift(threshold: ThresholdConfig): boolean {
  const delta = Math.abs(threshold.currentValue - threshold.baselineValue)
  const ratio = threshold.baselineValue === 0 ? 0 : delta / Math.abs(threshold.baselineValue)
  return ratio > threshold.driftTolerance
}

export function detectDriftFromRecords(
  currentMetric: number,
  baselineMetric: number,
  tolerance = 0.15
): { drifted: boolean; delta: number; ratio: number } {
  const delta = currentMetric - baselineMetric
  const ratio = baselineMetric === 0 ? 0 : delta / Math.abs(baselineMetric)
  return {
    drifted: Math.abs(ratio) > tolerance,
    delta,
    ratio,
  }
}

export function buildGrayBreakdown(params: {
  sampleChange: number
  thresholdChange: number
  manualOverride: number
  baselineMetric: number
}): GrayBreakdown {
  const { sampleChange, thresholdChange, manualOverride, baselineMetric } = params
  const totalDelta = sampleChange + thresholdChange + manualOverride

  const makeNote = (label: string, value: number) => {
    if (Math.abs(value) < 1e-6) return `${label}：无变化`
    const pct = baselineMetric === 0 ? 0 : (value / Math.abs(baselineMetric)) * 100
    const sign = value > 0 ? '+' : ''
    return `${label}：${sign}${value.toFixed(4)}（${sign}${pct.toFixed(2)}%）`
  }

  return {
    sampleChangeDelta: sampleChange,
    sampleChangeNote: makeNote('样本变化', sampleChange),
    thresholdChangeDelta: thresholdChange,
    thresholdChangeNote: makeNote('阈值变化', thresholdChange),
    manualOverrideDelta: manualOverride,
    manualOverrideNote: makeNote('人工改判', manualOverride),
    totalDelta,
  }
}
