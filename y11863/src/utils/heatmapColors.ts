import { Color } from 'three';

export const getHeatmapColor = (value: number, min: number, max: number): string => {
  const normalized = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  if (normalized < 0.25) {
    return '#10b981';
  } else if (normalized < 0.5) {
    return '#eab308';
  } else if (normalized < 0.75) {
    return '#f97316';
  } else {
    return '#ef4444';
  }
};

export const getHeatmapColorThree = (value: number, min: number, max: number): Color => {
  return new Color(getHeatmapColor(value, min, max));
};

export const getEnergyConsumptionRange = (
  floorMeters: { energyConsumption: { electricity: number; water?: number; gas?: number } }[],
  energyType: 'electricity' | 'water' | 'gas'
): { min: number; max: number } => {
  const values = floorMeters.map(fm => fm.energyConsumption[energyType] || 0);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

export const getDeviceEnergyConsumptionRange = (
  devices: { energyConsumption: { electricity: number; water?: number; gas?: number } }[],
  energyType: 'electricity' | 'water' | 'gas'
): { min: number; max: number } => {
  const values = devices.map(d => d.energyConsumption[energyType] || 0);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

export const formatEnergyValue = (value: number, type: 'electricity' | 'water' | 'gas'): string => {
  const units = {
    electricity: 'kWh',
    water: 'm³',
    gas: 'm³',
  };
  return `${value.toLocaleString()} ${units[type]}`;
};
