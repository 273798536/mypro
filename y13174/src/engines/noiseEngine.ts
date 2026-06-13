import type { DeflectionRecord } from '@/types';

export function detectNoise(records: DeflectionRecord[]): DeflectionRecord[] {
  if (records.length === 0) return [];

  const values = records.map((r) => r.deflectionValue);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  return records.map((record) => {
    const noiseScore = stddev === 0 ? 0 : Math.abs(record.deflectionValue - mean) / (3 * stddev);
    let status = record.status;
    if (noiseScore > 1.0 && record.status === 'PASS') {
      status = 'NOISE_SUSPECTED';
    }
    return { ...record, noiseScore, status };
  });
}

export function isBoundarySample(records: DeflectionRecord[]): DeflectionRecord[] {
  if (records.length === 0) return [];

  const values = records.map((r) => r.deflectionValue);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  return records.filter((record) => {
    const noiseScore = stddev === 0 ? 0 : Math.abs(record.deflectionValue - mean) / (3 * stddev);
    return record.isBoundary || noiseScore > 0.8;
  });
}
