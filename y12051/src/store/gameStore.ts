import { create } from 'zustand';
import { GameState, GameSettings, JudgmentResult, ErrorRecord } from '../types';

interface GameStore extends GameState {
  setStatus: (status: GameState['status']) => void;
  setCurrentTime: (time: number) => void;
  setScore: (score: number) => void;
  addScore: (points: number) => void;
  setCombo: (combo: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  setSelectedTrack: (track: number | null) => void;
  addJudgment: (judgment: JudgmentResult) => void;
  addError: (error: ErrorRecord) => void;
  setSettings: (settings: Partial<GameSettings>) => void;
  setReviewTime: (time: number) => void;
  setIsPlayingReview: (playing: boolean) => void;
  resetGame: () => void;
}

const initialSettings: GameSettings = {
  sensitivity: 'normal',
  showRemarks: true,
  toleranceMode: false
};

const initialState: GameState = {
  status: 'idle',
  currentTime: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  judgments: [],
  errors: [],
  selectedTrack: null,
  settings: initialSettings,
  reviewTime: 0,
  isPlayingReview: false
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setScore: (score) => set({ score }),
  addScore: (points) => set((state) => ({ score: state.score + points })),
  setCombo: (combo) => set((state) => ({ 
    combo, 
    maxCombo: Math.max(state.maxCombo, combo) 
  })),
  incrementCombo: () => set((state) => ({
    combo: state.combo + 1,
    maxCombo: Math.max(state.maxCombo, state.combo + 1)
  })),
  resetCombo: () => set({ combo: 0 }),
  setSelectedTrack: (selectedTrack) => set({ selectedTrack }),
  addJudgment: (judgment) => set((state) => ({
    judgments: [...state.judgments, judgment]
  })),
  addError: (error) => set((state) => ({
    errors: [...state.errors, error]
  })),
  setSettings: (settings) => set((state) => ({
    settings: { ...state.settings, ...settings }
  })),
  setReviewTime: (reviewTime) => set({ reviewTime }),
  setIsPlayingReview: (isPlayingReview) => set({ isPlayingReview }),
  resetGame: () => set({
    ...initialState,
    settings: get().settings
  })
}));
