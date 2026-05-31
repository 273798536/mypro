import type {
  GameEvent,
  EventType,
  EventSeverity,
  ConflictEvent,
  PositionInfo,
  VolatilityInfo,
  DeltaInfo,
  CompoundEventData,
} from '../types/game';
import { EVENT_CONFIG } from './constants';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

export function getSeverity(probability: number): EventSeverity {
  if (probability < 0.5) return 'low';
  if (probability < 0.8) return 'medium';
  if (probability < 0.95) return 'high';
  return 'critical';
}

export interface EventGeneratorState {
  currentTime: number;
  lastEventTime: Record<string, number>;
  volatility: number;
  underlying: number;
}

export function shouldTriggerEvent(
  eventType: keyof typeof EVENT_CONFIG,
  state: EventGeneratorState
): boolean {
  const config = EVENT_CONFIG[eventType];
  const lastTime = state.lastEventTime[eventType] || 0;
  const interval = state.currentTime - lastTime;

  if (interval < config.minInterval) return false;
  return Math.random() < config.probability;
}

export function createVolatilityStorm(
  currentTime: number,
  currentVolatility: number
): GameEvent {
  const config = EVENT_CONFIG.volatilityStorm;
  const ivChange = randomBetween(config.ivChangeRange[0], config.ivChangeRange[1]);
  const severity = getSeverity(ivChange / config.ivChangeRange[1]);
  const direction = Math.random() > 0.5 ? 1 : -1;

  return {
    id: generateId(),
    type: 'volatility_storm',
    timestamp: currentTime,
    severity,
    data: {
      ivChange: ivChange * direction,
      newIv: Math.max(0.05, Math.min(1.0, currentVolatility + ivChange * direction)),
      duration: randomInt(10, 30),
    },
    handled: false,
  };
}

export function createDeltaSurge(
  currentTime: number,
  currentDelta: number
): GameEvent {
  const config = EVENT_CONFIG.deltaSurge;
  const deltaChange = randomBetween(config.deltaChangeRange[0], config.deltaChangeRange[1]);
  const severity = getSeverity(deltaChange / config.deltaChangeRange[1]);
  const direction = Math.random() > 0.5 ? 1 : -1;

  return {
    id: generateId(),
    type: 'delta_surge',
    timestamp: currentTime,
    severity,
    data: {
      deltaChange: deltaChange * direction,
      newDelta: Math.max(-1, Math.min(1, currentDelta + deltaChange * direction)),
      underlyingChange: direction * randomBetween(1, 5),
    },
    handled: false,
  };
}

export function createGammaGate(
  currentTime: number,
  currentGamma: number
): GameEvent {
  const config = EVENT_CONFIG.gammaGate;
  const delay = randomInt(config.delayRange[0], config.delayRange[1]);
  const gammaChange = randomBetween(config.gammaChangeRange[0], config.gammaChangeRange[1]);
  const severity = getSeverity(delay / config.delayRange[1]);

  return {
    id: generateId(),
    type: 'gamma_gate',
    timestamp: currentTime,
    actualArrivalTime: currentTime + delay,
    isDelayed: true,
    delaySeconds: delay,
    severity,
    data: {
      gammaChange,
      newGamma: currentGamma + gammaChange,
      delaySeconds: delay,
    },
    handled: false,
  };
}

export function createMarginWarning(
  currentTime: number,
  marginRatio: number
): GameEvent {
  let severity: EventSeverity = 'low';
  if (marginRatio < 1.0) severity = 'critical';
  else if (marginRatio < 1.2) severity = 'high';
  else if (marginRatio < 1.5) severity = 'medium';

  return {
    id: generateId(),
    type: 'margin_warning',
    timestamp: currentTime,
    severity,
    data: {
      marginRatio,
      level: marginRatio < 1.0 ? 'liquidation' : marginRatio < 1.2 ? 'call' : 'warning',
    },
    handled: false,
  };
}

export function createCompoundEvent(
  currentTime: number
): { mainEvent: GameEvent; compoundData: CompoundEventData } {
  const direction = Math.random() > 0.5 ? 'up' : 'down';
  const wrongDirection = direction === 'up' ? 'down' : 'up';

  const compoundData: CompoundEventData = {
    directionMistake: {
      timestamp: currentTime,
      expectedDirection: direction,
      playerDirection: wrongDirection,
    },
    marginInsufficient: {
      timestamp: currentTime + 2,
      marginRatio: randomBetween(1.0, 1.2),
    },
    volatilityJumps: [
      {
        expectedTimestamp: currentTime + 4,
        actualTimestamp: currentTime + 4 + randomInt(3, 8),
        volatilityChange: randomBetween(0.1, 0.2),
      },
      {
        expectedTimestamp: currentTime + 8,
        actualTimestamp: currentTime + 8 + randomInt(2, 6),
        volatilityChange: randomBetween(0.05, 0.15),
      },
    ],
  };

  return {
    mainEvent: {
      id: generateId(),
      type: 'compound',
      timestamp: currentTime,
      severity: 'critical',
      data: {
        expectedDirection: direction,
        marginRatio: compoundData.marginInsufficient.marginRatio,
        jumpsCount: 2,
      },
      handled: false,
    },
    compoundData,
  };
}

export function createInfoConflict(
  currentTime: number,
  currentUnderlying: number,
  currentVolatility: number,
  currentDelta: number
): ConflictEvent {
  const priceChange = randomBetween(-5, 5);
  const ivChange = randomBetween(-0.1, 0.1);
  const deltaChange = randomBetween(-0.2, 0.2);

  const mainInfo: PositionInfo = {
    underlyingPrice: currentUnderlying + priceChange,
    priceChange,
    priceDirection: priceChange >= 0 ? 'up' : 'down',
    confidence: randomBetween(0.6, 0.9),
  };

  const volatilityStorm: VolatilityInfo = {
    iv: currentVolatility + ivChange,
    ivChange,
    severity: getSeverity(Math.abs(ivChange) / 0.1),
    expectedDuration: randomInt(10, 25),
  };

  const deltaInstrument: DeltaInfo = {
    delta: Math.max(-1, Math.min(1, currentDelta + deltaChange)),
    deltaChange,
    gammaIndicator:
      deltaChange > 0.05 ? 'increasing' : deltaChange < -0.05 ? 'decreasing' : 'stable',
  };

  const correctDirection = priceChange >= 0 ? 'up' : 'down';
  const correctResolution: 'main' | 'volatility' | 'delta' =
    Math.abs(priceChange) > Math.abs(ivChange * 100) && Math.abs(priceChange) > Math.abs(deltaChange * 50)
      ? 'main'
      : Math.abs(ivChange) > Math.abs(deltaChange)
        ? 'volatility'
        : 'delta';

  return {
    id: generateId(),
    timestamp: currentTime,
    mainInfo,
    volatilityStorm,
    deltaInstrument,
    trace: {
      mainInfoSnapshot: { ...mainInfo },
      volatilitySnapshot: { ...volatilityStorm },
      deltaSnapshot: { ...deltaInstrument },
      timestamp: currentTime,
    },
    correctResolution,
  };
}

export function generateRandomEvents(
  state: EventGeneratorState,
  currentDelta: number,
  currentGamma: number,
  marginRatio: number
): {
  events: GameEvent[];
  conflict: ConflictEvent | null;
  compoundData: CompoundEventData | null;
} {
  const events: GameEvent[] = [];
  let conflict: ConflictEvent | null = null;
  let compoundData: CompoundEventData | null = null;

  if (shouldTriggerEvent('volatilityStorm', state)) {
    events.push(createVolatilityStorm(state.currentTime, state.volatility));
  }

  if (shouldTriggerEvent('deltaSurge', state)) {
    events.push(createDeltaSurge(state.currentTime, currentDelta));
  }

  if (shouldTriggerEvent('gammaGate', state)) {
    events.push(createGammaGate(state.currentTime, currentGamma));
  }

  if (shouldTriggerEvent('marginWarning', state) && marginRatio < 1.5) {
    events.push(createMarginWarning(state.currentTime, marginRatio));
  }

  if (shouldTriggerEvent('compoundEvent', state)) {
    const result = createCompoundEvent(state.currentTime);
    events.push(result.mainEvent);
    compoundData = result.compoundData;
  }

  if (shouldTriggerEvent('infoConflict', state)) {
    conflict = createInfoConflict(
      state.currentTime,
      state.underlying,
      state.volatility,
      currentDelta
    );
  }

  return { events, conflict, compoundData };
}
