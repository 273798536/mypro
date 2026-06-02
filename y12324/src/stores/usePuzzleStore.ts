import { create } from 'zustand';
import {
  cloneBoard,
  cloneCandidates,
  CorrectionReport,
  createEmptyBoard,
  createEmptyCandidates,
  DataBatch,
  ErrorDetection,
  ImportedMaterial,
  initializeCandidates,
  MaterialType,
  SolutionStep,
  SudokuPuzzle,
} from '../types';
import { analyzeErrors, validateAllSteps } from '../engine/conflictDetector';
import { generateCorrectionReport } from '../engine/explanationGenerator';
import { applyStep } from '../engine/sudokuCore';
import { getFirstMockDataSet, getMockDataSet, MockDataSet } from '../data/mockData';

interface PuzzleState {
  currentBatchId: string;
  batches: Record<string, DataBatch>;
  importedMaterials: ImportedMaterial[];
  
  puzzle: SudokuPuzzle;
  steps: SolutionStep[];
  errors: ErrorDetection[];
  report: CorrectionReport | null;
  currentStepIndex: number;
  selectedCell: { row: number; col: number } | null;
  selectedErrorId: string | null;
  showCandidates: boolean;
  showHeatmap: boolean;
  isAnalyzing: boolean;
  isMerging: boolean;
  sourceMaterial: string;
  
  createNewBatch: () => void;
  setCurrentBatch: (batchId: string) => void;
  importMaterial: (type: MaterialType, name: string, source: string, data: any) => string;
  removeMaterial: (materialId: string) => void;
  mergeMaterials: () => void;
  linkErrorToStep: (errorId: string, stepId: string) => void;
  setSelectedErrorId: (errorId: string | null) => void;
  
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
  getCurrentBatch: () => DataBatch | null;
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

function createEmptyBatch(id: string): DataBatch {
  return {
    id,
    name: `分析批次 ${new Date().toLocaleString('zh-CN')}`,
    materials: [],
    mergedPuzzle: { ...initialPuzzle, id: `puzzle-${id}` },
    mergedSteps: [],
    mergedErrors: [],
    mergedReport: null,
    createdAt: new Date(),
    isAnalyzed: false,
  };
}

export const usePuzzleStore = create<PuzzleState>((set, get) => {
  const firstMock = getFirstMockDataSet();
  const initialBatchId = `batch-${Date.now()}`;
  const initialBatch = createEmptyBatch(initialBatchId);
  
  if (firstMock) {
    initialBatch.materials = [
      {
        id: 'mock-board',
        type: 'board',
        name: firstMock.puzzle.name,
        source: firstMock.puzzle.source,
        importedAt: new Date(),
        data: firstMock.puzzle,
      },
      {
        id: 'mock-steps',
        type: 'steps',
        name: '解题步骤',
        source: firstMock.puzzle.source,
        importedAt: new Date(),
        data: firstMock.steps,
      },
    ];
    initialBatch.mergedPuzzle = clonePuzzle(firstMock.puzzle);
    initialBatch.mergedSteps = [...firstMock.steps];
    initialBatch.mergedErrors = [...firstMock.errors];
    initialBatch.mergedReport = firstMock.report;
    initialBatch.isAnalyzed = true;
  }
  
  return {
    currentBatchId: initialBatchId,
    batches: { [initialBatchId]: initialBatch },
    importedMaterials: initialBatch.materials,
    
    puzzle: firstMock ? clonePuzzle(firstMock.puzzle) : initialPuzzle,
    steps: firstMock?.steps || [],
    errors: firstMock?.errors || [],
    report: firstMock?.report || null,
    currentStepIndex: firstMock?.steps ? firstMock.steps.length - 1 : 0,
    selectedCell: null,
    selectedErrorId: null,
    showCandidates: true,
    showHeatmap: false,
    isAnalyzing: false,
    isMerging: false,
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
    setSelectedErrorId: (errorId) => set({ selectedErrorId: errorId }),

    createNewBatch: () => {
      const batchId = `batch-${Date.now()}`;
      const newBatch = createEmptyBatch(batchId);
      set((state) => ({
        batches: { ...state.batches, [batchId]: newBatch },
        currentBatchId: batchId,
        importedMaterials: [],
        puzzle: clonePuzzle(newBatch.mergedPuzzle),
        steps: [],
        errors: [],
        report: null,
        currentStepIndex: 0,
        selectedCell: null,
        selectedErrorId: null,
      }));
    },

    setCurrentBatch: (batchId) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch) return state;
        return {
          currentBatchId: batchId,
          importedMaterials: batch.materials,
          puzzle: clonePuzzle(batch.mergedPuzzle),
          steps: [...batch.mergedSteps],
          errors: [...batch.mergedErrors],
          report: batch.mergedReport,
          currentStepIndex: batch.mergedSteps.length > 0 ? batch.mergedSteps.length - 1 : 0,
          selectedCell: null,
          selectedErrorId: null,
        };
      });
    },

    importMaterial: (type, name, source, data) => {
      const materialId = `material-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const material: ImportedMaterial = {
        id: materialId,
        type,
        name,
        source,
        importedAt: new Date(),
        data,
      };
      set((state) => ({
        importedMaterials: [...state.importedMaterials, material],
        batches: {
          ...state.batches,
          [state.currentBatchId]: {
            ...state.batches[state.currentBatchId],
            materials: [...state.batches[state.currentBatchId].materials, material],
          },
        },
      }));
      return materialId;
    },

    removeMaterial: (materialId) => {
      set((state) => ({
        importedMaterials: state.importedMaterials.filter((m) => m.id !== materialId),
      }));
    },

    mergeMaterials: () => {
      set({ isMerging: true });
      setTimeout(() => {
        const state = get();
        const materials = state.importedMaterials;

        const byType = (t: MaterialType) => materials.filter((m) => m.type === t);

        let mergedBoard = createEmptyBoard();
        let mergedCandidates = createEmptyCandidates();
        let mergedSteps: SolutionStep[] = [];
        let puzzleName = '合并题目';
        let puzzleSource = '多材料合并';

        const boardMaterials = byType('board');
        const candidateMaterials = byType('candidates');
        const stepsMaterials = byType('steps');
        const reportMaterials = byType('report');

        for (const bm of boardMaterials) {
          if (bm.data && bm.data.board) {
            const src = bm.data.board as (number | null)[][];
            for (let r = 0; r < 9; r++) {
              for (let c = 0; c < 9; c++) {
                if (src[r][c] !== null && mergedBoard[r][c] === null) {
                  mergedBoard[r][c] = src[r][c];
                }
              }
            }
            if (!puzzleName || puzzleName === '合并题目') {
              puzzleName = bm.data.name || bm.name;
            }
            puzzleSource = [puzzleSource, bm.source].filter((s) => s && s !== '多材料合并').join(' + ');
          }
        }

        if (candidateMaterials.length > 0) {
          for (const cm of candidateMaterials) {
            if (cm.data) {
              const srcCands = cm.data as Set<number>[][];
              for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                  if (mergedBoard[r][c] === null) {
                    if (mergedCandidates[r][c].size === 0) {
                      mergedCandidates[r][c] = new Set(srcCands[r][c]);
                    } else {
                      mergedCandidates[r][c] = new Set(
                        [...mergedCandidates[r][c]].filter((v) => srcCands[r][c].has(v))
                      );
                    }
                  }
                }
              }
            }
          }
        } else {
          mergedCandidates = initializeCandidates(mergedBoard);
        }

        for (const sm of stepsMaterials) {
          if (Array.isArray(sm.data)) {
            mergedSteps = mergedSteps.concat(sm.data as SolutionStep[]);
          }
        }
        mergedSteps.sort((a, b) => a.stepNumber - b.stepNumber);

        const mergedPuzzle: SudokuPuzzle = {
          id: `puzzle-merged-${Date.now()}`,
          name: puzzleName,
          difficulty: 'medium',
          board: mergedBoard,
          initialBoard: cloneBoard(mergedBoard),
          candidates: mergedCandidates,
          source: puzzleSource,
          createdAt: new Date(),
        };

        const allErrors = validateAllSteps(mergedPuzzle, mergedSteps);
        let report = generateCorrectionReport(mergedPuzzle, allErrors, puzzleSource);

        if (reportMaterials.length > 0) {
          const existingNotes = reportMaterials
            .map((rm) => rm.data)
            .filter(Boolean)
            .map((d) => d.summary || d.description || '')
            .filter(Boolean)
            .join('；');
          if (existingNotes) {
            report = {
              ...report,
              sourceMaterial: [report.sourceMaterial, existingNotes].join('；'),
            };
          }
        }

        set((state) => ({
          puzzle: mergedPuzzle,
          steps: mergedSteps,
          errors: allErrors,
          report,
          currentStepIndex: mergedSteps.length > 0 ? mergedSteps.length - 1 : 0,
          isMerging: false,
          sourceMaterial: puzzleSource,
          batches: {
            ...state.batches,
            [state.currentBatchId]: {
              ...state.batches[state.currentBatchId],
              mergedPuzzle,
              mergedSteps,
              mergedErrors: allErrors,
              mergedReport: report,
              isAnalyzed: true,
            },
          },
        }));
      }, 800);
    },

    linkErrorToStep: (errorId, stepId) => {
    },

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
        const allErrors = validateAllSteps(state.puzzle, state.steps);
        set({ errors: allErrors, isAnalyzing: false });
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
        const batchId = get().currentBatchId;
        const boardMat: ImportedMaterial = {
          id: `mock-board-${Date.now()}`,
          type: 'board',
          name: data.puzzle.name,
          source: data.puzzle.source,
          importedAt: new Date(),
          data: data.puzzle,
        };
        const stepsMat: ImportedMaterial = {
          id: `mock-steps-${Date.now()}`,
          type: 'steps',
          name: '解题步骤',
          source: data.puzzle.source,
          importedAt: new Date(),
          data: data.steps,
        };
        const newMaterials = [boardMat, stepsMat];
        set({
          puzzle: clonePuzzle(data.puzzle),
          steps: [...data.steps],
          errors: [...data.errors],
          report: data.report,
          currentStepIndex: data.steps.length - 1,
          sourceMaterial: data.puzzle.source,
          selectedCell: null,
          importedMaterials: newMaterials,
          batches: {
            ...get().batches,
            [batchId]: {
              ...get().batches[batchId],
              materials: newMaterials,
              mergedPuzzle: clonePuzzle(data.puzzle),
              mergedSteps: [...data.steps],
              mergedErrors: [...data.errors],
              mergedReport: data.report,
              isAnalyzed: true,
            },
          },
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

    getCurrentBatch: () => {
      const state = get();
      return state.batches[state.currentBatchId] || null;
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
