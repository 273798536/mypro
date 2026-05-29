import type {
  Tower,
  GameState,
  GameAction,
  SettlementDetail,
  MarginCheckResult,
  LiquidationItem,
  OptionCard,
} from '../types';
import { calculateTowerValue, calculateTotalMarginUsed } from './pricingEngine';
import { defaultGameConfig } from '../data/mockData';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const checkMarginAdequacy = (
  currentMargin: number,
  totalMarginUsed: number,
  maintenanceMarginRatio: number = defaultGameConfig.maintenanceMarginRatio
): MarginCheckResult => {
  const requiredMargin = totalMarginUsed * maintenanceMarginRatio;
  const adequate = currentMargin >= requiredMargin;

  return {
    adequate,
    deficit: adequate ? 0 : requiredMargin - currentMargin,
    relatedCards: [],
    maintenanceMarginRatio,
    currentMargin,
    totalMarginUsed,
  };
};

export const calculateLiquidationOrder = (
  towers: Tower[],
  targetDeficit: number,
  cards: OptionCard[],
  volatility: number
): LiquidationItem[] => {
  const towerRiskScores = towers.map((tower) => {
    const card = cards.find((c) => c.id === tower.optionCardId);
    if (!card) return { tower, riskScore: 0, marginUsed: 0 };

    const { marginUsed } = calculateTowerValue(card, tower.level, 100, volatility);
    const riskScore = card.vega * tower.level + Math.abs(card.delta) * 0.5;

    return { tower, riskScore, marginUsed };
  });

  towerRiskScores.sort((a, b) => b.riskScore - a.riskScore);

  const liquidationItems: LiquidationItem[] = [];
  let remainingDeficit = targetDeficit;

  for (const item of towerRiskScores) {
    if (remainingDeficit <= 0) break;

    const card = cards.find((c) => c.id === item.tower.optionCardId);
    if (!card) continue;

    const marginPerLevel = item.marginUsed / item.tower.level;
    let levelsToLiquidate = 0;

    for (let level = item.tower.level; level > 0 && remainingDeficit > 0; level--) {
      levelsToLiquidate++;
      remainingDeficit -= marginPerLevel;
    }

    if (levelsToLiquidate > 0) {
      liquidationItems.push({
        towerId: item.tower.id,
        amount: levelsToLiquidate,
        reason: `Vega风险值${item.riskScore.toFixed(3)}最高，优先强平${levelsToLiquidate}层，释放保证金约${(marginPerLevel * levelsToLiquidate).toFixed(2)}`,
      });
    }
  }

  return liquidationItems;
};

export const executeForceLiquidation = (
  gameState: GameState,
  deficit: number,
  cards: OptionCard[]
): {
  newState: GameState;
  actions: GameAction[];
  details: SettlementDetail[];
} => {
  const liquidationOrder = calculateLiquidationOrder(
    gameState.towers,
    deficit,
    cards,
    gameState.currentVolatility
  );

  const newActions: GameAction[] = [];
  const newDetails: SettlementDetail[] = [];
  let updatedTowers = [...gameState.towers];
  let marginReleased = 0;

  for (const item of liquidationOrder) {
    const towerIndex = updatedTowers.findIndex((t) => t.id === item.towerId);
    if (towerIndex === -1) continue;

    const tower = updatedTowers[towerIndex];
    const card = cards.find((c) => c.id === tower.optionCardId);
    if (!card) continue;

    const { marginUsed: marginBefore } = calculateTowerValue(
      card,
      tower.level,
      gameState.spotPrice,
      gameState.currentVolatility
    );

    const newLevel = tower.level - item.amount;
    let updatedTower: Tower | null = null;

    if (newLevel <= 0) {
      updatedTowers = updatedTowers.filter((t) => t.id !== tower.id);
    } else {
      updatedTower = {
        ...tower,
        level: newLevel,
      };
      updatedTowers[towerIndex] = updatedTower;
    }

    const { marginUsed: marginAfter } = calculateTowerValue(
      card,
      newLevel,
      gameState.spotPrice,
      gameState.currentVolatility
    );

    const released = marginBefore - marginAfter;
    marginReleased += released;

    const action: GameAction = {
      id: generateId(),
      type: 'FORCE_LIQUIDATION',
      round: gameState.currentRound,
      timestamp: Date.now(),
      payload: {
        towerId: item.towerId,
        cardId: card.id,
        cardName: card.name,
        levelsLiquidated: item.amount,
        newLevel: Math.max(0, newLevel),
        marginReleased: released,
        reason: item.reason,
      },
      relatedCardId: card.id,
    };

    newActions.push(action);

    const detail: SettlementDetail = {
      id: generateId(),
      round: gameState.currentRound,
      eventType: 'FORCE_LIQUIDATION',
      description: `强制平仓：${card.name} 被强平${item.amount}层`,
      scoreChange: -defaultGameConfig.forceLiquidationPenalty * item.amount,
      relatedCardId: card.id,
      humanReadableReason: `在第${gameState.currentRound}回合，由于保证金不足（缺口${deficit.toFixed(2)}），系统按风险度排序强制平掉了${card.name}的${item.amount}层仓位。${item.reason}。本次强平释放保证金${released.toFixed(2)}。`,
    };

    newDetails.push(detail);
  }

  const newState: GameState = {
    ...gameState,
    towers: updatedTowers,
    currentMargin: gameState.currentMargin + marginReleased,
    lives: gameState.lives - 1,
    actionLog: [...gameState.actionLog, ...newActions],
  };

  return {
    newState,
    actions: newActions,
    details: newDetails,
  };
};

export const createMarginCallDetail = (
  gameState: GameState,
  marginCheck: MarginCheckResult
): SettlementDetail => {
  return {
    id: generateId(),
    round: gameState.currentRound,
    eventType: 'MARGIN_CALL',
    description: `保证金预警：缺口${marginCheck.deficit.toFixed(2)}`,
    scoreChange: -defaultGameConfig.marginCallPenalty,
    humanReadableReason: `第${gameState.currentRound}回合结束时，保证金余额${marginCheck.currentMargin.toFixed(2)}低于维持保证金要求${(marginCheck.totalMarginUsed * marginCheck.maintenanceMarginRatio).toFixed(2)}（维持保证金率${(marginCheck.maintenanceMarginRatio * 100).toFixed(0)}%），缺口为${marginCheck.deficit.toFixed(2)}。请及时补充保证金或降低仓位，否则将触发强制平仓。`,
  };
};

export const performRiskCheck = (
  gameState: GameState,
  cards: OptionCard[]
): {
  newState: GameState;
  marginCallDetails: SettlementDetail[];
  liquidationDetails: SettlementDetail[];
} => {
  const towerInfo = gameState.towers.map((tower) => {
    const card = cards.find((c) => c.id === tower.optionCardId);
    return { option: card!, level: tower.level };
  });

  const totalMarginUsed = calculateTotalMarginUsed(towerInfo, gameState.currentVolatility);
  const marginCheck = checkMarginAdequacy(gameState.currentMargin, totalMarginUsed);

  let newState = gameState;
  const marginCallDetails: SettlementDetail[] = [];
  const liquidationDetails: SettlementDetail[] = [];

  if (!marginCheck.adequate) {
    marginCallDetails.push(createMarginCallDetail(gameState, marginCheck));

    if (gameState.currentMargin < totalMarginUsed * 0.5) {
      const result = executeForceLiquidation(newState, marginCheck.deficit, cards);
      newState = result.newState;
      liquidationDetails.push(...result.details);
    }
  }

  return {
    newState,
    marginCallDetails,
    liquidationDetails,
  };
};
