import { create } from 'zustand';
import {
  AppState,
  AppActions,
  DEFAULT_CONFIG,
  DEFAULT_FIELD_MAPPING,
  PageType,
  AnomalyType,
} from '@/types';
import { runFullAnalysis } from '@/utils/analysisService';

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set, get) => ({
  rawData: [],
  fieldMapping: DEFAULT_FIELD_MAPPING,
  analysisResult: null,
  fileInfo: null,
  currentPage: 'upload',
  selectedCategory: null,
  anomalyFilters: new Set<AnomalyType>(),
  isAnalyzing: false,
  uploadProgress: 0,
  config: DEFAULT_CONFIG,
  isDemoMode: false,

  setRawData: (data) => set({ rawData: data }),
  setFieldMapping: (mapping) => set({ fieldMapping: mapping }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setFileInfo: (info) => set({ fileInfo: info }),
  setCurrentPage: (page: PageType) => set({ currentPage: page }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  toggleAnomalyFilter: (type: AnomalyType) => {
    const current = get().anomalyFilters;
    const newSet = new Set(current);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    set({ anomalyFilters: newSet });
  },
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setConfig: (partialConfig) => set((state) => ({
    config: { ...state.config, ...partialConfig },
  })),
  setIsDemoMode: (isDemo) => set({ isDemoMode: isDemo }),

  resetAll: () => set({
    rawData: [],
    fieldMapping: DEFAULT_FIELD_MAPPING,
    analysisResult: null,
    fileInfo: null,
    currentPage: 'upload',
    selectedCategory: null,
    anomalyFilters: new Set(),
    isAnalyzing: false,
    uploadProgress: 0,
    isDemoMode: false,
  }),

  runAnalysis: () => {
    const { rawData, config } = get();

    if (rawData.length === 0) {
      console.warn('没有数据可分析');
      return;
    }

    set({ isAnalyzing: true });

    try {
      const result = runFullAnalysis(rawData, config);
      set({
        analysisResult: result,
        isAnalyzing: false,
        currentPage: 'analysis',
      });
    } catch (error) {
      console.error('分析失败:', error);
      set({ isAnalyzing: false });
      throw error;
    }
  },
}));

export const useRawData = () => useAppStore(state => state.rawData);
export const useAnalysisResult = () => useAppStore(state => state.analysisResult);
export const useCurrentPage = () => useAppStore(state => state.currentPage);
export const useIsAnalyzing = () => useAppStore(state => state.isAnalyzing);
export const useConfig = () => useAppStore(state => state.config);
export const useFileInfo = () => useAppStore(state => state.fileInfo);
export const useAnomalyFilters = () => useAppStore(state => state.anomalyFilters);
export const useSelectedCategory = () => useAppStore(state => state.selectedCategory);
export const useIsDemoMode = () => useAppStore(state => state.isDemoMode);
export const useFieldMapping = () => useAppStore(state => state.fieldMapping);
export const useUploadProgress = () => useAppStore(state => state.uploadProgress);
