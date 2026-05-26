import type { RoutePoint, SunState } from "@/types";
import { terrainHeight } from "./terrain";

export type SegmentEnergy = {
  distance: number;
  slope: number;
  shadowRatio: number;
  shadowCost: number;
  baseCost: number;
  weightPenalty: number;
  overload: boolean;
  totalCost: number;
  startBattery: number;
  endBattery: number;
  inShade: boolean;
  warning: string | null;
};

export type EnergyReport = {
  segments: SegmentEnergy[];
  totalDistance: number;
  totalCost: number;
  totalShadowCost: number;
  totalWeightPenalty: number;
  shadowSegments: number;
  overloadSegments: number;
  finalBattery: number;
  failed: boolean;
  failureReason: string | null;
};

export function isPointInShadow(
  x: number,
  z: number,
  seed: number,
  sun: SunState,
  sensitivity: number
): boolean {
  const rad = (sun.angle * Math.PI) / 180;
  const sx = Math.cos(rad);
  const sz = Math.sin(rad);
  const y = terrainHeight(x, z, seed);
  const samples = 4;
  for (let i = 1; i <= samples; i++) {
    const t = i * 1.2;
    const nx = x - sx * t;
    const nz = z - sz * t;
    const ny = terrainHeight(nx, nz, seed);
    const expectedY = y + Math.tan(rad > Math.PI / 2 ? Math.PI - rad : rad) * t * 0.6;
    if (ny > expectedY + sensitivity * 0.5) {
      return true;
    }
  }
  return false;
}

export function computeEnergy(
  route: RoutePoint[],
  seed: number,
  sun: SunState,
  weightKg: number,
  sensitivity: number,
  startBattery = 100
): EnergyReport {
  const segments: SegmentEnergy[] = [];
  let battery = startBattery;
  let totalDistance = 0;
  let totalCost = 0;
  let totalShadowCost = 0;
  let totalWeightPenalty = 0;
  let shadowSegments = 0;
  let overloadSegments = 0;
  let failed = false;
  let failureReason: string | null = null;

  const overload = weightKg > 50;

  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const dy = b.y - a.y;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const slope = distance > 0 ? dy / distance : 0;

    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    const inShade = isPointInShadow(midX, midZ, seed, sun, sensitivity);

    const slopePenalty = slope > 0 ? Math.abs(slope) * 1.6 : Math.abs(slope) * 0.8;
    const baseCost = distance * (0.3 + slopePenalty);
    const weightPenalty = distance * weightKg * 0.02;
    const overloadMultiplier = overload ? 3 : 1;
    const shadowCost = inShade ? (baseCost + weightPenalty) * 1.5 * overloadMultiplier : 0;
    const total = (baseCost + weightPenalty + shadowCost) * overloadMultiplier;

    const startB = battery;
    battery = Math.max(0, battery - total);

    if (inShade) shadowSegments++;
    if (overload) overloadSegments++;

    let warning: string | null = null;
    if (inShade && !failed) warning = "阴影区：耗电 ×2.5";
    if (overload && !failed) warning = warning ? `${warning}；超载：惩罚 ×3` : "超载：惩罚 ×3";
    if (battery <= 0 && !failed) {
      failed = true;
      failureReason = "电池耗尽";
    }

    segments.push({
      distance,
      slope,
      shadowRatio: inShade ? 1 : 0,
      shadowCost,
      baseCost,
      weightPenalty,
      overload,
      totalCost: total,
      startBattery: startB,
      endBattery: battery,
      inShade,
      warning,
    });
    totalDistance += distance;
    totalCost += total;
    totalShadowCost += shadowCost;
    totalWeightPenalty += weightPenalty;
  }

  if (overload && !failed) {
    failed = true;
    failureReason = "样本超载未解决";
  }

  return {
    segments,
    totalDistance,
    totalCost,
    totalShadowCost,
    totalWeightPenalty,
    shadowSegments,
    overloadSegments,
    finalBattery: battery,
    failed,
    failureReason,
  };
}
