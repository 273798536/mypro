import { Measurement } from '../types';
import { linearRegression } from './linearFit';

export function calculateTheoreticalSpeed(temperature: number): number {
  return 331.45 * Math.sqrt(1 + temperature / 273.15);
}

export function correctTemperature(
  length: number,
  temperature: number,
  referenceTemp: number = 20
): number {
  const tempFactor = Math.sqrt((273.15 + temperature) / (273.15 + referenceTemp));
  return length * tempFactor;
}

export function calculateSoundSpeed(
  measurements: Measurement[],
  frequency: number,
  temperature: number,
  excludeOutliers: boolean = true
): { speed: number; fitResult: ReturnType<typeof linearRegression> } {
  const validMeasurements = excludeOutliers
    ? measurements.filter((m) => !m.isOutlier)
    : measurements;

  const points = validMeasurements.map((m) => ({
    x: m.nodeNumber,
    y: m.tubeLength,
  }));

  const fitResult = linearRegression(points);
  const wavelength = 2 * fitResult.slope;
  const speed = frequency * wavelength * 0.01;

  return { speed, fitResult };
}

export function calculateRelativeError(
  experimental: number,
  theoretical: number
): number {
  return Math.abs((experimental - theoretical) / theoretical) * 100;
}
