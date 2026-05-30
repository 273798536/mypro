import type {
  Submarine,
  BallastTank,
  TreasureChest,
  OceanEnvironment,
  BuoyancyCalculation,
} from "./types";

let calcIdCounter = 0;

export function getFluidDensity(
  y: number,
  environment: OceanEnvironment
): number {
  for (const zone of environment.densityZones) {
    if (y >= zone.startY && y <= zone.endY) {
      return zone.density;
    }
  }
  return environment.baseDensity;
}

export function calculateTotalMass(
  submarine: Submarine,
  ballastTank: BallastTank,
  treasure: TreasureChest | null
): number {
  let total = submarine.mass;
  total += ballastTank.currentWater * ballastTank.waterDensity;
  if (treasure && treasure.collected) {
    total += treasure.mass;
  }
  return total;
}

export function calculateDisplacedVolume(
  submarine: Submarine,
  ballastTank: BallastTank,
  treasure: TreasureChest | null
): number {
  let vol = submarine.volume + ballastTank.maxVolume;
  if (treasure && treasure.collected) {
    vol += treasure.volume;
  }
  return vol;
}

export function calculateBuoyancy(
  submarine: Submarine,
  ballastTank: BallastTank,
  treasure: TreasureChest | null,
  environment: OceanEnvironment,
  trigger: string
): BuoyancyCalculation {
  const fluidDensity = submarine.y > 0 ? getFluidDensity(submarine.y, environment) : environment.baseDensity;

  const totalDisplacedVolume = calculateDisplacedVolume(submarine, ballastTank, treasure);

  const totalMass = calculateTotalMass(submarine, ballastTank, treasure);

  const buoyantForce = fluidDensity * environment.gravity * totalDisplacedVolume;
  const gravitationalForce = totalMass * environment.gravity;
  const netForce = buoyantForce - gravitationalForce;

  const treasureImpact = treasure && treasure.collected ? treasure.mass * environment.gravity : 0;

  calcIdCounter++;
  return {
    id: `calc-${calcIdCounter}`,
    timestamp: Date.now(),
    fluidDensity,
    displacedVolume: totalDisplacedVolume,
    gravity: environment.gravity,
    buoyantForce,
    gravitationalForce,
    netForce,
    formula: `F浮=${fluidDensity.toFixed(0)}×${environment.gravity}×${totalDisplacedVolume.toFixed(3)}=${buoyantForce.toFixed(1)}N`,
    trigger,
    totalMass,
    treasureImpact,
  };
}
