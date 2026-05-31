import type { BondHolding, AnalysisParams } from '../types';

export interface DurationCalculationResult {
  avgDuration: number;
  weightedDuration: number;
  avgYield: number;
  durationConclusion: string;
  byIndustry: Record<string, { count: number; avgDuration: number; weightedDuration: number; totalWeight: number }>;
}

export function calculateDurations(
  holdings: BondHolding[],
  params: AnalysisParams
): DurationCalculationResult {
  const filtered = filterHoldings(holdings, params);
  
  if (filtered.length === 0) {
    return {
      avgDuration: 0,
      weightedDuration: 0,
      avgYield: 0,
      durationConclusion: '筛选条件下无有效债券数据',
      byIndustry: {}
    };
  }
  
  const totalWeight = filtered.reduce((sum, h) => sum + (h.weight ?? 0), 0);
  const useEqualWeight = totalWeight === 0 || filtered.some(h => h.weight === null);
  
  const avgDuration = filtered.reduce((sum, h) => sum + h.duration, 0) / filtered.length;
  const avgYield = filtered.reduce((sum, h) => sum + h.yield, 0) / filtered.length;
  
  let weightedDuration: number;
  if (useEqualWeight) {
    weightedDuration = avgDuration;
  } else {
    weightedDuration = filtered.reduce((sum, h) => sum + h.duration * (h.weight! / 100), 0);
  }
  
  const byIndustry: DurationCalculationResult['byIndustry'] = {};
  const industryGroups = groupByIndustry(filtered);
  
  for (const [industry, bonds] of Object.entries(industryGroups)) {
    const indTotalWeight = bonds.reduce((sum, h) => sum + (h.weight ?? 0), 0);
    const indUseEqualWeight = indTotalWeight === 0 || bonds.some(h => h.weight === null);
    
    const indAvgDuration = bonds.reduce((sum, h) => sum + h.duration, 0) / bonds.length;
    let indWeightedDuration: number;
    
    if (indUseEqualWeight) {
      indWeightedDuration = indAvgDuration;
    } else {
      indWeightedDuration = bonds.reduce((sum, h) => sum + h.duration * (h.weight! / 100), 0);
    }
    
    byIndustry[industry] = {
      count: bonds.length,
      avgDuration: Math.round(indAvgDuration * 100) / 100,
      weightedDuration: Math.round(indWeightedDuration * 100) / 100,
      totalWeight: Math.round(indTotalWeight * 100) / 100
    };
  }
  
  const durationConclusion = generateDurationConclusion(
    avgDuration,
    weightedDuration,
    avgYield,
    filtered.length,
    useEqualWeight,
    byIndustry
  );
  
  return {
    avgDuration: Math.round(avgDuration * 100) / 100,
    weightedDuration: Math.round(weightedDuration * 100) / 100,
    avgYield: Math.round(avgYield * 100) / 100,
    durationConclusion,
    byIndustry
  };
}

function filterHoldings(holdings: BondHolding[], params: AnalysisParams): BondHolding[] {
  return holdings.filter(h => {
    if (h.duration < params.durationRange[0] || h.duration > params.durationRange[1]) return false;
    if (h.yield < params.yieldRange[0] || h.yield > params.yieldRange[1]) return false;
    if (params.industries.length > 0 && !params.industries.includes(h.industry)) return false;
    if (h.weight !== null && h.weight < params.weightThreshold) return false;
    return true;
  });
}

function groupByIndustry(holdings: BondHolding[]): Record<string, BondHolding[]> {
  const groups: Record<string, BondHolding[]> = {};
  for (const h of holdings) {
    if (!groups[h.industry]) groups[h.industry] = [];
    groups[h.industry].push(h);
  }
  return groups;
}

function generateDurationConclusion(
  avgDuration: number,
  weightedDuration: number,
  avgYield: number,
  count: number,
  useEqualWeight: boolean,
  byIndustry: DurationCalculationResult['byIndustry']
): string {
  const parts: string[] = [];
  
  parts.push(`组合包含 ${count} 只债券`);
  parts.push(`平均久期 ${avgDuration.toFixed(2)} 年`);
  parts.push(`加权久期 ${weightedDuration.toFixed(2)} 年${useEqualWeight ? '（因权重缺失使用等权重计算）' : ''}`);
  parts.push(`平均收益率 ${avgYield.toFixed(2)}%`);
  
  const industries = Object.entries(byIndustry)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);
  
  if (industries.length > 0) {
    const topIndustries = industries.map(([name, data]) => 
      `${name}(${data.count}只，久期${data.weightedDuration.toFixed(2)}年)`
    ).join('、');
    parts.push(`前三大行业：${topIndustries}`);
  }
  
  const durationDeviation = Math.abs(avgDuration - weightedDuration);
  if (durationDeviation > 0.5) {
    parts.push(`久期偏离度 ${durationDeviation.toFixed(2)} 年，建议关注权重分布`);
  }
  
  if (avgDuration < 3) {
    parts.push('组合久期偏短，利率风险较低');
  } else if (avgDuration > 7) {
    parts.push('组合久期偏长，利率敏感性较高');
  } else {
    parts.push('组合久期适中，利率风险可控');
  }
  
  return parts.join('；') + '。';
}
