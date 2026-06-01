import { ObjectStatus } from '../types';

export const getStatusColor = (status: ObjectStatus): string => {
  switch (status) {
    case 'critical':
      return '#FF4757';
    case 'warning':
      return '#FFA502';
    case 'normal':
      return '#2ED573';
    default:
      return '#2ED573';
  }
};

export const getTemperatureColor = (temp: number): string => {
  if (temp < 22) return '#00D4FF';
  if (temp < 26) return '#2ED573';
  if (temp < 32) return '#FFA502';
  return '#FF4757';
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
};
