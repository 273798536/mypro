import { create } from 'zustand';
import type { GameState, GameConfig, Decision, GameEvent } from '../types';
import { initGame, processRound } from '../utils/gameEngine';

interface GameStore {
  gameState: GameState | null;
  eventQueue: GameEvent[];

  startGame: (config: GameConfig) => void;
  submitDecision: (decision: Decision) => GameEvent[];
  togglePause: () => void;
  resetGame: () => void;
  setGameState: (state: GameState) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  eventQueue: [],

  startGame: (config: GameConfig) => {
    const state = initGame(config);
    set({ gameState: state, eventQueue: [] });
  },

  submitDecision: (decision: Decision) => {
    const { gameState } = get();
    if (!gameState) return [];

    const firedEvents: GameEvent[] = [];
    const newState = processRound(gameState, decision, (event) => {
      firedEvents.push(event);
    });

    set({ gameState: newState, eventQueue: firedEvents });
    return firedEvents;
  },

  togglePause: () => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: { ...gameState, isPaused: !gameState.isPaused } });
  },

  resetGame: () => {
    set({ gameState: null, eventQueue: [] });
  },

  setGameState: (state: GameState) => {
    set({ gameState: state });
  },
}));
