import { CashFlow } from '../types';

export function mapRatingToColor(rating: string): string {
  const colorMap: Record<string, string> = {
    'AAA': '#00D4AA',
    'AA+': '#4ADE80',
    'AA': '#22C55E',
    'AA-': '#16A34A',
    'A+': '#86EFAC',
    'A': '#65A30D',
    'A-': '#4D7C0F',
    'BBB+': '#F59E0B',
    'BBB': '#D97706',
    'BBB-': '#B45309',
    'BB+': '#F97316',
    'BB': '#EA580C',
    'BB-': '#C2410C',
    'B+': '#EF4444',
    'B': '#DC2626',
    'B-': '#B91C1C',
    'CCC+': '#F43F5E',
    'CCC': '#E11D48',
    'CC': '#BE123C',
    'C': '#881337',
  };
  return colorMap[rating] || '#6B7280';
}

export function mapRatingToHex(rating: string): number {
  return parseInt(mapRatingToColor(rating).replace('#', ''), 16);
}

export function mapFlowTypeToColor(flowType: string): string {
  const colorMap: Record<string, string> = {
    coupon: '#00D4AA',
    principal: '#0366D6',
    call: '#F59E0B',
    put: '#EF4444',
  };
  return colorMap[flowType] || '#6B7280';
}

export function mapAnomalyToColor(anomaly: string | undefined): string {
  if (!anomaly) return '';
  const colorMap: Record<string, string> = {
    date_misalignment: '#F59E0B',
    scenario_duplicate: '#F59E0B',
    negative_cashflow: '#EF4444',
    missing_rating: '#F97316',
    outlier_amount: '#DC2626',
    invalid_date_format: '#B91C1C',
  };
  return colorMap[anomaly] || '#F59E0B';
}

export function getGlowIntensity(rating: string): number {
  const glowMap: Record<string, number> = {
    'AAA': 0.8,
    'AA+': 0.7,
    'AA': 0.6,
    'AA-': 0.55,
    'A+': 0.5,
    'A': 0.45,
    'A-': 0.4,
    'BBB+': 0.35,
    'BBB': 0.3,
    'BBB-': 0.25,
    'BB+': 0.2,
    'BB': 0.15,
    'BB-': 0.15,
    'B+': 0.1,
    'B': 0.1,
    'B-': 0.1,
  };
  return glowMap[rating] ?? 0.1;
}

export function calculateBarHeight(amount: number, maxAmount: number): number {
  const absAmount = Math.abs(amount);
  return (absAmount / maxAmount) * 8;
}

export function getAnomalyGlowColor(anomaly: string | undefined): number {
  if (!anomaly) return 0x000000;
  const colorMap: Record<string, number> = {
    negative_cashflow: 0xff0000,
    outlier_amount: 0xff4444,
    date_misalignment: 0xffaa00,
    scenario_duplicate: 0xffaa00,
    missing_rating: 0xff8800,
    invalid_date_format: 0xff0000,
  };
  return colorMap[anomaly] ?? 0xff4444;
}