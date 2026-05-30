import { create } from 'zustand';
import type {
  VectorFieldState,
  VectorFieldFormula,
  SeedPoint,
  FilterConditions,
  ColorScale,
  AnomalyType,
} from '@/types';
import { defaultFormulas } from '@/data/formulas';
import { defaultSeedPoints } from '@/data/seedPoints';
import { loadCustomFormulas, loadSeedPoints, loadColorScale, saveColorScale } from '@/utils/storage';
import { useDetectionStore } from './detectionStore';

interface VectorFieldActions {
  setCurrentFormula: (formulaId: string | null) => void;
  addFormula: (formula: VectorFieldFormula) => void;
  removeFormula: (formulaId: string) => void;
  setSeedPoints: (points: SeedPoint[]) => void;
  addSeedPoint: (point: SeedPoint) => void;
  removeSeedPoint: (pointId: string) => void;
  setColorScale: (scale: ColorScale | null) => void;
  updateFilterConditions: (conditions: Partial<FilterConditions>) => void;
  toggleAnomalyType: (type: AnomalyType) => void;
  setShowOnlyAnomalies: (show: boolean) => void;
  setSpeedRange: (range: [number, number]) => void;
  resetFilters: () => void;
  loadStoredData: () => void;
  initFromStorage: () => void;
  getCurrentFormula: () => VectorFieldFormula | null;
}

const initialFilterConditions: FilterConditions = {
  anomalyTypes: [],
  streamlineIds: [],
  speedRange: [0, 100],
  showOnlyAnomalies: false,
};

export const useVectorFieldStore = create<VectorFieldState & VectorFieldActions>(
  (set, get) => ({
    formulas: defaultFormulas,
    currentFormulaId: defaultFormulas[0]?.id || null,
    seedPoints: defaultSeedPoints,
    colorScale: null,
    filterConditions: initialFilterConditions,

    setCurrentFormula: (formulaId) => {
      set({ currentFormulaId: formulaId });
    },

    addFormula: (formula) => {
      set((state) => ({
        formulas: [...state.formulas, formula],
      }));
    },

    removeFormula: (formulaId) => {
      set((state) => ({
        formulas: state.formulas.filter((f) => f.id !== formulaId),
        currentFormulaId:
          state.currentFormulaId === formulaId
            ? state.formulas[0]?.id || null
            : state.currentFormulaId,
      }));
    },

    setSeedPoints: (points) => {
      set({ seedPoints: points });
    },

    addSeedPoint: (point) => {
      set((state) => ({
        seedPoints: [...state.seedPoints, point],
      }));
    },

    removeSeedPoint: (pointId) => {
      set((state) => ({
        seedPoints: state.seedPoints.filter((p) => p.id !== pointId),
      }));
    },

    setColorScale: (scale) => {
      const previousScale = get().colorScale;
      const currentResult = useDetectionStore.getState().currentResult;
      
      set({ colorScale: scale });
      
      if (scale) {
        saveColorScale(scale);
      }

      if (scale && !previousScale && currentResult) {
        const affectedAnomalyIds = currentResult.anomalies.map((a) => a.id);
        
        useDetectionStore.getState().addChangeRecord({
          type: 'color_scale',
          description: '补录颜色标尺，流线颜色将按速度映射显示',
          before: {
            hasColorScale: false,
          },
          after: {
            hasColorScale: true,
            colorScale: scale,
          },
          affectedIds: currentResult.streamlines.map((s) => s.id),
          affectedAnomalyIds,
          anomaliesBefore: currentResult.anomalies.length,
          anomaliesAfter: currentResult.anomalies.length,
        });

        const affectedStreamlines = currentResult.streamlines.map((s) => ({
          ...s,
          colorAffected: true,
        }));

        useDetectionStore.getState().setCurrentResult({
          ...currentResult,
          streamlines: affectedStreamlines,
          hasColorScale: true,
        });
      }
    },

    updateFilterConditions: (conditions) => {
      set((state) => ({
        filterConditions: {
          ...state.filterConditions,
          ...conditions,
        },
      }));
    },

    toggleAnomalyType: (type) => {
      set((state) => {
        const types = state.filterConditions.anomalyTypes;
        const newTypes = types.includes(type)
          ? types.filter((t) => t !== type)
          : [...types, type];
        return {
          filterConditions: {
            ...state.filterConditions,
            anomalyTypes: newTypes,
          },
        };
      });
    },

    setShowOnlyAnomalies: (show) => {
      set((state) => ({
        filterConditions: {
          ...state.filterConditions,
          showOnlyAnomalies: show,
        },
      }));
    },

    setSpeedRange: (range) => {
      set((state) => ({
        filterConditions: {
          ...state.filterConditions,
          speedRange: range,
        },
      }));
    },

    resetFilters: () => {
      set({ filterConditions: initialFilterConditions });
    },

    loadStoredData: () => {
      const customFormulas = loadCustomFormulas();
      const storedSeedPoints = loadSeedPoints();
      
      if (customFormulas.length > 0) {
        set((state) => ({
          formulas: [...defaultFormulas, ...customFormulas],
        }));
      }
      
      if (storedSeedPoints.length > 0) {
        set({ seedPoints: storedSeedPoints });
      }
    },

    initFromStorage: () => {
      const storedColorScale = loadColorScale();
      if (storedColorScale) {
        set({ colorScale: storedColorScale });
      }
      get().loadStoredData();
    },

    getCurrentFormula: () => {
      const state = get();
      return state.formulas.find((f) => f.id === state.currentFormulaId) || null;
    },
  })
);
