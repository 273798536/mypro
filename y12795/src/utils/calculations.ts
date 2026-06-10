import type { CombustionParams, ConcentrationParams } from '@/types';

export function calcCombustionHeat(params: CombustionParams): {
  value: number;
  unit: string;
  formula: string;
  scope: string;
  steps: Record<string, number>;
} {
  const { waterEquivalent, initialTemp, finalTemp, tempCorrection, wireHeat, wireMass, sampleMass } = params;

  const tempChange = finalTemp - initialTemp + tempCorrection;
  const totalHeat = waterEquivalent * tempChange;
  const wireCombustionHeat = wireHeat * wireMass;
  const sampleCombustionHeat = (totalHeat - wireCombustionHeat) / sampleMass;

  return {
    value: Number(sampleCombustionHeat.toFixed(2)),
    unit: 'J/g',
    formula: 'Qv = [W × (tn - t0 + Δt) - q × m] / M',
    scope: '适用于恒容条件下固体/液体有机化合物的燃烧热测定，样品质量范围0.5~1.5g',
    steps: {
      '温度变化值 ΔT = tn - t0 + Δt': Number(tempChange.toFixed(4)),
      '总热量 W × ΔT': Number(totalHeat.toFixed(2)),
      '点火丝热量 q × m': Number(wireCombustionHeat.toFixed(2)),
      '样品燃烧热 (总热量 - 点火丝热量) / M': Number(sampleCombustionHeat.toFixed(2)),
    },
  };
}

export function calcConcentration(params: ConcentrationParams): {
  value: number;
  unit: string;
  formula: string;
  scope: string;
  steps: Record<string, number>;
} {
  const { mass, molarMass, volume } = params;

  const moles = mass / molarMass;
  const volumeLiters = volume / 1000;
  const concentration = moles / volumeLiters;

  return {
    value: Number(concentration.toFixed(4)),
    unit: 'mol/L',
    formula: 'c = (m × 1000) / (Mm × V)',
    scope: '适用于室温(20~25℃)常压下的水溶液浓度换算，体积单位mL',
    steps: {
      '物质的量 n = m / Mm': Number(moles.toFixed(6)),
      '溶液体积 V(L) = V(mL) / 1000': Number(volumeLiters.toFixed(4)),
      '摩尔浓度 c = n / V': Number(concentration.toFixed(4)),
    },
  };
}

export function calcTemperatureCorrection(
  temps: number[],
  periodPoints: { start: number; end: number; peak: number }
): number {
  if (temps.length < 5) return 0;

  const beforeTemps = temps.slice(periodPoints.start, periodPoints.peak);
  const afterTemps = temps.slice(periodPoints.peak, periodPoints.end);

  const avgBefore = beforeTemps.reduce((a, b) => a + b, 0) / beforeTemps.length;
  const avgAfter = afterTemps.reduce((a, b) => a + b, 0) / afterTemps.length;

  return Number(((avgAfter - avgBefore) / 10).toFixed(4));
}
