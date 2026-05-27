import * as THREE from 'three';
import type { LiquidityLevel, RiskSeverity } from '../types';

export const PRESSURE_COLORS = {
  SAFE_LOW: 0x00D4AA,
  SAFE_HIGH: 0x00A884,
  WARNING_LOW: 0xFFB800,
  WARNING_HIGH: 0xFF9500,
  DANGER_LOW: 0xFF3B30,
  DANGER_HIGH: 0xD70015,
  CRITICAL: 0xFF2D55,
  CASH: 0x007AFF,
  CASH_RISK: 0xAF52DE,
};

export const LIQUIDITY_COLORS: Record<LiquidityLevel, number> = {
  HIGH: 0x34C759,
  MEDIUM: 0xFF9500,
  LOW: 0xFF3B30,
};

export const RISK_SEVERITY_COLORS: Record<RiskSeverity, string> = {
  LOW: '#00D4AA',
  MEDIUM: '#FFB800',
  HIGH: '#FF3B30',
  CRITICAL: '#FF2D55',
};

export function interpolateColor(color1: number, color2: number, t: number): THREE.Color {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.clone().lerp(c2, t);
}

export function getPressureColor(pressure: number, isRisk: boolean = false): THREE.Color {
  if (isRisk) {
    return new THREE.Color(PRESSURE_COLORS.CRITICAL);
  }
  if (pressure < 0.33) {
    return interpolateColor(PRESSURE_COLORS.SAFE_LOW, PRESSURE_COLORS.SAFE_HIGH, pressure * 3);
  } else if (pressure < 0.66) {
    return interpolateColor(PRESSURE_COLORS.WARNING_LOW, PRESSURE_COLORS.WARNING_HIGH, (pressure - 0.33) * 3);
  } else {
    return interpolateColor(PRESSURE_COLORS.DANGER_LOW, PRESSURE_COLORS.DANGER_HIGH, (pressure - 0.66) * 3);
  }
}

export function getLiquidityColor(level: LiquidityLevel): THREE.Color {
  return new THREE.Color(LIQUIDITY_COLORS[level]);
}

export function getSeverityFromScore(score: number): RiskSeverity {
  if (score < 0.25) return 'LOW';
  if (score < 0.5) return 'MEDIUM';
  if (score < 0.75) return 'HIGH';
  return 'CRITICAL';
}

export function formatCurrency(value: number): string {
  if (value >= 1e8) {
    return `${(value / 1e8).toFixed(2)}亿`;
  } else if (value >= 1e4) {
    return `${(value / 1e4).toFixed(2)}万`;
  }
  return value.toFixed(2);
}
