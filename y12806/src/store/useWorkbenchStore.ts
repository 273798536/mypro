import { create } from 'zustand';
import type {
  ReagentLot,
  Sample,
  Band,
  AnalysisRun,
  ReviewLog,
  SamplingSite,
  DiffReport,
  ExportOptions,
} from '../../shared/types';

interface WorkbenchFilters {
  qualityMin: number;
  labelCategory: string[];
  confirmStatus: string[];
  runIndex: number | null;
}

interface WorkbenchState {
  lots: ReagentLot[];
  samples: Sample[];
  bands: Band[];
  analysisRuns: AnalysisRun[];
  reviewLogs: ReviewLog[];
  samplingSites: SamplingSite[];

  currentLotId: string | null;
  compareLotIds: [string | null, string | null];
  reviewStep: 1 | 2 | 3;
  isDemoMode: boolean;
  currentDemoCase: string | null;

  filters: WorkbenchFilters;

  fetchAllData: () => Promise<void>;
  selectLot: (id: string) => void;
  setCompareLots: (oldId: string, newId: string) => void;
  triggerDiffRun: (lotId: string, params: Record<string, unknown>) => Promise<DiffReport>;
  supplementBand: (bandId: string, fields: Record<string, unknown>) => Promise<void>;
  confirmBand: (bandId: string, pass: boolean, comment?: string) => Promise<void>;
  confirmBatchBands: (ids: string[], pass: boolean) => Promise<void>;
  loadDemoCase: (caseId: string) => Promise<void>;
  toggleDemoMode: () => void;
  exportData: (format: 'csv' | 'json' | 'pdf', opts: Omit<ExportOptions, 'format'>) => Promise<Blob>;
  updateFilters: (patch: Partial<WorkbenchFilters>) => void;
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  lots: [],
  samples: [],
  bands: [],
  analysisRuns: [],
  reviewLogs: [],
  samplingSites: [],

  currentLotId: null,
  compareLotIds: [null, null],
  reviewStep: 1,
  isDemoMode: false,
  currentDemoCase: null,

  filters: {
    qualityMin: 0,
    labelCategory: [],
    confirmStatus: [],
    runIndex: null,
  },

  fetchAllData: async () => {
    try {
      const [lotsRes, samplesRes, bandsRes, runsRes, logsRes, sitesRes] = await Promise.all([
        fetch('/api/lots'),
        fetch('/api/common/samples'),
        fetch('/api/bands'),
        fetch('/api/common/analysis-runs'),
        fetch('/api/review/logs'),
        fetch('/api/common/sampling-sites'),
      ]);

      const unwrap = async <T,>(r: Response): Promise<T[]> => {
        if (!r.ok) return [] as T[];
        const json = await r.json();
        if (Array.isArray(json)) return json as T[];
        if (json && Array.isArray(json.data)) return json.data as T[];
        return [] as T[];
      };

      const [lots, samples, bands, analysisRuns, reviewLogs, samplingSites] = await Promise.all([
        unwrap<ReagentLot>(lotsRes),
        unwrap<Sample>(samplesRes),
        unwrap<Band>(bandsRes),
        unwrap<AnalysisRun>(runsRes),
        unwrap<ReviewLog>(logsRes),
        unwrap<SamplingSite>(sitesRes),
      ]);

      set({ lots, samples, bands, analysisRuns, reviewLogs, samplingSites });
    } catch (err) {
      console.error('Failed to fetch all data:', err);
    }
  },

  selectLot: (id: string) => {
    set({ currentLotId: id });
  },

  setCompareLots: (oldId: string, newId: string) => {
    set({ compareLotIds: [oldId, newId] });
  },

  triggerDiffRun: async (lotId: string, params: Record<string, unknown>) => {
    const res = await fetch('/api/diff/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lot_id: lotId, ...params }),
    });

    if (!res.ok) {
      throw new Error('Failed to trigger diff run');
    }

    const json = await res.json();
    const diffReport: DiffReport = (json?.data ?? json) as DiffReport;

    const bandsRes = await fetch('/api/bands');
    if (bandsRes.ok) {
      const bJson = await bandsRes.json();
      const bands = Array.isArray(bJson) ? bJson : bJson?.data ?? [];
      set({ bands });
    }

    return diffReport;
  },

  supplementBand: async (bandId: string, fields: Record<string, unknown>) => {
    const res = await fetch('/api/review/supplement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ band_id: bandId, fields }),
    });

    if (!res.ok) {
      throw new Error('Failed to supplement band');
    }

    const json = await res.json();
    const updatedBand: Band = (json?.data?.band ?? json?.band ?? json?.data ?? json) as Band;
    set((state) => ({
      bands: state.bands.map((b) => (b.id === bandId ? updatedBand : b)),
    }));
  },

  confirmBand: async (bandId: string, pass: boolean, comment?: string) => {
    const res = await fetch('/api/review/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ band_id: bandId, pass, comment }),
    });

    if (!res.ok) {
      throw new Error('Failed to confirm band');
    }

    const json = await res.json();
    const updatedBand: Band = (json?.data?.band ?? json?.band ?? json?.data ?? json) as Band;
    set((state) => ({
      bands: state.bands.map((b) => (b.id === bandId ? updatedBand : b)),
    }));
  },

  confirmBatchBands: async (ids: string[], pass: boolean) => {
    const res = await fetch('/api/review/confirm-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ band_ids: ids, pass, operator: 'analyst' }),
    });

    if (!res.ok) {
      throw new Error('Failed to confirm batch bands');
    }

    const json = await res.json();
    const results = json?.data?.results ?? [];
    const updatedBands: Band[] = Array.isArray(results)
      ? results.filter((r: any) => r?.success).map((r: any) => r.band as Band)
      : [];
    if (updatedBands.length === 0) {
      await get().fetchAllData();
    } else {
      set((state) => ({
        bands: state.bands.map((b) => {
          const updated = updatedBands.find((u) => u.id === b.id);
          return updated ?? b;
        }),
      }));
    }
  },

  loadDemoCase: async (caseId: string) => {
    const res = await fetch(`/api/demo/load/${caseId}`, {
      method: 'POST',
    });

    if (!res.ok) {
      throw new Error('Failed to load demo case');
    }

    set({ isDemoMode: true, currentDemoCase: caseId });
    await get().fetchAllData();
  },

  toggleDemoMode: () => {
    set((state) => ({ isDemoMode: !state.isDemoMode }));
  },

  exportData: async (format: 'csv' | 'json' | 'pdf', opts: Omit<ExportOptions, 'format'>) => {
    const res = await fetch('/api/export/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, ...opts }),
    });

    if (!res.ok) {
      throw new Error('Failed to export data');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return blob;
  },

  updateFilters: (patch: Partial<WorkbenchFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...patch },
    }));
  },
}));
