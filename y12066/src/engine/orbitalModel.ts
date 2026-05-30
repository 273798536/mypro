import type { Planet, TransferWindow, Spacecraft } from '@/types';

const MU = 1.0;

export function orbitalPeriod(radius: number): number {
  return 2 * Math.PI * Math.sqrt(Math.pow(radius, 3) / MU);
}

export function angularVelocity(radius: number): number {
  return Math.sqrt(MU / Math.pow(radius, 3));
}

export function hohmannTransferCost(r1: number, r2: number): number {
  const a = (r1 + r2) / 2;
  const v1 = Math.sqrt(MU / r1);
  const vTransfer1 = Math.sqrt(MU * (2 / r1 - 1 / a));
  const vTransfer2 = Math.sqrt(MU * (2 / r2 - 1 / a));
  const v2 = Math.sqrt(MU / r2);
  const dv1 = Math.abs(vTransfer1 - v1);
  const dv2 = Math.abs(v2 - vTransfer2);
  return dv1 + dv2;
}

export function hohmannTransferTime(r1: number, r2: number): number {
  const a = (r1 + r2) / 2;
  return Math.PI * Math.sqrt(Math.pow(a, 3) / MU);
}

export function requiredPhaseAngle(r1: number, r2: number): number {
  const transferTime = hohmannTransferTime(r1, r2);
  const omega2 = angularVelocity(r2);
  const targetAngle = Math.PI - omega2 * transferTime;
  return ((targetAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

export function computeTransferWindows(
  spacecraft: Spacecraft,
  targetPlanet: Planet,
  allPlanets: Planet[],
  currentStep: number,
  timeHorizon: number = 20
): TransferWindow[] {
  const r1 = spacecraft.currentOrbitRadius;
  const r2 = targetPlanet.orbitalRadius;
  const baseCost = hohmannTransferCost(r1, r2);
  const requiredPhase = requiredPhaseAngle(r1, r2);
  const currentPhase = ((targetPlanet.currentAngle - spacecraft.currentAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const omegaRel = angularVelocity(r1) - angularVelocity(r2);

  const windows: TransferWindow[] = [];
  let phaseDiff = (requiredPhase - currentPhase + 2 * Math.PI) % (2 * Math.PI);

  if (omegaRel !== 0) {
    const timeToAlignment = phaseDiff / Math.abs(omegaRel);

    for (let k = 0; k < 5; k++) {
      const alignmentTime = timeToAlignment + (k * 2 * Math.PI) / Math.abs(omegaRel);
      if (alignmentTime > timeHorizon) break;

      const windowWidth = 2.0;
      const openTime = Math.max(0, alignmentTime - windowWidth / 2);
      const closeTime = alignmentTime + windowWidth / 2;

      const waitSteps = Math.max(0, alignmentTime);
      const timeOffset = waitSteps;
      const fuelCost = baseCost * (1 + timeOffset * 0.15);

      windows.push({
        id: `w-${targetPlanet.id}-${currentStep}-${k}`,
        targetPlanetId: targetPlanet.id,
        targetPlanetName: targetPlanet.name,
        openTime: openTime + currentStep,
        closeTime: closeTime + currentStep,
        optimalTime: alignmentTime + currentStep,
        fuelCost: Math.round(fuelCost * 100) / 100,
        isMissed: false,
        timeOffset: Math.round(timeOffset * 100) / 100,
      });
    }
  }

  return windows;
}

export function computeMissedWindow(
  spacecraft: Spacecraft,
  targetPlanet: Planet,
  currentStep: number
): TransferWindow {
  const r1 = spacecraft.currentOrbitRadius;
  const r2 = targetPlanet.orbitalRadius;
  const baseCost = hohmannTransferCost(r1, r2);

  return {
    id: `w-missed-${targetPlanet.id}-${currentStep}`,
    targetPlanetId: targetPlanet.id,
    targetPlanetName: targetPlanet.name,
    openTime: 0,
    closeTime: 0,
    optimalTime: -1,
    fuelCost: Math.round(baseCost * 2.5 * 100) / 100,
    isMissed: true,
    timeOffset: 999,
  };
}

export function checkOrbitIntersection(
  spacecraft: Spacecraft,
  targetOrbitRadius: number,
  planets: Planet[]
): boolean {
  for (const planet of planets) {
    if (planet.orbitalRadius === spacecraft.currentOrbitRadius) continue;
    const minR = Math.min(spacecraft.currentOrbitRadius, targetOrbitRadius);
    const maxR = Math.max(spacecraft.currentOrbitRadius, targetOrbitRadius);
    if (planet.orbitalRadius > minR && planet.orbitalRadius < maxR) {
      const planetAngle = planet.currentAngle % (2 * Math.PI);
      const scAngle = spacecraft.currentAngle % (2 * Math.PI);
      const angleDiff = Math.abs(planetAngle - scAngle);
      if (angleDiff < 0.3 || angleDiff > (2 * Math.PI - 0.3)) {
        return true;
      }
    }
  }
  return false;
}

export function advancePlanets(planets: Planet[], dt: number): Planet[] {
  return planets.map(p => ({
    ...p,
    currentAngle: p.currentAngle + p.angularSpeed * dt,
  }));
}

export function calculateScoreDelta(
  resultType: string,
  timeOffset: number,
  fuelConsumed: number,
  baseCost: number
): number {
  if (resultType === 'window_missed') return -50;
  if (resultType === 'fuel_insufficient') return -30;
  if (resultType === 'orbit_intersect') return -20;

  const efficiencyBonus = Math.max(0, 10 - Math.floor(timeOffset * 5));
  const fuelPenalty = Math.floor((fuelConsumed / baseCost - 1) * 10);
  return efficiencyBonus - fuelPenalty;
}
