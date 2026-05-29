import { FloorData, EntranceData, DateType } from '../types/parking';

export const calculateFloorPressure = (occupied: number, total: number): number => {
  if (total <= 0) return 0;
  const ratio = occupied / total;
  return Math.max(0, Math.min(1, ratio));
};

export const calculateEntrancePressure = (queueLength: number, incomingCars: number, maxQueue: number = 20): number => {
  const queuePressure = Math.min(1, queueLength / maxQueue);
  const incomingPressure = Math.min(1, incomingCars / 100);
  return Math.max(0, Math.min(1, queuePressure * 0.7 + incomingPressure * 0.3));
};

export const calculateOverallPressure = (
  floors: FloorData[],
  entrances: EntranceData[],
  dateType: DateType,
  hourOfDay: number
): number => {
  const avgFloorPressure = floors.reduce((sum, f) => sum + f.pressureLevel, 0) / (floors.length || 1);
  const avgEntrancePressure = entrances.reduce((sum, e) => sum + e.pressureLevel, 0) / (entrances.length || 1);
  const timeFactor = getTimePressureFactor(hourOfDay, dateType);
  const eventFactor = dateType === 'event' ? 0.3 : 0;
  
  return Math.max(0, Math.min(1, 
    avgFloorPressure * 0.4 + 
    avgEntrancePressure * 0.4 + 
    timeFactor * 0.15 + 
    eventFactor * 0.05
  ));
};

export const getTimePressureFactor = (hour: number, dateType: DateType): number => {
  const peaks = dateType === 'workday' 
    ? [8, 12, 18] 
    : dateType === 'weekend'
    ? [11, 15, 19]
    : [10, 14, 18, 21];
  
  let maxDist = Infinity;
  for (const peak of peaks) {
    const dist = Math.abs(hour - peak);
    if (dist < maxDist) maxDist = dist;
  }
  
  return Math.max(0, 1 - maxDist / 4);
};

export const calculateFloorContribution = (floors: FloorData[]): number => {
  const maxFloorPressure = Math.max(...floors.map(f => f.pressureLevel), 0);
  const fullFloors = floors.filter(f => f.overflowStatus === 'full').length;
  return Math.max(0, Math.min(1, maxFloorPressure * 0.7 + fullFloors * 0.15));
};

export const calculateEntranceContribution = (entrances: EntranceData[]): number => {
  const maxEntrancePressure = Math.max(...entrances.map(e => e.pressureLevel), 0);
  const blockedEntrances = entrances.filter(e => e.blockageStatus === 'blocked').length;
  return Math.max(0, Math.min(1, maxEntrancePressure * 0.7 + blockedEntrances * 0.15));
};

export const calculateTimeContribution = (hour: number, dateType: DateType): number => {
  return getTimePressureFactor(hour, dateType);
};

export const calculateEventContribution = (dateType: DateType, hour: number): number => {
  if (dateType !== 'event') return 0;
  const eventPeak = getTimePressureFactor(hour, dateType);
  return Math.min(1, 0.3 + eventPeak * 0.4);
};
