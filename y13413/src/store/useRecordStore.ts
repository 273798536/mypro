import { create } from 'zustand';
import type {
  ReviewRecord,
  Anomaly,
  RecordVersion,
  AnomalyType,
} from '@/types';
import {
  reviewRecords as mockRecordsData,
  anomalies as mockAnomaliesData,
} from '@/data/mockData';

const RECORDS_KEY = 'de-br-records';
const ANOMALIES_KEY = 'de-br-anomalies';

const loadRecords = (): ReviewRecord[] => {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (raw) return JSON.parse(raw) as ReviewRecord[];
  } catch {
    // ignore
  }
  return [];
};

const loadAnomalies = (): Anomaly[] => {
  try {
    const raw = localStorage.getItem(ANOMALIES_KEY);
    if (raw) return JSON.parse(raw) as Anomaly[];
  } catch {
    // ignore
  }
  return [];
};

const saveRecords = (records: ReviewRecord[]) => {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
};

const saveAnomalies = (anomalies: Anomaly[]) => {
  try {
    localStorage.setItem(ANOMALIES_KEY, JSON.stringify(anomalies));
  } catch {
    // ignore
  }
};

const transformVersion = (v: Record<string, unknown>): RecordVersion => ({
  id: v.id as string,
  version:
    (v.version as number) ?? (v.versionNumber as number) ?? 1,
  data: (v.data as Record<string, unknown>) || {},
  createdAt: v.createdAt as string,
  createdBy: (v.createdBy as string) || '',
  comment: v.comment as string | undefined,
  recordId: v.recordId as string | undefined,
  versionNumber: v.versionNumber as number | undefined,
  computationTrace: v.computationTrace as RecordVersion['computationTrace'],
  boundaryCheck: v.boundaryCheck as RecordVersion['boundaryCheck'],
  overwriteReason: v.overwriteReason as string | undefined,
});

const transformRecord = (r: Record<string, unknown>): ReviewRecord => ({
  id: r.id as string,
  batchId: r.batchId as string,
  recordNo: (r.recordNo as string) || (r.recordKey as string) || '',
  sourceFile: r.sourceFile as string,
  status: r.status as ReviewRecord['status'],
  currentVersionId: r.currentVersionId as string,
  versions: ((r.versions as Record<string, unknown>[]) || []).map(
    transformVersion
  ),
  isOutOfBounds: (r.isOutOfBounds as boolean) ?? false,
  consistencyCheck: (r.consistencyCheck as boolean) ?? true,
  createdAt: r.createdAt as string,
  updatedAt: (r.updatedAt as string) || (r.createdAt as string),
  recordKey: r.recordKey as string | undefined,
});

const transformAnomaly = (a: Record<string, unknown>): Anomaly => ({
  id: a.id as string,
  recordId: a.recordId as string,
  batchId: a.batchId as string,
  type: a.type as AnomalyType,
  field: a.field as string | undefined,
  description: a.description as string,
  severity: a.severity as Anomaly['severity'],
  resolved: (a.resolved as boolean) ?? false,
  createdAt: a.createdAt as string,
  detail: a.detail as Record<string, unknown> | undefined,
  suggestion: a.suggestion as string | undefined,
});

interface RecordState {
  records: ReviewRecord[];
  currentRecord: ReviewRecord | null;
  anomalies: Anomaly[];
}

interface RecordActions {
  initMock: () => void;
  getRecordById: (id: string) => ReviewRecord | undefined;
  getRecordsByBatch: (batchId: string) => ReviewRecord[];
  switchVersion: (
    recordId: string,
    versionId: string
  ) => RecordVersion | undefined;
  setCurrentRecord: (id: string | null) => void;
  getAnomaliesByBatch: (batchId: string) => Anomaly[];
  getAnomaliesByType: (type: AnomalyType) => Anomaly[];
}

export const useRecordStore = create<RecordState & RecordActions>(
  (set, get) => ({
    records: loadRecords(),
    currentRecord: null,
    anomalies: loadAnomalies(),

    initMock: () => {
      const records = mockRecordsData.map((r) =>
        transformRecord(r as unknown as Record<string, unknown>)
      );
      const anomalies = mockAnomaliesData.map((a) =>
        transformAnomaly(a as unknown as Record<string, unknown>)
      );
      saveRecords(records);
      saveAnomalies(anomalies);
      set({ records, anomalies });
    },

    getRecordById: (id: string) => {
      return get().records.find((r) => r.id === id);
    },

    getRecordsByBatch: (batchId: string) => {
      return get().records.filter((r) => r.batchId === batchId);
    },

    switchVersion: (recordId: string, versionId: string) => {
      const { records } = get();
      const record = records.find((r) => r.id === recordId);
      if (!record) return undefined;

      const version = record.versions.find((v) => v.id === versionId);
      if (!version) return undefined;

      const updatedRecords = records.map((r) => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          currentVersionId: versionId,
          updatedAt: new Date().toISOString(),
        };
      });

      saveRecords(updatedRecords);
      set({ records: updatedRecords });
      return version;
    },

    setCurrentRecord: (id: string | null) => {
      if (id === null) {
        set({ currentRecord: null });
        return;
      }
      const record = get().records.find((r) => r.id === id) || null;
      set({ currentRecord: record });
    },

    getAnomaliesByBatch: (batchId: string) => {
      return get().anomalies.filter((a) => a.batchId === batchId);
    },

    getAnomaliesByType: (type: AnomalyType) => {
      return get().anomalies.filter((a) => a.type === type);
    },
  })
);
