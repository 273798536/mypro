import type { CalculatorConfig } from '@/types';

export interface CalculationResult {
  success: boolean;
  value?: number;
  error?: string;
  formula?: string;
  breakdown?: string;
}

export function calculateDilution(
  c1: number,
  v1: number,
  c2: number
): CalculationResult {
  if (c1 <= 0) {
    return { success: false, error: '初始浓度必须大于0' };
  }
  if (c2 <= 0) {
    return { success: false, error: '目标浓度必须大于0' };
  }
  if (v1 < 0) {
    return { success: false, error: '初始体积不能为负' };
  }
  if (c2 >= c1) {
    return { success: false, error: '目标浓度应小于初始浓度（应为稀释）' };
  }

  const dilutionFactor = c1 / c2;
  if (dilutionFactor > 1000) {
    return { success: false, error: '稀释倍数超过1000倍，误差过大' };
  }

  const v2 = (c1 * v1) / c2;
  const solventVolume = v2 - v1;

  return {
    success: true,
    value: v2,
    formula: 'C₁ × V₁ = C₂ × V₂',
    breakdown: `${c1} mg/mL × ${v1} μL = ${c2} mg/mL × V₂\nV₂ = ${v2.toFixed(2)} μL\n需加溶剂：${solventVolume.toFixed(2)} μL`
  };
}

export function calculateCellCount(
  totalCells: number,
  dilutionFactor: number
): CalculationResult {
  if (totalCells <= 0) {
    return { success: false, error: '细胞总数必须大于0' };
  }
  if (dilutionFactor <= 0) {
    return { success: false, error: '稀释倍数必须大于0' };
  }

  const avgPerSquare = totalCells / 4;

  if (avgPerSquare < 10) {
    return { success: false, error: '每大格细胞数过少（<10个），统计误差大' };
  }
  if (avgPerSquare > 300) {
    return { success: false, error: '每大格细胞数过多（>300个），计数不准确' };
  }

  const cellsPerMl = avgPerSquare * 10000 * dilutionFactor;

  return {
    success: true,
    value: cellsPerMl,
    formula: '细胞数/mL = (四大格总数 ÷ 4) × 10⁴ × 稀释倍数',
    breakdown: `每大格平均 = ${totalCells} ÷ 4 = ${avgPerSquare.toFixed(1)} 个\n细胞浓度 = ${avgPerSquare.toFixed(1)} × 10⁴ × ${dilutionFactor} = ${formatNumber(cellsPerMl)} cells/mL`
  };
}

export function calculateCellViability(
  liveCells: number,
  deadCells: number
): CalculationResult {
  const total = liveCells + deadCells;

  if (total <= 0) {
    return { success: false, error: '总细胞数必须大于0' };
  }
  if (liveCells < 0 || deadCells < 0) {
    return { success: false, error: '细胞数不能为负' };
  }
  if (total < 100) {
    return { success: false, error: '细胞总数不足100个，统计误差大' };
  }

  const viability = (liveCells / total) * 100;

  return {
    success: true,
    value: viability,
    formula: '存活率 = (活细胞数 ÷ 总细胞数) × 100%',
    breakdown: `总细胞数 = ${liveCells} + ${deadCells} = ${total} 个\n存活率 = ${liveCells} ÷ ${total} × 100% = ${viability.toFixed(2)}%`
  };
}

export function runCalculation(
  calculatorId: string,
  inputs: Record<string, number>
): CalculationResult {
  switch (calculatorId) {
    case 'dilution':
      return calculateDilution(inputs.c1 || 0, inputs.v1 || 0, inputs.c2 || 0);
    case 'cell-count':
      return calculateCellCount(inputs.totalCells || 0, inputs.dilutionFactor || 0);
    case 'cell-viability':
      return calculateCellViability(inputs.liveCells || 0, inputs.deadCells || 0);
    default:
      return { success: false, error: '未知的计算器类型' };
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + ' × 10⁶';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + ' × 10³';
  }
  return num.toFixed(2);
}

export function getResultUnit(calculatorId: string): string {
  switch (calculatorId) {
    case 'dilution':
      return 'μL';
    case 'cell-count':
      return 'cells/mL';
    case 'cell-viability':
      return '%';
    default:
      return '';
  }
}
