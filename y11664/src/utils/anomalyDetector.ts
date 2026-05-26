import { FundData, AnomalyAlert, ThreeDPoint } from '../types';

const INDUSTRY_OVERLAP_THRESHOLD = 30;
const OCCLUSION_DISTANCE_THRESHOLD = 3;
const NEGATIVE_RETURN_THRESHOLD = -5;

export const detectIndustryOverlap = (funds: FundData[]): AnomalyAlert | null => {
  const industryWeights: Record<string, number> = {};
  
  funds.forEach(fund => {
    industryWeights[fund.industry] = (industryWeights[fund.industry] || 0) + fund.weight;
  });

  const overlappingIndustries = Object.entries(industryWeights)
    .filter(([, weight]) => weight > INDUSTRY_OVERLAP_THRESHOLD);

  if (overlappingIndustries.length === 0) return null;

  const relatedFunds = funds
    .filter(fund => overlappingIndustries.some(([industry]) => fund.industry === industry))
    .map(fund => fund.id);

  return {
    id: 'industry-overlap-' + Date.now(),
    type: 'industry_overlap',
    severity: 'warning',
    message: `行业权重重叠警告：${overlappingIndustries.map(([ind, w]) => `${ind}(${w.toFixed(1)}%)`).join(', ')} 超过${INDUSTRY_OVERLAP_THRESHOLD}%`,
    relatedFunds
  };
};

export const detectOcclusion = (points: ThreeDPoint[]): AnomalyAlert | null => {
  const occludedPairs: string[] = [];
  
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = Math.sqrt(
        Math.pow(points[i].x - points[j].x, 2) +
        Math.pow(points[i].y - points[j].y, 2) +
        Math.pow(points[i].z - points[j].z, 2)
      );
      
      if (distance < OCCLUSION_DISTANCE_THRESHOLD) {
        occludedPairs.push(`${points[i].fund.name} & ${points[j].fund.name}`);
      }
    }
  }

  if (occludedPairs.length === 0) return null;

  const relatedFunds = points
    .filter(p => occludedPairs.some(pair => pair.includes(p.fund.name)))
    .map(p => p.fund.id);

  return {
    id: 'occlusion-' + Date.now(),
    type: 'occlusion',
    severity: 'warning',
    message: `风险点遮挡警告：${occludedPairs.slice(0, 3).join(', ')}${occludedPairs.length > 3 ? '...' : ''} 在3D视图中距离过近可能影响观察`,
    relatedFunds: [...new Set(relatedFunds)]
  };
};

export const detectNegativeReturn = (funds: FundData[]): AnomalyAlert | null => {
  const negativeFunds = funds.filter(fund => fund.returnRate < NEGATIVE_RETURN_THRESHOLD);
  
  if (negativeFunds.length === 0) return null;

  return {
    id: 'negative-return-' + Date.now(),
    type: 'negative_return',
    severity: negativeFunds.some(f => f.returnRate < -15) ? 'danger' : 'warning',
    message: `负收益提示：${negativeFunds.length}只基金收益率低于${NEGATIVE_RETURN_THRESHOLD}%，包括 ${negativeFunds.slice(0, 3).map(f => f.name).join(', ')}${negativeFunds.length > 3 ? '...' : ''}`,
    relatedFunds: negativeFunds.map(f => f.id)
  };
};

export const detectBadData = (funds: FundData[]): AnomalyAlert | null => {
  const badFunds = funds.filter(fund => fund.dataStatus === 'bad');
  
  if (badFunds.length === 0) return null;

  return {
    id: 'bad-data-' + Date.now(),
    type: 'bad_data',
    severity: 'danger',
    message: `异常数据警告：${badFunds.map(f => f.name).join(', ')} 标记为坏数据，请谨慎参考`,
    relatedFunds: badFunds.map(f => f.id)
  };
};

export const detectAllAnomalies = (funds: FundData[], points: ThreeDPoint[]): AnomalyAlert[] => {
  const alerts: AnomalyAlert[] = [];
  
  const industryAlert = detectIndustryOverlap(funds);
  const occlusionAlert = detectOcclusion(points);
  const negativeReturnAlert = detectNegativeReturn(funds);
  const badDataAlert = detectBadData(funds);

  if (industryAlert) alerts.push(industryAlert);
  if (occlusionAlert) alerts.push(occlusionAlert);
  if (negativeReturnAlert) alerts.push(negativeReturnAlert);
  if (badDataAlert) alerts.push(badDataAlert);

  return alerts;
};
