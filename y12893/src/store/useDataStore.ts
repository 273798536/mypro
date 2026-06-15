import { create } from 'zustand';
import type {
  DataRecord,
  QualityStats,
  Filters,
  CorrectionRecord,
  ProcessingTrace,
  TideCorrelation,
  ImportResult,
  ImportBatch,
  SceneSettings,
  DataStatus
} from '@/types';
import {
  getAllRecords,
  getRecordById,
  importRecords,
  updateRecord,
  getQualityStats,
  getProcessingTrace,
  getTideCorrelation,
  getBadRecords,
  clearAllData as dbClearAllData,
  getImportBatches,
  initDb,
  exportAllData,
  importAllData
} from '@/services/database';
import { generateAllRecords } from '@/services/mockData';

interface DataState {
  records: DataRecord[];
  selectedRecord: DataRecord | null;
  qualityStats: QualityStats | null;
  processingTrace: ProcessingTrace | null;
  tideCorrelation: TideCorrelation | null;
  importBatches: ImportBatch[];
  filters: Filters;
  sceneSettings: SceneSettings;
  loading: boolean;
  error: string | null;
  importResult: ImportResult | null;
  stats: {
    totalRecords: number;
    approvedCount: number;
    pendingCount: number;
    issuesCount: number;
    avgLoad: number;
    unitMismatchCount: number;
    negativeDepthCount: number;
    outlierCount: number;
    duplicateCount: number;
  };

  initDatabase: () => Promise<void>;
  loadRecords: (filters?: Filters) => Promise<void>;
  loadRecord: (id: string) => Promise<void>;
  loadStats: () => Promise<void>;
  loadTrace: (recordId: string) => Promise<void>;
  loadTideCorrelation: (period: { start: number; end: number }) => Promise<void>;
  loadBadRecords: () => Promise<void>;
  loadImportBatches: () => Promise<void>;
  generateMockData: () => Promise<void>;

  importData: (records: DataRecord[]) => Promise<ImportResult>;
  correctRecord: (
    id: string,
    updates: Partial<DataRecord>,
    correction: CorrectionRecord
  ) => Promise<void>;
  approveRecord: (id: string, operator: string, reason: string) => Promise<void>;
  setRecordStatus: (id: string, status: DataStatus, operator: string, reason: string) => Promise<void>;

  selectRecord: (record: DataRecord | null) => void;
  setFilters: (filters: Partial<Filters>) => void;
  setSceneSettings: (settings: Partial<SceneSettings>) => void;
  clearImportResult: () => void;
  clearError: () => void;
  resetAll: () => Promise<void>;
  clearAllData: () => Promise<void>;
  exportData: () => Promise<any>;
  importDataFromFile: (data: any) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  records: [],
  selectedRecord: null,
  qualityStats: null,
  processingTrace: null,
  tideCorrelation: null,
  importBatches: [],
  filters: {},
  sceneSettings: {
    showWireframe: false,
    showGrid: true,
    clippingEnabled: false,
    clippingPlaneY: 0,
    autoRotate: false,
    timeOfDay: 12
  },
  loading: false,
  error: null,
  importResult: null,
  stats: {
    totalRecords: 0,
    approvedCount: 0,
    pendingCount: 0,
    issuesCount: 0,
    avgLoad: 0,
    unitMismatchCount: 0,
    negativeDepthCount: 0,
    outlierCount: 0,
    duplicateCount: 0
  },

  initDatabase: async () => {
    await initDb();
  },

  generateMockData: async () => {
    set({ loading: true, error: null });
    try {
      const mockRecords = generateAllRecords(15, 10, 15);
      const result = await importRecords(mockRecords);
      set({ loading: false, importResult: result });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  loadRecords: async (filters?: Filters) => {
    set({ loading: true, error: null });
    try {
      const mergedFilters = { ...get().filters, ...filters };
      const records = await getAllRecords(mergedFilters);
      set({ records, filters: mergedFilters, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  loadRecord: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const record = await getRecordById(id);
      set({ selectedRecord: record, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  loadStats: async () => {
    set({ loading: true, error: null });
    try {
      const qualityStats = await getQualityStats();
      const allRecords = await getAllRecords();

      const totalRecords = allRecords.length;
      const approvedCount = allRecords.filter(r => r.status === 'approved').length;
      const pendingCount = allRecords.filter(r => r.status === 'pending').length;
      const issuesCount = allRecords.filter(r => r.qualityIssues.length > 0).length;
      const unitMismatchCount = allRecords.filter(r => r.qualityIssues.includes('unit_mismatch')).length;
      const negativeDepthCount = allRecords.filter(r => r.qualityIssues.includes('negative_depth')).length;
      const outlierCount = allRecords.filter(r => r.qualityIssues.includes('outlier')).length;
      const duplicateCount = allRecords.filter(r => r.qualityIssues.includes('duplicate')).length;

      const loads = allRecords.map(r => {
        if (r.type === 'ship_track') return r.powerConsumption;
        if (r.type === 'aquaculture_log') return r.dailyPowerUsage;
        return r.relatedLoad;
      });
      const avgLoad = loads.length > 0 ? loads.reduce((a, b) => a + b, 0) / loads.length : 0;

      set({
        qualityStats,
        stats: {
          totalRecords,
          approvedCount,
          pendingCount,
          issuesCount,
          avgLoad,
          unitMismatchCount,
          negativeDepthCount,
          outlierCount,
          duplicateCount
        },
        loading: false
      });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  loadTrace: async (recordId: string) => {
    set({ loading: true, error: null });
    try {
      const trace = await getProcessingTrace(recordId);
      set({ processingTrace: trace, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  loadTideCorrelation: async (period: { start: number; end: number }) => {
    set({ loading: true, error: null });
    try {
      const correlation = await getTideCorrelation(period);
      set({ tideCorrelation: correlation, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  loadBadRecords: async () => {
    set({ loading: true, error: null });
    try {
      const badRecords = await getBadRecords();
      set({ records: badRecords, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  loadImportBatches: async () => {
    try {
      const batches = await getImportBatches();
      set({ importBatches: batches });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  importData: async (records: DataRecord[]) => {
    set({ loading: true, error: null, importResult: null });
    try {
      const result = await importRecords(records);
      set({ importResult: result, loading: false });
      await get().loadRecords();
      await get().loadStats();
      await get().loadImportBatches();
      return result;
    } catch (error) {
      set({ error: String(error), loading: false });
      return { success: [], duplicates: [], errors: [String(error)] };
    }
  },

  correctRecord: async (id: string, updates: Partial<DataRecord>, correction: CorrectionRecord) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateRecord(id, updates, correction);
      if (updated) {
        const records = get().records.map(r => r.id === id ? updated : r);
        set({ records, selectedRecord: updated, loading: false });
        await get().loadStats();
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  approveRecord: async (id: string, operator: string, reason: string) => {
    const record = await getRecordById(id);
    if (!record) return;

    const correction: CorrectionRecord = {
      id: `corr_${Date.now()}`,
      timestamp: Date.now(),
      operator,
      before: { status: record.status, qualityIssues: record.qualityIssues },
      after: { status: 'approved', qualityIssues: [] },
      reason,
      statusChange: { from: record.status, to: 'approved' }
    };

    await get().correctRecord(id, { status: 'approved', qualityIssues: [] }, correction);
  },

  setRecordStatus: async (id: string, status: DataStatus, operator: string, reason: string) => {
    const record = await getRecordById(id);
    if (!record) return;

    const correction: CorrectionRecord = {
      id: `corr_${Date.now()}`,
      timestamp: Date.now(),
      operator,
      before: { status: record.status },
      after: { status },
      reason,
      statusChange: { from: record.status, to: status }
    };

    await get().correctRecord(id, { status }, correction);
  },

  selectRecord: (record: DataRecord | null) => {
    set({ selectedRecord: record });
  },

  setFilters: (filters: Partial<Filters>) => {
    set(state => ({ filters: { ...state.filters, ...filters } }));
  },

  setSceneSettings: (settings: Partial<SceneSettings>) => {
    set(state => ({ sceneSettings: { ...state.sceneSettings, ...settings } }));
  },

  clearImportResult: () => {
    set({ importResult: null });
  },

  clearError: () => {
    set({ error: null });
  },

  resetAll: async () => {
    try {
      await dbClearAllData();
      set({
        records: [],
        selectedRecord: null,
        qualityStats: null,
        processingTrace: null,
        tideCorrelation: null,
        importBatches: [],
        importResult: null
      });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  clearAllData: async () => {
    try {
      await dbClearAllData();
      set({
        records: [],
        selectedRecord: null,
        qualityStats: null,
        processingTrace: null,
        tideCorrelation: null,
        importBatches: [],
        importResult: null,
        stats: {
          totalRecords: 0,
          approvedCount: 0,
          pendingCount: 0,
          issuesCount: 0,
          avgLoad: 0,
          unitMismatchCount: 0,
          negativeDepthCount: 0,
          outlierCount: 0,
          duplicateCount: 0
        }
      });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  exportData: async () => {
    return await exportAllData();
  },

  importDataFromFile: async (data: any) => {
    set({ loading: true, error: null });
    try {
      await importAllData(data);
      await get().loadRecords();
      await get().loadStats();
      await get().loadImportBatches();
      set({ loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
      throw error;
    }
  }
}));
