import { create } from 'zustand';
import type {
  GameState,
  Tower,
  GameAction,
  SettlementDetail,
  OptionCard,
  VolatilityEvent,
  GameLevel,
} from '../types';
import { calculateTowerValue, calculateMarginRequirement } from '../engine/pricingEngine';
import { performRiskCheck } from '../engine/riskEngine';
import {
  processVolatilityEvent,
  getEventsForRound,
  createVolatilityShockDetail,
} from '../engine/volatilityEngine';
import { generateSettlement, generateTowerActionReason } from '../engine/settlementEngine';
import { recordGameSnapshot, saveSettlementResult } from '../engine/replayEngine';
import { mockOptionCards, mockVolatilityEvents, defaultGameConfig } from '../data/mockData';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

const createInitialState = (level: GameLevel): GameState => {
  const levelCards = mockOptionCards.filter((c) => level.optionCardIds.includes(c.id));
  const levelEvents = mockVolatilityEvents.filter((e) =>
    level.volatilityEventIds.includes(e.id)
  );

  return {
    sessionId: generateId(),
    levelId: level.id,
    status: 'IDLE',
    currentRound: 0,
    totalRounds: level.totalRounds,
    currentMargin: level.initialMargin,
    initialMargin: level.initialMargin,
    currentVolatility: level.initialVolatility,
    initialVolatility: level.initialVolatility,
    lives: defaultGameConfig.maxLives,
    score: defaultGameConfig.baseScore,
    speed: 1,
    towers: [],
    availableCards: levelCards,
    volatilityEvents: levelEvents,
    triggeredEvents: [],
    actionLog: [],
    spotPrice: defaultGameConfig.baseSpotPrice,
  };
};

interface GameStore {
  state: GameState | null;
  roundDetails: SettlementDetail[];
  currentLevel: GameLevel | null;
  actions: {
    initGame: (level: GameLevel) => void;
    startGame: () => void;
    pauseGame: () => void;
    resumeGame: () => void;
    restartGame: () => void;
    setSpeed: (speed: number) => void;
    placeTower: (cardId: string, position: { x: number; y: number }) => boolean;
    upgradeTower: (towerId: string) => boolean;
    sellTower: (towerId: string) => boolean;
    addMargin: (amount: number) => void;
    nextRound: () => {
      volatilityDetails: SettlementDetail[];
      marginCallDetails: SettlementDetail[];
      liquidationDetails: SettlementDetail[];
    };
    settleGame: () => void;
    getCardById: (cardId: string) => OptionCard | undefined;
    getEventById: (eventId: string) => VolatilityEvent | undefined;
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  roundDetails: [],
  currentLevel: null,

  actions: {
    initGame: (level: GameLevel) => {
      const initialState = createInitialState(level);
      set({ state: initialState, roundDetails: [], currentLevel: level });
      recordGameSnapshot(initialState, 0);
    },

    startGame: () => {
      const { state } = get();
      if (!state) return;

      set({
        state: { ...state, status: 'PLAYING', currentRound: 1 },
      });
    },

    pauseGame: () => {
      const { state } = get();
      if (!state || state.status !== 'PLAYING') return;

      set({ state: { ...state, status: 'PAUSED' } });
    },

    resumeGame: () => {
      const { state } = get();
      if (!state || state.status !== 'PAUSED') return;

      set({ state: { ...state, status: 'PLAYING' } });
    },

    restartGame: () => {
      const { currentLevel } = get();
      if (!currentLevel) return;

      get().actions.initGame(currentLevel);
    },

    setSpeed: (speed: number) => {
      const { state } = get();
      if (!state) return;

      set({ state: { ...state, speed } });
    },

    placeTower: (cardId: string, position: { x: number; y: number }) => {
      const { state, actions } = get();
      if (!state) return false;

      const card = actions.getCardById(cardId);
      if (!card) return false;

      const { marginUsed } = calculateTowerValue(
        card,
        1,
        state.spotPrice,
        state.currentVolatility
      );

      if (state.currentMargin < marginUsed) {
        return false;
      }

      const newTower: Tower = {
        id: generateId(),
        optionCardId: cardId,
        position,
        level: 1,
        placedAtRound: state.currentRound,
        marginUsed,
        currentValue: calculateTowerValue(
          card,
          1,
          state.spotPrice,
          state.currentVolatility
        ).currentValue,
      };

      const action: GameAction = {
        id: generateId(),
        type: 'PLACE_TOWER',
        round: state.currentRound,
        timestamp: Date.now(),
        payload: {
          towerId: newTower.id,
          cardId,
          cardName: card.name,
          position,
          level: 1,
          marginUsed,
        },
        relatedCardId: cardId,
      };

      const reason = generateTowerActionReason(action, card);
      const detail: SettlementDetail = {
        id: generateId(),
        round: state.currentRound,
        eventType: 'TOWER_ACTION',
        description: `放置防御塔：${card.name}`,
        scoreChange: 0,
        relatedCardId: cardId,
        humanReadableReason: reason,
      };

      set({
        state: {
          ...state,
          towers: [...state.towers, newTower],
          currentMargin: state.currentMargin - marginUsed,
          actionLog: [...state.actionLog, action],
        },
        roundDetails: [...get().roundDetails, detail],
      });

      return true;
    },

    upgradeTower: (towerId: string) => {
      const { state, actions } = get();
      if (!state) return false;

      const towerIndex = state.towers.findIndex((t) => t.id === towerId);
      if (towerIndex === -1) return false;

      const tower = state.towers[towerIndex];
      if (tower.level >= 3) return false;

      const card = actions.getCardById(tower.optionCardId);
      if (!card) return false;

      const newLevel = tower.level + 1;
      const { marginUsed: newMarginUsed } = calculateTowerValue(
        card,
        newLevel,
        state.spotPrice,
        state.currentVolatility
      );
      const additionalMargin = newMarginUsed - tower.marginUsed;

      if (state.currentMargin < additionalMargin) {
        return false;
      }

      const updatedTower: Tower = {
        ...tower,
        level: newLevel,
        marginUsed: newMarginUsed,
        currentValue: calculateTowerValue(
          card,
          newLevel,
          state.spotPrice,
          state.currentVolatility
        ).currentValue,
      };

      const action: GameAction = {
        id: generateId(),
        type: 'UPGRADE_TOWER',
        round: state.currentRound,
        timestamp: Date.now(),
        payload: {
          towerId,
          cardId: card.id,
          cardName: card.name,
          oldLevel: tower.level,
          newLevel,
          additionalMargin,
        },
        relatedCardId: card.id,
      };

      const reason = generateTowerActionReason(action, card);
      const detail: SettlementDetail = {
        id: generateId(),
        round: state.currentRound,
        eventType: 'TOWER_ACTION',
        description: `升级防御塔：${card.name} Lv.${tower.level} → Lv.${newLevel}`,
        scoreChange: 0,
        relatedCardId: card.id,
        humanReadableReason: reason,
      };

      const newTowers = [...state.towers];
      newTowers[towerIndex] = updatedTower;

      set({
        state: {
          ...state,
          towers: newTowers,
          currentMargin: state.currentMargin - additionalMargin,
          actionLog: [...state.actionLog, action],
        },
        roundDetails: [...get().roundDetails, detail],
      });

      return true;
    },

    sellTower: (towerId: string) => {
      const { state, actions } = get();
      if (!state) return false;

      const tower = state.towers.find((t) => t.id === towerId);
      if (!tower) return false;

      const card = actions.getCardById(tower.optionCardId);
      if (!card) return false;

      const marginReleased = tower.marginUsed * 0.8;

      const action: GameAction = {
        id: generateId(),
        type: 'SELL_TOWER',
        round: state.currentRound,
        timestamp: Date.now(),
        payload: {
          towerId,
          cardId: card.id,
          cardName: card.name,
          level: tower.level,
          marginReleased,
        },
        relatedCardId: card.id,
      };

      const reason = generateTowerActionReason(action, card);
      const detail: SettlementDetail = {
        id: generateId(),
        round: state.currentRound,
        eventType: 'TOWER_ACTION',
        description: `卖出防御塔：${card.name} Lv.${tower.level}`,
        scoreChange: -10,
        relatedCardId: card.id,
        humanReadableReason: `${reason} 主动卖出扣10分。`,
      };

      set({
        state: {
          ...state,
          towers: state.towers.filter((t) => t.id !== towerId),
          currentMargin: state.currentMargin + marginReleased,
          score: state.score - 10,
          actionLog: [...state.actionLog, action],
        },
        roundDetails: [...get().roundDetails, detail],
      });

      return true;
    },

    addMargin: (amount: number) => {
      const { state } = get();
      if (!state) return;

      const action: GameAction = {
        id: generateId(),
        type: 'ADD_MARGIN',
        round: state.currentRound,
        timestamp: Date.now(),
        payload: { amount },
      };

      set({
        state: {
          ...state,
          currentMargin: state.currentMargin + amount,
          actionLog: [...state.actionLog, action],
        },
      });
    },

    nextRound: () => {
      const { state, actions } = get();
      if (!state || state.status !== 'PLAYING') {
        return { volatilityDetails: [], marginCallDetails: [], liquidationDetails: [] };
      }

      const volatilityDetails: SettlementDetail[] = [];
      let newVolatility = state.currentVolatility;

      const eventsThisRound = getEventsForRound(
        state.volatilityEvents,
        state.currentRound,
        state.triggeredEvents
      );

      const newTriggeredEvents = [...state.triggeredEvents];

      for (const event of eventsThisRound) {
        const result = processVolatilityEvent(event, newVolatility, state.currentRound);
        const oldVolatility = newVolatility;
        newVolatility = result.newVolatility;

        if (!newTriggeredEvents.includes(event.id)) {
          newTriggeredEvents.push(event.id);
        }

        const detail = createVolatilityShockDetail(
          event,
          state.currentRound,
          oldVolatility,
          newVolatility,
          result.exactCalculation
        );
        volatilityDetails.push(detail);
      }

      const volatilityScoreChange = volatilityDetails.reduce(
        (sum, d) => sum + d.scoreChange,
        0
      );

      const updatedTowers = state.towers.map((tower) => {
        const card = actions.getCardById(tower.optionCardId);
        if (!card) return tower;

        const { currentValue, marginUsed } = calculateTowerValue(
          card,
          tower.level,
          state.spotPrice,
          newVolatility
        );

        return {
          ...tower,
          currentValue,
          marginUsed,
        };
      });

      let newState: GameState = {
        ...state,
        currentRound: state.currentRound + 1,
        currentVolatility: newVolatility,
        towers: updatedTowers,
        score: state.score + volatilityScoreChange,
        triggeredEvents: newTriggeredEvents,
      };

      const riskResult = performRiskCheck(newState, state.availableCards);
      newState = riskResult.newState;

      const allRoundDetails = [
        ...get().roundDetails,
        ...volatilityDetails,
        ...riskResult.marginCallDetails,
        ...riskResult.liquidationDetails,
      ];

      const totalPenalty = [
        ...riskResult.marginCallDetails,
        ...riskResult.liquidationDetails,
      ].reduce((sum, d) => sum + d.scoreChange, 0);

      newState.score += totalPenalty;

      if (newState.lives <= 0 || newState.currentMargin < 0) {
        newState.status = 'SETTLED';
      } else if (newState.currentRound > newState.totalRounds) {
        newState.status = 'SETTLED';
        newState.score += newState.currentMargin;
      }

      set({
        state: newState,
        roundDetails: allRoundDetails,
      });

      recordGameSnapshot(newState, newState.currentRound);

      return {
        volatilityDetails,
        marginCallDetails: riskResult.marginCallDetails,
        liquidationDetails: riskResult.liquidationDetails,
      };
    },

    settleGame: () => {
      const { state, roundDetails } = get();
      if (!state) return;

      const settlement = generateSettlement(
        state,
        roundDetails,
        state.availableCards,
        state.volatilityEvents
      );

      saveSettlementResult(settlement);

      set({
        state: { ...state, status: 'SETTLED' },
      });
    },

    getCardById: (cardId: string) => {
      const { state } = get();
      if (!state) return undefined;
      return state.availableCards.find((c) => c.id === cardId);
    },

    getEventById: (eventId: string) => {
      const { state } = get();
      if (!state) return undefined;
      return state.volatilityEvents.find((e) => e.id === eventId);
    },
  },
}));
