import type { Nozzle, CalculationInput, SprayQuality } from '../types';

const NOZZLE_TYPE_COEFFICIENT = 1200;
const DEFAULT_SPRAY_HEIGHT = 0.5;

export function calculateDropletSize(
  pressure: number,
  orificeDiameter: number,
  viscosity: number = 1
): number {
  const vmd = NOZZLE_TYPE_COEFFICIENT 
    * Math.pow(pressure, -0.4) 
    * Math.pow(orificeDiameter, 0.5) 
    * Math.pow(viscosity, 0.2);
  return Math.round(vmd * 10) / 10;
}

export function calculateCoverageWidth(
  sprayAngle: number,
  sprayHeight: number = DEFAULT_SPRAY_HEIGHT,
  pressure: number
): number {
  const angleRad = (sprayAngle * Math.PI) / 180;
  const pressureFactor = 0.85 + (Math.min(pressure, 10) / 10) * 0.2;
  const width = 2 * sprayHeight * Math.tan(angleRad / 2) * pressureFactor;
  return Math.round(width * 100) / 100;
}

export function determineSprayQuality(dropletSize: number): SprayQuality {
  if (dropletSize < 150) return 'EXCELLENT';
  if (dropletSize < 250) return 'GOOD';
  if (dropletSize < 350) return 'FAIR';
  return 'POOR';
}

export function getSprayQualityLabel(quality: SprayQuality): string {
  const labels: Record<SprayQuality, string> = {
    EXCELLENT: '优秀',
    GOOD: '良好',
    FAIR: '一般',
    POOR: '较差'
  };
  return labels[quality];
}

export function getSprayQualityColor(quality: SprayQuality): string {
  const colors: Record<SprayQuality, string> = {
    EXCELLENT: '#00B42A',
    GOOD: '#165DFF',
    FAIR: '#FF7D00',
    POOR: '#F53F3F'
  };
  return colors[quality];
}

export function performCalculation(
  nozzle: Nozzle,
  input: CalculationInput
) {
  const viscosity = input.viscosity ?? 1;
  const sprayHeight = input.sprayHeight ?? DEFAULT_SPRAY_HEIGHT;
  
  const dropletSize = calculateDropletSize(
    input.pressure,
    nozzle.orificeDiameter,
    viscosity
  );
  
  const coverageWidth = calculateCoverageWidth(
    nozzle.sprayAngle,
    sprayHeight,
    input.pressure
  );
  
  const sprayQuality = determineSprayQuality(dropletSize);
  
  return {
    dropletSize,
    coverageWidth,
    sprayQuality,
    isEstimate: !input.viscosity
  };
}

export function formatPressureRange(nozzle: Nozzle): string {
  return `${nozzle.minPressure} - ${nozzle.maxPressure} bar`;
}
