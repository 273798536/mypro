import { create } from 'zustand';
import {
  DifferentialAnalysis,
  AnalysisResult,
  ActionableError,
  VolcanoPoint,
} from '../types';
import { getMockData, generateId } from '../utils/mockData';
import { DifferentialAnalysisEngine } from '../services/analysisService';
import { useSampleStore } from './sampleStore';
import { useQCStore } from './qcStore';

interface AnalysisState {
  analyses: DifferentialAnalysis[];
  analysisResults: AnalysisResult[];
  currentAnalysis: DifferentialAnalysis | null;
  isRunning: boolean;
  error: ActionableError | null;

  createAnalysis: (data: Omit<DifferentialAnalysis, 'id' | 'status' | 'createdAt' | 'createdBy'>) => void;
  runAnalysis: (analysisId: string) => Promise<void>;
  getVolcanoData: (analysisId: string) => VolcanoPoint[];
  getSignificantResults: (analysisId: string) => AnalysisResult[];
  clearError: () => void;
  retryAnalysis: (analysisId: string, skipValidation?: boolean) => Promise<void>;
}

const mockData = getMockData();

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  analyses: [mockData.analysis],
  analysisResults: mockData.analysisResults,
  currentAnalysis: null,
  isRunning: false,
  error: null,

  createAnalysis: (data) => {
    const { currentUser } = useSampleStore.getState();
    const newAnalysis: DifferentialAnalysis = {
      ...data,
      id: generateId(),
      status: 'pending',
      createdAt: new Date(),
      createdBy: currentUser,
    };
    set(state => ({
      analyses: [...state.analyses, newAnalysis],
      currentAnalysis: newAnalysis,
    }));
  },

  runAnalysis: async (analysisId) => {
    set({ isRunning: true, error: null });
    const analysis = get().analyses.find(a => a.id === analysisId);
    if (!analysis) {
      set({ isRunning: false });
      return;
    }

    const { groups, samples } = useSampleStore.getState();
    const { qcRecords } = useQCStore.getState();

    const result = await DifferentialAnalysisEngine.runAnalysis(
      analysis,
      groups,
      samples,
      qcRecords
    );

    if (!result.success && result.error) {
      set({
        isRunning: false,
        error: result.error,
        analyses: get().analyses.map(a =>
          a.id === analysisId
            ? { ...a, status: 'failed', errorMessage: result.error.title }
            : a
        ),
      });
      return;
    }

    if (result.results) {
      set(state => ({
        isRunning: false,
        analysisResults: [...state.analysisResults, ...result.results!],
        analyses: state.analyses.map(a =>
          a.id === analysisId
            ? { ...a, status: 'completed', completedAt: new Date() }
            : a
        ),
      }));
    }
  },

  getVolcanoData: (analysisId) => {
    const { analysisResults } = get();
    const { samples } = useSampleStore.getState();
    const results = analysisResults.filter(r => r.analysisId === analysisId);

    return results.map(result => {
      const sample = samples.find(s => s.id === result.sampleId);
      let color = '#9CA3AF';
      if (result.isSignificant) {
        color = result.log2FoldChange > 0 ? '#10B981' : '#EF4444';
      }

      return {
        sampleId: result.sampleId,
        sampleName: sample?.name || result.sampleId,
        x: result.log2FoldChange,
        y: -Math.log10(result.adjustedPValue),
        color,
        regulation: result.regulation,
        isSignificant: result.isSignificant,
      };
    });
  },

  getSignificantResults: (analysisId) => {
    return get().analysisResults.filter(
      r => r.analysisId === analysisId && r.isSignificant
    );
  },

  clearError: () => {
    set({ error: null });
  },

  retryAnalysis: async (analysisId, skipValidation = false) => {
    if (skipValidation) {
      const { samples } = useSampleStore.getState();
      const failedSamples = samples.filter(s => s.status === 'reviewing');
      const updatedSamples = failedSamples.map(s => ({
        ...s,
        invalidReason: s.invalidReason ? s.invalidReason + '; 跳过校验继续分析' : '跳过校验继续分析',
      }));

      useSampleStore.setState({
        samples: samples.map(s => {
          const updated = updatedSamples.find(u => u.id === s.id);
          return updated || s;
        }),
      });
    }

    await get().runAnalysis(analysisId);
  },
}));
