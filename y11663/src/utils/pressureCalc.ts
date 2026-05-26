
import type {
  Airfoil,
  ExperimentParams,
  Point3D,
  PressureField,
  SamplingPoint,
} from '../types';
import {
  getLowerSurfacePoints,
  getUpperSurfacePoints,
  rotateCoordinates,
} from './airfoilMath';

const STANDARD_PRESSURE = 101325;

export function calculatePressureField(
  airfoil: Airfoil,
  params: ExperimentParams,
  missingPoints: number = 0
): PressureField {
  const alphaRad = (params.angleOfAttack * Math.PI) / 180;
  const rotatedCoords = rotateCoordinates(
    airfoil.coordinates,
    params.angleOfAttack,
    0.25 * airfoil.chordLength,
    0
  );

  const upperCoords = getUpperSurfacePoints(rotatedCoords);
  const lowerCoords = getLowerSurfacePoints(rotatedCoords);

  const samplingPoints: SamplingPoint[] = [];
  const numUpperPoints = 10;
  const numLowerPoints = 10;

  for (let i = 0; i < numUpperPoints; i++) {
    const coordIndex = Math.floor((i / (numUpperPoints - 1)) * (upperCoords.length - 1));
    const coord = upperCoords[coordIndex];
    const xRatio = i / (numUpperPoints - 1);

    const cp = calculatePressureCoefficient(xRatio, params.angleOfAttack, true);
    const pressure = cpToPressure(cp, params);

    const point3D: Point3D = {
      x: coord.x,
      y: coord.y,
      z: 0,
    };

    samplingPoints.push({
      id: `upper-${i}`,
      position: point3D,
      pressure,
      isValid: true,
      surface: i === 0 ? 'leading' : i === numUpperPoints - 1 ? 'trailing' : 'upper',
    });
  }

  for (let i = 1; i < numLowerPoints - 1; i++) {
    const coordIndex = Math.floor((i / (numLowerPoints - 1)) * (lowerCoords.length - 1));
    const coord = lowerCoords[coordIndex];
    const xRatio = i / (numLowerPoints - 1);

    const cp = calculatePressureCoefficient(xRatio, params.angleOfAttack, false);
    const pressure = cpToPressure(cp, params);

    const point3D: Point3D = {
      x: coord.x,
      y: coord.y,
      z: 0,
    };

    samplingPoints.push({
      id: `lower-${i}`,
      position: point3D,
      pressure,
      isValid: true,
      surface: 'lower',
    });
  }

  if (missingPoints > 0) {
    const shuffled = [...samplingPoints].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(missingPoints, shuffled.length); i++) {
      const point = shuffled[i];
      const original = samplingPoints.find((p) => p.id === point.id);
      if (original) {
        original.pressure = null;
        original.isValid = false;
      }
    }
  }

  const validPressures = samplingPoints
    .filter((p) => p.isValid && p.pressure !== null)
    .map((p) => p.pressure as number);

  const minPressure = validPressures.length > 0 ? Math.min(...validPressures) : 0;
  const maxPressure = validPressures.length > 0 ? Math.max(...validPressures) : 0;

  const colorInverted = detectColorInversion(samplingPoints, params.angleOfAttack);

  return {
    airfoilId: airfoil.id,
    params,
    samplingPoints,
    minPressure,
    maxPressure,
    colorInverted,
  };
}

function calculatePressureCoefficient(
  xRatio: number,
  angleOfAttack: number,
  isUpperSurface: boolean
): number {
  const alphaRad = (angleOfAttack * Math.PI) / 180;
  const x = Math.max(0.01, Math.min(0.99, xRatio));

  const baseCp = 2 * Math.sqrt(1 / x - 1) * Math.sin(alphaRad);

  let surfaceFactor = 1;
  if (isUpperSurface) {
    surfaceFactor = 1 + 0.5 * Math.sin(Math.PI * x);
  } else {
    surfaceFactor = 1 - 0.3 * Math.sin(Math.PI * x);
  }

  const cp = 1 - Math.pow(1 + baseCp * surfaceFactor, 2);

  return Math.max(-5, Math.min(1.5, cp));
}

function cpToPressure(cp: number, params: ExperimentParams): number {
  const dynamicPressure = 0.5 * params.airDensity * params.velocity * params.velocity;
  return STANDARD_PRESSURE + cp * dynamicPressure;
}

function detectColorInversion(
  samplingPoints: SamplingPoint[],
  angleOfAttack: number
): boolean {
  const upperPoints = samplingPoints.filter(
    (p) => p.surface === 'upper' && p.isValid && p.pressure !== null
  );
  const lowerPoints = samplingPoints.filter(
    (p) => p.surface === 'lower' && p.isValid && p.pressure !== null
  );

  if (upperPoints.length === 0 || lowerPoints.length === 0) return false;

  const avgUpperPressure =
    upperPoints.reduce((sum, p) => sum + (p.pressure || 0), 0) / upperPoints.length;
  const avgLowerPressure =
    lowerPoints.reduce((sum, p) => sum + (p.pressure || 0), 0) / lowerPoints.length;

  if (angleOfAttack > 0) {
    return avgUpperPressure > avgLowerPressure;
  } else if (angleOfAttack < 0) {
    return avgLowerPressure > avgUpperPressure;
  }

  return false;
}

export function calculateReynoldsNumber(
  velocity: number,
  chordLength: number,
  kinematicViscosity: number = 1.5e-5
): number {
  return (velocity * chordLength) / kinematicViscosity;
}
