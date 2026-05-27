import type { FluidProperties } from '../types';

export const FLUID_LIBRARY: FluidProperties[] = [
  {
    id: 'water-20',
    name: '水 (20°C)',
    density: 998.2,
    viscosity: 1.004e-6,
    temperature: 20,
  },
  {
    id: 'water-10',
    name: '水 (10°C)',
    density: 999.7,
    viscosity: 1.308e-6,
    temperature: 10,
  },
  {
    id: 'water-40',
    name: '水 (40°C)',
    density: 992.2,
    viscosity: 0.658e-6,
    temperature: 40,
  },
  {
    id: 'water-60',
    name: '水 (60°C)',
    density: 983.2,
    viscosity: 0.478e-6,
    temperature: 60,
  },
  {
    id: 'water-80',
    name: '水 (80°C)',
    density: 971.8,
    viscosity: 0.365e-6,
    temperature: 80,
  },
  {
    id: 'water-100',
    name: '饱和水 (100°C)',
    density: 958.4,
    viscosity: 0.295e-6,
    temperature: 100,
  },
  {
    id: 'ethylene-glycol-30',
    name: '30%乙二醇水溶液',
    density: 1050,
    viscosity: 1.8e-6,
    temperature: 20,
  },
  {
    id: 'ethylene-glycol-50',
    name: '50%乙二醇水溶液',
    density: 1078,
    viscosity: 3.0e-6,
    temperature: 20,
  },
  {
    id: 'ethylene-glycol-50-0',
    name: '50%乙二醇 (0°C)',
    density: 1085,
    viscosity: 6.2e-6,
    temperature: 0,
  },
  {
    id: 'air-20',
    name: '空气 (20°C, 1atm)',
    density: 1.204,
    viscosity: 1.51e-5,
    temperature: 20,
  },
  {
    id: 'steam-saturated-100',
    name: '饱和蒸汽 (100°C)',
    density: 0.598,
    viscosity: 1.23e-5,
    temperature: 100,
  },
  {
    id: 'steam-saturated-150',
    name: '饱和蒸汽 (150°C)',
    density: 2.548,
    viscosity: 1.43e-5,
    temperature: 150,
  },
];

export function getFluidById(id: string): FluidProperties | undefined {
  return FLUID_LIBRARY.find((f) => f.id === id);
}

export function getWaterByTemperature(temp: number): FluidProperties | undefined {
  const fluids = FLUID_LIBRARY.filter((f) => f.name.includes('水') && !f.name.includes('乙二醇'));
  let closest = fluids[0];
  let minDiff = Math.abs(closest.temperature - temp);

  for (const fluid of fluids) {
    const diff = Math.abs(fluid.temperature - temp);
    if (diff < minDiff) {
      minDiff = diff;
      closest = fluid;
    }
  }

  return closest;
}
