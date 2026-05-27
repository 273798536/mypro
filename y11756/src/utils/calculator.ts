import { Position, Industry, GameScore, RiskWarning, RiskSeverity, TradeRecord } from '../types/game.types';
import { INDUSTRY_BASE_DATA } from '../data/industries';

export const FEE_RATE = 0.0015;
export const CONCENTRATION_WARNING_THRESHOLD = 0.30;
export const CONCENTRATION_PENALTY_THRESHOLD = 0.40;
export const FEE_EROSION_THRESHOLD = 0.15;
export const CHASING_WINDOW = 3;

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(2)}%`;
};

export const formatCurrency = (value: number): string => {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(2)}万`;
  }
  return value.toFixed(2);
};

export const calculateFee = (amount: number): number => {
  return Math.abs(amount) * FEE_RATE;
};

export const generatePriceChange = (industry: Industry, difficulty: 'easy' | 'normal' | 'hard'): number => {
  const difficultyMultiplier = {
    easy: 0.7,
    normal: 1.0,
    hard: 1.4,
  };
  
  const baseChange = (Math.random() - 0.5) * industry.volatility * difficultyMultiplier[difficulty];
  const betaEffect = (Math.random() - 0.5) * 0.05 * industry.beta;
  
  return baseChange + betaEffect;
};

export const checkConcentrationRisk = (positions: Position[]): RiskWarning | null => {
  const maxWeight = Math.max(...positions.map(p => p.weight));
  
  if (maxWeight >= CONCENTRATION_PENALTY_THRESHOLD) {
    const industry = INDUSTRY_BASE_DATA.find(i => i.id === positions.find(p => p.weight === maxWeight)?.industryId);
    return {
      id: generateId(),
      type: 'concentration',
      severity: 'high',
      message: `风险预警：${industry?.name}占比过高（${formatPercent(maxWeight)}），过度集中可能导致大幅回撤`,
      details: { maxWeight, industryId: industry?.id },
      timestamp: new Date(),
    };
  }
  
  if (maxWeight >= CONCENTRATION_WARNING_THRESHOLD) {
    const industry = INDUSTRY_BASE_DATA.find(i => i.id === positions.find(p => p.weight === maxWeight)?.industryId);
    return {
      id: generateId(),
      type: 'concentration',
      severity: 'medium',
      message: `注意：${industry?.name}占比偏高（${formatPercent(maxWeight)}），建议适度分散`,
      details: { maxWeight, industryId: industry?.id },
      timestamp: new Date(),
    };
  }
  
  return null;
};

export const checkChasingBehavior = (
  tradeHistory: TradeRecord[],
  industries: Industry[]
): RiskWarning | null => {
  const recentTrades = tradeHistory.slice(-CHASING_WINDOW * 2);
  
  if (recentTrades.length < CHASING_WINDOW * 2) return null;
  
  const industryTrades: { [key: string]: TradeRecord[] } = {};
  recentTrades.forEach(trade => {
    if (!industryTrades[trade.industryId]) {
      industryTrades[trade.industryId] = [];
    }
    industryTrades[trade.industryId].push(trade);
  });
  
  for (const [industryId, trades] of Object.entries(industryTrades)) {
    if (trades.length >= CHASING_WINDOW) {
      const industry = industries.find(i => i.id === industryId);
      const recentPriceHistory = industry?.priceHistory.slice(-CHASING_WINDOW - 1) || [];
      
      let chasingCount = 0;
      for (let i = 1; i < recentPriceHistory.length && i <= trades.length; i++) {
        const priceUp = recentPriceHistory[i] > recentPriceHistory[i - 1];
        const trade = trades[i - 1];
        if ((priceUp && trade.action === 'buy') || (!priceUp && trade.action === 'sell')) {
          chasingCount++;
        }
      }
      
      if (chasingCount >= CHASING_WINDOW) {
        return {
          id: generateId(),
          type: 'chasing',
          severity: 'medium',
          message: `行为提示：疑似追涨杀跌，连续${CHASING_WINDOW}次在${industry?.name}涨跌后同向操作`,
          details: { industryId, chasingCount },
          timestamp: new Date(),
        };
      }
    }
  }
  
  return null;
};

export const checkFeeErosion = (totalFees: number, totalProfit: number): RiskWarning | null => {
  if (totalProfit <= 0) return null;
  
  const feeRatio = totalFees / totalProfit;
  
  if (feeRatio >= FEE_EROSION_THRESHOLD) {
    return {
      id: generateId(),
      type: 'fee_erosion',
      severity: 'high',
      message: `警告：手续费侵蚀严重，累计手续费已占总收益的${formatPercent(feeRatio)}`,
      details: { feeRatio, totalFees, totalProfit },
      timestamp: new Date(),
    };
  }
  
  return null;
};

export const calculateRiskUsed = (positions: Position[], industries: Industry[]): number => {
  let riskScore = 0;
  
  positions.forEach(position => {
    const industry = industries.find(i => i.id === position.industryId);
    if (industry) {
      riskScore += position.weight * industry.volatility * industry.beta;
    }
  });
  
  const maxWeight = Math.max(...positions.map(p => p.weight));
  if (maxWeight > 0.25) {
    riskScore *= 1 + (maxWeight - 0.25) * 2;
  }
  
  return Math.min(riskScore * 5, 100);
};

export const calculateDiversificationScore = (positions: Position[]): number => {
  const weights = positions.map(p => p.weight);
  const sumSquares = weights.reduce((sum, w) => sum + w * w, 0);
  const hhi = sumSquares;
  
  if (hhi <= 0.15) return 100;
  if (hhi <= 0.25) return 90;
  if (hhi <= 0.35) return 75;
  if (hhi <= 0.50) return 60;
  if (hhi <= 0.70) return 40;
  return 20;
};

export const calculateFeeEfficiencyScore = (totalFees: number, totalAssets: number): number => {
  const feeRatio = totalFees / totalAssets;
  
  if (feeRatio <= 0.005) return 100;
  if (feeRatio <= 0.01) return 85;
  if (feeRatio <= 0.02) return 70;
  if (feeRatio <= 0.03) return 50;
  if (feeRatio <= 0.05) return 30;
  return 10;
};

export const calculateEventResponseScore = (
  eventHistory: any[],
  tradeHistory: TradeRecord[],
  industries: Industry[]
): number => {
  if (eventHistory.length === 0) return 60;
  
  let correctResponses = 0;
  let totalEvents = 0;
  
  eventHistory.forEach(event => {
    Object.entries(event.impact).forEach(([industryId, impact]) => {
      const tradesAfterEvent = tradeHistory.filter(
        t => t.round >= event.round && t.industryId === industryId
      );
      
      if (tradesAfterEvent.length > 0) {
        totalEvents++;
        const firstTrade = tradesAfterEvent[0];
        const impactNumber = impact as number;
        
        if ((impactNumber > 0 && firstTrade.action === 'buy') ||
            (impactNumber < 0 && firstTrade.action === 'sell')) {
          correctResponses++;
        }
      }
    });
  });
  
  if (totalEvents === 0) return 60;
  
  return Math.round((correctResponses / totalEvents) * 100);
};

export const calculateMaxDrawdown = (history: number[]): number => {
  if (history.length < 2) return 0;
  
  let maxDrawdown = 0;
  let peak = history[0];
  
  for (let i = 1; i < history.length; i++) {
    peak = Math.max(peak, history[i]);
    const drawdown = (peak - history[i]) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  
  return maxDrawdown;
};

export const calculateSharpeRatio = (returns: number[], riskFreeRate: number = 0.02): number => {
  if (returns.length < 2) return 0;
  
  const actualReturns = [];
  for (let i = 1; i < returns.length; i++) {
    actualReturns.push((returns[i] - returns[i - 1]) / returns[i - 1]);
  }
  
  const avgReturn = actualReturns.reduce((a, b) => a + b, 0) / actualReturns.length;
  const variance = actualReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / actualReturns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  return (avgReturn * 12 - riskFreeRate / 12) / (stdDev * Math.sqrt(12));
};

export const calculateFinalScore = (
  netValueHistory: number[],
  positions: Position[],
  totalFees: number,
  totalAssets: number,
  eventHistory: any[],
  tradeHistory: TradeRecord[],
  industries: Industry[]
): GameScore => {
  const initialValue = netValueHistory[0];
  const finalValue = netValueHistory[netValueHistory.length - 1];
  const totalReturn = (finalValue - initialValue) / initialValue;
  
  const sharpeRatio = calculateSharpeRatio(netValueHistory);
  const riskAdjustedReturn = Math.max(0, Math.min(100, (sharpeRatio + 1) * 40));
  
  const maxDrawdown = calculateMaxDrawdown(netValueHistory);
  const diversificationScore = calculateDiversificationScore(positions);
  const feeEfficiencyScore = calculateFeeEfficiencyScore(totalFees, totalAssets);
  const eventResponseScore = calculateEventResponseScore(eventHistory, tradeHistory, industries);
  
  const totalScore = Math.round(
    riskAdjustedReturn * 0.40 +
    diversificationScore * 0.25 +
    feeEfficiencyScore * 0.15 +
    eventResponseScore * 0.20
  );
  
  let grade = 'D';
  if (totalScore >= 90) grade = 'S';
  else if (totalScore >= 80) grade = 'A';
  else if (totalScore >= 70) grade = 'B';
  else if (totalScore >= 60) grade = 'C';
  
  const failureReasons: string[] = [];
  const suggestions: string[] = [];
  
  if (diversificationScore < 60) {
    failureReasons.push('持仓过度集中，缺乏分散化配置');
    suggestions.push('建议单个行业权重不超过30%，分散配置降低风险');
  }
  
  if (feeEfficiencyScore < 50) {
    failureReasons.push('交易过于频繁，手续费侵蚀严重');
    suggestions.push('减少不必要的调仓，降低交易成本');
  }
  
  if (maxDrawdown > 0.25) {
    failureReasons.push(`最大回撤过大（${formatPercent(maxDrawdown)}）`);
    suggestions.push('注意风险控制，避免在单一行业押注过重');
  }
  
  if (totalReturn < 0) {
    failureReasons.push(`最终收益为负（${formatPercent(totalReturn)}）`);
    suggestions.push('关注基本面信息，在事件后做出合理判断');
  }
  
  if (eventResponseScore < 50) {
    failureReasons.push('对市场事件响应不佳');
    suggestions.push('关注新闻事件对行业的影响，及时调整持仓');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('继续保持良好的投资习惯，祝投资顺利！');
  }
  
  return {
    totalReturn,
    riskAdjustedReturn,
    maxDrawdown,
    diversificationScore,
    feeEfficiency: feeEfficiencyScore,
    eventResponseScore,
    totalScore,
    grade,
    failureReasons,
    suggestions,
  };
};
