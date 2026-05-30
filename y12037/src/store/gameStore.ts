import { create } from 'zustand';
import { GameState, ToolType, ActionRecord, ProblemSpot } from '@/types/game';
import { generateProblemSpots, processAction, calculateMaxScore } from '@/game/engine';

interface GameStore extends GameState {
  startGame: () => void;
  selectTool: (tool: ToolType | null) => void;
  handleClick: (position: number, track: number) => void;
  updateBeatPosition: (position: number) => void;
  clearFeedback: () => void;
  endGame: () => void;
  resetGame: () => void;
  setTimeRemaining: (time: number) => void;
}

const initialState: GameState = {
  status: 'idle',
  score: 0,
  maxScore: 0,
  problemSpots: [],
  actionHistory: [],
  selectedTool: null,
  combo: 0,
  timeRemaining: 90,
  beatPosition: 0,
  showFeedback: false,
  lastFeedback: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  startGame: () => {
    const problemSpots = generateProblemSpots();
    const maxScore = calculateMaxScore(problemSpots.length);
    
    set({
      status: 'playing',
      score: 0,
      maxScore,
      problemSpots,
      actionHistory: [],
      selectedTool: null,
      combo: 0,
      timeRemaining: 90,
      beatPosition: 0,
      showFeedback: false,
      lastFeedback: null,
    });
  },

  selectTool: (tool: ToolType | null) => {
    set({ selectedTool: tool });
  },

  handleClick: (position: number, track: number) => {
    const state = get();
    if (state.status !== 'playing' || !state.selectedTool) return;

    const result = processAction(
      state.selectedTool,
      position,
      track,
      state.beatPosition,
      state.problemSpots,
      state.combo
    );

    const newScore = state.score + result.record.scoreChange;

    set({
      score: Math.max(0, newScore),
      problemSpots: result.updatedSpots,
      actionHistory: [...state.actionHistory, result.record],
      combo: result.newCombo,
      showFeedback: true,
      lastFeedback: result.feedback,
    });

    const allFixed = result.updatedSpots.every((s) => s.isFixed);
    if (allFixed) {
      set({ status: 'finished' });
    }
  },

  updateBeatPosition: (position: number) => {
    set({ beatPosition: position });
  },

  clearFeedback: () => {
    set({ showFeedback: false, lastFeedback: null });
  },

  endGame: () => {
    set({ status: 'finished' });
  },

  resetGame: () => {
    set(initialState);
  },

  setTimeRemaining: (time: number) => {
    set({ timeRemaining: time });
    if (time <= 0) {
      set({ status: 'finished' });
    }
  },
}));

export const selectActionHistory = (state: GameStore): ActionRecord[] => state.actionHistory;
export const selectProblemSpots = (state: GameStore): ProblemSpot[] => state.problemSpots;
