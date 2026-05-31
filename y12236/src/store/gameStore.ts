import { create } from 'zustand';
import type {
  GameState,
  GameStatus,
  Greeks,
  OptionPosition,
  ShipState,
  MarginState,
  Score,
  TimelineItem,
  ReplayFrame,
  GameEvent,
  ConflictEvent,
  ConflictResolution,
  DataPoint,
} from '../types/game';
import {
  calculateAllGreeks,
  calculateOptionPrice,
  calculateMargin,
  GammaGate,
} from '../utils/greeksCalculator';
import { generateRandomEvents, generateId } from '../utils/eventGenerator';
import {
  createInitialScore,
  handleEventResponse,
  handleConflictResolution,
  checkBonuses,
  calculateTotalScore,
} from '../utils/scoringSystem';
import {
  GAME_CONFIG,
  MARGIN_RULES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
} from '../utils/constants';
import { saveFlightReport, generateFlightReport } from '../utils/storage';

const gammaGate = new GammaGate(10);

function createInitialState(): GameState {
  const position: OptionPosition = {
    type: 'call',
    strike: GAME_CONFIG.initialStrike,
    expiry: GAME_CONFIG.initialExpiry,
    underlying: GAME_CONFIG.initialUnderlying,
    quantity: GAME_CONFIG.initialQuantity,
    costBasis: 0,
    currentValue: 0,
  };

  const greeksData = calculateAllGreeks(
    position.underlying,
    position.strike,
    position.expiry / 365,
    GAME_CONFIG.riskFreeRate,
    GAME_CONFIG.initialVolatility,
    position.type
  );

  const optionPrice = calculateOptionPrice(
    position.underlying,
    position.strike,
    position.expiry / 365,
    GAME_CONFIG.riskFreeRate,
    GAME_CONFIG.initialVolatility,
    position.type
  );

  position.costBasis = optionPrice * position.quantity;
  position.currentValue = position.costBasis;

  const greeks: Greeks = {
    ...greeksData,
    deltaHistory: [{ time: 0, value: greeksData.delta }],
    gammaHistory: [{ time: 0, value: greeksData.gamma }],
    vegaHistory: [{ time: 0, value: greeksData.vega }],
    thetaHistory: [{ time: 0, value: greeksData.theta }],
  };

  const margin = calculateMargin(
    position.currentValue,
    GAME_CONFIG.initialMargin,
    MARGIN_RULES.maintenanceRate
  );

  const marginState: MarginState = {
    current: GAME_CONFIG.initialMargin,
    required: margin.required,
    ratio: margin.ratio,
    warnings: [],
  };

  const ship: ShipState = {
    x: 0,
    y: 0,
    velocity: 0,
    acceleration: 0,
    direction: 'center',
    health: 100,
  };

  return {
    status: 'idle',
    time: 0,
    score: createInitialScore(),
    position,
    greeks,
    events: [],
    timeline: [],
    conflicts: [],
    activeConflict: null,
    ship,
    margin: marginState,
    replayData: [],
    volatility: GAME_CONFIG.initialVolatility,
    riskFreeRate: GAME_CONFIG.riskFreeRate,
    pendingGammaUpdates: [],
    lastEventTime: {},
  };
}

interface GameActions {
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  settleGame: () => void;
  tick: (deltaTime: number) => void;
  adjustPosition: (direction: 'up' | 'down', amount: number) => void;
  setShipDirection: (direction: 'left' | 'right' | 'center') => void;
  setShipAcceleration: (acceleration: number) => void;
  handleEvent: (eventId: string, response: 'accept' | 'reject' | 'hedge') => void;
  traceConflict: (conflictId: string) => void;
  resolveConflict: (conflictId: string, resolution: ConflictResolution) => void;
  getReplayData: () => ReplayFrame[];
  loadReplay: (replayData: ReplayFrame[]) => void;
  reset: () => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...createInitialState(),

  startGame: () => {
    const state = createInitialState();
    gammaGate.clear();
    set({
      ...state,
      status: 'playing',
      timeline: [
        {
          id: generateId(),
          timestamp: 0,
          type: 'system',
          label: '🚀 飞行任务开始',
          color: 'text-neon-green',
        },
      ],
    });
  },

  pauseGame: () => {
    set((state) => ({
      status: state.status === 'playing' ? 'paused' : state.status,
    }));
  },

  resumeGame: () => {
    set((state) => ({
      status: state.status === 'paused' ? 'playing' : state.status,
    }));
  },

  restartGame: () => {
    const state = createInitialState();
    gammaGate.clear();
    set({
      ...state,
      status: 'playing',
      timeline: [
        {
          id: generateId(),
          timestamp: 0,
          type: 'system',
          label: '🔄 重新开始飞行',
          color: 'text-neon-green',
        },
      ],
    });
  },

  settleGame: () => {
    const state = get();
    const finalScore = checkBonuses(state);
    
    const timelineItem: TimelineItem = {
      id: generateId(),
      timestamp: state.time,
      type: 'system',
      label: '📊 飞行结算',
      color: 'text-neon-cyan',
    };

    const report = generateFlightReport({ ...state, score: finalScore });
    saveFlightReport(report);

    set({
      status: 'settled',
      score: finalScore,
      timeline: [...state.timeline, timelineItem],
    });
  },

  tick: (deltaTime: number) => {
    const state = get();
    if (state.status !== 'playing') return;

    const newTime = state.time + deltaTime;

    let newUnderlying = state.position.underlying;
    let newVolatility = state.volatility;
    let newExpiry = Math.max(0, state.position.expiry - deltaTime / 60);

    const drift = (Math.random() - 0.5) * 0.5;
    newUnderlying = Math.max(50, Math.min(150, newUnderlying + drift));

    const T = Math.max(0.001, newExpiry / 365);
    const greeksData = calculateAllGreeks(
      newUnderlying,
      state.position.strike,
      T,
      state.riskFreeRate,
      newVolatility,
      state.position.type
    );

    const optionPrice = calculateOptionPrice(
      newUnderlying,
      state.position.strike,
      T,
      state.riskFreeRate,
      newVolatility,
      state.position.type
    );

    gammaGate.pushUpdate(newTime, greeksData.gamma);
    const gammaInfo = gammaGate.getAvailableGamma(newTime);
    const displayGamma = gammaInfo.gamma > 0 ? gammaInfo.gamma : greeksData.gamma;

    const newGreeks: Greeks = {
      delta: greeksData.delta,
      gamma: displayGamma,
      vega: greeksData.vega,
      theta: greeksData.theta,
      rho: greeksData.rho,
      deltaHistory: [...state.greeks.deltaHistory, { time: newTime, value: greeksData.delta }].slice(-100),
      gammaHistory: [...state.greeks.gammaHistory, { time: newTime, value: displayGamma }].slice(-100),
      vegaHistory: [...state.greeks.vegaHistory, { time: newTime, value: greeksData.vega }].slice(-100),
      thetaHistory: [...state.greeks.thetaHistory, { time: newTime, value: greeksData.theta }].slice(-100),
    };

    const newPosition = {
      ...state.position,
      underlying: newUnderlying,
      expiry: newExpiry,
      currentValue: optionPrice * state.position.quantity,
    };

    const marginCalc = calculateMargin(
      newPosition.currentValue,
      state.margin.current,
      MARGIN_RULES.maintenanceRate
    );

    let newMarginState = { ...state.margin };
    if (marginCalc.level === 'liquidation') {
      newMarginState.warnings.push({
        id: generateId(),
        timestamp: newTime,
        ratio: marginCalc.ratio,
        level: 'liquidation',
      });
    } else if (marginCalc.level === 'call') {
      newMarginState.warnings.push({
        id: generateId(),
        timestamp: newTime,
        ratio: marginCalc.ratio,
        level: 'call',
      });
    }

    newMarginState = {
      ...newMarginState,
      required: marginCalc.required,
      ratio: marginCalc.ratio,
    };

    let newShipX = state.ship.x;
    let newVelocity = state.ship.velocity;
    
    if (state.ship.direction === 'left') {
      newVelocity = Math.max(-GAME_CONFIG.shipSpeed, newVelocity - 0.1);
    } else if (state.ship.direction === 'right') {
      newVelocity = Math.min(GAME_CONFIG.shipSpeed, newVelocity + 0.1);
    } else {
      newVelocity *= 0.95;
    }
    
    newShipX = Math.max(-90, Math.min(90, newShipX + newVelocity));
    
    const newShip: ShipState = {
      ...state.ship,
      x: newShipX,
      velocity: newVelocity,
      y: Math.sin(newTime * 0.5) * 5,
    };

    const { events, conflict, compoundData } = generateRandomEvents(
      {
        currentTime: newTime,
        lastEventTime: state.lastEventTime,
        volatility: newVolatility,
        underlying: newUnderlying,
      },
      newGreeks.delta,
      newGreeks.gamma,
      newMarginState.ratio
    );

    let newEvents = [...state.events];
    let newTimeline = [...state.timeline];
    let newLastEventTime = { ...state.lastEventTime };
    let newConflicts = [...state.conflicts];
    let newActiveConflict = state.activeConflict;

    for (const event of events) {
      newEvents.push(event);
      newLastEventTime[event.type] = newTime;

      const timelineItem: TimelineItem = {
        id: generateId(),
        timestamp: event.timestamp,
        type: event.type,
        label: `${EVENT_TYPE_LABELS[event.type] || event.type} - ${event.severity}`,
        color: EVENT_TYPE_COLORS[event.type] || 'text-neon-cyan',
        delayed: event.isDelayed,
        actualArrivalTime: event.actualArrivalTime,
        description: `波动率变化: ${(event.data.ivChange as number || 0).toFixed(2)}`,
      };
      newTimeline.push(timelineItem);
    }

    if (conflict && !state.activeConflict) {
      newConflicts.push(conflict);
      newActiveConflict = conflict;
      newLastEventTime['info_conflict'] = newTime;

      const timelineItem: TimelineItem = {
        id: generateId(),
        timestamp: newTime,
        type: 'info_conflict',
        label: '⚠️ 信息冲突 - 需先留痕再判断',
        color: 'text-neon-yellow',
      };
      newTimeline.push(timelineItem);
    }

    newEvents = newEvents.map((event) => {
      if (event.actualArrivalTime && !event.handled && newTime >= event.actualArrivalTime) {
        const timelineItem: TimelineItem = {
          id: generateId(),
          timestamp: event.actualArrivalTime,
          type: event.type,
          label: `[延迟到达] ${EVENT_TYPE_LABELS[event.type]} - 原时间: ${formatTime(event.timestamp)}`,
          color: EVENT_TYPE_COLORS[event.type] || 'text-neon-cyan',
          delayed: true,
          actualArrivalTime: event.actualArrivalTime,
        };
        if (!newTimeline.find((t) => t.id === timelineItem.id)) {
          newTimeline.push(timelineItem);
        }
      }
      return event;
    });

    if (compoundData) {
      newTimeline.push({
        id: generateId(),
        timestamp: compoundData.directionMistake.timestamp,
        type: 'compound',
        label: `① 方向误判 - 预期${compoundData.directionMistake.expectedDirection}`,
        color: 'text-neon-red',
      });
      newTimeline.push({
        id: generateId(),
        timestamp: compoundData.marginInsufficient.timestamp,
        type: 'compound',
        label: `② 保证金不足 - 比率: ${compoundData.marginInsufficient.marginRatio.toFixed(2)}`,
        color: 'text-neon-red',
      });
      for (const jump of compoundData.volatilityJumps) {
        newTimeline.push({
          id: generateId(),
          timestamp: jump.expectedTimestamp,
          actualArrivalTime: jump.actualTimestamp,
          type: 'compound',
          label: `③ 波动连跳 [延迟${(jump.actualTimestamp - jump.expectedTimestamp).toFixed(0)}秒]`,
          color: 'text-neon-red',
          delayed: true,
        });
      }
    }

    const replayFrame: ReplayFrame = {
      time: newTime,
      ship: newShip,
      greeks: newGreeks,
      position: newPosition,
      margin: newMarginState,
      events: events.map((e) => e.id),
    };

    let newScore = state.score;
    if (marginCalc.level === 'liquidation') {
      const finalScore = checkBonuses({ ...get(), score: newScore });
      const report = generateFlightReport({ ...get(), score: finalScore });
      saveFlightReport(report);
      
      set({
        time: newTime,
        position: newPosition,
        greeks: newGreeks,
        events: newEvents,
        timeline: newTimeline,
        conflicts: newConflicts,
        activeConflict: newActiveConflict,
        ship: newShip,
        margin: newMarginState,
        volatility: newVolatility,
        replayData: [...state.replayData, replayFrame],
        lastEventTime: newLastEventTime,
        pendingGammaUpdates: [...state.pendingGammaUpdates, { timestamp: newTime, gamma: gammaInfo.gamma }].slice(-50),
        status: 'settled',
        score: finalScore,
      });
      return;
    }

    const pendingUpdates = state.pendingGammaUpdates.filter(
      (u) => newTime - u.timestamp < 30
    );
    pendingUpdates.push({ timestamp: newTime, gamma: gammaInfo.gamma });

    set({
      time: newTime,
      position: newPosition,
      greeks: newGreeks,
      events: newEvents,
      timeline: newTimeline,
      conflicts: newConflicts,
      activeConflict: newActiveConflict,
      ship: newShip,
      margin: newMarginState,
      volatility: newVolatility,
      replayData: [...state.replayData, replayFrame],
      lastEventTime: newLastEventTime,
      pendingGammaUpdates: pendingUpdates.slice(-50),
      score: newScore,
    });
  },

  adjustPosition: (direction: 'up' | 'down', amount: number) => {
    set((state) => {
      const newQuantity = direction === 'up'
        ? state.position.quantity + amount
        : Math.max(0, state.position.quantity - amount);

      const optionPrice = calculateOptionPrice(
        state.position.underlying,
        state.position.strike,
        state.position.expiry / 365,
        state.riskFreeRate,
        state.volatility,
        state.position.type
      );

      const marginCalc = calculateMargin(
        optionPrice * newQuantity,
        state.margin.current,
        MARGIN_RULES.maintenanceRate
      );

      const timelineItem: TimelineItem = {
        id: generateId(),
        timestamp: state.time,
        type: 'position',
        label: `仓位调整: ${state.position.quantity} → ${newQuantity}`,
        color: 'text-neon-cyan',
      };

      return {
        position: {
          ...state.position,
          quantity: newQuantity,
          currentValue: optionPrice * newQuantity,
        },
        margin: {
          ...state.margin,
          required: marginCalc.required,
          ratio: marginCalc.ratio,
        },
        timeline: [...state.timeline, timelineItem],
      };
    });
  },

  setShipDirection: (direction: 'left' | 'right' | 'center') => {
    set((state) => ({
      ship: { ...state.ship, direction },
    }));
  },

  setShipAcceleration: (acceleration: number) => {
    set((state) => ({
      ship: { ...state.ship, acceleration },
    }));
  },

  handleEvent: (eventId: string, response: 'accept' | 'reject' | 'hedge') => {
    set((state) => {
      const event = state.events.find((e) => e.id === eventId);
      if (!event || event.handled) return state;

      const responseTime = state.time - event.timestamp;
      const correct = response === 'hedge' || (response === 'accept' && event.severity === 'low');

      const newEvents = state.events.map((e) =>
        e.id === eventId
          ? { ...e, handled: true, handledAt: state.time, playerResponse: response }
          : e
      );

      const newScore = handleEventResponse(state.score, event, responseTime, correct);

      const timelineItem: TimelineItem = {
        id: generateId(),
        timestamp: state.time,
        type: 'response',
        label: `${correct ? '✅' : '❌'} 事件处理: ${EVENT_TYPE_LABELS[event.type]}`,
        color: correct ? 'text-neon-green' : 'text-neon-red',
      };

      return {
        events: newEvents,
        score: newScore,
        timeline: [...state.timeline, timelineItem],
      };
    });
  },

  traceConflict: (conflictId: string) => {
    set((state) => {
      const conflict = state.conflicts.find((c) => c.id === conflictId);
      if (!conflict) return state;

      const newConflicts = state.conflicts.map((c) =>
        c.id === conflictId
          ? {
              ...c,
              trace: {
                ...c.trace,
                timestamp: state.time,
              },
            }
          : c
      );

      const newActiveConflict = state.activeConflict?.id === conflictId
        ? {
            ...state.activeConflict,
            trace: {
              ...state.activeConflict.trace,
              timestamp: state.time,
            },
          }
        : state.activeConflict;

      const timelineItem: TimelineItem = {
        id: generateId(),
        timestamp: state.time,
        type: 'trace',
        label: '📝 信息已留痕',
        color: 'text-neon-yellow',
      };

      return {
        conflicts: newConflicts,
        activeConflict: newActiveConflict,
        timeline: [...state.timeline, timelineItem],
      };
    });
  },

  resolveConflict: (conflictId: string, resolution: ConflictResolution) => {
    set((state) => {
      const conflict = state.conflicts.find((c) => c.id === conflictId);
      if (!conflict) return state;

      const traced = conflict.trace.timestamp !== conflict.timestamp;
      const traceTime = traced ? conflict.trace.timestamp : undefined;

      const newConflicts = state.conflicts.map((c) =>
        c.id === conflictId
          ? { ...c, resolution, resolvedAt: state.time }
          : c
      );

      const resolvedConflict = { ...conflict, resolution, resolvedAt: state.time };
      const newScore = handleConflictResolution(
        state.score,
        resolvedConflict,
        state.time,
        traced,
        traceTime
      );

      const correct = resolution === conflict.correctResolution;
      const timelineItem: TimelineItem = {
        id: generateId(),
        timestamp: state.time,
        type: 'conflict_resolved',
        label: `${correct ? '✅' : '❌'} 冲突判定: ${resolution}`,
        color: correct ? 'text-neon-green' : 'text-neon-red',
      };

      return {
        conflicts: newConflicts,
        activeConflict: null,
        score: newScore,
        timeline: [...state.timeline, timelineItem],
      };
    });
  },

  getReplayData: () => {
    return get().replayData;
  },

  loadReplay: (replayData: ReplayFrame[]) => {
    set({ replayData });
  },

  reset: () => {
    gammaGate.clear();
    set(createInitialState());
  },
}));

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
