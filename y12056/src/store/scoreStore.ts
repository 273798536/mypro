import { create } from 'zustand';
import type { ScoreResult } from '../types/score';

interface ScoreState {
  scoreResult: ScoreResult | null;
  isScoring: boolean;
  error: string | null;
}

interface ScoreActions {
  setScoreResult: (result: ScoreResult) => void;
  setScoring: (isScoring: boolean) => void;
  clearScore: () => void;
}

const initialState: ScoreState = {
  scoreResult: null,
  isScoring: false,
  error: null,
};

export const useScoreStore = create<ScoreState & ScoreActions>((set) => ({
  ...initialState,

  setScoreResult: (result: ScoreResult) => {
    set({ scoreResult: result, isScoring: false, error: null });
  },

  setScoring: (isScoring: boolean) => {
    set({ isScoring });
  },

  clearScore: () => {
    set(initialState);
  },
}));
