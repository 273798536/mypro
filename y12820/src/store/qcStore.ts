import { create } from 'zustand';
import { QCRecord, QCThresholds, FilterResult, TraceNode } from '../types';
import { getMockData } from '../utils/mockData';
import { LowQualityReadFilter, SourceTracingService } from '../services/qcService';
import { useSampleStore } from './sampleStore';

interface QCState {
  qcRecords: QCRecord[];
  thresholds: QCThresholds;
  filterResults: Map<string, FilterResult>;
  isFiltering: boolean;

  runQualityFilter: () => Map<string, FilterResult>;
  updateThresholds: (thresholds: Partial<QCThresholds>) => void;
  getQCRecordForSample: (sampleId: string) => QCRecord | undefined;
  getTraceChain: (sampleId: string) => TraceNode[];
  getLowQualitySamples: () => QCRecord[];
  getQualityStats: () => {
    total: number;
    passed: number;
    failed: number;
    avgScore: number;
  };
}

const mockData = getMockData();

export const useQCStore = create<QCState>((set, get) => ({
  qcRecords: mockData.qcRecords,
  thresholds: LowQualityReadFilter.DEFAULT_THRESHOLDS,
  filterResults: new Map(),
  isFiltering: false,

  runQualityFilter: () => {
    set({ isFiltering: true });
    const { samples } = useSampleStore.getState();
    const { qcRecords, thresholds } = get();

    const results = LowQualityReadFilter.batchFilter(samples, qcRecords, thresholds);

    const updatedRecords = qcRecords.map(record => {
      const result = results.get(record.sampleId);
      if (result) {
        return {
          ...record,
          isLowQuality: !result.passed,
          filterReasons: result.reasons,
        };
      }
      return record;
    });

    set({
      qcRecords: updatedRecords,
      filterResults: results,
      isFiltering: false,
    });

    return results;
  },

  updateThresholds: (newThresholds) => {
    set(state => ({
      thresholds: { ...state.thresholds, ...newThresholds },
    }));
  },

  getQCRecordForSample: (sampleId) => {
    return get().qcRecords.find(q => q.sampleId === sampleId);
  },

  getTraceChain: (sampleId) => {
    const { samples, manualCorrections } = useSampleStore.getState();
    const { qcRecords } = get();
    const { analysisResults } = useAnalysisStore.getState();

    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return [];

    const qcRecord = qcRecords.find(q => q.sampleId === sampleId);
    const corrections = manualCorrections.filter(c => c.sampleId === sampleId);
    const analysisResult = analysisResults.find(r => r.sampleId === sampleId);

    return SourceTracingService.buildTraceChain(sample, qcRecord, corrections, analysisResult);
  },

  getLowQualitySamples: () => {
    return get().qcRecords.filter(q => q.isLowQuality);
  },

  getQualityStats: () => {
    const { qcRecords } = get();
    const total = qcRecords.length;
    const passed = qcRecords.filter(q => !q.isLowQuality).length;
    const failed = total - passed;
    const avgScore = total > 0
      ? qcRecords.reduce((sum, q) => sum + q.qcScore, 0) / total
      : 0;

    return { total, passed, failed, avgScore };
  },
}));

import { useAnalysisStore } from './analysisStore';
