import type { Sample, ConfusionType } from '@/types';

export function confusion(s: Sample): ConfusionType {
  if (s.groundTruth === 'NG' && s.prediction === 'NG') return 'TP';
  if (s.groundTruth === 'OK' && s.prediction === 'OK') return 'TN';
  if (s.groundTruth === 'OK' && s.prediction === 'NG') return 'FP';
  return 'FN';
}

export function isMisjudged(s: Sample): boolean {
  return s.groundTruth !== s.prediction;
}

export function statusText(s: Sample): string {
  if (s.groundTruth === 'OK' && s.prediction === 'NG') return '误判';
  if (s.groundTruth === 'NG' && s.prediction === 'OK') return '漏检';
  return '通过';
}

export const CONFUSION_LABEL: Record<ConfusionType, string> = {
  TP: '检出缺陷',
  TN: '正确放行',
  FP: '误判(好判坏)',
  FN: '漏检(坏放行)',
};

export const CONFUSION_SHORT: Record<ConfusionType, string> = {
  TP: 'TP',
  TN: 'TN',
  FP: 'FP',
  FN: 'FN',
};
