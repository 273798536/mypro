import type { FluidType, FluidProperties } from '@/types';

export const FLUID_DATABASE: Record<FluidType, Record<number, Omit<FluidProperties, 'type' | 'temperature'>>> = {
  water: {
    0: { density: 999.8, viscosity: 1.789e-3 },
    5: { density: 999.9, viscosity: 1.519e-3 },
    10: { density: 999.7, viscosity: 1.308e-3 },
    15: { density: 999.1, viscosity: 1.140e-3 },
    20: { density: 998.2, viscosity: 1.002e-3 },
    25: { density: 997.0, viscosity: 0.890e-3 },
    30: { density: 995.7, viscosity: 0.798e-3 },
    40: { density: 992.2, viscosity: 0.653e-3 },
    50: { density: 988.1, viscosity: 0.547e-3 },
    60: { density: 983.2, viscosity: 0.466e-3 },
    70: { density: 977.8, viscosity: 0.404e-3 },
    80: { density: 971.8, viscosity: 0.355e-3 },
    90: { density: 965.3, viscosity: 0.315e-3 },
    100: { density: 958.4, viscosity: 0.282e-3 },
  },
  steam: {
    100: { density: 0.598, viscosity: 1.23e-5 },
    120: { density: 0.553, viscosity: 1.30e-5 },
    140: { density: 0.514, viscosity: 1.37e-5 },
    160: { density: 0.480, viscosity: 1.44e-5 },
    180: { density: 0.450, viscosity: 1.51e-5 },
    200: { density: 0.424, viscosity: 1.58e-5 },
  },
  air: {
    0: { density: 1.293, viscosity: 1.72e-5 },
    10: { density: 1.247, viscosity: 1.77e-5 },
    20: { density: 1.205, viscosity: 1.82e-5 },
    30: { density: 1.165, viscosity: 1.87e-5 },
    40: { density: 1.128, viscosity: 1.92e-5 },
    50: { density: 1.093, viscosity: 1.97e-5 },
    60: { density: 1.060, viscosity: 2.02e-5 },
    80: { density: 1.000, viscosity: 2.11e-5 },
    100: { density: 0.946, viscosity: 2.20e-5 },
  },
  refrigerant: {
    0: { density: 1270, viscosity: 0.25e-3 },
    10: { density: 1250, viscosity: 0.22e-3 },
    20: { density: 1230, viscosity: 0.20e-3 },
    30: { density: 1210, viscosity: 0.18e-3 },
    40: { density: 1190, viscosity: 0.16e-3 },
    50: { density: 1170, viscosity: 0.14e-3 },
  },
};

export function getFluidProperties(type: FluidType, temperature: number): FluidProperties {
  const data = FLUID_DATABASE[type];
  const temperatures = Object.keys(data).map(Number).sort((a, b) => a - b);
  
  let lowerTemp = temperatures[0];
  let upperTemp = temperatures[temperatures.length - 1];
  
  for (let i = 0; i < temperatures.length - 1; i++) {
    if (temperature >= temperatures[i] && temperature <= temperatures[i + 1]) {
      lowerTemp = temperatures[i];
      upperTemp = temperatures[i + 1];
      break;
    }
  }
  
  const lowerProps = data[lowerTemp];
  const upperProps = data[upperTemp];
  
  if (lowerTemp === upperTemp) {
    return { type, temperature, ...lowerProps };
  }
  
  const ratio = (temperature - lowerTemp) / (upperTemp - lowerTemp);
  
  return {
    type,
    temperature,
    density: lowerProps.density + (upperProps.density - lowerProps.density) * ratio,
    viscosity: lowerProps.viscosity + (upperProps.viscosity - lowerProps.viscosity) * ratio,
  };
}

export const FLUID_NAMES: Record<FluidType, string> = {
  water: '水',
  steam: '蒸汽',
  air: '空气',
  refrigerant: '制冷剂',
};
