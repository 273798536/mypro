import type { Spacecraft, Anomaly, AnomalyType } from '@/types';

export function consumeFuel(
  spacecraft: Spacecraft,
  amount: number
): { spacecraft: Spacecraft; anomaly: Anomaly | null } {
  const fuelRemaining = spacecraft.fuel - amount;
  const isInsufficient = fuelRemaining < 0;

  const updated: Spacecraft = {
    ...spacecraft,
    fuel: Math.max(0, fuelRemaining),
    status: isInsufficient ? 'stranded' : spacecraft.status,
  };

  const anomaly: Anomaly | null = isInsufficient
    ? {
        id: `anomaly-fuel-${Date.now()}`,
        type: 'fuel_insufficient' as AnomalyType,
        description: `燃料不足：需要 ${amount.toFixed(1)}，仅剩 ${spacecraft.fuel.toFixed(1)}`,
        stepIndex: -1,
        isResolved: false,
      }
    : null;

  return { spacecraft: updated, anomaly };
}

export function fuelPercentage(spacecraft: Spacecraft): number {
  return (spacecraft.fuel / spacecraft.maxFuel) * 100;
}

export function isFuelCritical(spacecraft: Spacecraft): boolean {
  return fuelPercentage(spacecraft) < 30;
}

export function isFuelLow(spacecraft: Spacecraft): boolean {
  return fuelPercentage(spacecraft) < 15;
}

export function stationKeepingCost(stepsWaited: number): number {
  return 0.5 * stepsWaited;
}
