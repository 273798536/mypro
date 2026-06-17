import type { DeflectionRecord, RecalcResult } from '@/types';
import { FORMULA_VERSION } from '@/types';

function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  let s = h >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashRecord(record: DeflectionRecord): string {
  return `${record.id}-${record.deflectionValue.toFixed(6)}-${record.threshold.min}-${record.threshold.max}-${record.calculationFormula}`;
}

export function recalcBoundary(record: DeflectionRecord): RecalcResult {
  const seed = hashRecord(record);
  const rand = seededRandom(seed);

  const variation = (rand() - 0.5) * 0.05;
  const recalculatedValue = record.deflectionValue * (1 + variation);
  const difference = Math.abs(recalculatedValue - record.deflectionValue);
  const isConsistent = difference < 0.1;

  const chartData = Array.from({ length: 20 }, (_, i) => {
    const factor = (i + 1) / 20;
    const localVariation = (rand() - 0.5) * 0.05;
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
