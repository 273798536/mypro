import SunCalc from 'suncalc';
import { SunPosition } from '../types';

export const DEFAULT_LATITUDE = 31.2304;
export const DEFAULT_LONGITUDE = 121.4737;

export function getSunPosition(
  date: Date,
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): SunPosition {
  const pos = SunCalc.getPosition(date, latitude, longitude);
  return {
    azimuth: pos.azimuth,
    altitude: pos.altitude
  };
}

export function getSunTimes(
  date: Date,
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
) {
  return SunCalc.getTimes(date, latitude, longitude);
}

export function sunPositionToVector(azimuth: number, altitude: number): [number, number, number] {
  const x = Math.cos(altitude) * Math.sin(azimuth);
  const y = Math.sin(altitude);
  const z = Math.cos(altitude) * Math.cos(azimuth);
  return [x, y, z];
}

export function calculateSunlightForArea(
  playgroundBoundary: [number, number][],
  buildings: Array<{ position: [number, number, number]; dimensions: [number, number, number] }>,
  date: Date,
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): boolean {
  const sunPos = getSunPosition(date, latitude, longitude);
  
  if (sunPos.altitude <= 0) {
    return false;
  }

  const sunDir = sunPositionToVector(sunPos.azimuth, sunPos.altitude);

  for (const point of playgroundBoundary) {
    const isPointShadowed = isPointInShadow(
      [point[0], 0, point[1]],
      sunDir,
      buildings
    );
    
    if (!isPointShadowed) {
      return true;
    }
  }

  return false;
}

function isPointInShadow(
  point: [number, number, number],
  sunDir: [number, number, number],
  buildings: Array<{ position: [number, number, number]; dimensions: [number, number, number] }>
): boolean {
  if (sunDir[1] <= 0) return true;

  for (const building of buildings) {
    const [bx, by, bz] = building.position;
    const [bw, bh, bd] = building.dimensions;
    
    const halfW = bw / 2;
    const halfD = bd / 2;
    
    const t = (bh - point[1]) / sunDir[1];
    if (t <= 0) continue;
    
    const shadowX = point[0] + sunDir[0] * t;
    const shadowZ = point[2] + sunDir[2] * t;
    
    if (
      shadowX >= bx - halfW &&
      shadowX <= bx + halfW &&
      shadowZ >= bz - halfD &&
      shadowZ <= bz + halfD
    ) {
      return true;
    }
  }

  return false;
}

export function generateDaySunlightStats(
  playgroundBoundary: [number, number][],
  buildings: Array<{ position: [number, number, number]; dimensions: [number, number, number] }>,
  date: Date,
  intervalMinutes: number = 5,
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): { hasSunlight: boolean; time: Date }[] {
  const results: { hasSunlight: boolean; time: Date }[] = [];
  
  const dayStart = new Date(date);
  dayStart.setHours(6, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(18, 0, 0, 0);

  let currentTime = new Date(dayStart);
  
  while (currentTime <= dayEnd) {
    const hasSunlight = calculateSunlightForArea(
      playgroundBoundary,
      buildings,
      currentTime,
      latitude,
      longitude
    );
    
    results.push({
      hasSunlight,
      time: new Date(currentTime)
    });
    
    currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
  }

  return results;
}
