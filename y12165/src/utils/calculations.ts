import { LengthUnit, SpeedUnit, DensityUnit, ViscosityUnit, TemperatureUnit } from '@/types';

export function calculateReynolds(
  density: number,
  velocity: number,
  length: number,
  viscosity: number
): number {
  if (viscosity === 0) return 0;
  return (density * velocity * length) / viscosity;
}

export function calculateMach(
  velocity: number,
  temperature: number,
  gamma: number = 1.4,
  R: number = 287.058
): number {
  if (temperature <= 0) return 0;
  const speedOfSound = Math.sqrt(gamma * R * temperature);
  if (speedOfSound === 0) return 0;
  return velocity / speedOfSound;
}

export function calculateScaleRatio(
  modelLength: number,
  realLength: number
): number {
  if (realLength === 0) return 0;
  return modelLength / realLength;
}

export function convertLength(value: number, fromUnit: LengthUnit, toUnit: LengthUnit): number {
  const toMeters: Record<LengthUnit, number> = {
    'm': 1,
    'cm': 0.01,
    'mm': 0.001,
  };
  const inMeters = value * toMeters[fromUnit];
  return inMeters / toMeters[toUnit];
}

export function convertSpeed(value: number, fromUnit: SpeedUnit, toUnit: SpeedUnit): number {
  const toMetersPerSecond: Record<SpeedUnit, number> = {
    'm/s': 1,
    'km/h': 1 / 3.6,
    'ft/s': 0.3048,
  };
  const inMetersPerSecond = value * toMetersPerSecond[fromUnit];
  return inMetersPerSecond / toMetersPerSecond[toUnit];
}

export function convertDensity(value: number, fromUnit: DensityUnit, toUnit: DensityUnit): number {
  const toKgPerM3: Record<DensityUnit, number> = {
    'kg/m³': 1,
    'g/cm³': 1000,
  };
  const inKgPerM3 = value * toKgPerM3[fromUnit];
  return inKgPerM3 / toKgPerM3[toUnit];
}

export function convertViscosity(value: number, fromUnit: ViscosityUnit, toUnit: ViscosityUnit): number {
  const toPaS: Record<ViscosityUnit, number> = {
    'Pa·s': 1,
    'cP': 0.001,
  };
  const inPaS = value * toPaS[fromUnit];
  return inPaS / toPaS[toUnit];
}

export function convertTemperature(value: number, fromUnit: TemperatureUnit, toUnit: TemperatureUnit): number {
  let inKelvin: number;
  
  switch (fromUnit) {
    case 'K':
      inKelvin = value;
      break;
    case '°C':
      inKelvin = value + 273.15;
      break;
    case '°F':
      inKelvin = (value - 32) * 5 / 9 + 273.15;
      break;
    default:
      inKelvin = value;
  }
  
  switch (toUnit) {
    case 'K':
      return inKelvin;
    case '°C':
      return inKelvin - 273.15;
    case '°F':
      return (inKelvin - 273.15) * 9 / 5 + 32;
    default:
      return inKelvin;
  }
}

export function formatScientific(value: number, decimals: number = 2): string {
  if (value === 0) return '0';
  return value.toExponential(decimals);
}

export function formatNumber(value: number, decimals: number = 4): string {
  if (value >= 1e6 || value <= 1e-4) {
    return formatScientific(value, decimals);
  }
  return value.toFixed(decimals);
}
