import { create } from 'zustand';
import { AppState, UploadedFile, AnalysisResult, TabType, Warning, AnalysisParams } from '@/types';
import { alignData } from '@/utils/dataProcessor';
import {
  calculateCorrelationMatrix,
  calculateLagAnalysis,
  calculateTrendAnalysis,
  generateWarnings
} from '@/utils/correlation';

const defaultParams: AnalysisParams = {
  timeField: '',
  groupFields: [],
  metricFields: [],
  timeRange: { start: null, end: null },
  maxLag: 6,
  correlationThreshold: 0.7,
  trendThreshold: 0.6
};

export const useAppStore = create<AppState & {
  addFile: (file: UploadedFile) => void;
  removeFile: (fileId: string) => void;
  setParams: (params: Partial<AnalysisParams>) => void;
  runAnalysis: () => void;
  setActiveTab: (tab: TabType) => void;
  setSelectedWarning: (warning: Warning | null) => void;
  clearAll: () => void;
  setMockData: (files: UploadedFile[], params: AnalysisParams) => void;
}>((set, get) => ({
  uploadedFiles: [],
  analysisParams: defaultParams,
  analysisResult: null,
  isAnalyzing: false,
  activeTab: 'correlation',
  selectedWarning: null,

  addFile: (file: UploadedFile) => {
    set(state => ({
      uploadedFiles: [...state.uploadedFiles, file]
    }));
  },

  removeFile: (fileId: string) => {
    set(state => ({
      uploadedFiles: state.uploadedFiles.filter(f => f.id !== fileId),
      analysisResult: null
    }));
  },

  setParams: (params: Partial<AnalysisParams>) => {
    set(state => ({
      analysisParams: { ...state.analysisParams, ...params },
      analysisResult: null
    }));
  },

  setMockData: (files: UploadedFile[], params: AnalysisParams) => {
    set({
      uploadedFiles: files,
      analysisParams: params,
      analysisResult: null
    });
  },

  runAnalysis: () => {
    set({ isAnalyzing: true });
    
    setTimeout(() => {
      const state = get();
      const { uploadedFiles, analysisParams } = state;
      
      const alignedData = alignData(uploadedFiles, analysisParams);
      
      if (alignedData.length === 0 || analysisParams.metricFields.length < 2) {
        set({ 
          analysisResult: null, 
          isAnalyzing: false 
        });
        return;
      }
      
      const correlationMatrix = calculateCorrelationMatrix(
        alignedData,
        analysisParams.metricFields,
        analysisParams
      );
      
      const lagResults = calculateLagAnalysis(
        alignedData,
        analysisParams.metricFields,
        analysisParams
      );
      
      const trendResults = calculateTrendAnalysis(
        alignedData,
        analysisParams.metricFields,
        analysisParams
      );
      
      const warnings = generateWarnings(
        correlationMatrix,
        lagResults,
        trendResults,
        alignedData
      );
      
      const result: AnalysisResult = {
        correlationMatrix,
        lagResults,
        trendResults,
        warnings,
        alignedData
      };
      
      set({ 
        analysisResult: result, 
        isAnalyzing: false,
        activeTab: warnings.length > 0 ? 'warnings' : 'correlation'
      });
    }, 500);
  },

  setActiveTab: (tab: TabType) => {
    set({ activeTab: tab });
  },

  setSelectedWarning: (warning: Warning | null) => {
    set({ selectedWarning: warning });
  },

  clearAll: () => {
    set({
      uploadedFiles: [],
      analysisParams: defaultParams,
      analysisResult: null,
      isAnalyzing: false,
      activeTab: 'correlation',
      selectedWarning: null
    });
  }
}));
