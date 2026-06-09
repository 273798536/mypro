import { create } from 'zustand';
import type { GCRecord, RecordStatus, Peak, OperationLog } from '@/types';
import { sampleRecords } from '@/data/samples';
import { calculateBalance } from '@/utils/calculation';
import { validatePeaks, autoMarkStatus } from '@/utils/validation';

interface RecordState {
  records: GCRecord[];
  loaded: boolean;
  loadRecords: () => void;
  getRecord: (id: string) => GCRecord | undefined;
  addRecord: (r: Omit<GCRecord, 'id' | 'createdAt' | 'updatedAt'>) => GCRecord;
  updateRecord: (id: string, patch: Partial<GCRecord>) => void;
  updateRecordStatus: (id: string, status: RecordStatus, operator: string, reason?: string) => void;
  recalculateBalance: (id: string) => void;
  revalidatePeaks: (id: string) => void;
  addOperationLog: (id: string, log: Omit<OperationLog, 'id' | 'timestamp'>) => void;
}

const STORAGE_KEY = 'gc_records_v1';

function loadFromStorage(): GCRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return [];
}

function saveToStorage(records: GCRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (_) { /* ignore */ }
}

export const useRecordStore = create<RecordState>((set, get) => ({
  records: [],
  loaded: false,
  loadRecords: () => {
    const stored = loadFromStorage();
    if (stored.length === 0) {
      saveToStorage(sampleRecords);
      set({ records: sampleRecords, loaded: true });
    } else {
      set({ records: stored, loaded: true });
    }
  },
  getRecord: (id) => get().records.find(r => r.id === id),
  addRecord: (r) => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const id = `rec-${Date.now()}`;
    const newRecord: GCRecord = { ...r, id, createdAt: now, updatedAt: now };
    const { peaks, issues } = validatePeaks(newRecord.peaks);
    newRecord.peaks = peaks;
    if (issues.nullCount || issues.duplicateCount || issues.outlierCount) {
      newRecord.status = autoMarkStatus(issues);
    }
    const next = [...get().records, newRecord];
    saveToStorage(next);
    set({ records: next });
    return newRecord;
  },
  updateRecord: (id, patch) => {
    const next = get().records.map(r =>
      r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') } : r
    );
    saveToStorage(next);
    set({ records: next });
  },
  updateRecordStatus: (id, status, operator, reason) => {
    const record = get().getRecord(id);
    if (!record) return;
    get().addOperationLog(id, {
      recordId: id,
      operator,
      actionType: 'update_status',
      oldValue: record.status,
      newValue: status,
      reason,
    });
    get().updateRecord(id, { status });
  },
  recalculateBalance: (id) => {
    const record = get().getRecord(id);
    if (!record) return;
    const result = calculateBalance(record.peaks);
    result.recordId = id;
    get().updateRecord(id, { calculationResult: result });
    get().addOperationLog(id, {
      recordId: id,
      operator: '系统',
      actionType: 'recalculate',
      reason: `使用${result.method === 'normalization' ? '归一化法' : result.method}重新计算`,
    });
  },
  revalidatePeaks: (id) => {
    const record = get().getRecord(id);
    if (!record) return;
    const { peaks, issues } = validatePeaks(record.peaks);
    const status = autoMarkStatus(issues);
    get().updateRecord(id, { peaks, status });
  },
  addOperationLog: (id, log) => {
    const record = get().getRecord(id);
    if (!record) return;
    const newLog: OperationLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    get().updateRecord(id, {
      operationLogs: [...record.operationLogs, newLog],
    } as Partial<GCRecord>);
  },
}));

export type UseRecordStore = RecordState;
export default useRecordStore;
