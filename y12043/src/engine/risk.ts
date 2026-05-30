import { Fund, IndustryGate, DrawdownRecord, Decision } from '@/types';

export function calculateIndustryConcentration(
  portfolio: Record<string, number>,
  funds: Fund[]
): Record<string, number> {
  const industryTotals: Record<string, number> = {};
  let totalValue = 0;

  Object.entries(portfolio).forEach(([fundId, amount]) => {
    const fund = funds.find(f => f.id === fundId);
    if (fund && amount > 0) {
      const industryId = fund.industryId || 'unknown';
      industryTotals[industryId] = (industryTotals[industryId] || 0) + amount;
      totalValue += amount;
    }
  });

  if (totalValue === 0) return {};

  const concentration: Record<string, number> = {};
  Object.entries(industryTotals).forEach(([industryId, value]) => {
    concentration[industryId] = value / totalValue;
  });

  return concentration;
}

export function getMaxConcentration(concentration: Record<string, number>): number {
  const values = Object.values(concentration);
  return values.length > 0 ? Math.max(...values) : 0;
}

export function checkIndustryGate(
  concentration: number,
  gate: IndustryGate
): { triggered: boolean; gate: IndustryGate } {
  if (gate.condition === 'exceed') {
    return { triggered: concentration > gate.maxConcentration, gate };
  }
  return { triggered: concentration >= gate.maxConcentration, gate };
}

export function calculateHighRiskRatio(
  portfolio: Record<string, number>,
  funds: Fund[]
): number {
  let highRiskValue = 0;
  let totalValue = 0;

  Object.entries(portfolio).forEach(([fundId, amount]) => {
    const fund = funds.find(f => f.id === fundId);
    if (fund && amount > 0) {
      totalValue += amount;
      if (fund.riskLevel >= 4) {
        highRiskValue += amount;
      }
    }
  });

  return totalValue > 0 ? highRiskValue / totalValue : 0;
}

export function checkConsecutiveIndustry(
  decisions: Decision[],
  funds: Fund[],
  maxConsecutive: number = 3
): { triggered: boolean; industryId: string | null; count: number } {
  if (decisions.length < maxConsecutive) {
    return { triggered: false, industryId: null, count: 0 };
  }

  const recentDecisions = decisions.slice(-maxConsecutive);
  let lastIndustry: string | null = null;
  let consecutiveCount = 0;

  for (const decision of recentDecisions) {
    if (!decision.fundId) continue;
    const fund = funds.find(f => f.id === decision.fundId);
    const industryId = fund?.industryId || null;

    if (industryId && industryId === lastIndustry) {
      consecutiveCount++;
    } else {
      consecutiveCount = 1;
      lastIndustry = industryId;
    }

    if (consecutiveCount >= maxConsecutive) {
      return { triggered: true, industryId: lastIndustry, count: consecutiveCount };
    }
  }

  return { triggered: false, industryId: null, count: consecutiveCount };
}

export function generateDrawdownSuggestion(
  cause: string,
  industryName?: string
): string {
  const suggestions: Record<string, string[]> = {
    industry_concentration: [
      `建议降低${industryName || '该行业'}仓位至30%以下`,
      `考虑配置2-3个不同行业的基金分散风险`,
      `定期再平衡，避免单一行业权重过高`,
    ],
    consecutive_buy: [
      `避免追涨式连续买入同行业`,
      `采用定投策略，分批建仓`,
      `设置单行业持仓上限`,
    ],
    high_risk: [
      `高风险基金占比建议控制在40%以内`,
      `搭配债券型基金降低组合波动`,
      `根据风险承受能力调整配置比例`,
    ],
    market_event: [
      `黑天鹅事件无法预测，分散是最佳防御`,
      `保留现金仓位应对市场波动`,
      `长期投资，忽略短期波动`,
    ],
  };

  const list = suggestions[cause] || suggestions.market_event;
  return list[Math.floor(Math.random() * list.length)];
}

export function createDrawdownRecord(
  step: number,
  triggerPoint: string,
  drawdownPercent: number,
  cause: string,
  industryName?: string
): DrawdownRecord {
  return {
    step,
    triggerPoint,
    drawdownPercent,
    cause,
    suggestion: generateDrawdownSuggestion(cause, industryName),
  };
}
