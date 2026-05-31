import { create } from 'zustand';
import type {
  GameState,
  GameStatus,
  LogEntry,
  GameStateSnapshot,
} from '../types/game';
import type { Card } from '../types/card';
import type { RiskRecord } from '../types/risk';
import { INITIAL_CITY_STATUS } from '../types/city';
import {
  TOTAL_ROUNDS,
  MAX_SCORE,
} from '../types/game';
import { getDefaultScenario, type Scenario } from '../data/scenarios';
import { initializeGame, playCard, drawNewCards } from '../engine/cardScheduler';
import { calculateStorage } from '../engine/storageCalculator';
import { detectRisks } from '../engine/riskDetector';
import {
  createClueFromCard,
  associateClues,
  linkRiskToEventChain,
} from '../engine/clueAssociator';
import { calculateFinalScore, type ScoreBreakdown } from '../engine/scoreCalculator';
import { generateId, downloadJson } from '../utils/common';

interface GameStore extends GameState {
  scenario: Scenario;
  scoreBreakdown: ScoreBreakdown | null;
  roundsWithNoRisk: number;

  setScenario: (scenario: Scenario) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  settleGame: () => void;

  playCard: (cardId: string) => void;
  endRound: () => void;

  addLog: (type: LogEntry['type'], message: string, cardId?: string) => void;
  saveStateSnapshot: (logMessage: string) => void;

  setReplayMode: (enabled: boolean) => void;
  setReplayIndex: (index: number) => void;

  exportGameRecord: () => void;
  loadGameRecord: (record: unknown) => void;

  updateElapsedTime: (seconds: number) => void;
}

const getInitialState = (scenario: Scenario): GameState => {
  const { hand, deck, discardPile, initialRainfall } = initializeGame(scenario);

  return {
    status: 'idle',
    currentRound: 1,
    totalRounds: TOTAL_ROUNDS,
    elapsedTime: 0,
    score: MAX_SCORE,
    maxScore: MAX_SCORE,
    hand,
    deck,
    discardPile,
    city: { ...INITIAL_CITY_STATUS },
    eventChains: [],
    riskRecords: [],
    log: [],
    activeRainfall: initialRainfall,
    playedCardsThisRound: [],
    replayMode: false,
    replayIndex: 0,
    stateHistory: [],
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...getInitialState(getDefaultScenario()),
  scenario: getDefaultScenario(),
  scoreBreakdown: null,
  roundsWithNoRisk: 0,

  setScenario: (scenario: Scenario) => {
    set({ scenario });
  },

  startGame: () => {
    const scenario = get().scenario;
    const newState = getInitialState(scenario);
    set({
      ...newState,
      status: 'playing',
      scenario,
    });
    get().addLog('system', `游戏开始！场景：${scenario.name}`);
    get().addLog('event', `第1回合开始，降雨量 ${newState.activeRainfall} mm/h`);
    get().saveStateSnapshot('游戏开始');
  },

  pauseGame: () => {
    if (get().status === 'playing') {
      set({ status: 'paused' });
      get().addLog('system', '游戏已暂停');
    }
  },

  resumeGame: () => {
    if (get().status === 'paused') {
      set({ status: 'playing' });
      get().addLog('system', '游戏继续');
    }
  },

  restartGame: () => {
    const scenario = get().scenario;
    const newState = getInitialState(scenario);
    set({
      ...newState,
      status: 'playing',
      scenario,
      scoreBreakdown: null,
      roundsWithNoRisk: 0,
    });
    get().addLog('system', `游戏重新开始！场景：${scenario.name}`);
    get().addLog('event', `第1回合开始，降雨量 ${newState.activeRainfall} mm/h`);
    get().saveStateSnapshot('游戏重新开始');
  },

  settleGame: () => {
    const state = get();
    const breakdown = calculateFinalScore(
      state.riskRecords,
      state.city,
      state.totalRounds,
      state.roundsWithNoRisk,
    );

    set({
      status: 'settled',
      score: breakdown.finalScore,
      scoreBreakdown: breakdown,
    });
    get().addLog('system', `游戏结束！最终得分：${breakdown.finalScore} 分`);
  },

  playCard: (cardId: string) => {
    const state = get();
    if (state.status !== 'playing') return;

    const result = playCard(state.hand, state.deck, state.discardPile, cardId);
    if (!result.playedCard) return;

    const playedCard = result.playedCard;
    const newPlayedCards = [...state.playedCardsThisRound, playedCard];

    const newCityStatus = calculateStorage(
      state.city,
      state.activeRainfall,
      newPlayedCards,
    );

    const risks = detectRisks(newCityStatus, state.currentRound, playedCard);

    let newEventChains = state.eventChains;
    const clue = createClueFromCard(playedCard, state.currentRound, newCityStatus);
    newEventChains = associateClues(newEventChains, clue, newCityStatus);

    let newRiskRecords = [...state.riskRecords];
    let newScore = state.score;

    if (risks.length > 0) {
      risks.forEach(risk => {
        newRiskRecords.push(risk);
        newScore -= risk.penalty;
        newEventChains = linkRiskToEventChain(newEventChains, risk.id, risk.round);
        get().addLog(
          'risk',
          `【风险】${risk.type === 'pump_overload' ? '泵站过载' : risk.type === 'low_flooding' ? '低洼积水' : '绿地饱和'}，扣${risk.penalty}分 - ${risk.bottleneck}`,
          risk.triggerCardId || undefined,
        );
      });
    }

    set({
      hand: result.newHand,
      deck: result.newDeck,
      discardPile: result.newDiscardPile,
      city: newCityStatus,
      playedCardsThisRound: newPlayedCards,
      eventChains: newEventChains,
      riskRecords: newRiskRecords,
      score: Math.max(0, newScore),
    });

    get().addLog(
      'action',
      `调度「${playedCard.name}」，${playedCard.type === 'pipeline' ? '输送能力' : playedCard.type === 'disposal' ? '处置能力' : '吸纳容量'} ${playedCard.value}`,
      playedCard.id,
    );

    get().saveStateSnapshot(`调度${playedCard.name}`);
  },

  endRound: () => {
    const state = get();
    if (state.status !== 'playing') return;

    const hadRisk = state.riskRecords.some(r => r.round === state.currentRound);
    const newRoundsWithNoRisk = hadRisk ? state.roundsWithNoRisk : state.roundsWithNoRisk + 1;

    const nextRound = state.currentRound + 1;

    if (nextRound > state.totalRounds) {
      set({ roundsWithNoRisk: newRoundsWithNoRisk });
      get().settleGame();
      return;
    }

    const nextRainfall = state.scenario.rainfallPattern[nextRound - 1] || state.activeRainfall;

    const drawResult = drawNewCards(state.hand, state.deck, state.discardPile);

    const resetCity = {
      ...state.city,
      pumpLoad: 0,
      lowWater: Math.max(0, state.city.lowWater - 20),
    };

    set({
      currentRound: nextRound,
      activeRainfall: nextRainfall,
      hand: drawResult.newHand,
      deck: drawResult.newDeck,
      discardPile: drawResult.newDiscardPile,
      city: resetCity,
      playedCardsThisRound: [],
      roundsWithNoRisk: newRoundsWithNoRisk,
    });

    get().addLog('system', `第${state.currentRound}回合结束`);
    get().addLog('event', `第${nextRound}回合开始，降雨量 ${nextRainfall} mm/h`);
    get().saveStateSnapshot(`第${nextRound}回合开始`);
  },

  addLog: (type: LogEntry['type'], message: string, cardId?: string) => {
    const state = get();
    const entry: LogEntry = {
      id: generateId(),
      round: state.currentRound,
      timestamp: Date.now(),
      type,
      message,
      cardId,
    };
    set({
      log: [...state.log, entry],
    });
  },

  saveStateSnapshot: (logMessage: string) => {
    const state = get();
    const snapshot: GameStateSnapshot = {
      round: state.currentRound,
      city: { ...state.city },
      score: state.score,
      activeRainfall: state.activeRainfall,
      logMessage,
    };
    set({
      stateHistory: [...state.stateHistory, snapshot],
    });
  },

  setReplayMode: (enabled: boolean) => {
    set({ replayMode: enabled, replayIndex: enabled ? get().stateHistory.length - 1 : 0 });
  },

  setReplayIndex: (index: number) => {
    const state = get();
    const clampedIndex = Math.max(0, Math.min(index, state.stateHistory.length - 1));
    set({ replayIndex: clampedIndex });
  },

  exportGameRecord: () => {
    const state = get();
    const record = {
      exportTime: new Date().toISOString(),
      scenario: state.scenario,
      finalScore: state.score,
      scoreBreakdown: state.scoreBreakdown,
      riskRecords: state.riskRecords,
      eventChains: state.eventChains,
      stateHistory: state.stateHistory,
      log: state.log,
      totalRounds: state.totalRounds,
      elapsedTime: state.elapsedTime,
    };
    downloadJson(record, `城市雨洪卡牌局_${Date.now()}.json`);
  },

  loadGameRecord: (record: unknown) => {
    try {
      const parsed = record as {
        scenario: Scenario;
        stateHistory: GameStateSnapshot[];
        riskRecords: RiskRecord[];
        log: LogEntry[];
        eventChains: GameState['eventChains'];
        finalScore: number;
      };

      const initial = getInitialState(parsed.scenario);
      set({
        ...initial,
        status: 'settled',
        scenario: parsed.scenario,
        stateHistory: parsed.stateHistory,
        riskRecords: parsed.riskRecords,
        log: parsed.log,
        eventChains: parsed.eventChains,
        score: parsed.finalScore,
      });
    } catch (e) {
      console.error('Failed to load game record:', e);
    }
  },

  updateElapsedTime: (seconds: number) => {
    set({ elapsedTime: seconds });
  },
}));
