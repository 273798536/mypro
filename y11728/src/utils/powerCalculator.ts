import { RideInput, RideResult, PhysicsConstants, DEFAULT_PHYSICS, POWER_ZONES } from '@/types';

export function calculateGearRatio(chainringTeeth: number, cogTeeth: number): number {
  return chainringTeeth / cogTeeth;
}

export function calculateSpeed(
  gearRatio: number,
  cadence: number,
  wheelCircumference: number = DEFAULT_PHYSICS.wheelCircumference
): number {
  const speedMetersPerMinute = gearRatio * cadence * wheelCircumference;
  const speedKmPerHour = speedMetersPerMinute * 60 / 1000;
  return speedKmPerHour;
}

export function slopeToRadians(slope: number, unit: 'percent' | 'degree'): number {
  if (unit === 'degree') {
    return (slope * Math.PI) / 180;
  }
  return Math.atan(slope / 100);
}

export function calculateRollingResistance(
  totalMass: number,
  gravity: number,
  rollingCoeff: number
): number {
  return totalMass * gravity * rollingCoeff;
}

export function calculateGravityResistance(
  totalMass: number,
  gravity: number,
  slopeRad: number
): number {
  return totalMass * gravity * Math.sin(slopeRad);
}

export function calculateAerodynamicDrag(
  speedMs: number,
  windSpeed: number,
  windDirection: 'head' | 'tail' | 'cross',
  airDensity: number,
  dragCoeffArea: number
): number {
  let effectiveWindSpeed = windSpeed;
  if (windDirection === 'tail') {
    effectiveWindSpeed = -windSpeed;
  } else if (windDirection === 'cross') {
    effectiveWindSpeed = windSpeed * 0.5;
  }
  
  const relativeSpeed = speedMs + effectiveWindSpeed;
  const dragForce = 0.5 * airDensity * dragCoeffArea * relativeSpeed * Math.abs(relativeSpeed);
  return dragForce;
}

export function calculatePower(
  input: RideInput,
  constants: PhysicsConstants = DEFAULT_PHYSICS,
  ftp: number = 250
): RideResult {
  const {
    chainringTeeth,
    cogTeeth,
    cadence,
    riderWeight,
    bikeWeight,
    slope,
    slopeUnit,
    windSpeed,
    windDirection,
    duration,
  } = input;

  const totalMass = riderWeight + bikeWeight;
  const gearRatio = calculateGearRatio(chainringTeeth, cogTeeth);
  const speedKmh = calculateSpeed(gearRatio, cadence, constants.wheelCircumference);
  const speedMs = speedKmh / 3.6;
  const slopeRad = slopeToRadians(slope, slopeUnit);

  const rollingResistanceForce = calculateRollingResistance(
    totalMass, constants.gravity, constants.rollingResistanceCoeff);
  const gravityResistanceForce = calculateGravityResistance(
    totalMass, constants.gravity, slopeRad);
  const aerodynamicDragForce = calculateAerodynamicDrag(
    speedMs, windSpeed, windDirection, constants.airDensity, constants.dragCoeffArea);

  const totalResistanceForce = rollingResistanceForce + gravityResistanceForce + aerodynamicDragForce;
  const powerAtWheel = totalResistanceForce * speedMs;
  const power = powerAtWheel / constants.drivetrainEfficiency;

  const powerPerKg = power / riderWeight;
  
  const powerZone = getPowerZone(power, ftp);

  const durationHours = (duration || 3600) / 3600;
  const calories = power * durationHours * 3.6;

  const distance = duration ? speedKmh * (duration / 3600) : undefined;

  return {
    inputId: input.id,
    calculatedAt: Date.now(),
    gearRatio: Number(gearRatio.toFixed(2)),
    speed: Number(speedKmh.toFixed(1)),
    power: Math.round(power),
    powerPerKg: Number(powerPerKg.toFixed(2)),
    powerZone,
    calories: Math.round(calories),
    distance: distance ? Number(distance.toFixed(2)) : undefined,
    rollingResistance: Math.round(rollingResistanceForce * speedMs),
    gravityResistance: Math.round(gravityResistanceForce * speedMs),
    aerodynamicDrag: Math.round(aerodynamicDragForce * speedMs),
  };
}

export function getPowerZone(power: number, ftp: number): number {
  const powerRatio = power / ftp;
  for (let i = POWER_ZONES.length - 1; i >= 0; i--) {
    if (powerRatio >= POWER_ZONES[i].min) {
      return POWER_ZONES[i].zone;
    }
  }
  return 1;
}

export function getPowerZoneInfo(power: number, ftp: number) {
  const zone = getPowerZone(power, ftp);
  return POWER_ZONES.find(z => z.zone === zone) || POWER_ZONES[0];
}

export function generatePowerCurveData(
  baseInput: RideInput, minCadence: number = 60, maxCadence: number = 120, steps: number = 13) {
  const data = [];
  const stepSize = (maxCadence - minCadence) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    const cadence = Math.round(minCadence + stepSize * i);
    const input = { ...baseInput, cadence };
    const result = calculatePower(input);
    data.push({
      cadence,
      power: result.power,
      speed: result.speed,
    });
  }
  return data;
}

export function generateResistanceBreakdown(result: RideResult) {
  const total = result.rollingResistance + result.gravityResistance + result.aerodynamicDrag;
  return [
    { name: '滚动阻力', value: result.rollingResistance, percentage: total > 0 ? (result.rollingResistance / total * 100).toFixed(1) : 0, color: '#52C41A' },
    { name: '坡度阻力', value: result.gravityResistance, percentage: total > 0 ? (result.gravityResistance / total * 100).toFixed(1) : 0, color: '#FAAD14' },
    { name: '空气阻力', value: result.aerodynamicDrag, percentage: total > 0 ? (result.aerodynamicDrag / total * 100).toFixed(1) : 0, color: '#165DFF' },
  ];
}
