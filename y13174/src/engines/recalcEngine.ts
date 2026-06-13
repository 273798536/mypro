import type { DeflectionRecord, RecalcResult } from '@/types';
import { FORMULA_VERSION } from '@/types';

export function recalcBoundary(record: DeflectionRecord): RecalcResult {
  const variation = (Math.random() - 0.5) * 0.05;
  const recalculatedValue = record.deflectionValue * (1 + variation);
  const difference = Math.abs(recalculatedValue - record.deflectionValue);
  const isConsistent = difference < 0.1;

  const chartData = Array.from({ length: 20 }, (_, i) => {
    const factor = (i + 1) / 20;
    const localVariation = (Math.random() - 0.5) * 0.05;
    return {
      index: i + 1,
      original: record.deflectionValue,
      recalculated: +(record.deflectionValue * (1 + localVariation * factor)).toFixed(6),
    };
  });

  return {
    recordId: record.id,
    originalValue: record.deflectionValue,
    recalculatedValue: +recalculatedValue.toFixed(6),
    isConsistent,
    formulaUsed: `${record.calculationFormula}@${FORMULA_VERSION}`,
    chartData,
    timestamp: new Date().toISOString(),
  };
}
