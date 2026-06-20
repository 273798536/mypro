import { GrayFactor } from '@/types';

export function grayFactorLabel(f: GrayFactor): string {
  switch (f) {
    case 'sample_change': return '样本变化 Δ';
    case 'threshold_change': return '阈值变化 Δ';
    case 'manual_override': return '人工改判 Δ';
  }
}

export function grayFactorColor(f: GrayFactor): string {
  switch (f) {
    case 'sample_change': return '#10B981';
    case 'threshold_change': return '#F59E0B';
    case 'manual_override': return '#8B5CF6';
  }
}

export function buildGrayWaterfall(
  baseRate: number,
  breakdown: { factor: GrayFactor; delta: number; description: string }[]
) {
  let acc = baseRate;
  return breakdown.map(b => {
    const start = acc;
    acc += b.delta;
    return {
      factor: b.factor,
      label: grayFactorLabel(b.factor),
      color: grayFactorColor(b.factor),
      start: Number(start.toFixed(2)),
      end: Number(acc.toFixed(2)),
      delta: b.delta,
      description: b.description,
    };
  });
}
