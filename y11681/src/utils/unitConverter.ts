import type { SpeedUnit } from '@/types/trajectory';

export function convertToMs(value: number, unit: SpeedUnit): number {
  switch (unit) {
    case 'm/s':
      return value;
    case 'km/h':
      return value / 3.6;
    case 'mph':
      return value * 0.44704;
    default:
      return value;
  }
}

export function convertFromMs(value: number, targetUnit: SpeedUnit): number {
  switch (targetUnit) {
    case 'm/s':
      return value;
    case 'km/h':
      return value * 3.6;
    case 'mph':
      return value / 0.44704;
    default:
      return value;
  }
}

export function convertSpeed(value: number, from: SpeedUnit, to: SpeedUnit): number {
  const ms = convertToMs(value, from);
  return convertFromMs(ms, to);
}

export function normalizeAngle(angle: number): number {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
}

export function angleDiff(a: number, b: number): number {
  let diff = (a - b + 180) % 360 - 180;
  if (diff < -180) diff += 360;
  return diff;
}
