import { create } from 'zustand';
import type {
  UnifiedDataSource,
  FilterCriteria,
  DeflectionRecord,
  Statistics,
  Remark,
  Snapshot,
  Confirmation,
  RecordStatus,
  RecalcResult,
} from '@/types';
import { FORMULA_VERSION } from '@/types';
import { applyFilter } from '@/engines/filterEngine';
import { detectNoise } from '@/engines/noiseEngine';
import { computeStatistics } from '@/engines/statsEngine';
import { createSnapshot, getNextVersion } from '@/engines/snapshotEngine';
import { recalcBoundary } from '@/engines/recalcEngine';
import { exportReport } from '@/engines/reportEngine';
import { mockRecords } from '@/data/mockRecords';
import { mockRemarks } from '@/data/mockRemarks';
import { mockSnapshots, mockConfirmations } from '@/data/mockHistory';

const DEFAULT_FILTER_CRITERIA: FilterCriteria = {
  dateFrom: '',
  dateTo: '',
  beamNumber: '',
  detectionType: '',
  status: '',
};

interface DeflectionStore {
  unifiedDataSource: UnifiedDataSource | null;
  rawRecords: DeflectionRecord[];
  remarks: Remark[];
  snapshots: Snapshot[];
  confirmations: Confirmation[];
  filterCriteria: FilterCriteria;

  initStore: () => void;
  setFilterCriteria: (criteria: Partial<FilterCriteria>) => void;
  refreshDataSource: () => void;
  addRemark: (recordId: string, content: string, author: string) => void;
  confirmRecord: (recordId: string, newStatus: RecordStatus, reason: string, operator: string) => void;
  recalibrateBoundary: (recordId: string) => RecalcResult;
  exportReport: () => Promise<Blob>;

  getStatistics: () => Statistics | null;
  getRecords: () => DeflectionRecord[];
  getExceptionQueue: () => DeflectionRecord[];
  getRecordHistory: (recordId: string) => { remarks: Remark[]; snapshots: Snapshot[]; confirmations: Confirmation[] } | null;
}

export const useDeflectionStore = create<DeflectionStore>((set, get) => ({
  unifiedDataSource: null,
  rawRecords: [],
  remarks: [],
  snapshots: [],
  confirmations: [],
  filterCriteria: { ...DEFAULT_FILTER_CRITERIA },

  initStore: () => {
    set({
      rawRecords: [...mockRecords],
      remarks: [...mockRemarks],
      snapshots: [...mockSnapshots],
      confirmations: [...mockConfirmations],
      filterCriteria: { ...DEFAULT_FILTER_CRITERIA },
    });
    get().refreshDataSource();
  },

  setFilterCriteria: (criteria: Partial<FilterCriteria>) => {
    set((state) => ({
      filterCriteria: { ...state.filterCriteria, ...criteria },
    }));
    get().refreshDataSource();
  },

  refreshDataSource: () => {
    const { rawRecords, filterCriteria } = get();
    const filtered = applyFilter(rawRecords, filterCriteria);
    const processed = detectNoise(filtered);
    const statistics = computeStatistics(processed);
    const exceptionQueue = processed.filter(
      (r) =>
        r.status === 'NOISE_SUSPECTED' ||
        r.status === 'EXTREME_VALUE' ||
        r.status === 'PENDING_CONFIRM'
    );

    set({
      unifiedDataSource: {
        records: processed,
        statistics,
        exceptionQueue,
        filterCriteria,
        lastUpdated: new Date().toISOString(),
        calculationVersion: FORMULA_VERSION,
      },
    });
  },

  addRemark: (recordId: string, content: string, author: string) => {
    const { snapshots } = get();
    const version = getNextVersion(recordId, snapshots);
    const newRemark: Remark = {
      id: `rmk-${Date.now()}`,
      recordId,
      content,
      author,
      createdAt: new Date().toISOString(),
      version,
      isBackfilled: false,
      attachmentUrls: [],
    };
    set((state) => ({ remarks: [...state.remarks, newRemark] }));
    get().refreshDataSource();
  },

  confirmRecord: (recordId: string, newStatus: RecordStatus, reason: string, operator: string) => {
    const { rawRecords } = get();
    const recordIndex = rawRecords.findIndex((r) => r.id === recordId);
    if (recordIndex === -1) return;

    const oldRecord = rawRecords[recordIndex];
    const updatedRecord: DeflectionRecord = {
      ...oldRecord,
      status: newStatus,
    };

    const newRawRecords = [...rawRecords];
    newRawRecords[recordIndex] = updatedRecord;

    const newConfirmation: Confirmation = {
      id: `cfm-${Date.now()}`,
      recordId,
      valueBefore: oldRecord.deflectionValue,
      valueAfter: updatedRecord.deflectionValue,
      statusBefore: oldRecord.status,
      statusAfter: newStatus,
      reason,
      operator,
      confirmedAt: new Date().toISOString(),
      formulaVersion: FORMULA_VERSION,
    };

    const newSnapshot = createSnapshot(updatedRecord, operator);

    set((state) => ({
      rawRecords: newRawRecords,
      confirmations: [...state.confirmations, newConfirmation],
      snapshots: [...state.snapshots, newSnapshot],
    }));
    get().refreshDataSource();
  },

  recalibrateBoundary: (recordId: string) => {
    const { rawRecords } = get();
    const record = rawRecords.find((r) => r.id === recordId);
    if (!record) {
      return {
        recordId,
        originalValue: 0,
        recalculatedValue: 0,
        isConsistent: false,
        formulaUsed: '',
        chartData: [],
        timestamp: new Date().toISOString(),
      };
    }
    return recalcBoundary(record);
  },

  exportReport: async () => {
    const { unifiedDataSource, remarks, snapshots, confirmations } = get();
    if (!unifiedDataSource) {
      throw new Error('UnifiedDataSource is not initialized');
    }
    return exportReport(unifiedDataSource, remarks, snapshots, confirmations);
  },

  getStatistics: () => {
    return get().unifiedDataSource?.statistics ?? null;
  },

  getRecords: () => {
    return get().unifiedDataSource?.records ?? [];
  },

  getExceptionQueue: () => {
    return get().unifiedDataSource?.exceptionQueue ?? [];
  },

  getRecordHistory: (recordId: string) => {
    const { remarks, snapshots, confirmations } = get();
    const recordRemarks = remarks.filter((r) => r.recordId === recordId);
    const recordSnapshots = snapshots.filter((s) => s.recordId === recordId);
    const recordConfirmations = confirmations.filter((c) => c.recordId === recordId);

    if (recordRemarks.length === 0 && recordSnapshots.length === 0 && recordConfirmations.length === 0) {
      return null;
    }

    return {
      remarks: recordRemarks,
      snapshots: recordSnapshots,
      confirmations: recordConfirmations,
    };
  },
}));
