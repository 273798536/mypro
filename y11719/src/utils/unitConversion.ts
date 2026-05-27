import { LengthUnit, MassUnit, TimeUnit, AngularVelocityUnit } from '../types';

const LENGTH_TO_METERS: Record<LengthUnit, number> = {
  m: 1,
  cm: 0.01,
  mm: 0.001,
};

const MASS_TO_KG: Record<MassUnit, number> = {
  kg: 1,
  g: 0.001,
};

const TIME_TO_SECONDS: Record<TimeUnit, number> = {
  s: 1,
  ms: 0.001,
};

const ANGULAR_VELOCITY_TO_RAD_PER_SEC: Record<AngularVelocityUnit, number> = {
  'rad/s': 1,
  rpm: Math.PI / 30,
  'deg/s': Math.PI / 180,
};

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  const meters = value * LENGTH_TO_METERS[from];
  return meters / LENGTH_TO_METERS[to];
}

export function convertMass(value: number, from: MassUnit, to: MassUnit): number {
  const kg = value * MASS_TO_KG[from];
  return kg / MASS_TO_KG[to];
}

export function convertTime(value: number, from: TimeUnit, to: TimeUnit): number {
  const seconds = value * TIME_TO_SECONDS[from];
  return seconds / TIME_TO_SECONDS[to];
}

export function convertAngularVelocity(
  value: number,
  from: AngularVelocityUnit,
  to: AngularVelocityUnit
): number {
  const radPerSec = value * ANGULAR_VELOCITY_TO_RAD_PER_SEC[from];
  return radPerSec / ANGULAR_VELOCITY_TO_RAD_PER_SEC[to];
}

export function normalizeLength(value: number, unit: LengthUnit): number {
  return value * LENGTH_TO_METERS[unit];
}

export function normalizeMass(value: number, unit: MassUnit): number {
  return value * MASS_TO_KG[unit];
}

export function normalizeTime(value: number, unit: TimeUnit): number {
  return value * TIME_TO_SECONDS[unit];
}

export function normalizeAngularVelocity(value: number, unit: AngularVelocityUnit): number {
  return value * ANGULAR_VELOCITY_TO_RAD_PER_SEC[unit];
}
