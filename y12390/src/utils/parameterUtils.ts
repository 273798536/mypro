export function formatParameterValue(value: number, unit?: string): string {
  const formatted = value.toFixed(2);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function calculateDifference(baseline: number, compared: number): number {
  return compared - baseline;
}

export function calculatePercentage(baseline: number, compared: number): number {
  if (baseline === 0) return 0;
  return ((compared - baseline) / Math.abs(baseline)) * 100;
}

export function isOutOfBounds(value: number, min: number, max: number): boolean {
  return value < min || value > max;
}

export function getBoundsStatus(value: number, min: number, max: number): 'normal' | 'below_min' | 'above_max' {
  if (value < min) return 'below_min';
  if (value > max) return 'above_max';
  return 'normal';
}

export function isSignificantChange(percentage: number, threshold: number = 10): boolean {
  return Math.abs(percentage) >= threshold;
}
