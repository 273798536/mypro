import { create } from 'zustand';
import {
  GameState,
  DefectCard,
  GridPosition,
  PlacedDefect,
  Violation,
  GameReport,
} from '../types/game';
import { GAME_CONFIG } from '../data/gameConfig';
import { validateAllRules } from '../utils/rules';
import { calculateFullScore } from '../utils/scoring';
import {
  saveCurrentGame,
  loadCurrentGame,
  clearCurrentGame,
  saveGameReport,
  getMinecartId,
  setMinecartId,
} from '../utils/storage';

interface GameStore extends GameState {
  selectCard: (card: DefectCard | null) => void;
  placeDefect: (position: GridPosition) => Violation | null;
  undoLastDefect: () => void;
  resetGame: () => void;
  submitGame: () => GameReport;
  updateMinecartId: (id: string) => void;
  loadSavedGame: () => boolean;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function getInitialState(): GameState {
  return {
    gridSize: GAME_CONFIG.gridSize,
    maxEnergy: GAME_CONFIG.maxEnergy,
    currentEnergy: GAME_CONFIG.initialEnergy,
    score: { base: 0, bonus: 0, penalty: 0, total: 0 },
    selectedCard: null,
    placedDefects: [],
    violations: [],
    consecutiveSuccess: 0,
    isSubmitted: false,
    minecartId: getMinecartId(),
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...getInitialState(),

  selectCard: (card) => {
    set({ selectedCard: card });
  },

  placeDefect: (position) => {
    const state = get();

    if (!state.selectedCard) {
      return null;
    }

    if (state.isSubmitted) {
      return null;
    }

    const validationResult = validateAllRules(
      position,
      state.selectedCard,
      state
    );

    if (!validationResult.valid && validationResult.violation) {
      const newViolations = [...state.violations, validationResult.violation];
      const newScore = calculateFullScore(
        state.placedDefects,
        newViolations,
        0
      );

      set({
        violations: newViolations,
        score: newScore,
        consecutiveSuccess: 0,
      });

      saveCurrentGame(get());
      return validationResult.violation;
    }

    const newDefect: PlacedDefect = {
      id: generateId(),
      cardId: state.selectedCard.id,
      type: state.selectedCard.type,
      position,
      timestamp: Date.now(),
    };

    const newPlacedDefects = [...state.placedDefects, newDefect];
    const newEnergy = state.currentEnergy - state.selectedCard.energyCost;
    const newConsecutiveSuccess = state.consecutiveSuccess + 1;
    const newScore = calculateFullScore(
      newPlacedDefects,
      state.violations,
      newConsecutiveSuccess
    );

    set({
      placedDefects: newPlacedDefects,
      currentEnergy: newEnergy,
      consecutiveSuccess: newConsecutiveSuccess,
      score: newScore,
      selectedCard: null,
    });

    saveCurrentGame(get());
    return null;
  },

  undoLastDefect: () => {
    const state = get();
    if (state.placedDefects.length === 0 || state.isSubmitted) return;

    const lastDefect = state.placedDefects[state.placedDefects.length - 1];
    const energyMap: Record<string, number> = {
      vacancy: 10,
      interstitial: 15,
      dislocation: 25,
      grain_boundary: 40,
    };
    const refundEnergy = energyMap[lastDefect.type] || 0;

    const newPlacedDefects = state.placedDefects.slice(0, -1);
    const newConsecutiveSuccess = Math.max(0, state.consecutiveSuccess - 1);
    const newScore = calculateFullScore(
      newPlacedDefects,
      state.violations,
      newConsecutiveSuccess
    );

    set({
      placedDefects: newPlacedDefects,
      currentEnergy: state.currentEnergy + refundEnergy,
      consecutiveSuccess: newConsecutiveSuccess,
      score: newScore,
    });

    saveCurrentGame(get());
  },

  resetGame: () => {
    clearCurrentGame();
    const minecartId = getMinecartId();
    set({
      ...getInitialState(),
      minecartId,
    });
  },

  submitGame: () => {
    const state = get();
    const report: GameReport = {
      minecartId: state.minecartId,
      timestamp: Date.now(),
      score: state.score,
      totalDefects: state.placedDefects.length,
      totalViolations: state.violations.length,
      violations: state.violations,
      placedDefects: state.placedDefects,
    };

    saveGameReport(report);
    clearCurrentGame();

    set({ isSubmitted: true });
    return report;
  },

  updateMinecartId: (id) => {
    setMinecartId(id);
    set({ minecartId: id });
  },

  loadSavedGame: () => {
    const saved = loadCurrentGame();
    if (saved && !saved.isSubmitted) {
      set(saved);
      return true;
    }
    return false;
  },
}));
