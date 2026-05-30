export const SPECIFIC_HEAT_WATER = 4.186;
export const SPECIFIC_HEAT_ICE = 2.09;
export const LATENT_HEAT_FUSION = 334;
export const ROOM_TEMP = 25;
export const MAX_TEMP = 100;
export const MIN_TEMP = 0;
export const CONSERVATION_ERROR_THRESHOLD = 0.01;

export interface HeatCalculationParams {
  currentTemp: number;
  currentMass: number;
}

export interface HeatingParams extends HeatCalculationParams {
  power: number;
  duration: number;
}

export interface IceParams extends HeatCalculationParams {
  iceMass: number;
  iceTemp: number;
}

export interface StirringParams extends HeatCalculationParams {
  speed: number;
  duration: number;
}

export function calculateHeating({
  currentTemp,
  currentMass,
  power,
  duration,
}: HeatingParams) {
  const Q_in = power * duration;
  const deltaT = Q_in / (currentMass * SPECIFIC_HEAT_WATER);
  const finalTemp = currentTemp + deltaT;
  const deltaU = Q_in;

  const isAbnormal = finalTemp > MAX_TEMP || finalTemp < MIN_TEMP;
  const abnormalType = isAbnormal ? 'temperature_bound' as const : undefined;

  return {
    Q_in,
    Q_out: 0,
    deltaU,
    deltaT,
    finalTemp: Math.max(MIN_TEMP, Math.min(MAX_TEMP, finalTemp)),
    conservationCheck: true,
    errorMargin: 0,
    isAbnormal,
    abnormalType,
  };
}

export function calculateIceAdd({
  currentTemp,
  currentMass,
  iceMass,
  iceTemp,
}: IceParams) {
  const Q1 = iceMass * SPECIFIC_HEAT_ICE * (0 - iceTemp);
  const Q2 = iceMass * LATENT_HEAT_FUSION;
  
  const c = SPECIFIC_HEAT_WATER;
  const finalTemp = (currentMass * c * currentTemp - Q1 - Q2) / 
                    ((currentMass + iceMass) * c);
  
  const Q_out = currentMass * c * (currentTemp - finalTemp);
  const Q_in = Q1 + Q2 + iceMass * c * (finalTemp - 0);
  
  const errorMargin = Q_out > 0 ? Math.abs(Q_in - Q_out) / Q_out : 0;
  const conservationCheck = errorMargin < CONSERVATION_ERROR_THRESHOLD;
  
  const isTempOutOfBounds = finalTemp < MIN_TEMP || finalTemp > MAX_TEMP;
  const isAbnormal = !conservationCheck || isTempOutOfBounds;
  
  let abnormalType: 'conservation' | 'temperature_bound' | undefined;
  if (!conservationCheck) {
    abnormalType = 'conservation';
  } else if (isTempOutOfBounds) {
    abnormalType = 'temperature_bound';
  }

  return {
    Q_in,
    Q_out,
    deltaU: Q_in - Q_out,
    deltaT: finalTemp - currentTemp,
    finalTemp: Math.max(MIN_TEMP, Math.min(MAX_TEMP, finalTemp)),
    finalMass: currentMass + iceMass,
    conservationCheck,
    errorMargin,
    isAbnormal,
    abnormalType,
  };
}

export function calculateStirring({
  currentTemp,
  currentMass,
  speed,
  duration,
}: StirringParams) {
  const frictionHeat = speed * duration * 0.1;
  
  const surfaceArea = 0.01;
  const heatTransferCoeff = 10 + speed * 0.5;
  const deltaT_env = currentTemp - ROOM_TEMP;
  const Q_out = heatTransferCoeff * surfaceArea * deltaT_env * duration;
  
  const Q_in = frictionHeat;
  const netHeat = Q_in - Q_out;
  
  const deltaT = netHeat / (currentMass * SPECIFIC_HEAT_WATER);
  const finalTemp = currentTemp + deltaT;

  return {
    Q_in,
    Q_out,
    deltaU: netHeat,
    deltaT,
    finalTemp: Math.max(MIN_TEMP, Math.min(MAX_TEMP, finalTemp)),
    conservationCheck: true,
    errorMargin: 0,
    isAbnormal: false,
  };
}

export function checkConservation(
  Q_in: number,
  Q_out: number,
  deltaU: number
): { valid: boolean; error: number } {
  const expectedDeltaU = Q_in - Q_out;
  const error = Math.abs(deltaU - expectedDeltaU) / (Math.abs(expectedDeltaU) || 1);
  return {
    valid: error < CONSERVATION_ERROR_THRESHOLD,
    error,
  };
}
