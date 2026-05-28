import {
  CalculationInput,
  CalculationResult,
  AREA_UNIT_FACTORS,
  FORCE_UNIT_FACTORS,
  LENGTH_UNIT_FACTORS,
  AreaUnit,
  ForceUnit,
  LengthUnit,
  PressureUnit,
  EnergyUnit,
} from '../types';

function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  const valueInM2 = value * AREA_UNIT_FACTORS[from];
  return valueInM2 / AREA_UNIT_FACTORS[to];
}

function convertForce(value: number, from: ForceUnit, to: ForceUnit): number {
  const valueInN = value * FORCE_UNIT_FACTORS[from];
  return valueInN / FORCE_UNIT_FACTORS[to];
}

function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  const valueInM = value * LENGTH_UNIT_FACTORS[from];
  return valueInM / LENGTH_UNIT_FACTORS[to];
}

function getBestPressureUnit(pressurePa: number): PressureUnit {
  if (pressurePa >= 1e6) return 'MPa';
  if (pressurePa >= 1e3) return 'kPa';
  return 'Pa';
}

function getBestEnergyUnit(energyJ: number): EnergyUnit {
  if (energyJ >= 1000) return 'kJ';
  return 'J';
}

function convertPressure(value: number, unit: PressureUnit): number {
  switch (unit) {
    case 'MPa': return value / 1e6;
    case 'kPa': return value / 1e3;
    default: return value;
  }
}

function convertEnergy(value: number, unit: EnergyUnit): number {
  switch (unit) {
    case 'kJ': return value / 1000;
    default: return value;
  }
}

export function calculateHydraulicJack(input: CalculationInput): CalculationResult {
  const smallAreaM2 = convertArea(input.smallPistonArea, input.smallPistonAreaUnit, 'm²');
  const largeAreaM2 = convertArea(input.largePistonArea, input.largePistonAreaUnit, 'm²');
  const inputForceN = convertForce(input.inputForce, input.inputForceUnit, 'N');
  const inputStrokeM = convertLength(input.inputStroke, input.inputStrokeUnit, 'm');

  const pressurePa = inputForceN / smallAreaM2;
  const amplificationRatio = largeAreaM2 / smallAreaM2;
  const outputForceN = pressurePa * largeAreaM2 * input.efficiency;
  const strokeRatio = smallAreaM2 / largeAreaM2;
  const outputStrokeM = inputStrokeM * strokeRatio * input.efficiency;
  const inputWorkJ = inputForceN * inputStrokeM;
  const outputWorkJ = outputForceN * outputStrokeM;
  const energyLossJ = inputWorkJ - outputWorkJ;

  const pressureUnit = getBestPressureUnit(pressurePa);
  const outputForceUnit: ForceUnit = outputForceN >= 1000 ? 'kN' : 'N';
  const outputStrokeUnit: LengthUnit = outputStrokeM < 0.01 ? 'mm' : outputStrokeM < 1 ? 'cm' : 'm';
  const inputWorkUnit = getBestEnergyUnit(inputWorkJ);
  const outputWorkUnit = getBestEnergyUnit(outputWorkJ);
  const energyLossUnit = getBestEnergyUnit(energyLossJ);

  return {
    pressure: convertPressure(pressurePa, pressureUnit),
    pressureUnit,
    outputForce: convertForce(outputForceN, 'N', outputForceUnit),
    outputForceUnit,
    amplificationRatio,
    outputStroke: convertLength(outputStrokeM, 'm', outputStrokeUnit),
    outputStrokeUnit,
    strokeRatio,
    inputWork: convertEnergy(inputWorkJ, inputWorkUnit),
    inputWorkUnit,
    outputWork: convertEnergy(outputWorkJ, outputWorkUnit),
    outputWorkUnit,
    energyLoss: convertEnergy(energyLossJ, energyLossUnit),
    energyLossUnit,
    isValid: true,
  };
}

export function formatNumber(value: number, decimals: number = 4): string {
  if (Math.abs(value) < 1e-10) return '0';
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

export { convertArea, convertForce, convertLength };
