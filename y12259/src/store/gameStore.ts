import { create } from "zustand";
import type { GameState, PlayerAction } from "@/types";
import {
  createInitialState,
  startGame,
  setPendingAction,
  removePendingAction,
  submitRound,
  nextRound,
  generateReport,
} from "@/engine/gameEngine";

interface GameStore extends GameState {
  handleStartGame: () => void;
  handleSetAction: (fundId: string, action: PlayerAction["action"], shares: number) => void;
  handleRemoveAction: (fundId: string) => void;
  handleSubmitRound: () => void;
  handleNextRound: () => void;
  handleReset: () => void;
  handleGoReport: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  handleStartGame: () => {
    const state = get();
    set(startGame(state));
  },

  handleSetAction: (fundId, action, shares) => {
    const state = get();
    set(setPendingAction(state, fundId, action, shares));
  },

  handleRemoveAction: (fundId) => {
    const state = get();
    set(removePendingAction(state, fundId));
  },

  handleSubmitRound: () => {
    const state = get();
    set(submitRound(state));
  },

  handleNextRound: () => {
    const state = get();
    set(nextRound(state));
  },

  handleReset: () => {
    set(createInitialState());
  },

  handleGoReport: () => {
    const state = get();
    set(generateReport(state));
  },
}));
