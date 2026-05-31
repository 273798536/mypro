import { create } from 'zustand';
import type {
  ElevatorProfile,
  InspectionRecord,
  BrakeCalculation,
  AbnormalDetection,
  ThresholdCheck,
  DataTrace,
  BadRow,
  CleaningResult,
  ColumnMapping,
  ImportRawRow,
  FilterOptions,
  RecordWithDetails,
} from '../types';
import { db } from '../db';
import { cleanData } from '../engines/dataCleaningEngine';
import { calculateBatch } from '../engines/brakeCalculationEngine';
import { detectBatch } from '../engines/abnormalDetectionEngine';
import { checkBatch } from '../engines/thresholdCheckEngine';
import { generateMockDataForDemo } from '../mock/dataGenerator';

interface DataState {
  elevators: ElevatorProfile[];
  elevatorProfiles: ElevatorProfile[];
  records: InspectionRecord[];
  inspectionRecords: InspectionRecord[];
  calculations: BrakeCalculation[];
  brakeCalculations: BrakeCalculation[];
  abnormalities: AbnormalDetection[];
  abnormalDetections: AbnormalDetection[];
  thresholdChecks: ThresholdCheck[];
  traces: DataTrace[];
  dataTraces: DataTrace[];
  badRows: BadRow[];
  isLoading: boolean;
  isProcessing: boolean;
  isImporting: boolean;
  error: string | null;
  filters: FilterOptions;
  currentRecord: RecordWithDetails | null;

  setIsLoading: (loading: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  loadAllData: () => Promise<void>;
  importAndCleanData: (rawRows: ImportRawRow[], mapping: ColumnMapping, fileName?: string) => Promise<CleaningResult>;
  processAllRecords: () => Promise<void>;
  processRecord: (recordId: string) => Promise<void>;
  setFilters: (filters: Partial<FilterOptions>) => void;
  clearFilters: () => void;
  loadRecordDetails: (recordId: string) => Promise<void>;
  clearCurrentRecord: () => void;
  updateBadRowReview: (badRowId: string, reviewRemark: string) => Promise<void>;
  loadDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  clearBadRows: () => Promise<void>;
  getFilteredRecords: (filters?: FilterOptions) => InspectionRecord[];
  getRecordDetails: (recordId: string) => RecordWithDetails | null;
  getRecordWithDetails: (recordId: string) => RecordWithDetails | null;
}

export const useDataStore = create<DataState>((set, get) => ({
  elevators: [],
  elevatorProfiles: [],
  records: [],
  inspectionRecords: [],
  calculations: [],
  brakeCalculations: [],
  abnormalities: [],
  abnormalDetections: [],
  thresholdChecks: [],
  traces: [],
  dataTraces: [],
  badRows: [],
  isLoading: false,
  isProcessing: false,
  isImporting: false,
  error: null,
  filters: {},
  currentRecord: null,

  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  setIsProcessing: (processing: boolean) => set({ isProcessing: processing }),

  loadAllData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [elevators, records, calculations, abnormalities, thresholdChecks, traces, badRows] =
        await Promise.all([
          db.elevatorProfiles.orderBy('createdAt').reverse().toArray(),
          db.inspectionRecords.orderBy('createdAt').reverse().toArray(),
          db.brakeCalculations.orderBy('calculatedAt').reverse().toArray(),
          db.abnormalDetections.orderBy('detectedAt').reverse().toArray(),
          db.thresholdChecks.orderBy('checkedAt').reverse().toArray(),
          db.dataTraces.orderBy('operatedAt').toArray(),
          db.badRows.orderBy('createdAt').reverse().toArray(),
        ]);

      set({
        elevators,
        elevatorProfiles: elevators,
        records,
        inspectionRecords: records,
        calculations,
        brakeCalculations: calculations,
        abnormalities,
        abnormalDetections: abnormalities,
        thresholdChecks,
        traces,
        dataTraces: traces,
        badRows,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载数据失败',
        isLoading: false,
      });
    }
  },

  importAndCleanData: async (rawRows: ImportRawRow[], mapping: ColumnMapping, fileName?: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = cleanData(rawRows, mapping);

      await db.transaction('rw', [
        db.elevatorProfiles,
        db.inspectionRecords,
        db.badRows,
        db.dataTraces,
      ], async () => {
        await Promise.all([
          db.elevatorProfiles.bulkAdd(result.elevatorProfiles),
          db.inspectionRecords.bulkAdd(result.normalRecords),
          db.badRows.bulkAdd(result.badRows),
          db.dataTraces.bulkAdd(result.traces),
        ]);
      });

      set(state => ({
        elevators: [...result.elevatorProfiles, ...state.elevators],
        elevatorProfiles: [...result.elevatorProfiles, ...state.elevatorProfiles],
        records: [...result.normalRecords, ...state.records],
        inspectionRecords: [...result.normalRecords, ...state.inspectionRecords],
        badRows: [...result.badRows, ...state.badRows],
        traces: [...result.traces, ...state.traces],
        dataTraces: [...result.traces, ...state.dataTraces],
        isLoading: false,
      }));

      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '数据导入失败',
        isLoading: false,
      });
      throw error;
    }
  },

  processAllRecords: async () => {
    set({ isLoading: true, error: null });
    try {
      const { elevators, records } = get();
      const thresholdConfig = await db.getActiveThresholdConfig();

      const { calculations, traces: calcTraces } = calculateBatch(
        records,
        elevators,
        thresholdConfig
      );

      const { abnormalities, traces: abnTraces } = detectBatch(
        records,
        elevators,
        calculations,
        thresholdConfig
      );

      const { thresholdChecks, traces: thrTraces } = checkBatch(
        records,
        elevators,
        calculations,
        abnormalities,
        thresholdConfig
      );

      const allTraces = [...calcTraces, ...abnTraces, ...thrTraces];

      await db.transaction('rw', [
        db.brakeCalculations,
        db.abnormalDetections,
        db.thresholdChecks,
        db.dataTraces,
      ], async () => {
        await Promise.all([
          db.brakeCalculations.bulkPut(calculations),
          db.abnormalDetections.bulkPut(abnormalities),
          db.thresholdChecks.bulkPut(thresholdChecks),
          db.dataTraces.bulkAdd(allTraces),
        ]);
      });

      set(state => ({
        calculations,
        brakeCalculations: calculations,
        abnormalities,
        abnormalDetections: abnormalities,
        thresholdChecks,
        traces: [...state.traces, ...allTraces],
        dataTraces: [...state.dataTraces, ...allTraces],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '数据处理失败',
        isLoading: false,
      });
    }
  },

  processRecord: async (recordId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { elevators } = get();
      const record = await db.inspectionRecords.get(recordId);
      if (!record) throw new Error('记录不存在');

      const elevator = elevators.find(e => e.id === record.elevatorId);
      if (!elevator) throw new Error('电梯档案不存在');

      const thresholdConfig = await db.getActiveThresholdConfig();

      const { calculations, traces: calcTraces } = calculateBatch(
        [record],
        [elevator],
        thresholdConfig
      );

      const { abnormalities, traces: abnTraces } = detectBatch(
        [record],
        [elevator],
        calculations,
        thresholdConfig
      );

      const { thresholdChecks, traces: thrTraces } = checkBatch(
        [record],
        [elevator],
        calculations,
        abnormalities,
        thresholdConfig
      );

      const allTraces = [...calcTraces, ...abnTraces, ...thrTraces];

      await db.transaction('rw', [
        db.brakeCalculations,
        db.abnormalDetections,
        db.thresholdChecks,
        db.dataTraces,
      ], async () => {
        await Promise.all([
          db.brakeCalculations.bulkPut(calculations),
          db.abnormalDetections.bulkPut(abnormalities),
          db.thresholdChecks.bulkPut(thresholdChecks),
          db.dataTraces.bulkAdd(allTraces),
        ]);
      });

      set(state => ({
        calculations: [...state.calculations.filter(c => c.recordId !== recordId), ...calculations],
        brakeCalculations: [...state.brakeCalculations.filter(c => c.recordId !== recordId), ...calculations],
        abnormalities: [...state.abnormalities.filter(a => a.recordId !== recordId), ...abnormalities],
        abnormalDetections: [...state.abnormalDetections.filter(a => a.recordId !== recordId), ...abnormalities],
        thresholdChecks: [...state.thresholdChecks.filter(t => t.recordId !== recordId), ...thresholdChecks],
        traces: [...state.traces, ...allTraces],
        dataTraces: [...state.dataTraces, ...allTraces],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '记录处理失败',
        isLoading: false,
      });
    }
  },

  setFilters: (filters: Partial<FilterOptions>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  loadRecordDetails: async (recordId: string) => {
    set({ isLoading: true, error: null, currentRecord: null });
    try {
      const details = await db.getRecordWithDetails(recordId);
      set({ currentRecord: details, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载记录详情失败',
        isLoading: false,
      });
    }
  },

  clearCurrentRecord: () => {
    set({ currentRecord: null });
  },

  updateBadRowReview: async (badRowId: string, reviewRemark: string) => {
    try {
      await db.badRows.update(badRowId, {
        isManualReviewed: true,
        reviewRemark,
        reviewedBy: '检验员',
        reviewedAt: new Date().toISOString(),
      });

      set(state => ({
        badRows: state.badRows.map(br =>
          br.id === badRowId
            ? { ...br, isManualReviewed: true, reviewRemark, reviewedBy: '检验员', reviewedAt: new Date().toISOString() }
            : br
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新复核状态失败',
      });
    }
  },

  loadDemoData: async () => {
    set({ isLoading: true, error: null });
    try {
      await db.clearAllData();
      
      const mockData = generateMockDataForDemo();
      const thresholdConfig = await db.getActiveThresholdConfig();

      const { calculations, traces: calcTraces } = calculateBatch(
        mockData.normalRecords,
        mockData.elevators,
        thresholdConfig
      );

      const { abnormalities, traces: abnTraces } = detectBatch(
        mockData.normalRecords,
        mockData.elevators,
        calculations,
        thresholdConfig
      );

      const { thresholdChecks, traces: thrTraces } = checkBatch(
        mockData.normalRecords,
        mockData.elevators,
        calculations,
        abnormalities,
        thresholdConfig
      );

      const allTraces = [...calcTraces, ...abnTraces, ...thrTraces];

      await db.transaction('rw', [
        db.elevatorProfiles,
        db.inspectionRecords,
        db.brakeCalculations,
        db.abnormalDetections,
        db.thresholdChecks,
        db.dataTraces,
        db.badRows,
      ], async () => {
        await Promise.all([
          db.elevatorProfiles.bulkAdd(mockData.elevators),
          db.inspectionRecords.bulkAdd(mockData.normalRecords),
          db.brakeCalculations.bulkAdd(calculations),
          db.abnormalDetections.bulkAdd(abnormalities),
          db.thresholdChecks.bulkAdd(thresholdChecks),
          db.dataTraces.bulkAdd(allTraces),
          db.badRows.bulkAdd(mockData.badRows),
        ]);
      });

      set({
        elevators: mockData.elevators,
        elevatorProfiles: mockData.elevators,
        records: mockData.normalRecords,
        inspectionRecords: mockData.normalRecords,
        calculations,
        brakeCalculations: calculations,
        abnormalities,
        abnormalDetections: abnormalities,
        thresholdChecks,
        traces: allTraces,
        dataTraces: allTraces,
        badRows: mockData.badRows,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载演示数据失败',
        isLoading: false,
      });
    }
  },

  clearAllData: async () => {
    set({ isLoading: true, error: null });
    try {
      await db.clearAllData();
      set({
        elevators: [],
        elevatorProfiles: [],
        records: [],
        inspectionRecords: [],
        calculations: [],
        brakeCalculations: [],
        abnormalities: [],
        abnormalDetections: [],
        thresholdChecks: [],
        traces: [],
        dataTraces: [],
        badRows: [],
        currentRecord: null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '清空数据失败',
        isLoading: false,
      });
    }
  },

  clearBadRows: async () => {
    set({ isLoading: true, error: null });
    try {
      await db.badRows.clear();
      set({ badRows: [], isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '清空坏行失败',
        isLoading: false,
      });
    }
  },

  getFilteredRecords: (customFilters?: FilterOptions) => {
    const { records, abnormalities, thresholdChecks, filters: storeFilters, elevators } = get();
    const activeFilters = customFilters || storeFilters;
    
    return records.filter(record => {
      if (activeFilters.abnormalLevel && activeFilters.abnormalLevel.length > 0) {
        const abnormal = abnormalities.find(a => a.recordId === record.id);
        if (!abnormal || !activeFilters.abnormalLevel.includes(abnormal.abnormalLevel)) {
          return false;
        }
      }

      if (activeFilters.abnormalTypes && activeFilters.abnormalTypes.length > 0) {
        const abnormal = abnormalities.find(a => a.recordId === record.id);
        if (!abnormal || !activeFilters.abnormalTypes.some(t => abnormal.abnormalTypes.includes(t))) {
          return false;
        }
      }

      if (activeFilters.elevatorNo) {
        const elevator = elevators.find(e => e.id === record.elevatorId);
        if (!elevator || !elevator.elevatorNo.includes(activeFilters.elevatorNo)) {
          return false;
        }
      }

      if (activeFilters.dateFrom && record.inspectionDate < activeFilters.dateFrom) {
        return false;
      }

      if (activeFilters.dateTo && record.inspectionDate > activeFilters.dateTo) {
        return false;
      }

      if (activeFilters.inspector && !record.inspector.includes(activeFilters.inspector)) {
        return false;
      }

      if (activeFilters.overallResult) {
        const check = thresholdChecks.find(t => t.recordId === record.id);
        if (!check || check.overallResult !== activeFilters.overallResult) {
          return false;
        }
      }

      return true;
    });
  },

  getRecordWithDetails: (recordId: string) => {
    return get().getRecordDetails(recordId);
  },

  getRecordDetails: (recordId: string) => {
    const { records, elevators, calculations, abnormalities, thresholdChecks, traces } = get();
    
    const record = records.find(r => r.id === recordId);
    if (!record) return null;

    const elevator = elevators.find(e => e.id === record.elevatorId);
    if (!elevator) return null;

    const calculation = calculations.find(c => c.recordId === recordId) || null;
    const abnormal = abnormalities.find(a => a.recordId === recordId) || null;
    const threshold = thresholdChecks.find(t => t.recordId === recordId) || null;
    const recordTraces = traces.filter(t => t.recordId === recordId).sort((a, b) => a.operatedAt.localeCompare(b.operatedAt));

    return {
      ...record,
      elevator,
      profile: elevator,
      record,
      calculation,
      abnormal,
      detection: abnormal,
      threshold,
      traces: recordTraces,
    };
  },
}));
