import type { Turbine, WakeResult } from '../data/types';

const WAKE_EXPANSION_COEFF = 0.04;
const THRUST_COEFF = 0.8;
const WAKE_CONE_ANGLE = 0.1;

export function calculateWakeDeficit(
  turbines: Turbine[],
  windDirection: number,
  windSpeed: number
): WakeResult[] {
  const windRad = (windDirection * Math.PI) / 180;
  const dirX = Math.cos(windRad);
  const dirY = Math.sin(windRad);

  return turbines.map((turbine) => {
    const affectedBy: string[] = [];
    let totalDeficitSq = 0;
    const overlapZone: WakeResult['overlapZone'] = [];

    for (const other of turbines) {
      if (other.id === turbine.id) continue;

      const dx = turbine.x - other.x;
      const dy = turbine.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 50) continue;

      const projDist = dx * dirX + dy * dirY;
      if (projDist <= 0) continue;

      const perpDist = Math.abs(dx * (-dirY) + dy * dirX);
      const wakeRadius = (other.rotorDiameter / 2) + WAKE_EXPANSION_COEFF * projDist;

      if (perpDist < wakeRadius + turbine.rotorDiameter / 2) {
        const axialDist = projDist;
        const rotorRadius = other.rotorDiameter / 2;
        const deficit =
          (1 - Math.sqrt(1 - THRUST_COEFF)) /
          Math.pow(1 + (WAKE_EXPANSION_COEFF * axialDist) / rotorRadius, 2);

        affectedBy.push(other.id);
        totalDeficitSq += deficit * deficit;

        if (perpDist < wakeRadius * 0.6) {
          const midX = (turbine.x + other.x) / 2;
          const midY = (turbine.y + other.y) / 2;
          overlapZone.push({
            x: midX,
            y: midY,
            radius: wakeRadius * 0.4,
          });
        }
      }
    }

    const totalDeficit = Math.min(Math.sqrt(totalDeficitSq), 0.6);
    const effectiveSpeed = windSpeed * (1 - totalDeficit);

    return {
      turbineId: turbine.id,
      deficit: Math.round(totalDeficit * 1000) / 1000,
      affectedBy,
      overlapZone,
      effectiveSpeed,
    } as WakeResult & { effectiveSpeed: number };
  });
}

export function getWakeConeGeometry(
  turbine: Turbine,
  windDirection: number,
  maxLength: number = 1500
): { origin: [number, number]; end: [number, number]; startRadius: number; endRadius: number } {
  const windRad = (windDirection * Math.PI) / 180;
  const dirX = Math.cos(windRad);
  const dirY = Math.sin(windRad);

  const startRadius = turbine.rotorDiameter / 2;
  const endRadius = startRadius + WAKE_EXPANSION_COEFF * maxLength;

  return {
    origin: [turbine.x, turbine.y],
    end: [turbine.x + dirX * maxLength, turbine.y + dirY * maxLength],
    startRadius,
    endRadius,
  };
}

export { WAKE_CONE_ANGLE };
