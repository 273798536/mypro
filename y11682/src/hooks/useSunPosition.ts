import { useMemo } from 'react';
import { SunPosition } from '../types';
import { getSunPosition, DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from '../utils/suncalc';

export function useSunPosition(
  date: Date,
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): SunPosition {
  return useMemo(() => {
    return getSunPosition(date, latitude, longitude);
  }, [date, latitude, longitude]);
}

export function useSunPositionString(
  dateStr: string,
  hour: number,
  minute: number,
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): SunPosition {
  const date = useMemo(() => {
    const d = new Date(dateStr);
    d.setHours(hour, minute, 0, 0);
    return d;
  }, [dateStr, hour, minute]);

  return useSunPosition(date, latitude, longitude);
}
