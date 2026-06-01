import { create } from 'zustand';
import type {
  AppState,
  Action,
  Experiment,
  CalculationResult,
  AnomalyRecord,
} from '@/types';
import { calculateBatch } from '@/core/heatConduction';
import { processAllAnomalies } from '@/core/anomalyDetection';
import { loadState, saveState } from '@/utils/storage';

interface AppStore extends AppState {
  dispatch: (action: Action) => void;
  calculateAll: () => void;
  recalculateSingle: (experimentId: string) => void;
}

const initialState: AppState = {
  experiments: [],
  results: [],
  anomalies: [],
  selectedBatchId: null,
  isCalculating: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'IMPORT_DATA': {
      const existingIds = new Set(state.experiments.map((e) => e.id));
      const newExperiments = action.payload.filter((e) => !existingIds.has(e.id));
      const mergedExperiments = [...state.experiments];

      action.payload.forEach((newExp) => {
        const existingIndex = mergedExperiments.findIndex((e) => e.id === newExp.id);
        if (existingIndex >= 0) {
          const existing = mergedExperiments[existingIndex];
          if (!existing.isLocked) {
            mergedExperiments[existingIndex] = {
              ...newExp,
              status: existing.status,
              isLocked: existing.isLocked,
              createdAt: existing.createdAt,
              updatedAt: new Date().toISOString(),
            };
          }
        } else {
          mergedExperiments.push(newExp);
        }
      });

      return {
        ...state,
        experiments: mergedExperiments,
      };
    }

    case 'UPDATE_EXPERIMENT': {
      return {
        ...state,
        experiments: state.experiments.map((e) =>
          e.id === action.payload.id && !e.isLocked
            ? { ...e, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : e
        ),
      };
    }

    case 'LOCK_EXPERIMENT': {
      return {
        ...state,
        experiments: state.experiments.map((e) =>
          e.id === action.payload ? { ...e, isLocked: true } : e
        ),
      };
    }

    case 'UNLOCK_EXPERIMENT': {
      return {
        ...state,
        experiments: state.experiments.map((e) =>
          e.id === action.payload ? { ...e, isLocked: false } : e
        ),
        results: state.results.filter((r) => r.experimentId !== action.payload),
        anomalies: state.anomalies.filter((a) => a.experimentId !== action.payload),
      };
    }

    case 'SET_CALCULATING': {
      return { ...state, isCalculating: action.payload };
    }

    case 'CALCULATION_COMPLETE': {
      const updatedExperimentMap = new Map(
        action.payload.updatedExperiments.map((e) => [e.id, e])
      );

      const newExperiments = state.experiments.map((e) =>
        updatedExperimentMap.has(e.id) ? updatedExperimentMap.get(e.id)! : e
      );

      const existingResultIds = new Set(
        state.results.map((r) => r.experimentId)
      );
      const newResults = [
        ...state.results.filter(
          (r) =>
            !action.payload.results.some(
              (nr) => nr.experimentId === r.experimentId
            )
        ),
        ...action.payload.results,
      ];

      const existingAnomalyIds = new Set(
        state.anomalies.map((a) => a.experimentId)
      );
      const newAnomalies = [
        ...state.anomalies.filter(
          (a) =>
            !action.payload.anomalies.some(
              (na) => na.experimentId === a.experimentId
            )
        ),
        ...action.payload.anomalies,
      ];

      return {
        ...state,
        experiments: newExperiments,
        results: newResults,
        anomalies: newAnomalies,
        isCalculating: false,
      };
    }

    case 'CONFIRM_PENDING': {
      return {
        ...state,
        experiments: state.experiments.map((e) =>
          e.id === action.payload
            ? { ...e, status: 'confirmed', updatedAt: new Date().toISOString() }
            : e
        ),
        anomalies: state.anomalies.filter((a) => {
          if (a.experimentId !== action.payload) return true;
          return a.severity === 'error';
        }),
      };
    }

    case 'REJECT_PENDING': {
      return {
        ...state,
        experiments: state.experiments.map((e) =>
          e.id === action.payload
            ? { ...e, status: 'anomaly', isLocked: true, updatedAt: new Date().toISOString() }
            : e
        ),
      };
    }

    case 'RECALCULATE_SINGLE': {
      return {
        ...state,
        experiments: state.experiments.map((e) =>
          e.id === action.payload
            ? { ...e, isLocked: false, updatedAt: new Date().toISOString() }
            : e
        ),
        results: state.results.filter((r) => r.experimentId !== action.payload),
        anomalies: state.anomalies.filter((a) => a.experimentId !== action.payload),
      };
    }

    case 'CLEAR_ALL': {
      return initialState;
    }

    default:
      return state;
  }
}

export const useAppStore = create<AppStore>((set, get) => {
  const savedState = loadState();

  return {
    ...(savedState || initialState),

    dispatch: (action: Action) => {
      set((state) => {
        const newState = reducer(state, action);
        saveState(newState);
        return newState;
      });
    },

    calculateAll: () => {
      const state = get();
      const unlockedExperiments = state.experiments.filter((e) => !e.isLocked);

      if (unlockedExperiments.length === 0) return;

      set({ isCalculating: true });

      setTimeout(() => {
        const { results, updatedExperiments } = calculateBatch(
          unlockedExperiments,
          (current, total) => {
            console.log(`计算进度: ${current}/${total}`);
          }
        );

        const { anomalies, updatedExperiments: expWithAnomalies } =
          processAllAnomalies(updatedExperiments);

        const finalExperiments = expWithAnomalies.map((exp) => {
          if (exp.status === 'confirmed') {
            const result = results.find((r) => r.experimentId === exp.id);
            if (result) {
              const hasCalculationError =
                isNaN(result.thermalConductivity) || result.rSquared < 0.95;
              const newStatus: 'anomaly' | 'normal' = hasCalculationError ? 'anomaly' : 'normal';
              return {
                ...exp,
                status: newStatus,
                isLocked: true,
              };
            }
          }
          return exp;
        });

        set((state) => {
          const newState = reducer(state, {
            type: 'CALCULATION_COMPLETE',
            payload: {
              results,
              anomalies,
              updatedExperiments: finalExperiments,
            },
          });
          saveState(newState);
          return newState;
        });
      }, 100);
    },

    recalculateSingle: (experimentId: string) => {
      const state = get();
      const experiment = state.experiments.find((e) => e.id === experimentId);
      if (!experiment) return;

      set((state) => ({
        ...state,
        experiments: state.experiments.map((e) =>
          e.id === experimentId ? { ...e, isLocked: false } : e
        ),
        results: state.results.filter((r) => r.experimentId !== experimentId),
        anomalies: state.anomalies.filter((a) => a.experimentId !== experimentId),
      }));

      setTimeout(() => {
        const currentState = get();
        const expToRecalc = currentState.experiments.find(
          (e) => e.id === experimentId
        );
        if (!expToRecalc) return;

        const { results, updatedExperiments } = calculateBatch([expToRecalc]);
        const { anomalies, updatedExperiments: expWithAnomalies } =
          processAllAnomalies(updatedExperiments);

        set((state) => {
          const newState = reducer(state, {
            type: 'CALCULATION_COMPLETE',
            payload: { results, anomalies, updatedExperiments: expWithAnomalies },
          });
          saveState(newState);
          return newState;
        });
      }, 100);
    },
  };
});
