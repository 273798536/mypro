import { create } from 'zustand';
import type { Batch, WeighingRow, ExperimentRecord, ReactionTime } from '@/types';
import {
  MOCK_BATCH, MOCK_WEIGHING_ROWS, MOCK_EXPERIMENT_RECORDS, MOCK_REACTION_TIMES,
} from '@/data/mockBatch';

interface ExperimentState {
  batch: Batch;
  weighingRows: WeighingRow[];
  experimentRecords: ExperimentRecord[];
  reactionTimes: ReactionTime[];
  setBatch: (batch: Batch) => void;
  updateBatch: (updates: Partial<Batch>) => void;
  addWeighingRow: (row: Omit<WeighingRow, 'id' | 'batchId'>) => void;
  updateWeighingRow: (id: string, updates: Partial<WeighingRow>) => void;
  removeWeighingRow: (id: string) => void;
  addExperimentRecord: (record: Omit<ExperimentRecord, 'id' | 'batchId'>) => void;
  updateExperimentRecord: (id: string, updates: Partial<ExperimentRecord>) => void;
  removeExperimentRecord: (id: string) => void;
  addReactionTime: (rt: Omit<ReactionTime, 'id' | 'batchId'>) => void;
  updateReactionTime: (id: string, updates: Partial<ReactionTime>) => void;
  removeReactionTime: (id: string) => void;
  loadMockData: () => void;
  resetData: () => void;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

const emptyBatch: Batch = {
  id: generateId(),
  name: '',
  operator: '',
  createdAt: new Date().toLocaleString('zh-CN'),
  status: '录入中',
  sourceNote: '',
};

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  batch: emptyBatch,
  weighingRows: [],
  experimentRecords: [],
  reactionTimes: [],

  setBatch: (batch) => set({ batch }),
  updateBatch: (updates) => set((state) => ({ batch: { ...state.batch, ...updates } })),

  addWeighingRow: (row) => set((state) => ({
    weighingRows: [...state.weighingRows, { ...row, id: generateId(), batchId: state.batch.id }],
  })),
  updateWeighingRow: (id, updates) => set((state) => ({
    weighingRows: state.weighingRows.map((r) => (r.id === id ? { ...r, ...updates } : r)),
  })),
  removeWeighingRow: (id) => set((state) => ({
    weighingRows: state.weighingRows.filter((r) => r.id !== id),
  })),

  addExperimentRecord: (record) => set((state) => ({
    experimentRecords: [...state.experimentRecords, { ...record, id: generateId(), batchId: state.batch.id }],
  })),
  updateExperimentRecord: (id, updates) => set((state) => ({
    experimentRecords: state.experimentRecords.map((r) => (r.id === id ? { ...r, ...updates } : r)),
  })),
  removeExperimentRecord: (id) => set((state) => ({
    experimentRecords: state.experimentRecords.filter((r) => r.id !== id),
  })),

  addReactionTime: (rt) => set((state) => ({
    reactionTimes: [...state.reactionTimes, { ...rt, id: generateId(), batchId: state.batch.id }],
  })),
  updateReactionTime: (id, updates) => set((state) => ({
    reactionTimes: state.reactionTimes.map((r) => (r.id === id ? { ...r, ...updates } : r)),
  })),
  removeReactionTime: (id) => set((state) => ({
    reactionTimes: state.reactionTimes.filter((r) => r.id !== id),
  })),

  loadMockData: () => set({
    batch: MOCK_BATCH,
    weighingRows: [...MOCK_WEIGHING_ROWS],
    experimentRecords: [...MOCK_EXPERIMENT_RECORDS],
    reactionTimes: [...MOCK_REACTION_TIMES],
  }),

  resetData: () => set({
    batch: { ...emptyBatch, id: generateId(), createdAt: new Date().toLocaleString('zh-CN') },
    weighingRows: [],
    experimentRecords: [],
    reactionTimes: [],
  }),
}));
