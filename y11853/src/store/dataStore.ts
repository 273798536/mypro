import { create } from 'zustand';
import type { Asset } from '../types/asset';
import type { AnalysisResult, RunType } from '../types/analysis';

interface DataState {
  firstRunAssets: Asset[];
  secondRunAssets: Asset[];
  firstRunResult: AnalysisResult | null;
  secondRunResult: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  
  setFirstRunAssets: (assets: Asset[]) => void;
  setSecondRunAssets: (assets: Asset[]) => void;
  setFirstRunResult: (result: AnalysisResult | null) => void;
  setSecondRunResult: (result: AnalysisResult | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetAll: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  firstRunAssets: [],
  secondRunAssets: [],
  firstRunResult: null,
  secondRunResult: null,
  isLoading: false,
  error: null,
  
  setFirstRunAssets: (assets) => set({ firstRunAssets: assets }),
  setSecondRunAssets: (assets) => set({ secondRunAssets: assets }),
  setFirstRunResult: (result) => set({ firstRunResult: result }),
  setSecondRunResult: (result) => set({ secondRunResult: result }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  resetAll: () => set({
    firstRunAssets: [],
    secondRunAssets: [],
    firstRunResult: null,
    secondRunResult: null,
    isLoading: false,
    error: null,
  }),
}));

export const selectActiveAssets = (state: DataState, activeRun: RunType | 'comparison'): Asset[] => {
  if (activeRun === 'first' || activeRun === 'comparison') {
    return state.firstRunAssets;
  }
  return state.secondRunAssets;
};

export const selectActiveResult = (state: DataState, activeRun: RunType | 'comparison'): AnalysisResult | null => {
  if (activeRun === 'first' || activeRun === 'comparison') {
    return state.firstRunResult;
  }
  return state.secondRunResult;
};
