import { SunPosition, Season } from '@/types';

const SEASON_DATES: Record<Season, { month: number; day: number }> = {
  spring: { month: 3, day: 21 },
  summer: { month: 6, day: 22 },
  autumn: { month: 9, day: 23 },
  winter: { month: 12, day: 22 },
};

export function calculateSunPosition(
  latitude: number,
  longitude: number,
  season: Season,
  hour: number,
  timezoneOffset: number = 8
): SunPosition {
  const { month, day } = SEASON_DATES[season];
  const year = 2024;
  
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfYear = Math.floor((date.getTime() - Date.UTC(year, 0, 0)) / (1000 * 60 * 60 * 24));
  
  const declination = -23.45 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);
  
  const localSolarTime = hour + (longitude / 15) - timezoneOffset;
  const hourAngle = 15 * (localSolarTime - 12);
  
  const latRad = (latitude * Math.PI) / 180;
  const decRad = (declination * Math.PI) / 180;
  const haRad = (hourAngle * Math.PI) / 180;
  
  const sinAltitude = 
    Math.sin(latRad) * Math.sin(decRad) + 
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  
  const altitude = Math.max(-90, Math.min(90, (Math.asin(sinAltitude) * 180) / Math.PI));
  
  const cosAzimuth = 
    (Math.sin(decRad) * Math.cos(latRad) - Math.cos(decRad) * Math.sin(latRad) * Math.cos(haRad)) /
    Math.cos((altitude * Math.PI) / 180);
  
  let azimuth = (Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * 180) / Math.PI;
  
  if (Math.sin(haRad) > 0) {
    azimuth = 360 - azimuth;
  }
  
  return {
    hour,
    altitude: Math.round(altitude * 100) / 100,
    azimuth: Math.round(azimuth * 100) / 100,
  };
}

export function generateSunPath(
  latitude: number,
  longitude: number,
  timezoneOffset: number = 8
): Record<Season, SunPosition[]> {
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  const result: Record<Season, SunPosition[]> = {} as Record<Season, SunPosition[]>;
  
  for (const season of seasons) {
    const positions: SunPosition[] = [];
    for (let hour = 5; hour <= 19; hour += 0.5) {
      const pos = calculateSunPosition(latitude, longitude, season, hour, timezoneOffset);
      if (pos.altitude > 0) {
        positions.push(pos);
      }
    }
    result[season] = positions;
  }
  
  return result;
}

export function sunPositionTo3D(
  sunPos: SunPosition,
  distance: number = 100
): [number, number, number] {
  const altRad = (sunPos.altitude * Math.PI) / 180;
  const azRad = (sunPos.azimuth * Math.PI) / 180;
  
  const x = distance * Math.cos(altRad) * Math.sin(azRad);
  const y = distance * Math.sin(altRad);
  const z = distance * Math.cos(altRad) * Math.cos(azRad);
  
  return [x, y, z];
}

export function getSunColor(altitude: number): string {
  if (altitude < 5) return '#FF6B35';
  if (altitude < 15) return '#FFA500';
  if (altitude < 30) return '#FFD700';
  return '#FFFACD';
}

export function getSunIntensity(altitude: number): number {
  if (altitude <= 0) return 0;
  return Math.min(1.5, 0.3 + (altitude / 90) * 1.2);
}

export function interpolateSunPosition(
  positions: SunPosition[],
  currentTime: number
): SunPosition | null {
  if (positions.length === 0) return null;
  
  for (let i = 0; i < positions.length - 1; i++) {
    if (currentTime >= positions[i].hour && currentTime <= positions[i + 1].hour) {
      const t = (currentTime - positions[i].hour) / (positions[i + 1].hour - positions[i].hour);
      return {
        hour: currentTime,
        altitude: positions[i].altitude + t * (positions[i + 1].altitude - positions[i].altitude),
        azimuth: positions[i].azimuth + t * (positions[i + 1].azimuth - positions[i].azimuth),
      };
    }
  }
  
  if (currentTime < positions[0].hour) return positions[0];
  return positions[positions.length - 1];
}

export function getSeasonName(season: Season): string {
  const names: Record<Season, string> = {
    spring: '春分',
    summer: '夏至',
    autumn: '秋分',
    winter: '冬至',
  };
  return names[season];
}

export function getSeasonDescription(season: Season): string {
  const descriptions: Record<Season, string> = {
    spring: '3月21日前后，昼夜平分，太阳直射赤道',
    summer: '6月22日前后，北半球白昼最长，太阳直射北回归线',
    autumn: '9月23日前后，昼夜平分，太阳直射赤道',
    winter: '12月22日前后，北半球白昼最短，太阳直射南回归线',
  };
  return descriptions[season];
}

export function formatTime(hour: number): string {
  const hours = Math.floor(hour);
  const minutes = Math.round((hour - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function parseTimezone(timezone: string): number {
  const match = timezone.match(/UTC([+-]?\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 8;
}
