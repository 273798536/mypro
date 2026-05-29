import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SupplierQuote,
  WeightConfig,
  JudgeNote,
  WeightChangeRecord,
  ScoredSupplier,
  Anomaly,
  ConsistencyReport,
} from '@/types';
import { scoreSuppliers } from '@/utils/scoring';
import { detectAnomalies } from '@/utils/anomaly';
import { runConsistencyCheck } from '@/utils/consistency';
import {
  SAMPLE_SUPPLIERS,
  DEFAULT_WEIGHTS,
  SAMPLE_NOTES,
  SAMPLE_WEIGHT_HISTORY,
} from '@/utils/sampleData';

interface StoreState {
  suppliers: SupplierQuote[];
  weights: WeightConfig;
  notes: JudgeNote[];
  weightHistory: WeightChangeRecord[];
  scoredSuppliers: ScoredSupplier[];
  anomalies: Anomaly[];
  consistencyReport: ConsistencyReport | null;
  lastCalculatedWeights: WeightConfig | null;
  lastCalculatedScores: ScoredSupplier[] | null;
  selectedAnomalyId: string | null;
  highlightedSupplierId: string | null;
  highlightedDimension: string | null;

  updateSupplier: (id: string, field: keyof SupplierQuote, value: string | number) => void;
  addSupplier: () => void;
  removeSupplier: (id: string) => void;
  setWeights: (weights: WeightConfig, operator: string) => void;
  addNote: (note: Omit<JudgeNote, 'id' | 'timestamp'>) => void;
  removeNote: (id: string) => void;
  recalculate: () => void;
  runConsistency: () => void;
  setSelectedAnomaly: (id: string | null) => void;
  highlightField: (supplierId: string | null, dimension: string | null) => void;
  resetToSample: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      suppliers: SAMPLE_SUPPLIERS,
      weights: DEFAULT_WEIGHTS,
      notes: SAMPLE_NOTES,
      weightHistory: SAMPLE_WEIGHT_HISTORY,
      scoredSuppliers: [],
      anomalies: [],
      consistencyReport: null,
      lastCalculatedWeights: null,
      lastCalculatedScores: null,
      selectedAnomalyId: null,
      highlightedSupplierId: null,
      highlightedDimension: null,

      updateSupplier: (id, field, value) => {
        set(state => ({
          suppliers: state.suppliers.map(s =>
            s.id === id ? { ...s, [field]: value } : s
          ),
        }));
      },

      addSupplier: () => {
        const newId = `s${Date.now()}`;
        set(state => ({
          suppliers: [
            ...state.suppliers,
            {
              id: newId,
              name: '新供应商',
              source: '手动录入',
              price: 0,
              energyConsumption: 0,
              afterSales: 0,
              deliveryPeriod: 0,
            },
          ],
        }));
      },

      removeSupplier: (id) => {
        set(state => ({
          suppliers: state.suppliers.filter(s => s.id !== id),
          notes: state.notes.filter(n => n.supplierId !== id),
        }));
      },

      setWeights: (weights, operator) => {
        const prev = get().weights;
        const changeRecord: WeightChangeRecord = {
          id: `wh${Date.now()}`,
          timestamp: Date.now(),
          previous: { ...prev },
          current: { ...weights },
          operator,
        };
        set(state => ({
          weights,
          weightHistory: [...state.weightHistory, changeRecord],
        }));
      },

      addNote: (note) => {
        set(state => ({
          notes: [
            ...state.notes,
            { ...note, id: `n${Date.now()}`, timestamp: Date.now() },
          ],
        }));
      },

      removeNote: (id) => {
        set(state => ({
          notes: state.notes.filter(n => n.id !== id),
        }));
      },

      recalculate: () => {
        const { suppliers, weights } = get();
        const scored = scoreSuppliers(suppliers, weights);
        const anomalies = detectAnomalies(suppliers);
        set({
          scoredSuppliers: scored,
          anomalies,
          lastCalculatedWeights: { ...weights },
          lastCalculatedScores: scored,
        });
      },

      runConsistency: () => {
        const { weights, scoredSuppliers, lastCalculatedWeights, lastCalculatedScores } = get();
        const report = runConsistencyCheck(
          weights,
          scoredSuppliers,
          lastCalculatedWeights,
          lastCalculatedScores
        );
        set({ consistencyReport: report });
      },

      setSelectedAnomaly: (id) => {
        set({ selectedAnomalyId: id });
      },

      highlightField: (supplierId, dimension) => {
        set({ highlightedSupplierId: supplierId, highlightedDimension: dimension });
      },

      resetToSample: () => {
        set({
          suppliers: SAMPLE_SUPPLIERS,
          weights: DEFAULT_WEIGHTS,
          notes: SAMPLE_NOTES,
          weightHistory: SAMPLE_WEIGHT_HISTORY,
          scoredSuppliers: [],
          anomalies: [],
          consistencyReport: null,
          lastCalculatedWeights: null,
          lastCalculatedScores: null,
          selectedAnomalyId: null,
          highlightedSupplierId: null,
          highlightedDimension: null,
        });
      },
    }),
    {
      name: 'scoring-ranker-storage',
      partialize: (state) => ({
        suppliers: state.suppliers,
        weights: state.weights,
        notes: state.notes,
        weightHistory: state.weightHistory,
      }),
    }
  )
);
