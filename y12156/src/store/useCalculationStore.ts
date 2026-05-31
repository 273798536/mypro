import { create } from 'zustand';
import {
  ThermalBridgeCalculation,
  CalculationResult,
  WallConstruction,
  MaterialLibrary,
  EnvironmentParams,
  DataConflict,
  ValidationIssue,
  TaskStatus,
} from '../types';
import { mockCalculation, mockCalculations } from '../mock/calculations';
import { detectConflicts, resolveConflict, autoResolveConflicts } from '../utils/conflictDetector';
import { validateAll, hasBlockingIssues } from '../utils/dataValidator';
import { performCalculationAsync } from '../utils/calculationEngine';
import { generateId } from '../utils/formatters';

interface CalculationState {
  calculations: ThermalBridgeCalculation[];
  currentCalculation: ThermalBridgeCalculation | null;
  isCalculating: boolean;
  calculationProgress: number;
  calculationMessage: string;

  setCurrentCalculation: (id: string) => void;
  createNewCalculation: (name: string) => void;
  updateWallConstruction: (construction: WallConstruction) => void;
  updateMaterialLibrary: (library: MaterialLibrary) => void;
  updateEnvironmentParams: (params: EnvironmentParams) => void;

  detectAndSetConflicts: () => void;
  resolveDataConflict: (
    conflictId: string,
    choice: 'construction' | 'material' | 'custom',
    customValue?: number | string
  ) => void;
  autoResolveAllConflicts: (strategy: 'prefer_construction' | 'prefer_material') => void;

  validateAndSetIssues: () => void;

  performCalculation: () => Promise<void>;

  updateCalculationStatus: () => void;
}

export const useCalculationStore = create<CalculationState>((set, get) => ({
  calculations: mockCalculations,
  currentCalculation: mockCalculation,
  isCalculating: false,
  calculationProgress: 0,
  calculationMessage: '',

  setCurrentCalculation: (id: string) => {
    const calculation = get().calculations.find(c => c.id === id);
    set({ currentCalculation: calculation || null });
  },

  createNewCalculation: (name: string) => {
    const newCalc: ThermalBridgeCalculation = {
      id: generateId(),
      name,
      wallConstruction: {
        id: generateId(),
        name: '新建墙体构造',
        nodes: [],
        maintainedBy: '当前用户',
        lastUpdated: new Date(),
      },
      materialLibrary: {
        id: generateId(),
        name: '材料库',
        materials: [],
        maintainedBy: '当前用户',
        lastUpdated: new Date(),
      },
      environmentParams: {
        indoorTemperature: 20,
        outdoorTemperature: -5,
        calculationPeriod: 30,
      },
      conflicts: [],
      validationIssues: [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set(state => ({
      calculations: [...state.calculations, newCalc],
      currentCalculation: newCalc,
    }));
  },

  updateWallConstruction: (construction: WallConstruction) => {
    set(state => {
      if (!state.currentCalculation) return state;
      const updated = {
        ...state.currentCalculation,
        wallConstruction: construction,
        updatedAt: new Date(),
      };
      return {
        currentCalculation: updated,
        calculations: state.calculations.map(c =>
          c.id === updated.id ? updated : c
        ),
      };
    });
    get().updateCalculationStatus();
  },

  updateMaterialLibrary: (library: MaterialLibrary) => {
    set(state => {
      if (!state.currentCalculation) return state;
      const updated = {
        ...state.currentCalculation,
        materialLibrary: library,
        updatedAt: new Date(),
      };
      return {
        currentCalculation: updated,
        calculations: state.calculations.map(c =>
          c.id === updated.id ? updated : c
        ),
      };
    });
    get().updateCalculationStatus();
  },

  updateEnvironmentParams: (params: EnvironmentParams) => {
    set(state => {
      if (!state.currentCalculation) return state;
      const updated = {
        ...state.currentCalculation,
        environmentParams: params,
        updatedAt: new Date(),
      };
      return {
        currentCalculation: updated,
        calculations: state.calculations.map(c =>
          c.id === updated.id ? updated : c
        ),
      };
    });
    get().updateCalculationStatus();
  },

  detectAndSetConflicts: () => {
    set(state => {
      if (!state.currentCalculation) return state;

      const conflicts = detectConflicts(
        state.currentCalculation.wallConstruction,
        state.currentCalculation.materialLibrary
      );

      const updated = {
        ...state.currentCalculation,
        conflicts,
        updatedAt: new Date(),
      };

      return {
        currentCalculation: updated,
        calculations: state.calculations.map(c =>
          c.id === updated.id ? updated : c
        ),
      };
    });
    get().updateCalculationStatus();
  },

  resolveDataConflict: (
    conflictId: string,
    choice: 'construction' | 'material' | 'custom',
    customValue?: number | string
  ) => {
    set(state => {
      if (!state.currentCalculation) return state;

      const conflictIndex = state.currentCalculation.conflicts.findIndex(
        c => c.id === conflictId
      );

      if (conflictIndex === -1) return state;

      const conflict = state.currentCalculation.conflicts[conflictIndex];
      const resolved = resolveConflict(conflict, choice, customValue, '当前用户');

      const newConflicts = [...state.currentCalculation.conflicts];
      newConflicts[conflictIndex] = resolved;

      const updated = {
        ...state.currentCalculation,
        conflicts: newConflicts,
        updatedAt: new Date(),
      };

      return {
        currentCalculation: updated,
        calculations: state.calculations.map(c =>
          c.id === updated.id ? updated : c
        ),
      };
    });
    get().updateCalculationStatus();
  },

  autoResolveAllConflicts: (strategy: 'prefer_construction' | 'prefer_material') => {
    set(state => {
      if (!state.currentCalculation) return state;

      const resolved = autoResolveConflicts(
        state.currentCalculation.conflicts,
        strategy
      );

      const updated = {
        ...state.currentCalculation,
        conflicts: resolved,
        updatedAt: new Date(),
      };

      return {
        currentCalculation: updated,
        calculations: state.calculations.map(c =>
          c.id === updated.id ? updated : c
        ),
      };
    });
    get().updateCalculationStatus();
  },

  validateAndSetIssues: () => {
    set(state => {
      if (!state.currentCalculation) return state;

      const issues = validateAll(
        state.currentCalculation.wallConstruction,
        state.currentCalculation.materialLibrary,
        state.currentCalculation.environmentParams
      );

      const updated = {
        ...state.currentCalculation,
        validationIssues: issues,
        updatedAt: new Date(),
      };

      return {
        currentCalculation: updated,
        calculations: state.calculations.map(c =>
          c.id === updated.id ? updated : c
        ),
      };
    });
    get().updateCalculationStatus();
  },

  performCalculation: async () => {
    const { currentCalculation } = get();
    if (!currentCalculation) return;

    set({ isCalculating: true, calculationProgress: 0, calculationMessage: '正在准备计算...' });

    try {
      const result = await performCalculationAsync(
        currentCalculation,
        (progress, message) => {
          set({ calculationProgress: progress, calculationMessage: message });
        }
      );

      set(state => {
        if (!state.currentCalculation) return state;

        const newStatus: TaskStatus = result.status === 'failed' ? 'failed' : 'completed';

        const updated: ThermalBridgeCalculation = {
          ...state.currentCalculation,
          result,
          status: newStatus,
          updatedAt: new Date(),
        };

        return {
          currentCalculation: updated,
          calculations: state.calculations.map(c =>
            c.id === updated.id ? updated : c
          ),
          isCalculating: false,
          calculationProgress: 100,
          calculationMessage: '计算完成',
        };
      });
    } catch (error) {
      set({
        isCalculating: false,
        calculationProgress: 0,
        calculationMessage: `计算失败: ${(error as Error).message}`,
      });
    }
  },

  updateCalculationStatus: () => {
    set(state => {
      if (!state.currentCalculation) return state;

      const { conflicts, validationIssues } = state.currentCalculation;
      const unresolvedConflicts = conflicts.filter(c => !c.resolved).length;
      const hasErrors = hasBlockingIssues(validationIssues);

      let status: ThermalBridgeCalculation['status'] = 'draft';

      if (conflicts.length > 0 && unresolvedConflicts > 0) {
        status = 'conflict_pending';
      } else if (validationIssues.length > 0 && hasErrors) {
        status = 'validation_failed';
      } else if (state.currentCalculation.result) {
        status = 'completed';
      } else {
        status = 'ready';
      }

      if (status === state.currentCalculation.status) return state;

      const updated = {
        ...state.currentCalculation,
        status,
      };

      return {
        currentCalculation: updated,
        calculations: state.calculations.map(c =>
          c.id === updated.id ? updated : c
        ),
      };
    });
  },
}));
