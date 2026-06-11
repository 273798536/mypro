import { create } from 'zustand';
import type {
  AppState,
  Sample,
  CultureRecord,
  ReviewRound,
  ReviewOpinion,
  FinalConclusion,
  DuplicateLog,
  ActiveFilters,
  ChartData,
  ExportData,
  SampleStatus,
  ConclusionResult,
  UserRole,
} from '../types';
import { generateDemoData } from '../data/mockData';

const STORAGE_KEY = 'ethics-review-store';

interface EthicsStore extends AppState {
  setFilters: (filters: Partial<ActiveFilters>) => void;
  resetFilters: () => void;
  setUserRole: (role: UserRole) => void;
  loadDemoData: () => void;
  markVisited: () => void;
  setHighlightedElement: (id: string | null) => void;
  setCurrentReviewBatch: (batchId: string | null) => void;

  updateSamplingLocation: (sampleId: string, newLocation: string) => void;
  submitReviewRound: (params: {
    sampleId: string;
    opinionContent: string;
    missingTimePoints: string[];
    conclusionResult: ConclusionResult;
    linkedCultureRecordId: string | null;
    cultureRecordUpdates: { id: string; isMissing: boolean }[];
  }) => void;
  resolveDuplicate: (duplicateId: string, resolution: 'merged' | 'removed') => void;
  updateSampleStatus: (sampleId: string, status: SampleStatus) => void;

  getFilteredSamples: () => Sample[];
  getChartData: () => ChartData;
  getExportData: () => ExportData;
  getSampleById: (id: string) => Sample | undefined;
  getCultureRecordsBySampleId: (sampleId: string) => CultureRecord[];
  getReviewRoundsBySampleId: (sampleId: string) => ReviewRound[];
  getReviewOpinionByRoundId: (roundId: string) => ReviewOpinion | undefined;
  getFinalConclusionByRoundId: (roundId: string) => FinalConclusion | undefined;
  getDuplicatesBySampleId: (sampleId: string) => DuplicateLog[];

  detectDuplicates: () => DuplicateLog[];
  persist: () => void;
}

const getInitialState = (): AppState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }

  return {
    samples: [],
    cultureRecords: [],
    reviewRounds: [],
    reviewOpinions: [],
    finalConclusions: [],
    duplicateLogs: [],
    activeFilters: {},
    currentUser: {
      role: 'teacher',
      name: '李老师',
    },
    hasVisitedBefore: false,
    highlightedElementId: null,
    currentReviewBatch: 'BATCH-2026-06A',
  };
};

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useEthicsStore = create<EthicsStore>((set, get) => ({
  ...getInitialState(),

  setFilters: (filters) => {
    set((state) => ({
      activeFilters: { ...state.activeFilters, ...filters },
    }));
    get().persist();
  },

  resetFilters: () => {
    set({ activeFilters: {} });
    get().persist();
  },

  setUserRole: (role) => {
    const names: Record<UserRole, string> = {
      teacher: '李老师',
      supervisor: '王教授',
    };
    set({
      currentUser: { role, name: names[role] },
    });
    get().persist();
  },

  loadDemoData: () => {
    const demoData = generateDemoData();
    set({
      samples: demoData.samples,
      cultureRecords: demoData.cultureRecords,
      reviewRounds: demoData.reviewRounds,
      reviewOpinions: demoData.reviewOpinions,
      finalConclusions: demoData.finalConclusions,
      duplicateLogs: demoData.duplicateLogs,
    });
    get().persist();
  },

  markVisited: () => {
    set({ hasVisitedBefore: true });
    get().persist();
  },

  setHighlightedElement: (id) => {
    set({ highlightedElementId: id });
  },

  setCurrentReviewBatch: (batchId) => {
    set({ currentReviewBatch: batchId });
    get().persist();
  },

  updateSamplingLocation: (sampleId, newLocation) => {
    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === sampleId
          ? { ...s, samplingLocation: newLocation, updatedAt: new Date().toISOString() }
          : s
      ),
    }));
    get().persist();
    get().detectDuplicates();
  },

  submitReviewRound: ({
    sampleId,
    opinionContent,
    missingTimePoints,
    conclusionResult,
    linkedCultureRecordId,
    cultureRecordUpdates,
  }) => {
    const state = get();
    const existingRounds = state.getReviewRoundsBySampleId(sampleId);
    const nextRoundNumber = existingRounds.length > 0
      ? Math.max(...existingRounds.map((r) => r.roundNumber)) + 1
      : 1;

    const roundId = generateId();

    const newRound: ReviewRound = {
      id: roundId,
      sampleId,
      roundNumber: nextRoundNumber,
      reviewer: state.currentUser.name,
      reviewDate: new Date().toISOString(),
      status: 'finalized',
    };

    const newOpinion: ReviewOpinion = {
      id: generateId(),
      reviewRoundId: roundId,
      content: opinionContent,
      missingTimePoints,
      createdAt: new Date().toISOString(),
    };

    const newConclusion: FinalConclusion = {
      id: generateId(),
      reviewRoundId: roundId,
      result: conclusionResult,
      linkedCultureRecordId,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      reviewRounds: [...s.reviewRounds, newRound],
      reviewOpinions: [...s.reviewOpinions, newOpinion],
      finalConclusions: [...s.finalConclusions, newConclusion],
      cultureRecords: s.cultureRecords.map((cr) => {
        const update = cultureRecordUpdates.find((u) => u.id === cr.id);
        if (update) {
          return { ...cr, isMissing: update.isMissing };
        }
        if (cr.id === linkedCultureRecordId) {
          return { ...cr, linkedConclusionId: newConclusion.id };
        }
        return cr;
      }),
      samples: s.samples.map((s) =>
        s.id === sampleId
          ? {
              ...s,
              status: conclusionResult === 'pass' ? 'approved' : conclusionResult === 'fail' ? 'rejected' : 'reviewing',
              updatedAt: new Date().toISOString(),
            }
          : s
      ),
    }));

    get().persist();
  },

  resolveDuplicate: (duplicateId, resolution) => {
    set((state) => {
      const duplicate = state.duplicateLogs.find((d) => d.id === duplicateId);
      if (!duplicate) return state;

      let updatedSamples = [...state.samples];
      if (resolution === 'removed' && duplicate.sampleIds.length > 1) {
        const keepId = duplicate.sampleIds[0];
        updatedSamples = updatedSamples.map((s) =>
          duplicate.sampleIds.includes(s.id) && s.id !== keepId
            ? { ...s, status: 'duplicate' as const }
            : s
        );
      } else if (resolution === 'merged') {
        updatedSamples = updatedSamples.map((s) =>
          duplicate.sampleIds.includes(s.id) && s.id !== duplicate.sampleIds[0]
            ? { ...s, status: 'approved' as const }
            : s
        );
      }

      return {
        duplicateLogs: state.duplicateLogs.map((d) =>
          d.id === duplicateId ? { ...d, resolution } : d
        ),
        samples: updatedSamples,
      };
    });
    get().persist();
  },

  updateSampleStatus: (sampleId, status) => {
    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === sampleId ? { ...s, status, updatedAt: new Date().toISOString() } : s
      ),
    }));
    get().persist();
  },

  getFilteredSamples: () => {
    const state = get();
    const { samples, activeFilters } = state;

    return samples.filter((sample) => {
      if (activeFilters.batchNumber && sample.batchNumber !== activeFilters.batchNumber) {
        return false;
      }
      if (activeFilters.samplingLocation && sample.samplingLocation !== activeFilters.samplingLocation) {
        return false;
      }
      if (activeFilters.status && sample.status !== activeFilters.status) {
        return false;
      }
      if (activeFilters.startDate) {
        const sampleDate = new Date(sample.createdAt);
        const startDate = new Date(activeFilters.startDate);
        if (sampleDate < startDate) return false;
      }
      if (activeFilters.endDate) {
        const sampleDate = new Date(sample.createdAt);
        const endDate = new Date(activeFilters.endDate);
        if (sampleDate > endDate) return false;
      }
      return true;
    });
  },

  getChartData: () => {
    const filteredSamples = get().getFilteredSamples();

    const total = filteredSamples.length;
    const approved = filteredSamples.filter((s) => s.status === 'approved').length;
    const passRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    const locationMap = new Map<string, number>();
    filteredSamples.forEach((s) => {
      const current = locationMap.get(s.samplingLocation) || 0;
      locationMap.set(s.samplingLocation, current + 1);
    });
    const locationData = Array.from(locationMap.entries()).map(([name, value]) => ({
      name: name.length > 8 ? name.substring(0, 8) + '...' : name,
      value,
    }));

    const statusMap = new Map<SampleStatus, number>();
    filteredSamples.forEach((s) => {
      const current = statusMap.get(s.status) || 0;
      statusMap.set(s.status, current + 1);
    });

    const colorMap: Record<SampleStatus, string> = {
      pending: '#9CA3AF',
      reviewing: '#F59E0B',
      approved: '#10B981',
      rejected: '#EC4899',
      duplicate: '#EF4444',
    };

    const labelMap: Record<SampleStatus, string> = {
      pending: '待核对',
      reviewing: '复核中',
      approved: '已通过',
      rejected: '已驳回',
      duplicate: '重复记录',
    };

    const anomalyData = Array.from(statusMap.entries())
      .filter(([status]) => status !== 'approved')
      .map(([name, value]) => ({
        name: labelMap[name],
        value,
        color: colorMap[name],
      }));

    return {
      passRate,
      locationData,
      anomalyData,
    };
  },

  getExportData: () => {
    const filteredSamples = get().getFilteredSamples();
    const filteredIds = new Set(filteredSamples.map((s) => s.id));

    const state = get();
    return {
      samples: filteredSamples,
      cultureRecords: state.cultureRecords.filter((cr) => filteredIds.has(cr.sampleId)),
      reviewOpinions: state.reviewOpinions.filter((op) => {
        const round = state.reviewRounds.find((r) => r.id === op.reviewRoundId);
        return round && filteredIds.has(round.sampleId);
      }),
      finalConclusions: state.finalConclusions.filter((fc) => {
        const round = state.reviewRounds.find((r) => r.id === fc.reviewRoundId);
        return round && filteredIds.has(round.sampleId);
      }),
    };
  },

  getSampleById: (id) => {
    return get().samples.find((s) => s.id === id);
  },

  getCultureRecordsBySampleId: (sampleId) => {
    return get().cultureRecords.filter((cr) => cr.sampleId === sampleId);
  },

  getReviewRoundsBySampleId: (sampleId) => {
    return get().reviewRounds.filter((r) => r.sampleId === sampleId);
  },

  getReviewOpinionByRoundId: (roundId) => {
    return get().reviewOpinions.find((op) => op.reviewRoundId === roundId);
  },

  getFinalConclusionByRoundId: (roundId) => {
    return get().finalConclusions.find((fc) => fc.reviewRoundId === roundId);
  },

  getDuplicatesBySampleId: (sampleId) => {
    return get().duplicateLogs.filter((d) => d.sampleIds.includes(sampleId));
  },

  detectDuplicates: () => {
    const state = get();
    const { samples } = state;
    const newDuplicates: DuplicateLog[] = [];

    const barcodeGroups = new Map<string, Sample[]>();
    samples.forEach((s) => {
      const group = barcodeGroups.get(s.barcode) || [];
      group.push(s);
      barcodeGroups.set(s.barcode, group);
    });

    const existingBarcodes = new Set(
      state.duplicateLogs.filter((d) => d.duplicateType === 'barcode').map((d) => d.sampleBarcode)
    );

    barcodeGroups.forEach((group, barcode) => {
      if (group.length > 1 && !existingBarcodes.has(barcode)) {
        newDuplicates.push({
          id: generateId(),
          sampleBarcode: barcode,
          duplicateType: 'barcode',
          detectedAt: new Date().toISOString(),
          resolution: 'pending',
          sampleIds: group.map((s) => s.id),
        });
      }
    });

    if (newDuplicates.length > 0) {
      set((s) => ({
        duplicateLogs: [...s.duplicateLogs, ...newDuplicates],
      }));
      get().persist();
    }

    return [...state.duplicateLogs, ...newDuplicates];
  },

  persist: () => {
    const state = get();
    const { highlightedElementId, ...persistable } = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch {
      // ignore quota errors
    }
  },
}));

export function useEthicsData() {
  const getFilteredSamples = useEthicsStore((s) => s.getFilteredSamples);
  const getChartData = useEthicsStore((s) => s.getChartData);
  const getExportData = useEthicsStore((s) => s.getExportData);
  const rawState = useEthicsStore();

  return {
    samples: getFilteredSamples(),
    chartData: getChartData(),
    exportData: getExportData(),
    rawState,
  };
}

export function useFirstVisitExperience() {
  const hasVisitedBefore = useEthicsStore((s) => s.hasVisitedBefore);
  const loadDemoData = useEthicsStore((s) => s.loadDemoData);
  const markVisited = useEthicsStore((s) => s.markVisited);
  const samples = useEthicsStore((s) => s.samples);

  if (!hasVisitedBefore && samples.length === 0) {
    loadDemoData();
    markVisited();
  }

  return { isFirstVisit: !hasVisitedBefore };
}
