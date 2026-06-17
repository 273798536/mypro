import { create } from 'zustand';
import type { AppState, FilterCriteria, PageSummary, Sample, ScoreRecord, Attachment, Conclusion, TimelineEvent, ModelComparison, ExportState } from '@/types';
import { DEFAULT_FILTERS, SEGMENTS, MODEL_VERSIONS } from '@/types';
import { getMockData } from '@/data/mockData';
import { checkSampleReferences, generateTimeline, checkDataIntegrityStatus } from '@/services/integrityService';
import { compareModels } from '@/services/modelComparison';
import { exportToPDF, exportToExcel } from '@/services/exportService';

const mockData = getMockData();

const filterSamples = (samples: Sample[], filters: FilterCriteria): Sample[] => {
  return samples.filter(sample => {
    const applyDate = new Date(sample.applyDate);
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    if (applyDate < startDate || applyDate > endDate) return false;

    if (filters.minScore !== null && sample.latestScore < filters.minScore) return false;
    if (filters.maxScore !== null && sample.latestScore > filters.maxScore) return false;

    if (filters.modelVersion !== 'all' && sample.modelVersion !== filters.modelVersion) return false;

    if (filters.segments.length > 0 && !filters.segments.includes(sample.segmentId)) return false;

    if (filters.status !== 'all' && sample.status !== filters.status) return false;

    return true;
  });
};

const calculatePageSummary = (samples: Sample[], filters: FilterCriteria): PageSummary => {
  const filtered = filterSamples(samples, filters);
  const totalSamples = filtered.length;
  const passCount = filtered.filter(s => s.latestResult === 'pass').length;
  const passRate = totalSamples > 0 ? passCount / totalSamples : 0;
  const avgScore = totalSamples > 0 
    ? filtered.reduce((sum, s) => sum + s.latestScore, 0) / totalSamples 
    : 0;
  const suspendedCount = filtered.filter(s => s.isSuspended).length;
  const dataIntegrityStatus = checkDataIntegrityStatus(filtered);

  return {
    criteria: filters,
    dataAsOf: '2025-06-18',
    totalSamples,
    passRate,
    avgScore,
    dataIntegrityStatus,
    lastUpdated: new Date().toISOString(),
    suspendedCount,
  };
};

export const useAppStore = create<AppState>((set, get) => ({
  filters: { ...DEFAULT_FILTERS },
  pageSummary: null,
  samples: mockData.samples,
  filteredSamples: filterSamples(mockData.samples, DEFAULT_FILTERS),
  selectedSample: null,
  scoreRecords: mockData.scoreRecords,
  attachments: mockData.attachments,
  conclusions: mockData.conclusions,
  suspendedSamples: mockData.samples.filter(s => s.isSuspended),
  
  exportState: {
    isExporting: false,
    exportType: null,
    exportPreview: null,
  },

  setFilters: (newFilters: Partial<FilterCriteria>) => {
    set(state => {
      const updatedFilters = { ...state.filters, ...newFilters };
      const filtered = filterSamples(state.samples, updatedFilters);
      const summary = calculatePageSummary(state.samples, updatedFilters);
      return {
        filters: updatedFilters,
        filteredSamples: filtered,
        pageSummary: summary,
      };
    });
  },

  resetFilters: () => {
    set(state => {
      const filtered = filterSamples(state.samples, DEFAULT_FILTERS);
      const summary = calculatePageSummary(state.samples, DEFAULT_FILTERS);
      return {
        filters: { ...DEFAULT_FILTERS },
        filteredSamples: filtered,
        pageSummary: summary,
      };
    });
  },

  updatePageSummary: () => {
    set(state => {
      const summary = calculatePageSummary(state.samples, state.filters);
      return { pageSummary: summary };
    });
  },

  selectSample: (id: string | null) => {
    set(state => ({
      selectedSample: id ? state.samples.find(s => s.id === id) || null : null,
    }));
  },

  getSampleScoreRecords: (sampleId: string): ScoreRecord[] => {
    return get().scoreRecords.filter(sr => sr.sampleId === sampleId);
  },

  getSampleAttachments: (sampleId: string): Attachment[] => {
    return get().attachments.filter(a => a.sampleId === sampleId);
  },

  getSampleConclusion: (sampleId: string): Conclusion | undefined => {
    return get().conclusions.find(c => c.sampleId === sampleId);
  },

  getSampleTimeline: (sampleId: string): TimelineEvent[] => {
    const state = get();
    const sample = state.samples.find(s => s.id === sampleId);
    return generateTimeline(
      sampleId,
      sample,
      state.scoreRecords,
      state.attachments,
      state.conclusions
    );
  },

  getModelComparison: (sampleId: string): ModelComparison | null => {
    return compareModels(sampleId, get().scoreRecords);
  },

  suspendSample: (id: string, reason: string, assignee: string) => {
    set(state => {
      const updatedSamples = state.samples.map(s => 
        s.id === id 
          ? { 
              ...s, 
              status: 'suspended' as const, 
              isSuspended: true, 
              suspendReason: reason, 
              assignedTo: assignee,
              referenceComplete: false,
            }
          : s
      );
      const filtered = filterSamples(updatedSamples, state.filters);
      const summary = calculatePageSummary(updatedSamples, state.filters);
      return {
        samples: updatedSamples,
        filteredSamples: filtered,
        suspendedSamples: updatedSamples.filter(s => s.isSuspended),
        pageSummary: summary,
        selectedSample: state.selectedSample?.id === id 
          ? updatedSamples.find(s => s.id === id) || null 
          : state.selectedSample,
      };
    });
  },

  confirmSuspendedSample: (id: string) => {
    set(state => {
      const updatedSamples = state.samples.map(s => 
        s.id === id 
          ? { 
              ...s, 
              status: 'pending' as const, 
              isSuspended: false, 
              suspendReason: undefined, 
              assignedTo: undefined,
              referenceComplete: true,
              missingReferences: undefined,
            }
          : s
      );
      const filtered = filterSamples(updatedSamples, state.filters);
      const summary = calculatePageSummary(updatedSamples, state.filters);
      return {
        samples: updatedSamples,
        filteredSamples: filtered,
        suspendedSamples: updatedSamples.filter(s => s.isSuspended),
        pageSummary: summary,
        selectedSample: state.selectedSample?.id === id 
          ? updatedSamples.find(s => s.id === id) || null 
          : state.selectedSample,
      };
    });
  },

  checkSampleReferences: (sampleId: string) => {
    const state = get();
    return checkSampleReferences(
      sampleId,
      state.scoreRecords,
      state.attachments,
      state.conclusions
    );
  },

  linkAttachmentToConclusion: (attachmentId: string, conclusionId: string) => {
    set(state => {
      const updatedAttachments = state.attachments.map(a => 
        a.id === attachmentId ? { ...a, linkedConclusionId: conclusionId } : a
      );
      const updatedConclusions = state.conclusions.map(c => 
        c.id === conclusionId && !c.referencedAttachmentIds.includes(attachmentId)
          ? { 
              ...c, 
              referencedAttachmentIds: [...c.referencedAttachmentIds, attachmentId],
              isReferenceComplete: true,
              missingReferences: [],
            }
          : c
      );
      return {
        attachments: updatedAttachments,
        conclusions: updatedConclusions,
      };
    });
  },

  addLateAttachment: (sampleId: string, attachment: Omit<Attachment, 'id' | 'sampleId' | 'isLateArrival'>) => {
    set(state => {
      const newAttachment: Attachment = {
        ...attachment,
        id: `ATT_${sampleId}_${Date.now()}`,
        sampleId,
        isLateArrival: true,
      };
      const updatedAttachments = [...state.attachments, newAttachment];
      const updatedSamples = state.samples.map(s => 
        s.id === sampleId ? { ...s, hasLateAttachment: true } : s
      );
      return {
        attachments: updatedAttachments,
        samples: updatedSamples,
        selectedSample: state.selectedSample?.id === sampleId 
          ? { ...state.selectedSample, hasLateAttachment: true }
          : state.selectedSample,
      };
    });
  },

  startExport: (type: 'pdf' | 'excel') => {
    set(state => ({
      exportState: {
        ...state.exportState,
        isExporting: true,
        exportType: type,
      },
    }));
  },

  completeExport: () => {
    set(state => ({
      exportState: {
        ...state.exportState,
        isExporting: false,
        exportType: null,
      },
    }));
  },

  cancelExport: () => {
    set(state => ({
      exportState: {
        ...state.exportState,
        isExporting: false,
        exportType: null,
        exportPreview: null,
      },
    }));
  },

  generateExportPreview: () => {
    set(state => {
      if (!state.pageSummary) return state;
      return {
        exportState: {
          ...state.exportState,
          exportPreview: {
            summary: state.pageSummary,
            samples: state.filteredSamples,
            timestamp: new Date().toLocaleString('zh-CN'),
          },
        },
      };
    });
  },
}));

export const initializeStore = () => {
  const summary = calculatePageSummary(mockData.samples, DEFAULT_FILTERS);
  useAppStore.setState({ pageSummary: summary });
};

export const doExportPDF = async (elementId: string) => {
  const state = useAppStore.getState();
  if (!state.pageSummary) return;
  
  try {
    state.startExport('pdf');
    await exportToPDF(elementId, state.pageSummary, state.filteredSamples, SEGMENTS, MODEL_VERSIONS);
  } finally {
    state.completeExport();
  }
};

export const doExportExcel = () => {
  const state = useAppStore.getState();
  if (!state.pageSummary) return;
  
  try {
    state.startExport('excel');
    exportToExcel(state.pageSummary, state.filteredSamples, SEGMENTS, MODEL_VERSIONS);
  } finally {
    state.completeExport();
  }
};
