import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Experiment, ExperimentConfig, BatchJob, IterationResult, ExperimentStatus, ErrorType } from '@/types';
import { storage } from '@/utils/storage';

interface FractalState {
  currentExperiment: Experiment | null;
  history: Experiment[];
  batchJobs: BatchJob[];
  currentStep: number;
  currentPoints: IterationResult | null;
  selectedHistoryIds: string[];
  compareMode: boolean;

  createExperiment: (config: Partial<ExperimentConfig>, name?: string) => Experiment;
  setCurrentExperiment: (experiment: Experiment | null) => void;
  updateCurrentConfig: (config: Partial<ExperimentConfig>) => void;
  startExperiment: () => void;
  completeExperiment: (success: boolean, errorType?: string, errorMessage?: string, dimension?: number) => void;
  addIterationResult: (result: IterationResult) => void;
  setCurrentStep: (step: number) => void;
  setCurrentPoints: (points: IterationResult | null) => void;
  saveToHistory: (experiment: Experiment) => void;
  loadExperiment: (id: string) => Experiment | undefined;
  deleteExperiment: (id: string) => void;
  clearHistory: () => void;
  createBatchJob: (name: string, experiments: Experiment[]) => BatchJob;
  updateBatchJob: (id: string, updates: Partial<BatchJob>) => void;
  deleteBatchJob: (id: string) => void;
  toggleHistorySelection: (id: string) => void;
  clearSelection: () => void;
  setCompareMode: (enabled: boolean) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const defaultConfig: ExperimentConfig = {
  iterationRule: 'koch',
  initialShape: 'koch',
  colorScheme: {
    stroke: '#0A2463',
    fill: 'transparent',
    background: '#F8F9FA',
  },
  maxIterations: 4,
  zoomLevel: 1,
  note: '',
};

export const useFractalStore = create<FractalState>()(
  persist(
    (set, get) => ({
      currentExperiment: null,
      history: storage.loadExperiments(),
      batchJobs: storage.loadBatchJobs(),
      currentStep: 0,
      currentPoints: null,
      selectedHistoryIds: [],
      compareMode: false,

      createExperiment: (config: Partial<ExperimentConfig>, name?: string) => {
        const experiment: Experiment = {
          id: generateId(),
          name: name || `实验 ${new Date().toLocaleString()}`,
          config: { ...defaultConfig, ...config },
          status: 'idle',
          results: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set({ currentExperiment: experiment });
        return experiment;
      },

      setCurrentExperiment: (experiment) => set({ currentExperiment: experiment }),

      updateCurrentConfig: (config) =>
        set((state) => {
          if (!state.currentExperiment) return state;
          return {
            currentExperiment: {
              ...state.currentExperiment,
              config: { ...state.currentExperiment.config, ...config },
              updatedAt: new Date(),
            },
          };
        }),

      startExperiment: () =>
        set((state) => {
          if (!state.currentExperiment) return state;
          return {
            currentExperiment: {
              ...state.currentExperiment,
              status: 'running',
              results: [],
              updatedAt: new Date(),
            },
            currentStep: 0,
            currentPoints: null,
          };
        }),

      completeExperiment: (success: boolean, errorType?: string, errorMessage?: string, dimension?: number) =>
        set((state) => {
          if (!state.currentExperiment) return state;
          const updated: Experiment = {
            ...state.currentExperiment,
            status: (success ? 'success' : 'failed') as ExperimentStatus,
            errorType: errorType as ErrorType | undefined,
            errorMessage,
            fractalDimension: dimension,
            updatedAt: new Date(),
          };
          return { currentExperiment: updated };
        }),

      addIterationResult: (result) =>
        set((state) => {
          if (!state.currentExperiment) return state;
          return {
            currentExperiment: {
              ...state.currentExperiment,
              results: [...state.currentExperiment.results, result],
            },
          };
        }),

      setCurrentStep: (step) => set({ currentStep: step }),

      setCurrentPoints: (points) => set({ currentPoints: points }),

      saveToHistory: (experiment) =>
        set((state) => {
          const existingIndex = state.history.findIndex((e) => e.id === experiment.id);
          let newHistory;
          if (existingIndex >= 0) {
            newHistory = [...state.history];
            newHistory[existingIndex] = experiment;
          } else {
            newHistory = [experiment, ...state.history];
          }
          storage.saveExperiments(newHistory);
          return { history: newHistory };
        }),

      loadExperiment: (id) => {
        const experiment = get().history.find((e) => e.id === id);
        if (experiment) {
          set({ currentExperiment: { ...experiment } });
        }
        return experiment;
      },

      deleteExperiment: (id) =>
        set((state) => {
          const newHistory = state.history.filter((e) => e.id !== id);
          storage.saveExperiments(newHistory);
          return { history: newHistory };
        }),

      clearHistory: () => {
        storage.clearAll();
        set({ history: [], batchJobs: [] });
      },

      createBatchJob: (name, experiments) => {
        const job: BatchJob = {
          id: generateId(),
          name,
          experiments,
          status: 'pending',
          progress: 0,
        };
        set((state) => {
          const newJobs = [job, ...state.batchJobs];
          storage.saveBatchJobs(newJobs);
          return { batchJobs: newJobs };
        });
        return job;
      },

      updateBatchJob: (id, updates) =>
        set((state) => {
          const newJobs = state.batchJobs.map((j) =>
            j.id === id ? { ...j, ...updates } : j
          );
          storage.saveBatchJobs(newJobs);
          return { batchJobs: newJobs };
        }),

      deleteBatchJob: (id) =>
        set((state) => {
          const newJobs = state.batchJobs.filter((j) => j.id !== id);
          storage.saveBatchJobs(newJobs);
          return { batchJobs: newJobs };
        }),

      toggleHistorySelection: (id) =>
        set((state) => {
          const isSelected = state.selectedHistoryIds.includes(id);
          return {
            selectedHistoryIds: isSelected
              ? state.selectedHistoryIds.filter((i) => i !== id)
              : [...state.selectedHistoryIds, id],
          };
        }),

      clearSelection: () => set({ selectedHistoryIds: [] }),

      setCompareMode: (enabled) => set({ compareMode: enabled }),
    }),
    {
      name: 'fractal-store',
      partialize: (state) => ({
        history: state.history,
        batchJobs: state.batchJobs,
      }),
    }
  )
);
