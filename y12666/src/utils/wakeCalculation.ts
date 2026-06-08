import type { Turbine, SimulationParams, WakeResult } from '@/types';
import { normalizeWindSpeed, spacingToMeters } from './unitConversion';
import { normalizeTurbineToLocal } from './coordinateTransform';

export interface WakeConeGeometry {
  turbineId: string;
  origin: [number, number, number];
  direction: [number, number, number];
  length: number;
  baseRadius: number;
  tipRadius: number;
  maxSpeedLoss: number;
  isOutOfBounds: boolean;
}

function jensenWakeLoss(
  distance: number,
  rotorDiameter: number,
  thrustCoeff: number,
  wakeDecayConstant: number
): number {
  const wakeRadius = rotorDiameter / 2 + wakeDecayConstant * distance;
  const areaRatio = (rotorDiameter / 2) ** 2 / wakeRadius ** 2;
  return (1 - Math.sqrt(1 - thrustCoeff)) * areaRatio;
}

export function calculateWakeField(
  turbines: Turbine[],
  params: SimulationParams,
  wrongUnitConversion = false
): WakeResult[] {
  const windSpeedMs = normalizeWindSpeed(params.windSpeed, params.windSpeedUnit, wrongUnitConversion);
  const refDiameter = turbines[0]?.rotorDiameter || 126;
  const thrustCoeff = 0.75;
  const wakeDecay = 0.05 + params.turbulenceIntensity * 2;

  const windRad = (params.windDirection * Math.PI) / 180;
  const windX = Math.sin(windRad);
  const windY = Math.cos(windRad);

  const localTurbines = turbines.map((t) => {
    const local = normalizeTurbineToLocal(t);
    return { ...t, localX: local.x, localY: local.y };
  });

  const results: WakeResult[] = localTurbines.map((turbine) => {
    let totalSpeedDeficit = 0;
    const affectedBy: string[] = [];

    for (const upstream of localTurbines) {
      if (upstream.id === turbine.id) continue;

      const dx = turbine.localX - upstream.localX;
      const dy = turbine.localY - upstream.localY;

      const downwindDist = dx * windX + dy * windY;
      if (downwindDist <= 0) continue;

      const crossDist = Math.abs(dx * windY - dy * windX);
      const wakeRadiusAtDist =
        upstream.rotorDiameter / 2 + wakeDecay * downwindDist;

      if (crossDist > wakeRadiusAtDist + turbine.rotorDiameter / 2) continue;

      const overlapRatio = Math.max(
        0,
        1 - crossDist / (wakeRadiusAtDist + turbine.rotorDiameter / 2)
      );
      const deficit =
        jensenWakeLoss(downwindDist, upstream.rotorDiameter, thrustCoeff, wakeDecay) *
        overlapRatio;

      totalSpeedDeficit += deficit * deficit;
      affectedBy.push(upstream.name);
    }

    const combinedDeficit = Math.sqrt(totalSpeedDeficit);
    const effectiveSpeed = windSpeedMs * (1 - combinedDeficit);
    const wakeLossPercent = combinedDeficit * 100;
    const isOutOfBounds = wakeLossPercent > 20;

    return {
      turbineId: turbine.id,
      turbineName: turbine.name,
      incomingSpeed: effectiveSpeed,
      wakeLossPercent,
      affectedBy,
      isOutOfBounds,
    };
  });

  return results;
}

export function generateWakeCones(
  turbines: Turbine[],
  params: SimulationParams,
  wrongUnitConversion = false
): WakeConeGeometry[] {
  const windRad = (params.windDirection * Math.PI) / 180;
  const windX = Math.sin(windRad);
  const windY = Math.cos(windRad);
  const refDiameter = turbines[0]?.rotorDiameter || 126;
  const maxWakeDistance = spacingToMeters(
    params.spacingMultiple * 4,
    params.spacingUnit,
    refDiameter,
    wrongUnitConversion
  );
  const wakeDecay = 0.05 + params.turbulenceIntensity * 2;

  return turbines.map((t) => {
    const local = normalizeTurbineToLocal(t);
    const wakeLoss = jensenWakeLoss(maxWakeDistance, t.rotorDiameter, 0.75, wakeDecay);

    return {
      turbineId: t.id,
      origin: [local.x, t.hubHeight, local.y] as [number, number, number],
      direction: [windX, 0, windY] as [number, number, number],
      length: maxWakeDistance,
      baseRadius: t.rotorDiameter / 2,
      tipRadius: t.rotorDiameter / 2 + wakeDecay * maxWakeDistance,
      maxSpeedLoss: wakeLoss,
      isOutOfBounds: wakeLoss > 0.2,
    };
  });
}

export function getTotalWakeLoss(results: WakeResult[]): number {
  if (results.length === 0) return 0;
  const avg = results.reduce((sum, r) => sum + r.wakeLossPercent, 0) / results.length;
  return parseFloat(avg.toFixed(2));
}

export function getAffectedTurbineIds(results: WakeResult[]): string[] {
  return results.filter((r) => r.wakeLossPercent > 5).map((r) => r.turbineId);
}

export function getOutOfBoundsTurbineIds(results: WakeResult[]): string[] {
  return results.filter((r) => r.isOutOfBounds).map((r) => r.turbineId);
}

export function wakeLossToColor(lossPercent: number): string {
  if (lossPercent >= 20) return '#F46036';
  if (lossPercent >= 15) return '#E2B03A';
  if (lossPercent >= 10) return '#7BC950';
  if (lossPercent >= 5) return '#1B998B';
  return '#147a6e';
}
