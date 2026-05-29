import type {
  GameState,
  FundPosition,
  NewsEvent,
  Decision,
  RiskEvent,
  RiskType,
  RiskConfig,
  IndustryCard,
} from '@/types';

const RISK_CONFIGS: Record<RiskType, RiskConfig> = {
  over_concentration: {
    type: 'over_concentration',
    threshold: 0.3,
    penalty: 5,
    responsiblePerson: '行业分析师 张三',
    fixDocument: '《新能源行业卡风险提示等级配置表》',
    descriptionTemplate: '行业「{industry}」仓位占比达到 {weight}%，超过30%的风险阈值',
  },
  missing_fee: {
    type: 'missing_fee',
    threshold: 0,
    penalty: 3,
    responsiblePerson: '运营专员 李四',
    fixDocument: '《交易费率配置表》',
    descriptionTemplate: '交易时手续费字段缺失，已按默认费率0.3%计算',
  },
  panic_sell: {
    type: 'panic_sell',
    threshold: 0.2,
    penalty: 8,
    responsiblePerson: '投教专员 王五',
    fixDocument: '《投资者行为指南》',
    descriptionTemplate: '连续两回合在「{industry}」下跌时减仓超过20%，属于恐慌卖出行为',
  },
  chasing_rally: {
    type: 'chasing_rally',
    threshold: 0.15,
    penalty: 4,
    responsiblePerson: '策略师 赵六',
    fixDocument: '《趋势投资警示规则》',
    descriptionTemplate: '在「{industry}」已累计上涨 {gain}% 后继续加仓，属于追涨行为',
  },
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function calculateTotalAssets(state: GameState): number {
  const positionValue = state.positions.reduce((sum, p) => sum + p.currentValue, 0);
  return positionValue + state.availableCash;
}

export function calculateIndustryWeight(
  state: GameState,
  industryCardId: string
): number {
  const position = state.positions.find((p) => p.industryCardId === industryCardId);
  if (!position) return 0;
  const totalAssets = calculateTotalAssets(state);
  return totalAssets > 0 ? position.currentValue / totalAssets : 0;
}

export function getCurrentNews(
  newsEvents: NewsEvent[],
  currentRound: number
): NewsEvent | null {
  const roundNews = newsEvents.filter((n) => n.round === currentRound);
  if (roundNews.length === 0) return null;
  return roundNews[Math.floor(Math.random() * roundNews.length)];
}

export function calculateTransactionFee(
  amount: number,
  feeRate: number
): { fee: number; isMissing: boolean } {
  if (feeRate <= 0) {
    return { fee: amount * 0.003, isMissing: true };
  }
  return { fee: amount * feeRate, isMissing: false };
}

function updatePositionAfterTrade(
  position: FundPosition,
  action: 'buy' | 'sell',
  amount: number,
  priceChange: number
): FundPosition {
  const pricePerShare = position.shares > 0 ? position.currentValue / position.shares : 1;
  const newPrice = pricePerShare * (1 + priceChange);
  const sharesTraded = amount / newPrice;

  let newShares = position.shares;
  let newCost = position.cost;
  let newValue = position.currentValue * (1 + priceChange);

  if (action === 'buy') {
    newShares += sharesTraded;
    newCost += amount;
    newValue += amount;
  } else if (action === 'sell') {
    const sellRatio = sharesTraded / position.shares;
    newShares -= sharesTraded;
    newCost -= position.cost * sellRatio;
    newValue -= amount;
  }

  const totalAssets = 1000000;
  const newWeight = newValue / totalAssets;

  return {
    ...position,
    shares: Math.max(0, newShares),
    cost: Math.max(0, newCost),
    currentValue: Math.max(0, newValue),
    weight: newWeight,
  };
}

export function checkRiskEvents(
  state: GameState,
  decision: Decision,
  industryCards: IndustryCard[],
  priceChange: number
): RiskEvent[] {
  const events: RiskEvent[] = [];
  const industry = industryCards.find((c) => c.id === decision.industryCardId);
  const industryName = industry?.name || '未知行业';

  const weight = calculateIndustryWeight(state, decision.industryCardId);
  if (weight > RISK_CONFIGS.over_concentration.threshold) {
    const config = RISK_CONFIGS.over_concentration;
    events.push({
      id: generateId(),
      type: 'over_concentration',
      description: config.descriptionTemplate
        .replace('{industry}', industryName)
        .replace('{weight}', (weight * 100).toFixed(1)),
      penalty: config.penalty,
      round: state.currentRound,
      responsiblePerson: config.responsiblePerson,
      fixDocument: config.fixDocument,
    });
  }

  const cumGain = state.lastPriceChanges[decision.industryCardId] || 0;
  if (
    decision.actionType === 'buy' &&
    cumGain > RISK_CONFIGS.chasing_rally.threshold
  ) {
    const config = RISK_CONFIGS.chasing_rally;
    events.push({
      id: generateId(),
      type: 'chasing_rally',
      description: config.descriptionTemplate
        .replace('{industry}', industryName)
        .replace('{gain}', (cumGain * 100).toFixed(1)),
      penalty: config.penalty,
      round: state.currentRound,
      responsiblePerson: config.responsiblePerson,
      fixDocument: config.fixDocument,
    });
  }

  if (decision.actionType === 'sell' && priceChange < 0) {
    const sellRatio = decision.amount / state.positions.find(
      (p) => p.industryCardId === decision.industryCardId
    )!.currentValue;
    const consecutive = (state.consecutiveSellDowns[decision.industryCardId] || 0) + 1;

    if (consecutive >= 2 && sellRatio > RISK_CONFIGS.panic_sell.threshold) {
      const config = RISK_CONFIGS.panic_sell;
      events.push({
        id: generateId(),
        type: 'panic_sell',
        description: config.descriptionTemplate.replace('{industry}', industryName),
        penalty: config.penalty,
        round: state.currentRound,
        responsiblePerson: config.responsiblePerson,
        fixDocument: config.fixDocument,
      });
    }
  }

  return events;
}

export function executeDecision(
  state: GameState,
  decision: Decision,
  newsEvent: NewsEvent,
  industryCards: IndustryCard[]
): { newState: GameState; riskEvents: RiskEvent[]; feeMissing: boolean } {
  const { fee, isMissing: feeMissing } = calculateTransactionFee(
    decision.amount,
    state.transactionFeeRate
  );

  const feeRiskEvents: RiskEvent[] = [];
  if (feeMissing) {
    const config = RISK_CONFIGS.missing_fee;
    feeRiskEvents.push({
      id: generateId(),
      type: 'missing_fee',
      description: config.descriptionTemplate,
      penalty: config.penalty,
      round: state.currentRound,
      responsiblePerson: config.responsiblePerson,
      fixDocument: config.fixDocument,
    });
  }

  const priceChange = newsEvent.impactMagnitude + (Math.random() - 0.5) * 0.02;

  let newPositions = [...state.positions];
  let newCash = state.availableCash;

  if (decision.actionType !== 'hold') {
    const positionIndex = newPositions.findIndex(
      (p) => p.industryCardId === decision.industryCardId
    );

    if (positionIndex >= 0) {
      const totalTransactionAmount = decision.amount + (decision.actionType === 'buy' ? fee : 0);
      if (decision.actionType === 'buy' && totalTransactionAmount > state.availableCash) {
        throw new Error('可用资金不足');
      }
      if (decision.actionType === 'sell' && decision.amount > newPositions[positionIndex].currentValue) {
        throw new Error('卖出金额超过持有市值');
      }

      newPositions[positionIndex] = updatePositionAfterTrade(
        newPositions[positionIndex],
        decision.actionType,
        decision.amount,
        priceChange
      );

      if (decision.actionType === 'buy') {
        newCash -= totalTransactionAmount;
      } else {
        newCash += decision.amount - fee;
      }
    }
  }

  newPositions = newPositions.map((p) => {
    if (p.industryCardId !== decision.industryCardId) {
      const industryCard = industryCards.find((c) => c.id === p.industryCardId);
      const volatility = industryCard?.volatility || 0.1;
      const randomChange = (Math.random() - 0.5) * volatility * 0.3;
      return {
        ...p,
        currentValue: p.currentValue * (1 + randomChange),
      };
    }
    return p;
  });

  const totalAssets = newPositions.reduce((sum, p) => sum + p.currentValue, 0) + newCash;
  newPositions = newPositions.map((p) => ({
    ...p,
    weight: totalAssets > 0 ? p.currentValue / totalAssets : 0,
  }));

  const newNetValue = totalAssets / (state.initialNetValue > 0 ? 1000000 / state.initialNetValue : 1);

  const newLastPriceChanges = { ...state.lastPriceChanges };
  const currentGain = newLastPriceChanges[decision.industryCardId] || 0;
  newLastPriceChanges[decision.industryCardId] = Math.max(-0.3, Math.min(0.5, currentGain + priceChange));

  const newConsecutiveSellDowns = { ...state.consecutiveSellDowns };
  if (decision.actionType === 'sell' && priceChange < 0) {
    newConsecutiveSellDowns[decision.industryCardId] = (newConsecutiveSellDowns[decision.industryCardId] || 0) + 1;
  } else {
    newConsecutiveSellDowns[decision.industryCardId] = 0;
  }

  const newState: GameState = {
    ...state,
    positions: newPositions,
    availableCash: newCash,
    netValue: newNetValue,
    decisions: [...state.decisions, decision],
    lastPriceChanges: newLastPriceChanges,
    consecutiveSellDowns: newConsecutiveSellDowns,
  };

  const riskEvents = checkRiskEvents(newState, decision, industryCards, priceChange);
  const allRiskEvents = [...feeRiskEvents, ...riskEvents];

  const totalPenalty = allRiskEvents.reduce((sum, e) => sum + e.penalty, 0);
  newState.riskScore = Math.max(0, state.riskScore - totalPenalty);

  return { newState, riskEvents: allRiskEvents, feeMissing };
}

export function advanceRound(state: GameState): GameState {
  const nextRound = state.currentRound + 1;

  const newNetValueHistory = [
    ...state.netValueHistory,
    {
      round: state.currentRound,
      value: state.netValue,
      decisionId: state.decisions[state.decisions.length - 1]?.id,
      riskEventId: state.riskEvents[state.riskEvents.length - 1]?.id,
    },
  ];

  return {
    ...state,
    currentRound: nextRound,
    netValueHistory: newNetValueHistory,
  };
}

export function finishGame(state: GameState): GameState {
  const finalNetValueHistory = [
    ...state.netValueHistory,
    {
      round: state.currentRound,
      value: state.netValue,
      decisionId: state.decisions[state.decisions.length - 1]?.id,
      riskEventId: state.riskEvents[state.riskEvents.length - 1]?.id,
    },
  ];

  return {
    ...state,
    netValueHistory: finalNetValueHistory,
    isFinished: true,
  };
}

export function createInitialGameState(
  initialPositions: FundPosition[],
  initialCash: number,
  totalRounds: number,
  transactionFeeRate: number = 0.003
): GameState {
  const totalAssets = initialPositions.reduce((sum, p) => sum + p.currentValue, 0) + initialCash;
  const initialNetValue = totalAssets / 10000;

  return {
    currentRound: 1,
    totalRounds,
    netValue: initialNetValue,
    initialNetValue,
    riskBudget: 100,
    riskScore: 100,
    availableCash: initialCash,
    transactionFeeRate,
    positions: initialPositions,
    decisions: [],
    riskEvents: [],
    netValueHistory: [
      {
        round: 0,
        value: initialNetValue,
      },
    ],
    lastPriceChanges: {},
    consecutiveSellDowns: {},
    isFinished: false,
  };
}

export function createDecision(
  newsEventId: string,
  industryCardId: string,
  actionType: 'buy' | 'sell' | 'hold',
  amount: number,
  round: number
): Decision {
  return {
    id: generateId(),
    newsEventId,
    industryCardId,
    actionType,
    amount,
    round,
    timestamp: Date.now(),
  };
}
