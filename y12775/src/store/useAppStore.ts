import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Reagent,
  Batch,
  Experiment,
  CalculationResult,
  RetestRecord,
} from '@/types';
import {
  mockReagents,
  mockBatches,
  mockExperiments,
  mockResults,
} from '@/data/mockData';
import { calculateWaterContentResult, type CalculationParams } from '@/utils/calculator';

interface AppState {
  reagents: Reagent[];
  batches: Batch[];
  experiments: Experiment[];
  results: CalculationResult[];
  retestRecords: RetestRecord[];
  currentExperimentId: string | null;
  currentResultId: string | null;
  initialized: boolean;

  initializeWithMock: () => void;
  setCurrentExperiment: (id: string | null) => void;
  setCurrentResult: (id: string | null) => void;

  addReagent: (reagent: Omit<Reagent, 'id' | 'createdAt'>) => void;
  updateReagent: (id: string, reagent: Partial<Reagent>) => void;
  deleteReagent: (id: string) => void;
  mergeDuplicateReagents: () => void;

  addBatch: (batch: Omit<Batch, 'id'>) => void;
  updateBatch: (id: string, batch: Partial<Batch>) => void;

  addExperiment: (experiment: Omit<Experiment, 'id' | 'createTime'>) => string;
  updateExperiment: (id: string, experiment: Partial<Experiment>) => void;

  runCalculation: (experimentId: string, params: CalculationParams) => {
    resultId: string | null;
    errors: string[];
    warnings: string[];
  };

  addRetestRecord: (record: Omit<RetestRecord, 'id' | 'createdAt'>) => void;
  getResultsByBatch: (batchId: string) => CalculationResult[];
  getExperimentsByBatch: (batchId: string) => Experiment[];
  getReagentById: (id: string) => Reagent | undefined;
  getBatchById: (id: string) => Batch | undefined;
  getExperimentById: (id: string) => Experiment | undefined;
  getResultById: (id: string) => CalculationResult | undefined;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      reagents: [],
      batches: [],
      experiments: [],
      results: [],
      retestRecords: [],
      currentExperimentId: null,
      currentResultId: null,
      initialized: false,

      initializeWithMock: () => {
        if (get().initialized) return;
        set({
          reagents: mockReagents,
          batches: mockBatches,
          experiments: mockExperiments,
          results: mockResults,
          initialized: true,
        });
      },

      setCurrentExperiment: (id) => set({ currentExperimentId: id }),
      setCurrentResult: (id) => set({ currentResultId: id }),

      addReagent: (reagent) =>
        set((state) => ({
          reagents: [
            ...state.reagents,
            { ...reagent, id: genId('reag'), createdAt: new Date().toISOString() },
          ],
        })),

      updateReagent: (id, reagent) =>
        set((state) => ({
          reagents: state.reagents.map((r) =>
            r.id === id ? { ...r, ...reagent } : r
          ),
        })),

      deleteReagent: (id) =>
        set((state) => ({
          reagents: state.reagents.filter((r) => r.id !== id),
        })),

      mergeDuplicateReagents: () => {
        const { reagents } = get();
        const seen = new Map<string, Reagent>();
        reagents.forEach((r) => {
          const existing = seen.get(r.code);
          if (!existing) {
            seen.set(r.code, { ...r });
          } else {
            const merged: Reagent = {
              ...existing,
              name: existing.name || r.name,
              batchNo: existing.batchNo || r.batchNo,
              purity: existing.purity || r.purity,
              expiryDate: existing.expiryDate || r.expiryDate,
              remark: [existing.remark, r.remark].filter(Boolean).join(' | '),
              status: existing.status === 'available' ? r.status : existing.status,
            };
            seen.set(r.code, merged);
          }
        });
        set({ reagents: Array.from(seen.values()) });
      },

      addBatch: (batch) =>
        set((state) => ({
          batches: [...state.batches, { ...batch, id: genId('bat') }],
        })),

      updateBatch: (id, batch) =>
        set((state) => ({
          batches: state.batches.map((b) =>
            b.id === id ? { ...b, ...batch } : b
          ),
        })),

      addExperiment: (experiment) => {
        const id = genId('exp');
        set((state) => ({
          experiments: [
            ...state.experiments,
            { ...experiment, id, createTime: new Date().toISOString() },
          ],
          currentExperimentId: id,
        }));
        return id;
      },

      updateExperiment: (id, experiment) =>
        set((state) => ({
          experiments: state.experiments.map((e) =>
            e.id === id ? { ...e, ...experiment } : e
          ),
        })),

      runCalculation: (experimentId, params) => {
        const output = calculateWaterContentResult(experimentId, params);
        if (output.result) {
          set((state) => {
            const existing = state.results.findIndex(
              (r) => r.experimentId === experimentId
            );
            let newResults;
            if (existing >= 0) {
              newResults = [...state.results];
              newResults[existing] = output.result!;
            } else {
              newResults = [...state.results, output.result!];
            }
            return {
              results: newResults,
              currentResultId: output.result!.id,
            };
          });
          return {
            resultId: output.result.id,
            errors: output.errors,
            warnings: output.warnings,
          };
        }
        return { resultId: null, errors: output.errors, warnings: output.warnings };
      },

      addRetestRecord: (record) =>
        set((state) => ({
          retestRecords: [
            ...state.retestRecords,
            { ...record, id: genId('rt'), createdAt: new Date().toISOString() },
          ],
        })),

      getResultsByBatch: (batchId) => {
        const { experiments, results } = get();
        const expIds = experiments
          .filter((e) => e.batchId === batchId)
          .map((e) => e.id);
        return results.filter((r) => expIds.includes(r.experimentId));
      },

      getExperimentsByBatch: (batchId) =>
        get().experiments.filter((e) => e.batchId === batchId),

      getReagentById: (id) => get().reagents.find((r) => r.id === id),
      getBatchById: (id) => get().batches.find((b) => b.id === id),
      getExperimentById: (id) => get().experiments.find((e) => e.id === id),
      getResultById: (id) => get().results.find((r) => r.id === id),
    }),
    {
      name: 'crystal-water-store',
    }
  )
);
