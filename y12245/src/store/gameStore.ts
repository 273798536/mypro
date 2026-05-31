import { create } from 'zustand';
import { GameState, GameStep, Level, Point, GameError, GameSession } from '../types';

interface GameStore extends GameState {
  setLevel: (level: Level) => void;
  setParameter: (name: string, value: number) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: (result: 'success' | 'failed') => void;
  resetGame: () => void;
  addStep: (step: GameStep) => void;
  setCarPosition: (position: Point) => void;
  setSpeed: (speed: number) => void;
  addError: (error: GameError) => void;
  setTrajectory: (trajectory: Point[]) => void;
  setScore: (score: number) => void;
  clearErrors: () => void;
}

const initialState: GameState = {
  currentLevel: null,
  currentStep: 0,
  steps: [],
  parameters: {},
  isPlaying: false,
  isPaused: false,
  carPosition: { x: 0, y: 0 },
  speed: 0,
  errors: [],
  trajectory: [],
  result: 'playing',
  score: 0,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setLevel: (level: Level) => {
    const params: Record<string, number> = {};
    level.parameterRanges.forEach((p) => {
      params[p.name] = p.default;
    });
    set({
      currentLevel: level,
      parameters: params,
      carPosition: level.startPoint,
      trajectory: [level.startPoint],
    });
  },

  setParameter: (name: string, value: number) => {
    set((state) => ({
      parameters: { ...state.parameters, [name]: value },
    }));
  },

  startGame: () => {
    const state = get();
    set({
      isPlaying: true,
      isPaused: false,
      result: 'playing',
      steps: [],
      errors: [],
      currentStep: 0,
      trajectory: state.currentLevel ? [state.currentLevel.startPoint] : [],
      carPosition: state.currentLevel?.startPoint || { x: 0, y: 0 },
      score: 0,
    });
  },

  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),

  endGame: (result: 'success' | 'failed') => {
    set({
      isPlaying: false,
      isPaused: false,
      result,
    });
  },

  resetGame: () => {
    const state = get();
    if (state.currentLevel) {
      const params: Record<string, number> = {};
      state.currentLevel.parameterRanges.forEach((p) => {
        params[p.name] = p.default;
      });
      set({
        ...initialState,
        currentLevel: state.currentLevel,
        parameters: params,
        carPosition: state.currentLevel.startPoint,
        trajectory: [state.currentLevel.startPoint],
      });
    }
  },

  addStep: (step: GameStep) => {
    set((state) => ({
      steps: [...state.steps, step],
      currentStep: step.stepIndex,
    }));
  },

  setCarPosition: (position: Point) => set({ carPosition: position }),
  setSpeed: (speed: number) => set({ speed }),

  addError: (error: GameError) => {
    set((state) => ({
      errors: [...state.errors, error],
    }));
  },

  setTrajectory: (trajectory: Point[]) => set({ trajectory }),
  setScore: (score: number) => set({ score }),
  clearErrors: () => set({ errors: [] }),
}));

interface HistoryStore {
  sessions: GameSession[];
  addSession: (session: GameSession) => void;
  removeSession: (id: string) => void;
  clearHistory: () => void;
  loadSessions: () => void;
}

const STORAGE_KEY = 'function-racing-history';

export const useHistoryStore = create<HistoryStore>((set) => ({
  sessions: [],

  loadSessions: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        set({ sessions: JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  },

  addSession: (session: GameSession) => {
    set((state) => {
      const newSessions = [session, ...state.sessions].slice(0, 50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
      return { sessions: newSessions };
    });
  },

  removeSession: (id: string) => {
    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
      return { sessions: newSessions };
    });
  },

  clearHistory: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ sessions: [] });
  },
}));
