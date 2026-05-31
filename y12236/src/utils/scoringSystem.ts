import type {
  Score,
  DeductionItem,
  BonusItem,
  GameEvent,
  ConflictEvent,
  GameState,
} from '../types/game';
import { DEDUCTION_RULES, BONUS_RULES, GAME_CONFIG } from './constants';
import { generateId } from './eventGenerator';
import { calculateTimeWeight } from './greeksCalculator';

export function createInitialScore(): Score {
  return {
    baseScore: GAME_CONFIG.baseScore,
    riskDeductions: [],
    bonuses: [],
    total: GAME_CONFIG.baseScore,
  };
}

export function calculateTotalScore(score: Score): number {
  const totalDeductions = score.riskDeductions.reduce((sum, d) => sum + d.points, 0);
  const totalBonuses = score.bonuses.reduce((sum, b) => sum + b.points, 0);
  return score.baseScore - totalDeductions + totalBonuses;
}

export function addDeduction(
  score: Score,
  rule: string,
  timestamp: number,
  eventId: string,
  responseTime?: number
): Score {
  const ruleConfig = DEDUCTION_RULES[rule];
  if (!ruleConfig) return score;

  const timeWeight = responseTime !== undefined ? calculateTimeWeight(responseTime).weight : 1;
  const points = Math.round(ruleConfig.points * timeWeight);

  const deduction: DeductionItem = {
    id: generateId(),
    rule,
    points,
    reason: ruleConfig.reason + (responseTime !== undefined ? ` (响应时间: ${responseTime.toFixed(1)}秒, 权重: ${(timeWeight * 100).toFixed(0)}%)` : ''),
    timestamp,
    eventId,
  };

  const newDeductions = [...score.riskDeductions, deduction];
  return {
    ...score,
    riskDeductions: newDeductions,
    total: calculateTotalScore({ ...score, riskDeductions: newDeductions }),
  };
}

export function addBonus(
  score: Score,
  rule: string,
  timestamp: number
): Score {
  const ruleConfig = BONUS_RULES[rule];
  if (!ruleConfig) return score;

  const bonus: BonusItem = {
    id: generateId(),
    rule,
    points: ruleConfig.points,
    reason: ruleConfig.reason,
    timestamp,
  };

  const newBonuses = [...score.bonuses, bonus];
  return {
    ...score,
    bonuses: newBonuses,
    total: calculateTotalScore({ ...score, bonuses: newBonuses }),
  };
}

export function handleEventResponse(
  score: Score,
  event: GameEvent,
  responseTime: number,
  correct: boolean
): Score {
  let newScore = { ...score };

  if (correct) {
    if (event.type === 'volatility_storm' && responseTime < 3) {
      newScore = addBonus(newScore, 'early_volatility_response', event.timestamp);
    }
    if (event.type === 'gamma_gate') {
      newScore = addBonus(newScore, 'gamma_gate_correct_judgment', event.timestamp);
    }
    if (event.type === 'compound') {
      newScore = addBonus(newScore, 'correct_compound_event', event.timestamp);
    }
  } else {
    const ruleMap: Record<string, string> = {
      volatility_storm: 'unhandled_volatility',
      delta_surge: 'delta_mismatch',
      gamma_gate: 'gamma_gate_misjudgment',
      margin_warning: 'margin_call',
      compound: 'compound_event_failure',
    };

    const rule = ruleMap[event.type];
    if (rule) {
      newScore = addDeduction(newScore, rule, event.timestamp, event.id, responseTime);
    }

    if (event.type === 'gamma_gate' && event.isDelayed) {
      newScore = addDeduction(newScore, 'late_arrival_misjudgment', event.timestamp, event.id);
    }
  }

  return newScore;
}

export function handleConflictResolution(
  score: Score,
  conflict: ConflictEvent,
  resolutionTime: number,
  traced: boolean,
  traceTime?: number
): Score {
  let newScore = { ...score };

  if (!traced) {
    newScore = addDeduction(
      newScore,
      'conflict_no_trace',
      conflict.timestamp,
      conflict.id
    );
  } else if (traceTime && traceTime - conflict.timestamp > 10) {
    newScore = addDeduction(
      newScore,
      'conflict_no_trace',
      conflict.timestamp,
      conflict.id
    );
  }

  if (resolutionTime - conflict.timestamp > 40) {
    newScore = addDeduction(
      newScore,
      'conflict_timeout',
      conflict.timestamp,
      conflict.id
    );
  }

  const correct = conflict.resolution === conflict.correctResolution;

  if (correct) {
    newScore = addBonus(newScore, 'perfect_conflict_resolution', conflict.resolvedAt || conflict.timestamp);
  } else {
    newScore = addDeduction(
      newScore,
      'conflict_wrong_resolution',
      conflict.timestamp,
      conflict.id,
      resolutionTime - conflict.timestamp
    );
  }

  return newScore;
}

export function checkBonuses(state: GameState): Score {
  let newScore = { ...state.score };

  const deltaNeutralTime = checkDeltaNeutralDuration(state);
  if (deltaNeutralTime >= 30) {
    const hasBonus = newScore.bonuses.some((b) => b.rule === 'delta_neutral_maintained');
    if (!hasBonus) {
      newScore = addBonus(newScore, 'delta_neutral_maintained', state.time);
    }
  }

  if (state.margin.warnings.length === 0 && state.time > 60) {
    const hasBonus = newScore.bonuses.some((b) => b.rule === 'no_margin_warnings');
    if (!hasBonus) {
      newScore = addBonus(newScore, 'no_margin_warnings', state.time);
    }
  }

  const allEventsHandled = state.events.every((e) => e.handled);
  if (allEventsHandled && state.events.length > 0 && state.status === 'settled') {
    const hasBonus = newScore.bonuses.some((b) => b.rule === 'all_events_handled');
    if (!hasBonus) {
      newScore = addBonus(newScore, 'all_events_handled', state.time);
    }
  }

  return newScore;
}

function checkDeltaNeutralDuration(state: GameState): number {
  const threshold = GAME_CONFIG.deltaNeutralThreshold;
  let maxDuration = 0;
  let currentDuration = 0;
  let lastTime = 0;

  for (const point of state.greeks.deltaHistory) {
    if (Math.abs(point.value) <= threshold) {
      if (lastTime > 0) {
        currentDuration += point.time - lastTime;
      }
      maxDuration = Math.max(maxDuration, currentDuration);
    } else {
      currentDuration = 0;
    }
    lastTime = point.time;
  }

  return maxDuration;
}

export function getDeductionSummary(score: Score): {
  totalDeductions: number;
  byRule: Record<string, { count: number; points: number }>;
} {
  const byRule: Record<string, { count: number; points: number }> = {};

  for (const d of score.riskDeductions) {
    if (!byRule[d.rule]) {
      byRule[d.rule] = { count: 0, points: 0 };
    }
    byRule[d.rule].count++;
    byRule[d.rule].points += d.points;
  }

  return {
    totalDeductions: score.riskDeductions.reduce((sum, d) => sum + d.points, 0),
    byRule,
  };
}

export function getBonusSummary(score: Score): {
  totalBonuses: number;
  byRule: Record<string, { count: number; points: number }>;
} {
  const byRule: Record<string, { count: number; points: number }> = {};

  for (const b of score.bonuses) {
    if (!byRule[b.rule]) {
      byRule[b.rule] = { count: 0, points: 0 };
    }
    byRule[b.rule].count++;
    byRule[b.rule].points += b.points;
  }

  return {
    totalBonuses: score.bonuses.reduce((sum, b) => sum + b.points, 0),
    byRule,
  };
}
