import type {
  GameState,
  GameAction,
  SettlementResult,
  SettlementDetail,
  OptionCard,
  VolatilityEvent,
  ErrorLocation,
  Grade,
  ComparisonResult,
} from '../types';
import { defaultGameConfig } from '../data/mockData';
import { calculateCumulativeVolatility } from './volatilityEngine';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const generateHumanReadableReason = (
  detail: SettlementDetail,
  card?: OptionCard,
  event?: VolatilityEvent
): string => {
  if (detail.humanReadableReason) {
    return detail.humanReadableReason;
  }

  let reason = `第${detail.round}回合：`;

  switch (detail.eventType) {
    case 'VOLATILITY_SHOCK':
      if (event) {
        reason += `事件"${event.name}"触发波动率变动。${event.description}`;
      } else {
        reason += '波动率发生变动，影响组合价值。';
      }
      break;
    case 'MARGIN_CALL':
      reason += '保证金余额低于维持保证金要求，请及时补充保证金或降低仓位。';
      break;
    case 'FORCE_LIQUIDATION':
      if (card) {
        reason += `由于保证金严重不足，系统强制平仓了${card.name}的部分仓位。`;
      } else {
        reason += '由于保证金严重不足，系统触发强制平仓。';
      }
      break;
    case 'TOWER_ACTION':
      if (card) {
        reason += `对${card.name}进行了操作。`;
      }
      break;
    case 'PENALTY':
      reason += '因操作失误或策略不当导致扣分。';
      break;
    default:
      reason += '发生了一个事件。';
  }

  if (detail.scoreChange !== 0) {
    reason += ` 本次${detail.scoreChange > 0 ? '加' : '扣'}${Math.abs(detail.scoreChange)}分。`;
  }

  return reason;
};

export const generateRoundDescription = (
  round: number,
  actions: GameAction[],
  events: VolatilityEvent[]
): string => {
  const roundActions = actions.filter((a) => a.round === round);
  const roundEvents = events.filter((e) => e.triggerRound === round);

  const parts: string[] = [];

  if (roundEvents.length > 0) {
    parts.push(`市场事件：${roundEvents.map((e) => e.name).join('、')}`);
  }

  if (roundActions.length > 0) {
    const actionDescriptions = roundActions.map((a) => {
      switch (a.type) {
        case 'PLACE_TOWER':
          return `放置${a.payload.cardName || '防御塔'}`;
        case 'UPGRADE_TOWER':
          return `升级${a.payload.cardName || '防御塔'}至${a.payload.newLevel}级`;
        case 'SELL_TOWER':
          return `卖出${a.payload.cardName || '防御塔'}`;
        case 'ADD_MARGIN':
          return `补充保证金${a.payload.amount}`;
        case 'FORCE_LIQUIDATION':
          return `强平${a.payload.cardName || '仓位'}`;
        default:
          return '其他操作';
      }
    });
    parts.push(`操作：${actionDescriptions.join('、')}`);
  }

  if (parts.length === 0) {
    return `第${round}回合：市场平稳，无重大事件。`;
  }

  return `第${round}回合：${parts.join('；')}`;
};

export const locateErrorSource = (
  detail: SettlementDetail,
  cards: OptionCard[],
  events: VolatilityEvent[]
): ErrorLocation | null => {
  if (detail.relatedCardId) {
    const card = cards.find((c) => c.id === detail.relatedCardId);
    if (card) {
      let field = 'marginRequirement';
      let value = card.marginRequirement;
      let lineNumber = 7;

      if (detail.eventType === 'FORCE_LIQUIDATION') {
        field = 'vega';
        value = card.vega;
        lineNumber = 10;
      } else if (detail.eventType === 'MARGIN_CALL') {
        field = 'marginRequirement';
        value = card.marginRequirement;
        lineNumber = 7;
      }

      return {
        type: 'OPTION_CARD',
        id: card.id,
        field,
        lineNumber,
        value,
      };
    }
  }

  if (detail.relatedEventId) {
    const event = events.find((e) => e.id === detail.relatedEventId);
    if (event) {
      return {
        type: 'VOLATILITY_EVENT',
        id: event.id,
        field: 'volatilityJump',
        lineNumber: 5,
        value: event.volatilityJump,
      };
    }
  }

  return null;
};

export const calculateGrade = (score: number, maxScore: number): Grade => {
  const percentage = score / maxScore;

  if (percentage >= 0.9) return 'A';
  if (percentage >= 0.8) return 'B';
  if (percentage >= 0.7) return 'C';
  if (percentage >= 0.6) return 'D';
  return 'F';
};

export const generateSettlement = (
  gameState: GameState,
  roundDetails: SettlementDetail[],
  cards: OptionCard[],
  events: VolatilityEvent[]
): SettlementResult => {
  const maxScore = defaultGameConfig.baseScore + gameState.totalRounds * 50;
  const finalScore = Math.max(0, gameState.score);
  const grade = calculateGrade(finalScore, maxScore);

  const penaltyDetails = roundDetails.filter((d) => d.scoreChange < 0);

  const towerActions = gameState.actionLog
    .filter(
      (a) =>
        a.type === 'PLACE_TOWER' ||
        a.type === 'UPGRADE_TOWER' ||
        a.type === 'SELL_TOWER' ||
        a.type === 'FORCE_LIQUIDATION'
    )
    .map((a) => {
      const actionMap: Record<string, 'PLACE' | 'UPGRADE' | 'SELL' | 'LIQUIDATED'> = {
        PLACE_TOWER: 'PLACE',
        UPGRADE_TOWER: 'UPGRADE',
        SELL_TOWER: 'SELL',
        FORCE_LIQUIDATION: 'LIQUIDATED',
      };

      let scoreChange = 0;
      const relatedDetail = roundDetails.find(
        (d) => d.relatedCardId === a.relatedCardId && d.round === a.round
      );
      if (relatedDetail) {
        scoreChange = relatedDetail.scoreChange;
      }

      let reason = '';
      if (a.type === 'PLACE_TOWER') {
        reason = `在第${a.round}回合放置，消耗保证金${a.payload.marginUsed?.toFixed(2) || '未知'}`;
      } else if (a.type === 'UPGRADE_TOWER') {
        reason = `升级至${a.payload.newLevel}级，增加保证金占用`;
      } else if (a.type === 'SELL_TOWER') {
        reason = `主动卖出，释放保证金${a.payload.marginReleased?.toFixed(2) || '未知'}`;
      } else if (a.type === 'FORCE_LIQUIDATION') {
        reason = a.payload.reason || '强制平仓';
      }

      return {
        round: a.round,
        towerId: a.payload.towerId || a.id,
        cardName: a.payload.cardName || '未知期权',
        action: actionMap[a.type],
        scoreChange,
        reason,
      };
    });

  const cumulativeResult = calculateCumulativeVolatility(
    events,
    gameState.initialVolatility,
    gameState.totalRounds
  );
  const volatilityJumps = cumulativeResult.jumps.length;
  const maxVolatility = Math.max(...cumulativeResult.jumps.map((j) => j.cumulativeAfter));

  let summary = '';
  if (grade === 'A') {
    summary = `优秀！你成功守住了客户组合，在${volatilityJumps}次波动率冲击下展现了出色的风控能力。最高波动率达到${(maxVolatility * 100).toFixed(1)}%，但你始终保持了充足的保证金。`;
  } else if (grade === 'B') {
    summary = `良好！你基本守住了客户组合，但在部分波动冲击下保证金略显紧张。建议在波动率上升前提前准备更多保证金缓冲。`;
  } else if (grade === 'C') {
    summary = `及格。你经历了${penaltyDetails.length}次扣分事件，其中${roundDetails.filter((d) => d.eventType === 'MARGIN_CALL').length}次保证金预警。需要加强保证金管理意识。`;
  } else if (grade === 'D') {
    summary = `待改进。你经历了${roundDetails.filter((d) => d.eventType === 'FORCE_LIQUIDATION').length}次强制平仓，损失了${gameState.initialMargin - gameState.currentMargin > 0 ? (gameState.initialMargin - gameState.currentMargin).toFixed(2) : '0'}保证金。建议复习波动率对期权组合的影响。`;
  } else {
    summary = `未能通过。你损失了大部分保证金，组合被多次强平。请重新学习期权保证金制度和波动率风险管理。`;
  }

  return {
    id: generateId(),
    sessionId: gameState.sessionId,
    levelId: gameState.levelId,
    finalScore,
    grade,
    roundDetails,
    penaltyDetails,
    towerActions,
    summary,
    createdAt: new Date(),
    volatilityEventsUsed: events,
    optionCardsUsed: cards,
  };
};

export const generateTowerActionReason = (
  action: GameAction,
  card?: OptionCard
): string => {
  if (!card) return '操作记录';

  switch (action.type) {
    case 'PLACE_TOWER':
      return `在第${action.round}回合放置${card.name}，建仓成本${card.cost}，保证金占用${(card.marginRequirement * (action.payload.level || 1)).toFixed(2)}。Vega暴露${(card.vega * (action.payload.level || 1)).toFixed(3)}，将在波动率上升时增值。`;
    case 'UPGRADE_TOWER':
      return `在第${action.round}回合将${card.name}升级至${action.payload.newLevel}级。保证金占用增加，Vega暴露扩大至${(card.vega * action.payload.newLevel).toFixed(3)}。`;
    case 'SELL_TOWER':
      return `在第${action.round}回合卖出${card.name}，释放保证金${action.payload.marginReleased?.toFixed(2) || '未知'}。减少了${card.vega.toFixed(3)}的Vega暴露。`;
    case 'FORCE_LIQUIDATION':
      return `在第${action.round}回合被强制平仓${action.payload.levelsLiquidated}层${card.name}。原因：${action.payload.reason || '保证金不足'}。`;
    default:
      return `第${action.round}回合对${card.name}进行了操作。`;
  }
};

export const compareGameResults = (
  oldResult: SettlementResult,
  newResult: SettlementResult
): ComparisonResult => {
  const differences: ComparisonResult['differences'] = [];

  if (oldResult.finalScore !== newResult.finalScore) {
    differences.push({
      round: -1,
      field: 'finalScore',
      oldValue: oldResult.finalScore,
      newValue: newResult.finalScore,
      explanation: `总分从${oldResult.finalScore}变为${newResult.finalScore}，变化${newResult.finalScore - oldResult.finalScore > 0 ? '+' : ''}${newResult.finalScore - oldResult.finalScore}`,
    });
  }

  if (oldResult.grade !== newResult.grade) {
    differences.push({
      round: -1,
      field: 'grade',
      oldValue: oldResult.grade,
      newValue: newResult.grade,
      explanation: `评级从${oldResult.grade}变为${newResult.grade}`,
    });
  }

  const maxRounds = Math.max(
    oldResult.roundDetails.length,
    newResult.roundDetails.length
  );

  for (let r = 1; r <= maxRounds; r++) {
    const oldDetails = oldResult.roundDetails.filter((d) => d.round === r);
    const newDetails = newResult.roundDetails.filter((d) => d.round === r);

    const oldScoreChange = oldDetails.reduce((sum, d) => sum + d.scoreChange, 0);
    const newScoreChange = newDetails.reduce((sum, d) => sum + d.scoreChange, 0);

    if (oldScoreChange !== newScoreChange) {
      const oldEvents = oldDetails.map((d) => d.description).join('; ');
      const newEvents = newDetails.map((d) => d.description).join('; ');

      differences.push({
        round: r,
        field: 'roundScore',
        oldValue: oldScoreChange,
        newValue: newScoreChange,
        explanation: `第${r}回合得分变化：原${oldScoreChange > 0 ? '+' : ''}${oldScoreChange}，现${newScoreChange > 0 ? '+' : ''}${newScoreChange}。原因：原事件"${oldEvents || '无'}"，现事件"${newEvents || '无'}"`,
      });
    }
  }

  oldResult.penaltyDetails.forEach((oldPenalty) => {
    const matchingNew = newResult.penaltyDetails.find(
      (d) => d.round === oldPenalty.round && d.eventType === oldPenalty.eventType
    );
    if (!matchingNew) {
      differences.push({
        round: oldPenalty.round,
        field: 'penalty',
        oldValue: oldPenalty.scoreChange,
        newValue: 0,
        explanation: `第${oldPenalty.round}回合的扣分项"${oldPenalty.description}"不再存在`,
        relatedEventId: oldPenalty.relatedEventId,
        relatedCardId: oldPenalty.relatedCardId,
      });
    } else if (matchingNew.scoreChange !== oldPenalty.scoreChange) {
      differences.push({
        round: oldPenalty.round,
        field: 'penaltyAmount',
        oldValue: oldPenalty.scoreChange,
        newValue: matchingNew.scoreChange,
        explanation: `第${oldPenalty.round}回合扣分项"${oldPenalty.description}"的扣分数额变化`,
        relatedEventId: oldPenalty.relatedEventId,
        relatedCardId: oldPenalty.relatedCardId,
      });
    }
  });

  newResult.penaltyDetails.forEach((newPenalty) => {
    const matchingOld = oldResult.penaltyDetails.find(
      (d) => d.round === newPenalty.round && d.eventType === newPenalty.eventType
    );
    if (!matchingOld) {
      differences.push({
        round: newPenalty.round,
        field: 'penalty',
        oldValue: 0,
        newValue: newPenalty.scoreChange,
        explanation: `第${newPenalty.round}回合新增扣分项"${newPenalty.description}"`,
        relatedEventId: newPenalty.relatedEventId,
        relatedCardId: newPenalty.relatedCardId,
      });
    }
  });

  return {
    oldResult,
    newResult,
    differences,
  };
};
