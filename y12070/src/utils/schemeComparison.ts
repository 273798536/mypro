import type { Scheme, WakeResult, CableCrossing, MaintenanceConflict, PowerRecord } from '../data/types';
import { calculateWakeDeficit } from './wakeModel';
import { detectCableCrossings } from './cableAnalysis';

export interface SchemeComparison {
  schemeA: Scheme;
  schemeB: Scheme;
  wakeA: WakeResult[];
  wakeB: WakeResult[];
  crossingsA: CableCrossing[];
  crossingsB: CableCrossing[];
  avgDeficitA: number;
  avgDeficitB: number;
  totalPowerA: number;
  totalPowerB: number;
  wakeOverlapCountA: number;
  wakeOverlapCountB: number;
}

export function compareSchemes(
  schemeA: Scheme,
  schemeB: Scheme,
  windDirection: number,
  windSpeed: number,
  recordsA: PowerRecord[],
  recordsB: PowerRecord[]
): SchemeComparison {
  const wakeA = calculateWakeDeficit(schemeA.turbines, windDirection, windSpeed);
  const wakeB = calculateWakeDeficit(schemeB.turbines, windDirection, windSpeed);
  const crossingsA = detectCableCrossings(schemeA.cables);
  const crossingsB = detectCableCrossings(schemeB.cables);

  const avgDeficitA = wakeA.reduce((s, w) => s + w.deficit, 0) / wakeA.length;
  const avgDeficitB = wakeB.reduce((s, w) => s + w.deficit, 0) / wakeB.length;

  const totalPowerA = recordsA.reduce((s, r) => s + r.powerOutput, 0);
  const totalPowerB = recordsB.reduce((s, r) => s + r.powerOutput, 0);

  const wakeOverlapCountA = wakeA.filter((w) => w.affectedBy.length > 1).length;
  const wakeOverlapCountB = wakeB.filter((w) => w.affectedBy.length > 1).length;

  return {
    schemeA,
    schemeB,
    wakeA,
    wakeB,
    crossingsA,
    crossingsB,
    avgDeficitA: Math.round(avgDeficitA * 1000) / 1000,
    avgDeficitB: Math.round(avgDeficitB * 1000) / 1000,
    totalPowerA: Math.round(totalPowerA * 100) / 100,
    totalPowerB: Math.round(totalPowerB * 100) / 100,
    wakeOverlapCountA,
    wakeOverlapCountB,
  };
}

export function detectMaintenanceConflicts(plans: { vesselId: string; turbineId: string; startTime: number; endTime: number }[]): MaintenanceConflict[] {
  const conflicts: MaintenanceConflict[] = [];
  for (let i = 0; i < plans.length; i++) {
    for (let j = i + 1; j < plans.length; j++) {
      const a = plans[i];
      const b = plans[j];
      if (a.vesselId !== b.vesselId) continue;
      const overlapStart = Math.max(a.startTime, b.startTime);
      const overlapEnd = Math.min(a.endTime, b.endTime);
      if (overlapStart < overlapEnd) {
        conflicts.push({
          vessel1Id: a.vesselId,
          vessel2Id: b.vesselId,
          turbine1Id: a.turbineId,
          turbine2Id: b.turbineId,
          overlapStart,
          overlapEnd,
        });
      }
    }
  }
  return conflicts;
}
