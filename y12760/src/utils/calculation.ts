import type { Peak, CalculationResult, CalculationMethod } from '@/types';

const DEFAULT_CORRECTION_FACTORS: Record<string, number> = {
  '水': 0.70,
  '乙醇': 0.85,
  '甲醇': 0.82,
  '丙酮': 0.90,
  '乙酸乙酯': 1.00,
  '正丙醇': 0.92,
  '异丙醇': 0.88,
  '乙苯': 0.95,
  '苯乙烯': 1.00,
  'α-甲基苯乙烯': 0.98,
};

export interface CalculationOptions {
  method?: CalculationMethod;
  correctionFactors?: Record<string, number>;
}

export function calculateBalance(peaks: Peak[], options: CalculationOptions = {}): CalculationResult {
  const method = options.method || 'normalization';
  const factors = { ...DEFAULT_CORRECTION_FACTORS, ...(options.correctionFactors || {}) };

  const validPeaks = peaks.filter(p => !p.isNull && p.peakArea !== null && p.peakArea > 0);
  const components = validPeaks.map(p => {
    const name = p.compoundName || `峰${p.peakIndex}`;
    const area = p.peakArea || 0;
    const factor = factors[name] || 1.0;
    return { name, area, correctedArea: area * factor, factor };
  });

  const totalCorrected = components.reduce((s, c) => s + c.correctedArea, 0);
  const intermediateValues: { label: string; value: number; unit?: string }[] = [];

  components.forEach(c => {
    intermediateValues.push({
      label: `${c.name}校正面积 (A×f)`,
      value: Math.round(c.correctedArea),
    });
  });
  intermediateValues.push({ label: '校正面积总和 Σ(A×f)', value: Math.round(totalCorrected) });

  const resultComponents = components.map(c => ({
    name: c.name,
    area: c.area,
    percentage: totalCorrected > 0 ? (c.correctedArea / totalCorrected) * 100 : 0,
  }));

  const totalPercentage = resultComponents.reduce((s, c) => s + c.percentage, 0);
  const mainComponent = resultComponents
    .sort((a, b) => b.area - a.area)[0];

  const formulas: Record<CalculationMethod, string> = {
    normalization: 'w(i) = (A(i) × f(i)) / Σ(A(j) × f(j)) × 100%',
    external_standard: 'w(i) = (A(i) / A(s)) × C(s) × f',
    internal_standard: 'w(i) = (A(i) × m(s)) / (A(s) × m) × f',
  };

  return {
    id: `calc-${Date.now()}`,
    recordId: '',
    method,
    formula: formulas[method],
    intermediateValues,
    components: resultComponents.map(c => ({ ...c, percentage: round(c.percentage, 2) })),
    totalPercentage: round(totalPercentage, 2),
    finalResult: mainComponent ? round(mainComponent.percentage, 2) : 0,
    unit: '%',
    note: buildCalculationNote(totalPercentage, validPeaks.length, peaks.length),
  };
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

function buildCalculationNote(totalPct: number, validCount: number, totalCount: number): string {
  const notes: string[] = [];
  if (Math.abs(totalPct - 100) > 2) {
    notes.push(`配平总和 ${totalPct.toFixed(2)}% 偏离 100% 较多，可能存在未积分组分或数据质量问题。`);
  } else if (Math.abs(totalPct - 100) > 0.5) {
    notes.push(`配平总和 ${totalPct.toFixed(2)}%，略低于 100%，可能存在微量未识别杂质。`);
  } else {
    notes.push(`配平总和 ${totalPct.toFixed(2)}%，结果良好。`);
  }
  if (validCount < totalCount) {
    notes.push(`共 ${totalCount} 个峰，${totalCount - validCount} 个因空值被排除出计算。`);
  }
  return notes.join(' ');
}

export { DEFAULT_CORRECTION_FACTORS };
