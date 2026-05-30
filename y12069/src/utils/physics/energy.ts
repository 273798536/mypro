import { Vector2D } from './momentum';

export function calculateKineticEnergy(mass: number, velocity: Vector2D): number {
  const speedSquared = velocity.x ** 2 + velocity.y ** 2;
  return 0.5 * mass * speedSquared;
}

export function calculateTotalEnergy(
  particleEnergy: number,
  oreEnergy: number
): number {
  return particleEnergy + oreEnergy;
}

export function calculateEnergyDifference(
  beforeEnergy: number,
  afterEnergy: number
): number {
  return afterEnergy - beforeEnergy;
}

export function checkEnergyConservation(
  beforeEnergy: number,
  afterEnergy: number,
  tolerance: number
): {
  isConserved: boolean;
  difference: number;
  differencePercent: number;
} {
  const difference = calculateEnergyDifference(beforeEnergy, afterEnergy);
  const differencePercent = beforeEnergy > 0 ? Math.abs(difference) / beforeEnergy : 0;
  
  return {
    isConserved: differencePercent <= tolerance,
    difference,
    differencePercent,
  };
}

export function checkEnergyOverLimit(
  afterEnergy: number,
  beforeEnergy: number,
  limit: number,
  tolerance: number
): {
  isOverLimit: boolean;
  limit: number;
  overLimitAmount: number;
} {
  const maxAllowedEnergy = beforeEnergy * (1 + tolerance);
  const effectiveLimit = Math.max(maxAllowedEnergy, limit);
  const overLimitAmount = Math.max(0, afterEnergy - effectiveLimit);
  
  return {
    isOverLimit: overLimitAmount > 0,
    limit: effectiveLimit,
    overLimitAmount,
  };
}

export function calculateLaunchEnergy(power: number, maxEnergy: number): number {
  return (power / 100) * maxEnergy;
}

export function velocityFromEnergy(energy: number, mass: number): number {
  if (mass <= 0) return 0;
  return Math.sqrt((2 * energy) / mass);
}

export function calculateEnergyEfficiencyScore(
  usedEnergy: number,
  threshold: number,
  collected: boolean
): number {
  if (!collected) return 0;
  const ratio = threshold / usedEnergy;
  return Math.max(0, Math.floor(ratio * 100));
}

export function formatEnergy(value: number): string {
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + ' kJ';
  }
  return value.toFixed(1) + ' J';
}
