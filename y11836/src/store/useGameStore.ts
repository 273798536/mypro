import { create } from 'zustand';
import { CellType, GameState, ScoreResult, GRID_SIZE } from '@/types';
import { createInitialGrid, calculateScore, findChangedCells, loadSampleGrid1, loadSampleGrid2 } from '@/utils/scoreCalculator';

interface GameStore extends GameState {
  setCell: (row: number, col: number, type: CellType) => void;
  setSelectedTool: (tool: CellType | null) => void;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetGame: () => void;
  showResult: () => void;
  goBackToPlanning: () => void;
  saveFirstRun: () => void;
  toggleComparison: () => void;
  loadSample: (sampleNum: 1 | 2) => void;
  clearGrid: () => void;
}

const initialState: GameState = {
  grid: createInitialGrid(),
  isRunning: false,
  isPaused: false,
  phase: 'planning',
  score: null,
  selectedTool: null,
  firstRunGrid: null,
  firstRunScore: null,
  showComparison: false
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setCell: (row: number, col: number, type: CellType) => {
    const { phase } = get();
    if (phase !== 'planning') return;
    
    set(state => {
      const newGrid = state.grid.map(r => [...r]);
      newGrid[row][col] = type;
      return { grid: newGrid };
    });
  },

  setSelectedTool: (tool: CellType | null) => {
    set({ selectedTool: tool });
  },

  startSimulation: () => {
    set({ isRunning: true, isPaused: false, phase: 'simulating', score: null });
  },

  pauseSimulation: () => {
    const { isRunning } = get();
    if (!isRunning) return;
    set(state => ({ isPaused: !state.isPaused }));
  },

  resetGame: () => {
    set({
      grid: createInitialGrid(),
      isRunning: false,
      isPaused: false,
      phase: 'planning',
      score: null
    });
  },

  showResult: () => {
    const { grid, firstRunGrid } = get();
    const score = calculateScore(grid);
    set({
      isRunning: false,
      phase: 'result',
      score,
      showComparison: firstRunGrid !== null
    });
  },

  goBackToPlanning: () => {
    set({
      isRunning: false,
      isPaused: false,
      phase: 'planning',
      score: null,
      showComparison: false
    });
  },

  saveFirstRun: () => {
    const { grid, score } = get();
    const currentScore = score || calculateScore(grid);
    set({
      firstRunGrid: grid.map(r => [...r]),
      firstRunScore: currentScore,
      grid: createInitialGrid(),
      isRunning: false,
      isPaused: false,
      phase: 'planning',
      score: null,
      showComparison: false
    });
  },

  toggleComparison: () => {
    const { firstRunGrid } = get();
    if (!firstRunGrid) return;
    set(state => ({ showComparison: !state.showComparison }));
  },

  loadSample: (sampleNum: 1 | 2) => {
    const grid = sampleNum === 1 ? loadSampleGrid1() : loadSampleGrid2();
    set({
      grid,
      isRunning: false,
      isPaused: false,
      phase: 'planning',
      score: null
    });
  },

  clearGrid: () => {
    set({
      grid: createInitialGrid() });
  }
}));

export function useChangedCells() {
  const { firstRunGrid, grid } = useGameStore();
  if (!firstRunGrid) return [];
  return findChangedCells(firstRunGrid, grid);
}
