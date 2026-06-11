import { create } from 'zustand';
import type { Batch, Sample, CorrectionRecord, PathologyNote, BatchStatus, SampleStatus } from '@/types';
import { mockBatches, mockSamples, getBatchById, getSamplesByBatchId, getSampleById } from '@/data/mockData';

interface AppState {
  batches: Batch[];
  samples: Sample[];
  selectedBatchId: string | null;
  selectedSampleId: string | null;
  importHistory: { timestamp: string; batchId: string; sampleCount: number }[];

  setSelectedBatch: (id: string | null) => void;
  setSelectedSample: (id: string | null) => void;
  updateBatchStatus: (batchId: string, status: BatchStatus) => void;
  updateBatchConclusion: (batchId: string, conclusion: string) => void;
  addPathologyNote: (batchId: string, content: string, author: string) => void;
  correctSampleValue: (
    sampleId: string,
    fieldName: string,
    oldValue: number,
    newValue: number,
    reason: string,
    operator: string
  ) => void;
  markSampleContaminated: (sampleId: string, reason: string, reporter: string) => void;
  unmarkSampleContaminated: (sampleId: string) => void;
  simulateImport: (batchId: string) => { success: boolean; message: string; duplicates: string[] };
  recalculateGroupStats: (batchId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  batches: [...mockBatches],
  samples: [...mockSamples],
  selectedBatchId: null,
  selectedSampleId: null,
  importHistory: [],

  setSelectedBatch: (id) => set({ selectedBatchId: id }),
  setSelectedSample: (id) => set({ selectedSampleId: id }),

  updateBatchStatus: (batchId, status) =>
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id === batchId ? { ...b, status } : b
      ),
    })),

  updateBatchConclusion: (batchId, conclusion) =>
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id === batchId ? { ...b, conclusion } : b
      ),
    })),

  addPathologyNote: (batchId, content, author) => {
    const newNote: PathologyNote = {
      id: `pn-${Date.now()}`,
      batchId,
      content,
      author,
      timestamp: new Date().toLocaleString('zh-CN'),
    };
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id === batchId
          ? { ...b, pathologyNotes: [...b.pathologyNotes, newNote] }
          : b
      ),
    }));
  },

  correctSampleValue: (sampleId, fieldName, oldValue, newValue, reason, operator) => {
    const correction: CorrectionRecord = {
      id: `corr-${Date.now()}`,
      fieldName,
      oldValue,
      newValue,
      reason,
      operator,
      timestamp: new Date().toLocaleString('zh-CN'),
    };

    set((state) => {
      const updatedSamples = state.samples.map((s) => {
        if (s.id !== sampleId) return s;
        const history = s.correctionHistory || [];
        return {
          ...s,
          status: 'corrected' as SampleStatus,
          [fieldName]: newValue,
          correctionHistory: [...history, correction],
        };
      });

      const sample = updatedSamples.find((s) => s.id === sampleId);
      return { samples: updatedSamples };
    });

    const sample = get().samples.find((s) => s.id === sampleId);
    if (sample) {
      get().recalculateGroupStats(sample.batchId);
    }
  },

  markSampleContaminated: (sampleId, reason, _reporter) =>
    set((state) => {
      const updatedSamples = state.samples.map((s) =>
        s.id === sampleId
          ? { ...s, status: 'contaminated' as SampleStatus, contaminationReason: reason }
          : s
      );
      return { samples: updatedSamples };
    }),

  unmarkSampleContaminated: (sampleId) =>
    set((state) => {
      const sample = state.samples.find((s) => s.id === sampleId);
      const hasCorrections = sample?.correctionHistory && sample.correctionHistory.length > 0;
      const updatedSamples = state.samples.map((s) =>
        s.id === sampleId
          ? {
              ...s,
              status: hasCorrections ? ('corrected' as SampleStatus) : ('normal' as SampleStatus),
              contaminationReason: undefined,
            }
          : s
      );
      return { samples: updatedSamples };
    }),

  simulateImport: (batchId) => {
    const state = get();
    const existing = state.samples.filter((s) => s.batchId === batchId);
    const batch = getBatchById(batchId);

    if (!batch) {
      return { success: false, message: '批次不存在', duplicates: [] };
    }

    const duplicateIds = existing.map((s) => s.sampleId);

    const importRecord = {
      timestamp: new Date().toLocaleString('zh-CN'),
      batchId,
      sampleCount: existing.length,
    };

    set((state) => ({
      importHistory: [...state.importHistory, importRecord],
    }));

    return {
      success: true,
      message: `导入完成：发现 ${duplicateIds.length} 条重复记录已跳过，数据保持一致`,
      duplicates: duplicateIds.slice(0, 5),
    };
  },

  recalculateGroupStats: (batchId) => {
    set((state) => {
      const batchSamples = state.samples.filter(
        (s) => s.batchId === batchId && s.status !== 'contaminated'
      );

      const groups = [...new Set(batchSamples.map((s) => s.groupName))];
      const groupStatistics = groups.map((groupName) => {
        const groupSamples = batchSamples.filter((s) => s.groupName === groupName);
        const rates = groupSamples.map((s) => s.survivalRate);
        const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
        const variance = rates.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / rates.length;
        const stdDev = Math.sqrt(variance);

        return {
          groupName,
          sampleCount: groupSamples.length,
          avgSurvivalRate: Math.round(avg * 10) / 10,
          stdDev: Math.round(stdDev * 10) / 10,
          minValue: Math.min(...rates),
          maxValue: Math.max(...rates),
        };
      });

      const validSamples = batchSamples.filter((s) => s.survivalRate > 0);
      const allRates = validSamples.map((s) => s.survivalRate);
      const globalAvg = allRates.length
        ? allRates.reduce((a, b) => a + b, 0) / allRates.length
        : 0;
      const globalVariance = allRates.length
        ? allRates.reduce((sum, r) => sum + Math.pow(r - globalAvg, 2), 0) / allRates.length
        : 0;
      const globalStdDev = Math.sqrt(globalVariance);
      const cv = globalAvg > 0 ? globalStdDev / globalAvg : 0;
      const batchEffectScore = Math.max(0, Math.min(1, 1 - cv));

      return {
        batches: state.batches.map((b) =>
          b.id === batchId
            ? {
                ...b,
                groupStatistics,
                batchEffectScore: Math.round(batchEffectScore * 100) / 100,
              }
            : b
        ),
      };
    });
  },
}));
