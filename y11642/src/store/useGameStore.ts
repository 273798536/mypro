import { create } from 'zustand';
import {
  GameState,
  Valve,
  Plot,
  Cell,
  ActionRecord,
  Anomaly,
  Weather
} from '../types';
import {
  createDefaultBoard,
  createDefaultValves,
  createDefaultPlots,
  getRandomWeather
} from '../data/mockData';
import { MAX_ROUNDS } from '../data/constants';
import { calculateWaterFlow } from '../engine/waterFlow';
import { detectAnomalies } from '../engine/anomalyDetection';
import { calculateRoundScore } from '../engine/scoring';

interface GameStore {
  state: GameState;
  pendingValveChanges: Map<string, 'open' | 'closed'>;
  
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  toggleValve: (valveId: string) => void;
  advanceRound: () => void;
  endGame: () => void;
  loadGameState: (gameState: GameState) => void;
  clearPendingChanges: () => void;
}

function createInitialState(): GameState {
  return {
    phase: 'idle',
    currentRound: 0,
    maxRounds: MAX_ROUNDS,
    score: 0,
    board: createDefaultBoard(),
    valves: createDefaultValves(),
    plots: createDefaultPlots(),
    currentWeather: getRandomWeather(),
    anomalies: [],
    actionHistory: [],
    waterFlowState: {
      wateredPlots: [],
      flowPath: []
    },
    totalWaterUsed: 0,
    totalEvaporation: 0
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState(),
  pendingValveChanges: new Map(),

  startGame: () => {
    const newState = createInitialState();
    newState.phase = 'playing';
    newState.currentRound = 1;
    set({ state: newState, pendingValveChanges: new Map() });
  },

  pauseGame: () => {
    const { state } = get();
    if (state.phase === 'playing') {
      set({ state: { ...state, phase: 'paused' } });
    }
  },

  resumeGame: () => {
    const { state } = get();
    if (state.phase === 'paused') {
      set({ state: { ...state, phase: 'playing' } });
    }
  },

  restartGame: () => {
    const newState = createInitialState();
    newState.phase = 'playing';
    newState.currentRound = 1;
    set({ state: newState, pendingValveChanges: new Map() });
  },

  toggleValve: (valveId: string) => {
    const { state, pendingValveChanges } = get();
    if (state.phase !== 'playing') return;

    const valve = state.valves.find(v => v.id === valveId);
    if (!valve) return;

    const currentState = pendingValveChanges.get(valveId) || valve.state;
    const newState = currentState === 'open' ? 'closed' : 'open';

    const newPending = new Map(pendingValveChanges);
    newPending.set(valveId, newState);
    
    const action: ActionRecord = {
      round: state.currentRound,
      valveId,
      action: newState,
      timestamp: Date.now()
    };

    set({
      pendingValveChanges: newPending,
      state: {
        ...state,
        actionHistory: [...state.actionHistory, action]
      }
    });
  },

  advanceRound: () => {
    const { state, pendingValveChanges } = get();
    if (state.phase !== 'playing') return;

    const previousPlots = state.plots.map(p => ({ ...p }));

    const newValves = state.valves.map(v => {
      const pending = pendingValveChanges.get(v.id);
      return pending ? { ...v, state: pending } : v;
    });

    const { newBoard, newPlots, waterFlowState, waterUsed, evaporationLoss } = calculateWaterFlow(
      state.board,
      newValves,
      state.plots,
      state.currentWeather.evaporationRate
    );

    const { anomalies, totalPenalty } = detectAnomalies(
      newPlots,
      previousPlots,
      state.currentRound,
      evaporationLoss
    );

    const { roundScore } = calculateRoundScore(newPlots, totalPenalty);

    const nextRound = state.currentRound + 1;
    const shouldEnd = nextRound > state.maxRounds;

    set({
      state: {
        ...state,
        phase: shouldEnd ? 'ended' : 'playing',
        currentRound: shouldEnd ? state.currentRound : nextRound,
        board: newBoard,
        valves: newValves,
        plots: newPlots,
        score: state.score + roundScore,
        waterFlowState,
        totalWaterUsed: state.totalWaterUsed + waterUsed,
        totalEvaporation: state.totalEvaporation + evaporationLoss,
        anomalies: [...state.anomalies, ...anomalies],
        currentWeather: shouldEnd ? state.currentWeather : getRandomWeather()
      },
      pendingValveChanges: new Map()
    });
  },

  endGame: () => {
    const { state } = get();
    set({ state: { ...state, phase: 'ended' } });
  },

  loadGameState: (gameState: GameState) => {
    set({ state: gameState, pendingValveChanges: new Map() });
  },

  clearPendingChanges: () => {
    set({ pendingValveChanges: new Map() });
  }
}));
