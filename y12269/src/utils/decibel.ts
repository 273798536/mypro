import { DecibelCalculation, PlacedSource, SoundSource, TimePeriod, CityArea } from '../types';

export function calculateDecibelSum(decibels: number[]): number {
  if (decibels.length === 0) return 0;
  const sum = decibels.reduce((acc, db) => acc + Math.pow(10, db / 10), 0);
  return Math.round(10 * Math.log10(sum) * 10) / 10;
}

export function calculateRawSum(decibels: number[]): number {
  return Math.round(decibels.reduce((acc, db) => acc + db, 0) * 10) / 10;
}

export function getActiveDecibelsForArea(
  areaId: string,
  placedSources: PlacedSource[],
  soundSources: SoundSource[],
  period: TimePeriod,
): number[] {
  return placedSources
    .filter((ps) => ps.areaId === areaId && ps.isActive)
    .map((ps) => {
      const source = soundSources.find((s) => s.id === ps.sourceId);
      if (!source) return 0;
      if (!source.validPeriods.includes(period)) return 0;
      return source.baseDecibel;
    })
    .filter((db) => db > 0);
}

export function calculateAreaDecibels(
  areaId: string,
  placedSources: PlacedSource[],
  soundSources: SoundSource[],
  period: TimePeriod,
): DecibelCalculation {
  const decibels = getActiveDecibelsForArea(areaId, placedSources, soundSources, period);
  const sourceIds = placedSources
    .filter((ps) => ps.areaId === areaId && ps.isActive)
    .map((ps) => ps.sourceId);

  return {
    areaId,
    sources: sourceIds,
    rawSum: calculateRawSum(decibels),
    correctValue: calculateDecibelSum(decibels),
    isOverlap: decibels.length > 1,
    overlapCount: Math.max(0, decibels.length - 1),
  };
}

export function calculateAllAreasDecibels(
  areas: CityArea[],
  placedSources: PlacedSource[],
  soundSources: SoundSource[],
  period: TimePeriod,
): Record<string, DecibelCalculation> {
  const result: Record<string, DecibelCalculation> = {};
  areas.forEach((area) => {
    result[area.id] = calculateAreaDecibels(area.id, placedSources, soundSources, period);
  });
  return result;
}

export function isOverThreshold(
  currentDb: number,
  area: CityArea,
  period: TimePeriod,
): boolean {
  const threshold = period === 'day' ? area.dayThreshold : area.nightThreshold;
  return currentDb > threshold;
}

export function getThreshold(area: CityArea, period: TimePeriod): number {
  return period === 'day' ? area.dayThreshold : area.nightThreshold;
}

export function formatDecibel(value: number): string {
  return `${value.toFixed(1)} dB`;
}
