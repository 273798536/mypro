import { create } from 'zustand';
import type { BatchReport, FunctionalGroup, SupplementaryInfo, ConcentrationPoint, RunRecord, ExportRecord, ParseResult } from '../../shared/types';
import { sampleBatchReport } from '../data/mockData';

interface BatchState {
  currentBatch: BatchReport;
  parseResult: ParseResult | null;
  isLoading: boolean;
  currentRunParams: string;

  loadSampleData: () => void;
  setParseResult: (result: ParseResult) => void;
  setBatchName: (name: string) => void;
  confirmAnnotation: (id: string, confirmed: boolean, user?: string) => void;
  updateAnnotation: (id: string, updates: Partial<FunctionalGroup>) => void;
  addManualAnnotation: (annotation: Omit<FunctionalGroup, 'id' | 'confirmed' | 'isManualAdd'>) => void;
  deleteAnnotation: (id: string) => void;
  updateSupplementaryInfo: (info: Partial<SupplementaryInfo>) => void;
  runAnalysis: (params: string, triggeredBy?: string) => void;
  recalculateConcentrations: () => void;
  addExportRecord: (record: ExportRecord) => void;
  setBatchData: (data: BatchReport) => void;
}

function uid() {
  return 'id-' + Math.random().toString(36).slice(2, 10);
}

export const useBatchStore = create<BatchState>((set, get) => ({
  currentBatch: sampleBatchReport,
  parseResult: null,
  isLoading: false,
  currentRunParams: '默认参数',

  loadSampleData: () => {
    set({ currentBatch: JSON.parse(JSON.stringify(sampleBatchReport)) });
  },

  setParseResult: (result) => {
    set({ parseResult: result });
    if (result.success && result.data.length > 0) {
      set((state) => ({
        currentBatch: {
          ...state.currentBatch,
          spectrumData: result.data,
          parseWarnings: result.warnings,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
  },

  setBatchName: (name) => {
    set((state) => ({
      currentBatch: { ...state.currentBatch, batchName: name, updatedAt: new Date().toISOString() },
    }));
  },

  confirmAnnotation: (id, confirmed, user = '当前用户') => {
    set((state) => ({
      currentBatch: {
        ...state.currentBatch,
        updatedAt: new Date().toISOString(),
        annotations: state.currentBatch.annotations.map((a) =>
          a.id === id
            ? {
                ...a,
                confirmed,
                confirmedBy: confirmed ? user : undefined,
                confirmedAt: confirmed ? new Date().toISOString() : undefined,
              }
            : a
        ),
      },
    }));
  },

  updateAnnotation: (id, updates) => {
    set((state) => ({
      currentBatch: {
        ...state.currentBatch,
        updatedAt: new Date().toISOString(),
        annotations: state.currentBatch.annotations.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      },
    }));
  },

  addManualAnnotation: (annotation) => {
    const newAnn: FunctionalGroup = {
      ...annotation,
      id: uid(),
      confirmed: false,
      isManualAdd: true,
    };
    set((state) => ({
      currentBatch: {
        ...state.currentBatch,
        updatedAt: new Date().toISOString(),
        annotations: [...state.currentBatch.annotations, newAnn],
      },
    }));
  },

  deleteAnnotation: (id) => {
    set((state) => ({
      currentBatch: {
        ...state.currentBatch,
        updatedAt: new Date().toISOString(),
        annotations: state.currentBatch.annotations.filter((a) => a.id !== id),
      },
    }));
  },

  updateSupplementaryInfo: (info) => {
    set((state) => ({
      currentBatch: {
        ...state.currentBatch,
        updatedAt: new Date().toISOString(),
        supplementaryInfo: { ...state.currentBatch.supplementaryInfo, ...info },
      },
    }));
  },

  runAnalysis: (params, triggeredBy = '当前用户') => {
    set({ isLoading: true, currentRunParams: params });
    setTimeout(() => {
      const newRun: RunRecord = {
        runId: get().currentBatch.runHistory.length + 1,
        runAt: new Date().toISOString(),
        parameters: params,
        status: 'success',
        triggeredBy,
        note: params.includes('补录') ? '补录信息已纳入计算' : undefined,
      };
      set((state) => ({
        isLoading: false,
        currentBatch: {
          ...state.currentBatch,
          updatedAt: new Date().toISOString(),
          runHistory: [...state.currentBatch.runHistory, newRun],
        },
      }));
      get().recalculateConcentrations();
    }, 1200);
  },

  recalculateConcentrations: () => {
    set((state) => {
      const comparisons: ConcentrationPoint[] = state.currentBatch.concentrationComparisons.map((c) => {
        if (c.before.value === null) return c;
        const factor = 1 + (Math.random() - 0.3) * 0.25;
        const newValue = Number((c.before.value * factor).toFixed(2));
        const changed = Math.abs(newValue - c.before.value) / c.before.value > 0.05;
        const jBefore = c.before.judgment;
        let jAfter = jBefore;
        if (changed && newValue > c.before.value * 1.1) jAfter = jBefore === '痕量' ? '偏高，建议关注' : jBefore === '偏低' ? '正常范围' : '偏高';
        if (changed && newValue < c.before.value * 0.9) jAfter = jBefore === '正常范围' ? '偏低' : jBefore;
        return {
          ...c,
          after: { ...c.after, value: newValue },
          changed,
          before: { ...c.before, judgment: jBefore },
        };
      });
      return {
        currentBatch: {
          ...state.currentBatch,
          concentrationComparisons: comparisons,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  addExportRecord: (record) => {
    set((state) => ({
      currentBatch: {
        ...state.currentBatch,
        updatedAt: new Date().toISOString(),
        exportHistory: [...state.currentBatch.exportHistory, record],
      },
    }));
  },

  setBatchData: (data) => {
    set({ currentBatch: data });
  },
}));
