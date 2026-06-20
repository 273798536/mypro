import { MetricValue } from '@/types';

export function formatPct(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

export function formatAbs(v: number, digits = 2): string {
  return v.toFixed(digits);
}

export function hasCaliperIssue(m: MetricValue | undefined): boolean {
  if (!m) return false;
  return !m.caliperAligned;
}

export function caliperGap(m: MetricValue): string {
  const gap = Math.abs(m.offline - m.online);
  return (gap * 100).toFixed(2) + 'pp';
}

export function getCaliperNote(m: MetricValue): string {
  if (m.caliperAligned) return '口径已对齐';
  return m.diffNote || '存在离线/线上口径差异，需人工复核说明';
}

export type MetricKey = 'accuracy' | 'latency' | 'cost';

export function metricLabel(k: MetricKey): string {
  return { accuracy: '准确率', latency: '延迟(ms)', cost: '成本($/1k次)' }[k];
}

export function metricFormat(k: MetricKey, v: number): string {
  if (k === 'accuracy') return formatPct(v);
  if (k === 'latency') return formatAbs(v, 1) + ' ms';
  if (k === 'cost') return '$' + formatAbs(v, 4);
  return String(v);
}
