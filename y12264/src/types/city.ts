export interface CityStatus {
  pumpLoad: number;
  lowWater: number;
  greenCapacity: number;
  totalStorage: number;
}

export const INITIAL_CITY_STATUS: CityStatus = {
  pumpLoad: 0,
  lowWater: 0,
  greenCapacity: 100,
  totalStorage: 0,
};

export const PUMP_WARNING = 70;
export const PUMP_DANGER = 85;
export const LOW_WATER_WARNING = 50;
export const LOW_WATER_DANGER = 100;
export const GREEN_WARNING = 30;
export const GREEN_DANGER = 15;

export const CATCHMENT_AREA = 1000000;
export const RUNOFF_COEFFICIENT = 0.6;
export const MAX_PUMP_CAPACITY = 500;
export const MAX_GARDEN_CAPACITY = 300;
export const LOW_AREA = 50000;

export type StatusLevel = 'normal' | 'warning' | 'danger';

export function getPumpStatusLevel(load: number): StatusLevel {
  if (load >= PUMP_DANGER) return 'danger';
  if (load >= PUMP_WARNING) return 'warning';
  return 'normal';
}

export function getLowWaterStatusLevel(water: number): StatusLevel {
  if (water >= LOW_WATER_DANGER) return 'danger';
  if (water >= LOW_WATER_WARNING) return 'warning';
  return 'normal';
}

export function getGreenStatusLevel(capacity: number): StatusLevel {
  if (capacity <= GREEN_DANGER) return 'danger';
  if (capacity <= GREEN_WARNING) return 'warning';
  return 'normal';
}

export const statusLevelColors: Record<StatusLevel, string> = {
  normal: 'text-emerald-400',
  warning: 'text-orange-400',
  danger: 'text-red-500',
};

export const statusLevelBgColors: Record<StatusLevel, string> = {
  normal: 'bg-emerald-500/20 border-emerald-500/50',
  warning: 'bg-orange-500/20 border-orange-500/50',
  danger: 'bg-red-500/20 border-red-500/50',
};
