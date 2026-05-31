import { create } from 'zustand';
import { GameSession, Evidence, GameStep, Conflict } from '@/types';

interface ReviewState {
  session: GameSession | null;
  replayStep: number;
  isPlaying: boolean;
  playSpeed: number;
  selectedEvidence: Evidence | null;
  highlightedConflict: Conflict | null;
  steps: GameStep[];
  evidences: Evidence[];
  
  loadSession: (session: GameSession, evidences: Evidence[]) => void;
  play: () => void;
  pause: () => void;
  setPlaySpeed: (speed: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  seekTo: (stepNo: number) => void;
  selectEvidence: (evidence: Evidence | null) => void;
  highlightConflict: (conflict: Conflict | null) => void;
  reset: () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  session: null,
  replayStep: 0,
  isPlaying: false,
  playSpeed: 1,
  selectedEvidence: null,
  highlightedConflict: null,
  steps: [],
  evidences: [],

  loadSession: (session: GameSession, evidences: Evidence[]) => {
    set({
      session,
      steps: session.steps,
      evidences,
      replayStep: 0,
      isPlaying: false,
      selectedEvidence: null,
      highlightedConflict: null,
    });
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  
  setPlaySpeed: (speed: number) => set({ playSpeed: speed }),

  stepForward: () => {
    const state = get();
    if (state.replayStep < state.steps.length - 1) {
      set({ replayStep: state.replayStep + 1 });
    } else {
      set({ isPlaying: false });
    }
  },

  stepBackward: () => {
    const state = get();
    if (state.replayStep > 0) {
      set({ replayStep: state.replayStep - 1 });
    }
  },

  seekTo: (stepNo: number) => {
    set({ replayStep: Math.max(0, Math.min(stepNo, get().steps.length - 1)) });
  },

  selectEvidence: (evidence: Evidence | null) => {
    set({ selectedEvidence: evidence });
  },

  highlightConflict: (conflict: Conflict | null) => {
    set({ highlightedConflict: conflict });
  },

  reset: () => {
    set({
      session: null,
      replayStep: 0,
      isPlaying: false,
      playSpeed: 1,
      selectedEvidence: null,
      highlightedConflict: null,
      steps: [],
      evidences: [],
    });
  },
}));
