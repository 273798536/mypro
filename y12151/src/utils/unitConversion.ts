import { DistanceUnit, TemperatureUnit } from '../types';
import { UNIT_CONVERSION_FACTORS } from '../constants/config';

export const convertDistanceToMeters = (value: number, unit: DistanceUnit): number => {
  const factor = UNIT_CONVERSION_FACTORS.distance[unit];
  return value * factor;
};

export const convertMetersToUnit = (value: number, unit: DistanceUnit): number => {
  const factor = UNIT_CONVERSION_FACTORS.distance[unit];
  return value / factor;
};

export const convertTemperatureToCelsius = (value: number, unit: TemperatureUnit): number => {
  switch (unit) {
    case 'C':
      return value;
    case 'F':
      return (value - 32) * (5 / 9);
    case 'K':
      return value - 273.15;
    default:
      return value;
  }
};

export const convertCelsiusToTemperature = (value: number, unit: TemperatureUnit): number => {
  switch (unit) {
    case 'C':
      return value;
    case 'F':
      return value * (9 / 5) + 32;
    case 'K':
      return value + 273.15;
    default:
      return value;
  }
};

export const parseDistanceUnit = (unitStr: string): DistanceUnit => {
  const normalized = unitStr.toLowerCase().trim();
  if (normalized === 'm' || normalized === 'meter' || normalized === 'meters' || normalized === '米') {
    return 'm';
  }
  if (normalized === 'cm' || normalized === 'centimeter' || normalized === 'centimeters' || normalized === '厘米') {
    return 'cm';
  }
  if (normalized === 'mm' || normalized === 'millimeter' || normalized === 'millimeters' || normalized === '毫米') {
    return 'mm';
  }
  if (normalized === 'ft' || normalized === 'foot' || normalized === 'feet' || normalized === '英尺') {
    return 'ft';
  }
  return 'm';
};

export const parseTemperatureUnit = (unitStr: string): TemperatureUnit => {
  const normalized = unitStr.toLowerCase().trim();
  if (normalized === 'c' || normalized === '°c' || normalized === 'celsius' || normalized === '摄氏度') {
    return 'C';
  }
  if (normalized === 'f' || normalized === '°f' || normalized === 'fahrenheit' || normalized === '华氏度') {
    return 'F';
  }
  if (normalized === 'k' || normalized === 'kelvin' || normalized === '开尔文') {
    return 'K';
  }
  return 'C';
};

export const formatDistance = (value: number, decimals: number = 4): string => {
  return value.toFixed(decimals);
};

export const formatTemperature = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};
