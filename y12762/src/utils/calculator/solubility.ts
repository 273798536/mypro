import type { Reagent, SolubilityPoint } from '../../types';

const SOLUBILITY_COEFFICIENTS: Record<string, { a: number; b: number; c: number }> = {
  '氯化钠': { a: 35.7, b: 0.015, c: 0.0002 },
  'NaCl': { a: 35.7, b: 0.015, c: 0.0002 },
  '硝酸钾': { a: 13.3, b: 0.52, c: 0.012 },
  'KNO3': { a: 13.3, b: 0.52, c: 0.012 },
  '硫酸铜': { a: 23.1, b: 0.23, c: 0.004 },
  'CuSO4': { a: 23.1, b: 0.23, c: 0.004 },
  '氢氧化钙': { a: 0.189, b: -0.0018, c: -0.00002 },
  'Ca(OH)2': { a: 0.189, b: -0.0018, c: -0.00002 },
};

const DEFAULT_COEFFICIENTS = { a: 20, b: 0.2, c: 0.005 };

export function calculateSolubility(
  reagentName: string,
  temperature: number
): number {
  const coeff = SOLUBILITY_COEFFICIENTS[reagentName] || DEFAULT_COEFFICIENTS;
  const solubility = coeff.a + coeff.b * temperature + coeff.c * temperature * temperature;
  return Math.max(0, Number(solubility.toFixed(2)));
}

export function generateSolubilityCurve(
  reagentName: string,
  minTemp: number = 0,
  maxTemp: number = 100,
  step: number = 10
): SolubilityPoint[] {
  const points: SolubilityPoint[] = [];
  for (let t = minTemp; t <= maxTemp; t += step) {
    points.push({
      temperature: t,
      solubility: calculateSolubility(reagentName, t),
    });
  }
  return points;
}

export function getSolubilityExplanation(
  reagent: Reagent,
  curve: SolubilityPoint[]
): { explanation: string; detailedExplanation: string } {
  const currentSolubility = reagent.solubility || calculateSolubility(reagent.name, reagent.temperature);
  const tempTrend = curve.length >= 2
    ? curve[curve.length - 1].solubility > curve[0].solubility
      ? '随温度升高而增大'
      : curve[curve.length - 1].solubility < curve[0].solubility
        ? '随温度升高而减小'
        : '随温度变化不大'
    : '需要更多数据点判断';

  const explanation = `${reagent.name}在${reagent.temperature}°C时的溶解度约为${currentSolubility}g/100g水，该物质溶解度${tempTrend}。`;

  const detailedExplanation = `
【溶解度分析报告】
试剂名称：${reagent.name}${reagent.formula ? `（化学式：${reagent.formula}）` : ''}
实验温度：${reagent.temperature}°C
计算溶解度：${currentSolubility}g/100g水

曲线趋势分析：
- 低温区（0-40°C）：溶解度从${curve[0]?.solubility?.toFixed(2) || '-'}g/100g水变化至${curve[4]?.solubility?.toFixed(2) || '-'}g/100g水
- 高温区（60-100°C）：溶解度从${curve[6]?.solubility?.toFixed(2) || '-'}g/100g水变化至${curve[curve.length - 1]?.solubility?.toFixed(2) || '-'}g/100g水
- 总体趋势：${tempTrend}

教学提示：
${tempTrend.includes('增大')
    ? '该物质属于"温度升高溶解度增大"型，适合用降温结晶法提纯。'
    : tempTrend.includes('减小')
      ? '该物质属于"温度升高溶解度减小"型，较为特殊，如氢氧化钙，适合用升温结晶法。'
      : '该物质溶解度随温度变化不大，适合用蒸发结晶法提纯。'}
`.trim();

  return { explanation, detailedExplanation };
}
