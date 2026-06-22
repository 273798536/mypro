import { create } from 'zustand';
import type {
  Batch,
  ProcessHistory,
  BatchFile,
  ReviewRule,
  RecordStatus,
} from '@/types';
import {
  batches as mockBatchesData,
  processHistories as mockHistoriesData,
} from '@/data/mockData';

const BATCHES_KEY = 'de-br-batches';
const HISTORIES_KEY = 'de-br-histories';

const loadBatches = (): Batch[] => {
  try {
    const raw = localStorage.getItem(BATCHES_KEY);
    if (raw) return JSON.parse(raw) as Batch[];
  } catch {
    // ignore
  }
  return [];
};

const loadHistories = (): ProcessHistory[] => {
  try {
    const raw = localStorage.getItem(HISTORIES_KEY);
    if (raw) return JSON.parse(raw) as ProcessHistory[];
  } catch {
    // ignore
  }
  return [];
};

const saveBatches = (batches: Batch[]) => {
  try {
    localStorage.setItem(BATCHES_KEY, JSON.stringify(batches));
  } catch {
    // ignore
  }
};

const saveHistories = (histories: ProcessHistory[]) => {
  try {
    localStorage.setItem(HISTORIES_KEY, JSON.stringify(histories));
  } catch {
    // ignore
  }
};

const transformBatch = (b: Record<string, unknown>): Batch => ({
  id: b.id as string,
  name: b.name as string,
  files: (b.files as BatchFile[]) || [],
  status: (b.status as Batch['status']) || 'pending',
  totalRecords: (b.totalRecords as number) || 0,
  newRecords:
    (b.newRecords as number) ?? (b.newCount as number) ?? 0,
  skippedRecords:
    (b.skippedRecords as number) ?? (b.skippedCount as number) ?? 0,
  anomalyRecords:
    (b.anomalyRecords as number) ?? (b.anomalyCount as number) ?? 0,
  approvedRecords: (b.approvedRecords as number) ?? 0,
  createdAt: b.createdAt as string,
  updatedAt: b.updatedAt as string,
  fileHash: b.fileHash as string | undefined,
});

const transformHistory = (h: Record<string, unknown>): ProcessHistory => ({
  id: h.id as string,
  batchId: h.batchId as string,
  recordId: (h.recordId as string) || '',
  action: h.action as string,
  operator: h.operator as string,
  timestamp: (h.timestamp as string) || (h.createdAt as string) || '',
  details: (h.details as string) || (h.summary as string) || undefined,
  summary: h.summary as string | undefined,
});

interface BatchState {
  batches: Batch[];
  currentBatch: Batch | null;
  processHistories: ProcessHistory[];
}

interface BatchActions {
  initMock: () => void;
  createBatch: (name: string, files?: BatchFile[]) => Batch;
  runBatch: (batchId: string, rules: ReviewRule[]) => void;
  getBatchHistory: (batchId: string) => ProcessHistory[];
  setCurrentBatch: (batchId: string | null) => void;
}

export const useBatchStore = create<BatchState & BatchActions>((set, get) => ({
  batches: loadBatches(),
  currentBatch: null,
  processHistories: loadHistories(),

  initMock: () => {
    const batches = mockBatchesData.map((b) =>
      transformBatch(b as unknown as Record<string, unknown>)
    );
    const processHistories = mockHistoriesData.map((h) =>
      transformHistory(h as unknown as Record<string, unknown>)
    );
    saveBatches(batches);
    saveHistories(processHistories);
    set({ batches, processHistories });
  },

  createBatch: (name: string, files: BatchFile[] = []) => {
    const now = new Date().toISOString();
    const newBatch: Batch = {
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      files,
      status: 'pending',
      totalRecords: 0,
      newRecords: 0,
      skippedRecords: 0,
      anomalyRecords: 0,
      approvedRecords: 0,
      createdAt: now,
      updatedAt: now,
    };
    const batches = [...get().batches, newBatch];
    saveBatches(batches);
    set({ batches });
    return newBatch;
  },

  runBatch: (batchId: string, rules: ReviewRule[]) => {
    const { batches, processHistories } = get();
    const now = new Date().toISOString();
    const enabledRules = rules.filter((r) => r.enabled);

    const updatedBatches = batches.map((b) => {
      if (b.id !== batchId) return b;
      return {
        ...b,
        status: 'running' as const,
        startedAt: now,
        updatedAt: now,
      };
    });

    const simulateRecordCount = 20;
    const newHistories: ProcessHistory[] = [];
    let newCount = 0;
    let skippedCount = 0;
    let anomalyCount = 0;
    let approvedCount = 0;

    for (let i = 0; i < simulateRecordCount; i++) {
      const rand = Math.random();
      let status: RecordStatus;
      let action: string;
      let details: string;

      if (rand < 0.1) {
        status = 'anomaly';
        anomalyCount++;
        action = 'flag_anomaly';
        details = `检测到异常: ${
          enabledRules[Math.floor(Math.random() * enabledRules.length)]
            ?.name || '未定义规则'
        }`;
      } else if (rand < 0.2) {
        status = 'skipped';
        skippedCount++;
        action = 'skip';
        details = '记录被跳过';
      } else if (rand < 0.6) {
        status = 'approved';
        approvedCount++;
        action = 'approve';
        details = '自动审核通过';
      } else {
        status = 'new';
        newCount++;
        action = 'process';
        details = '待人工审核';
      }

      newHistories.push({
        id: `ph-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        batchId,
        recordId: `rec-${batchId}-${i + 1}`,
        action,
        operator: 'system',
        timestamp: now,
        details,
      });
    }

    const finalBatches = updatedBatches.map((b) => {
      if (b.id !== batchId) return b;
      return {
        ...b,
        status: 'completed' as const,
        totalRecords: simulateRecordCount,
        newRecords: newCount,
        skippedRecords: skippedCount,
        anomalyRecords: anomalyCount,
        approvedRecords: approvedCount,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const finalHistories = [...processHistories, ...newHistories];
    saveBatches(finalBatches);
    saveHistories(finalHistories);
    set({ batches: finalBatches, processHistories: finalHistories });
  },

  getBatchHistory: (batchId: string) => {
    return get().processHistories.filter((h) => h.batchId === batchId);
  },

  setCurrentBatch: (batchId: string | null) => {
    if (batchId === null) {
      set({ currentBatch: null });
      return;
    }
    const batch = get().batches.find((b) => b.id === batchId) || null;
    set({ currentBatch: batch });
  },
}));
