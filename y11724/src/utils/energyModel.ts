import type { DroneSpec, BatterySpec, CalcParams, CalcResult, EnergyBreakdown, Warning } from '../types';

const CLIMB_RATE = 3;
const HOVER_TIME = 0.5;
const AIR_DENSITY = 1.225;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function cosDeg(deg: number): number {
  return Math.cos(degToRad(deg));
}

function calcWindFactor(
  windSpeed: number,
  windDirection: number,
  cruiseSpeed: number,
  flightDirection: number
): number {
  const relativeAngle = Math.abs(windDirection - flightDirection) % 360;
  const cosAngle = cosDeg(relativeAngle);
  
  if (cosAngle >= 0) {
    return 1 + (windSpeed / cruiseSpeed) * cosAngle;
  } else {
    const tailwindRatio = (windSpeed / cruiseSpeed) * Math.abs(cosAngle);
    return Math.max(0.5, 1 - tailwindRatio);
  }
}

function calcDragPower(
  drone: DroneSpec,
  windSpeed: number,
  windDirection: number,
  flightDirection: number
): number {
  const relativeAngle = Math.abs(windDirection - flightDirection) % 360;
  const effectiveWind = windSpeed * Math.abs(cosDeg(relativeAngle));
  const totalSpeed = drone.cruiseSpeed + effectiveWind;
  
  return 0.5 * AIR_DENSITY * drone.dragCoefficient * drone.frontalArea * Math.pow(totalSpeed, 3);
}

export function calcEnergy(
  params: CalcParams,
  drone: DroneSpec,
  battery: BatterySpec
): CalcResult {
  const warnings: Warning[] = [];
  const grossWeight = drone.emptyWeight + battery.weight + params.payload;
  const weightRatio = grossWeight / drone.emptyWeight;
  
  const outDirection = 90;
  const backDirection = 270;
  
  const windFactorOut = calcWindFactor(
    params.windSpeed,
    params.windDirection,
    drone.cruiseSpeed,
    outDirection
  );
  const windFactorBack = calcWindFactor(
    params.windSpeed,
    params.windDirection,
    drone.cruiseSpeed,
    backDirection
  );
  
  const climbTime = params.altitude / CLIMB_RATE / 3600;
  const hoverTime = HOVER_TIME / 60;
  
  const hoverEnergy = drone.hoverPower * hoverTime * weightRatio;
  const climbEnergy = drone.hoverPower * 1.5 * climbTime * weightRatio;
  
  const outDistance = params.routeDistance / 2;
  const backDistance = params.routeDistance / 2;
  
  const dragPowerOut = calcDragPower(drone, params.windSpeed, params.windDirection, outDirection);
  const dragPowerBack = calcDragPower(drone, params.windSpeed, params.windDirection, backDirection);
  
  const outTime = outDistance / (drone.cruiseSpeed * 1000) / 3600;
  const backTime = backDistance / (drone.cruiseSpeed * 1000) / 3600;
  
  const baseCruisePowerOut = drone.hoverPower * (1 + Math.pow(drone.cruiseSpeed, 2) / 100);
  const baseCruisePowerBack = drone.hoverPower * (1 + Math.pow(drone.cruiseSpeed, 2) / 100);
  
  const cruiseOutEnergy = (baseCruisePowerOut + dragPowerOut) * outTime * weightRatio * windFactorOut;
  const cruiseBackEnergy = (baseCruisePowerBack + dragPowerBack) * backTime * weightRatio * windFactorBack;
  
  const noWindFactorOut = calcWindFactor(0, 0, drone.cruiseSpeed, outDirection);
  const noWindFactorBack = calcWindFactor(0, 0, drone.cruiseSpeed, backDirection);
  
  const cruiseOutNoWind = (baseCruisePowerOut + dragPowerOut) * outTime * weightRatio * noWindFactorOut;
  const cruiseBackNoWind = (baseCruisePowerBack + dragPowerBack) * backTime * weightRatio * noWindFactorBack;
  
  const windPenalty = (cruiseOutEnergy - cruiseOutNoWind) + (cruiseBackEnergy - cruiseBackNoWind);
  const windPenaltyAdj = Math.max(0, windPenalty);
  
  const basePayloadEnergy = hoverEnergy + climbEnergy + cruiseOutEnergy + cruiseBackEnergy;
  const nominalPayloadEnergy = (drone.hoverPower * hoverTime) + 
    (drone.hoverPower * 1.5 * climbTime) + 
    (baseCruisePowerOut * outTime) + 
    (baseCruisePowerBack * backTime);
  const payloadPenalty = basePayloadEnergy - nominalPayloadEnergy;
  const payloadPenaltyAdj = Math.max(0, payloadPenalty);
  
  const flightEnergy = hoverEnergy + climbEnergy + cruiseOutEnergy + cruiseBackEnergy;
  const reserveEnergy = flightEnergy * params.returnReserveRatio;
  const totalEnergyNeeded = flightEnergy + reserveEnergy;
  
  const availableEnergy = battery.capacityWh * battery.dischargeEfficiency;
  const remainingEnergy = availableEnergy - totalEnergyNeeded;
  
  const totalTimeHours = hoverTime + climbTime + outTime + backTime;
  const flightTime = totalTimeHours * 60;
  
  const energyPerKm = flightEnergy / (params.routeDistance / 1000);
  const safeEnergy = availableEnergy - reserveEnergy;
  const effectiveRange = (safeEnergy / energyPerKm) * 1000;
  
  const breakdown: EnergyBreakdown = {
    hoverEnergy: Math.round(hoverEnergy * 10) / 10,
    climbEnergy: Math.round(climbEnergy * 10) / 10,
    cruiseOutEnergy: Math.round(cruiseOutEnergy * 10) / 10,
    cruiseBackEnergy: Math.round(cruiseBackEnergy * 10) / 10,
    windPenalty: Math.round(windPenaltyAdj * 10) / 10,
    payloadPenalty: Math.round(payloadPenaltyAdj * 10) / 10
  };
  
  const result: CalcResult = {
    totalEnergyNeeded: Math.round(totalEnergyNeeded * 10) / 10,
    breakdown,
    reserveEnergy: Math.round(reserveEnergy * 10) / 10,
    remainingEnergy: Math.round(remainingEnergy * 10) / 10,
    flightTime: Math.round(flightTime * 10) / 10,
    effectiveRange: Math.round(effectiveRange * 10) / 10,
    warnings: []
  };
  
  return result;
}
