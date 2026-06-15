import { RiskLevel, DataStatus } from '../types/common';

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: '#2DD4BF',
  [RiskLevel.MEDIUM]: '#F59E0B',
  [RiskLevel.HIGH]: '#F97316',
  [RiskLevel.CRITICAL]: '#EF4444',
};

export const DATA_STATUS_COLORS: Record<DataStatus, string> = {
  [DataStatus.AVAILABLE]: '#2DD4BF',
  [DataStatus.PENDING]: '#F59E0B',
  [DataStatus.NEED_REVIEW]: '#F97316',
  [DataStatus.RECOLLECT]: '#EF4444',
};

export function getRiskGradientColor(score: number): string {
  if (score >= 75) return RISK_LEVEL_COLORS[RiskLevel.CRITICAL];
  if (score >= 50) return RISK_LEVEL_COLORS[RiskLevel.HIGH];
  if (score >= 25) return RISK_LEVEL_COLORS[RiskLevel.MEDIUM];
  return RISK_LEVEL_COLORS[RiskLevel.LOW];
}

export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getRiskLevelColor(level: RiskLevel): string {
  return RISK_LEVEL_COLORS[level];
}

export function getQualityScoreColor(score: number): string {
  if (score >= 90) return DATA_STATUS_COLORS[DataStatus.AVAILABLE];
  if (score >= 75) return DATA_STATUS_COLORS[DataStatus.PENDING];
  if (score >= 60) return DATA_STATUS_COLORS[DataStatus.NEED_REVIEW];
  return DATA_STATUS_COLORS[DataStatus.RECOLLECT];
}
