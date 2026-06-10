import { create } from 'zustand';
import type { Sample, SampleStatus, Annotation, SupervisorOverview, ImportResult } from '../../shared/types';
import { api } from '../utils/api';

interface QcStore {
  samples: Sample[];
  samplesTotal: number;
  samplesPage: number;
  samplesPageSize: number;
  samplesLoading: boolean;
  samplesFilter: { status?: SampleStatus; search?: string };

  currentSample: Sample | null;
  currentAnnotations: Annotation[];
  annotationsLoading: boolean;

  supervisorOverview: SupervisorOverview | null;
  overviewLoading: boolean;

  importResult: ImportResult | null;
  importLoading: boolean;
  importError: string | null;

  duplicateGroups: Sample[][];
  duplicatesLoading: boolean;

  fetchSamples: (opts?: { status?: SampleStatus; search?: string; page?: number }) => Promise<void>;
  fetchSample: (id: string) => Promise<void>;
  fetchAnnotations: (sampleId: string) => Promise<void>;
  addAnnotation: (sampleId: string, x: number, y: number, label?: string) => Promise<void>;
  removeAnnotation: (annotationId: string, sampleId: string) => Promise<void>;
  updateSampleStatus: (id: string, status: SampleStatus, note?: string) => Promise<void>;
  updateSample: (id: string, patch: Partial<Sample>) => Promise<void>;
  importFile: (file: File) => Promise<ImportResult>;
  fetchSupervisorOverview: () => Promise<void>;
  fetchDuplicates: () => Promise<void>;
  setSamplesFilter: (filter: { status?: SampleStatus; search?: string }) => void;
  clearImportResult: () => void;
}

export const useQcStore = create<QcStore>((set, get) => ({
  samples: [],
  samplesTotal: 0,
  samplesPage: 1,
  samplesPageSize: 50,
  samplesLoading: false,
  samplesFilter: {},

  currentSample: null,
  currentAnnotations: [],
  annotationsLoading: false,

  supervisorOverview: null,
  overviewLoading: false,

  importResult: null,
  importLoading: false,
  importError: null,

  duplicateGroups: [],
  duplicatesLoading: false,

  fetchSamples: async (opts) => {
    const filter = opts ?? get().samplesFilter;
    set({ samplesLoading: true, samplesFilter: filter });
    try {
      const data = await api.samples.list({
        status: filter.status,
        search: filter.search,
        page: get().samplesPage,
        pageSize: get().samplesPageSize,
      });
      set({ samples: data.list, samplesTotal: data.total, samplesLoading: false });
    } catch {
      set({ samplesLoading: false });
    }
  },

  fetchSample: async (id) => {
    try {
      const sample = await api.samples.get(id);
      set({ currentSample: sample });
    } catch {
      set({ currentSample: null });
    }
  },

  fetchAnnotations: async (sampleId) => {
    set({ annotationsLoading: true });
    try {
      const annotations = await api.annotations.list(sampleId);
      set({ currentAnnotations: annotations, annotationsLoading: false });
    } catch {
      set({ annotationsLoading: false });
    }
  },

  addAnnotation: async (sampleId, x, y, label) => {
    await api.annotations.create(sampleId, x, y, label);
    await get().fetchAnnotations(sampleId);
    await get().fetchSample(sampleId);
  },

  removeAnnotation: async (annotationId, sampleId) => {
    await api.annotations.delete(annotationId, sampleId);
    await get().fetchAnnotations(sampleId);
    await get().fetchSample(sampleId);
  },

  updateSampleStatus: async (id, status, note) => {
    const updated = await api.samples.updateStatus(id, status, note);
    set((state) => ({
      samples: state.samples.map((s) => (s.id === id ? updated : s)),
      currentSample: state.currentSample?.id === id ? updated : state.currentSample,
    }));
  },

  updateSample: async (id, patch) => {
    const updated = await api.samples.update(id, patch);
    set((state) => ({
      samples: state.samples.map((s) => (s.id === id ? updated : s)),
      currentSample: state.currentSample?.id === id ? updated : state.currentSample,
    }));
  },

  importFile: async (file) => {
    set({ importLoading: true, importError: null, importResult: null });
    try {
      const result = await api.samples.import(file);
      set({ importResult: result, importLoading: false });
      await get().fetchSamples();
      return result;
    } catch (error: any) {
      set({ importError: error.message, importLoading: false });
      throw error;
    }
  },

  fetchSupervisorOverview: async () => {
    set({ overviewLoading: true });
    try {
      const overview = await api.supervisor.overview();
      set({ supervisorOverview: overview, overviewLoading: false });
    } catch {
      set({ overviewLoading: false });
    }
  },

  fetchDuplicates: async () => {
    set({ duplicatesLoading: true });
    try {
      const groups = await api.duplicates.list();
      set({ duplicateGroups: groups, duplicatesLoading: false });
    } catch {
      set({ duplicatesLoading: false });
    }
  },

  setSamplesFilter: (filter) => {
    set({ samplesFilter: filter, samplesPage: 1 });
    get().fetchSamples(filter);
  },

  clearImportResult: () => set({ importResult: null, importError: null }),
}));
