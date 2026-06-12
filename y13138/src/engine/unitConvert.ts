export interface ConvertResult {
  value: number;
  targetUnit: string;
  steps: string[];
}

export function convertPerMinuteToPerSecond(v: number): ConvertResult {
  const out = v / 60;
  return {
    value: out,
    targetUnit: '次/秒',
    steps: [
      `原始值：${v} 次/分钟`,
      `换算关系：1 分钟 = 60 秒`,
      `计算：${v} ÷ 60 = ${out.toFixed(4)} 次/秒`,
    ],
  };
}

export function convertPerSecondToPerMinute(v: number): ConvertResult {
  const out = v * 60;
  return {
    value: out,
    targetUnit: '次/分钟',
    steps: [
      `原始值：${v} 次/秒`,
      `换算关系：1 分钟 = 60 秒`,
      `计算：${v} × 60 = ${out.toFixed(2)} 次/分钟`,
    ],
  };
}

export function convertPercentToProbability(v: number): ConvertResult {
  const out = v / 100;
  return {
    value: out,
    targetUnit: '概率',
    steps: [
      `原始百分比：${v}%`,
      `换算关系：概率 = 百分比 ÷ 100`,
      `计算：${v} ÷ 100 = ${out.toFixed(2)}（无量纲概率）`,
    ],
  };
}

export function convertProbabilityToPercent(v: number): ConvertResult {
  const out = v * 100;
  return {
    value: out,
    targetUnit: '%',
    steps: [
      `原始概率：${v}`,
      `换算关系：百分比 = 概率 × 100`,
      `计算：${v} × 100 = ${out.toFixed(2)}%`,
    ],
  };
}

export function convertCountToFrequency(count: number, total: number): ConvertResult {
  const out = total > 0 ? count / total : 0;
  return {
    value: out,
    targetUnit: '频率(≈概率)',
    steps: [
      `样本计数：${count} 次`,
      `总样本量：N = ${total} 次`,
      `频率 f = 计数/N = ${count}/${total} = ${total > 0 ? out.toFixed(3) : 'NaN'}`,
      `马尔可夫假设：以频率近似转移概率`,
    ],
  };
}

export function autoConvertByUnitPair(
  value: number,
  fromUnit: string,
  toUnit: string,
): ConvertResult | null {
  const norm = (s: string) => s.trim().toLowerCase();
  const f = norm(fromUnit);
  const t = norm(toUnit);
  if (f.includes('分钟') && t.includes('秒')) return convertPerMinuteToPerSecond(value);
  if (f.includes('秒') && t.includes('分钟')) return convertPerSecondToPerMinute(value);
  if ((f === '%' || f.includes('百分比')) && t.includes('概率')) return convertPercentToProbability(value);
  if (f.includes('概率') && (t === '%' || t.includes('百分比'))) return convertProbabilityToPercent(value);
  return null;
}
