import { create } from 'zustand';
import {
  cloneBoard,
  cloneCandidates,
  CorrectionReport,
  createEmptyBoard,
  createEmptyCandidates,
  ErrorDetection,
  initializeCandidates,
  SolutionStep,
  SudokuPuzzle,
} from '../types';
import { analyzeErrors } from '../engine/conflictDetector';
import { generateCorrectionReport } from '../engine/explanationGenerator';
import { applyStep } from '../engine/sudokuCore';
import { getFirstMockDataSet, getMockDataSet, MockDataSet } from '../data/mockData';

interface PuzzleState {
  puzzle: SudokuPuzzle;
  steps: SolutionStep[];
  errors: ErrorDetection[];
  report: CorrectionReport | null;
  currentStepIndex: number;
  selectedCell: { row: number; col: number } | null;
  showCandidates: boolean;
  showHeatmap: boolean;
  isAnalyzing: boolean;
  sourceMaterial: string;
  
  setPuzzle: (puzzle: SudokuPuzzle) => void;
  setCellValue: (row: number, col: number, value: number | null) => void;
  setSelectedCell: (cell: { row: number; col: number } | null) => void;
  toggleCandidates: () => void;
  toggleHeatmap: () => void;
  setSourceMaterial: (source: string) => void;
  
  addStep: (step: SolutionStep) => void;
  setCurrentStepIndex: (index: number) => void;
  goToStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  runAnalysis: () => void;
  generateReport: () => void;
  clearErrors: () => void;
  
  loadMockData: (id: string) => void;
  resetPuzzle: () => void;
  loadEmptyPuzzle: () => void;
  
  getCurrentBoard: () => (number | null)[][];
  getCurrentCandidates: () => Set<number>[][];
}

const initialPuzzle: SudokuPuzzle = {
  id: 'empty',
  name: '新题',
  difficulty: 'easy',
  board: createEmptyBoard(),
  initialBoard: createEmptyBoard(),
  candidates: createEmptyCandidates(),
  source: '手动输入',
  createdAt: new Date(),
};

export const usePuzzleStore = create<PuzzleState>((set, get) => {
  const firstMock = getFirstMockDataSet();
  
  return {
    puzzle: firstMock?.puzzle || initialPuzzle,
    steps: firstMock?.steps || [],
    errors: firstMock?.errors || [],
    report: firstMock?.report || null,
    currentStepIndex: firstMock?.steps ? firstMock.steps.length - 1 : 0,
    selectedCell: null,
    showCandidates: true,
    showHeatmap: false,
    isAnalyzing: false,
    sourceMaterial: firstMock?.puzzle.source || '',

    setPuzzle: (puzzle) => set({ puzzle }),

    setCellValue: (row, col, value) => {
      set((state) => {
        const newBoard = cloneBoard(state.puzzle.board);
        const newCandidates = cloneCandidates(state.puzzle.candidates);
        newBoard[row][col] = value;
        
        if (value !== null) {
          for (let c = 0; c < 9; c++) newCandidates[row][c].delete(value);
          for (let r = 0; r < 9; r++) newCandidates[r][col].delete(value);
          const boxRow = Math.floor(row / 3) * 3;
          const boxCol = Math.floor(col / 3) * 3;
          for (let r = boxRow; r < boxRow + 3; r++) {
            for (let c = boxCol; c < boxCol + 3; c++) {
              newCandidates[r][c].delete(value);
            }
          }
        } else {
          newCandidates[row][col] = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        }

        return {
          puzzle: {
            ...state.puzzle,
            board: newBoard,
            candidates: newCandidates,
          },
        };
      });
    },

    setSelectedCell: (cell) => set({ selectedCell: cell }),
    toggleCandidates: () => set((state) => ({ showCandidates: !state.showCandidates })),
    toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
    setSourceMaterial: (source) => set({ sourceMaterial: source }),

    addStep: (step) => set((state) => ({
      steps: [...state.steps, step],
      currentStepIndex: state.steps.length,
    })),

    setCurrentStepIndex: (index) => set({ currentStepIndex: index }),

    goToStep: (index) => {
      const state = get();
      if (index >= 0 && index < state.steps.length) {
        const step = state.steps[index];
        set({
          currentStepIndex: index,
          puzzle: {
            ...state.puzzle,
            board: cloneBoard(step.board),
            candidates: cloneCandidates(step.candidates),
          },
        });
      }
    },

    nextStep: () => {
      const state = get();
      if (state.currentStepIndex < state.steps.length - 1) {
        state.goToStep(state.currentStepIndex + 1);
      }
    },

    prevStep: () => {
      const state = get();
      if (state.currentStepIndex > 0) {
        state.goToStep(state.currentStepIndex - 1);
      }
    },

    runAnalysis: () => {
      set({ isAnalyzing: true });
      setTimeout(() => {
        const state = get();
        const errors = analyzeErrors(state.puzzle);
        set({ errors, isAnalyzing: false });
      }, 500);
    },

    generateReport: () => {
      const state = get();
      const report = generateCorrectionReport(
        state.puzzle,
        state.errors,
        state.sourceMaterial || state.puzzle.source
      );
      set({ report });
    },

    clearErrors: () => set({ errors: [], report: null }),

    loadMockData: (id) => {
      const data = getMockDataSet(id);
      if (data) {
        set({
          puzzle: clonePuzzle(data.puzzle),
          steps: [...data.steps],
          errors: [...data.errors],
          report: data.report,
          currentStepIndex: data.steps.length - 1,
          sourceMaterial: data.puzzle.source,
          selectedCell: null,
        });
      }
    },

    resetPuzzle: () => {
      const state = get();
      set({
        puzzle: {
          ...state.puzzle,
          board: cloneBoard(state.puzzle.initialBoard),
          candidates: initializeCandidates(state.puzzle.initialBoard),
        },
        steps: state.steps.slice(0, 1),
        currentStepIndex: 0,
        errors: [],
        report: null,
        selectedCell: null,
      });
    },

    loadEmptyPuzzle: () => {
      set({
        puzzle: { ...initialPuzzle, id: `puzzle-${Date.now()}` },
        steps: [],
        errors: [],
        report: null,
        currentStepIndex: 0,
        selectedCell: null,
      });
    },

    getCurrentBoard: () => {
      const state = get();
      if (state.steps.length > 0 && state.currentStepIndex < state.steps.length) {
        return state.steps[state.currentStepIndex].board;
      }
      return state.puzzle.board;
    },

    getCurrentCandidates: () => {
      const state = get();
      if (state.steps.length > 0 && state.currentStepIndex < state.steps.length) {
        return state.steps[state.currentStepIndex].candidates;
      }
      return state.puzzle.candidates;
    },
  };
});

function clonePuzzle(puzzle: SudokuPuzzle): SudokuPuzzle {
  return {
    ...puzzle,
    board: cloneBoard(puzzle.board),
    initialBoard: cloneBoard(puzzle.initialBoard),
    candidates: cloneCandidates(puzzle.candidates),
    createdAt: new Date(puzzle.createdAt),
  };
}
