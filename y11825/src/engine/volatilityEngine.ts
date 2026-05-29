import type {
  VolatilityEvent,
  ProcessedVolatilityEvent,
  CumulativeVolatilityResult,
  SettlementDetail,
} from '../types';
import { defaultGameConfig } from '../data/mockData';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const processVolatilityEvent = (
  event: VolatilityEvent,
  currentVolatility: number,
  round: number
): ProcessedVolatilityEvent => {
  const jumpAmount = event.volatilityJump;
  const newVolatility = Math.max(0.01, currentVolatility + jumpAmount);

  const exactCalculation = `
    第${round}回合波动率计算:
    - 当前波动率: ${(currentVolatility * 100).toFixed(2)}%
    - 事件"${event.name}"触发: ${jumpAmount >= 0 ? '+' : ''}${(jumpAmount * 100).toFixed(2)}%
    - 计算公式: ${(currentVolatility * 100).toFixed(2)}% ${jumpAmount >= 0 ? '+' : '-'} ${Math.abs(jumpAmount * 100).toFixed(2)}% = ${(newVolatility * 100).toFixed(2)}%
    - 影响范围: ${event.impactScope}
    - 持续影响: ${event.isContinuous ? `是，持续${event.duration}回合` : '否，单回合'}
  `.trim();

  const remainingDuration = event.isContinuous ? event.duration - 1 : 0;

  return {
    newVolatility,
    jumpAmount,
    isContinuous: event.isContinuous,
    remainingDuration,
    exactCalculation,
  };
};

export const calculateCumulativeVolatility = (
  events: VolatilityEvent[],
  baseVolatility: number,
  upToRound: number
): CumulativeVolatilityResult => {
  let volatility = baseVolatility;
  const jumps: CumulativeVolatilityResult['jumps'] = [];

  const sortedEvents = [...events].sort((a, b) => a.triggerRound - b.triggerRound);

  for (const event of sortedEvents) {
    if (event.triggerRound > upToRound) continue;

    if (event.isContinuous) {
      for (let d = 0; d < event.duration; d++) {
        const effectRound = event.triggerRound + d;
        if (effectRound > upToRound) continue;

        const result = processVolatilityEvent(event, volatility, effectRound);
        volatility = result.newVolatility;

        jumps.push({
          eventId: event.id,
          round: effectRound,
          jumpAmount: event.volatilityJump,
          cumulativeAfter: volatility,
          exactCalculation: result.exactCalculation,
        });
      }
    } else {
      const result = processVolatilityEvent(event, volatility, event.triggerRound);
      volatility = result.newVolatility;

      jumps.push({
        eventId: event.id,
        round: event.triggerRound,
        jumpAmount: event.volatilityJump,
        cumulativeAfter: volatility,
        exactCalculation: result.exactCalculation,
      });
    }
  }

  return {
    volatility,
    jumps,
  };
};

export const getEventsForRound = (
  events: VolatilityEvent[],
  round: number,
  triggeredEvents: string[]
): VolatilityEvent[] => {
  return events.filter((event) => {
    if (event.triggerRound > round) return false;
    if (triggeredEvents.includes(event.id) && !event.isContinuous) return false;

    if (event.isContinuous) {
      const endRound = event.triggerRound + event.duration - 1;
      return round >= event.triggerRound && round <= endRound;
    }

    return event.triggerRound === round;
  });
};

export const createVolatilityShockDetail = (
  event: VolatilityEvent,
  round: number,
  oldVolatility: number,
  newVolatility: number,
  exactCalculation: string
): SettlementDetail => {
  const scoreChange =
    event.volatilityJump > 0
      ? -Math.round(
          event.volatilityJump * 100 * defaultGameConfig.volatilityJumpPenaltyMultiplier
        )
      : 0;

  return {
    id: generateId(),
    round,
    eventType: 'VOLATILITY_SHOCK',
    description: `${event.name}: 波动率 ${(oldVolatility * 100).toFixed(1)}% → ${(newVolatility * 100).toFixed(1)}%`,
    scoreChange,
    relatedEventId: event.id,
    humanReadableReason: `第${round}回合，事件"${event.name}"触发。${event.description}。${exactCalculation}。${
      event.volatilityJump > 0
        ? `波动率上升${(event.volatilityJump * 100).toFixed(2)}个百分点，导致保证金要求提高，扣${Math.abs(scoreChange)}分。`
        : `波动率下降${Math.abs(event.volatilityJump * 100).toFixed(2)}个百分点，保证金压力缓解，不扣分。`
    }`,
  };
};

export const getVolatilityChartData = (
  events: VolatilityEvent[],
  baseVolatility: number,
  totalRounds: number
): { round: number; volatility: number; event?: string }[] => {
  const data: { round: number; volatility: number; event?: string }[] = [];
  let volatility = baseVolatility;

  data.push({ round: 0, volatility });

  const cumulativeResult = calculateCumulativeVolatility(events, baseVolatility, totalRounds);
  const volatilityByRound = new Map<number, number>();

  let currentVol = baseVolatility;
  volatilityByRound.set(0, currentVol);

  for (let r = 1; r <= totalRounds; r++) {
    const roundEvents = cumulativeResult.jumps.filter((j) => j.round === r);
    for (const jump of roundEvents) {
      currentVol = jump.cumulativeAfter;
    }
    volatilityByRound.set(r, currentVol);
  }

  for (let r = 1; r <= totalRounds; r++) {
    const roundEvents = events.filter(
      (e) => e.triggerRound === r || (e.isContinuous && r >= e.triggerRound && r < e.triggerRound + e.duration)
    );
    const eventNames = roundEvents.map((e) => e.name).join(', ');

    data.push({
      round: r,
      volatility: volatilityByRound.get(r) || volatility,
      event: eventNames || undefined,
    });
  }

  return data;
};

export const checkVolatilityJumps = (
  events: VolatilityEvent[],
  threshold: number = 0.15
): { event: VolatilityEvent; severity: 'WARNING' | 'CRITICAL' }[] => {
  return events
    .filter((e) => Math.abs(e.volatilityJump) >= threshold)
    .map((e) => ({
      event: e,
      severity: Math.abs(e.volatilityJump) >= 0.2 ? 'CRITICAL' : 'WARNING',
    }));
};
