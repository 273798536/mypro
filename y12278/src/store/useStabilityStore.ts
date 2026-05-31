import { create } from 'zustand';
import type { StabilityResult, ExportReport } from '../types';
import { mockStabilityResult } from '../utils/mockData';
import { calculateStability } from '../utils/stabilityCalculator';
import { useShipStore } from './useShipStore';
import { useCargoStore } from './useCargoStore';
import { useVersionStore } from './useVersionStore';

interface StabilityState {
  result: StabilityResult | null;
  reports: ExportReport[];
  isCalculating: boolean;
  showAnnotations: boolean;
  showGrid: boolean;
  toggleAnnotations: () => void;
  toggleGrid: () => void;
  calculate: () => void;
  addManualCheckToResult: (checkId: string) => void;
  createReport: (screenshot?: string) => ExportReport;
  clearResult: () => void;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useStabilityStore = create<StabilityState>((set, get) => ({
  result: mockStabilityResult,
  reports: [],
  isCalculating: false,
  showAnnotations: true,
  showGrid: true,
  toggleAnnotations: () => set((state) => ({ showAnnotations: !state.showAnnotations })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  calculate: () => {
    set({ isCalculating: true });
    setTimeout(() => {
      const ship = useShipStore.getState().currentShip;
      const cells = useCargoStore.getState().cells;
      const ballast = useVersionStore.getState().getCurrentBallast();
      const weatherLevel = useVersionStore.getState().weatherLevel;

      if (!ballast) {
        set({ isCalculating: false });
        return;
      }

      const result = calculateStability(ship, cells, ballast, weatherLevel);
      const weatherEvidenceId = useVersionStore.getState().weatherEvidence.id;
      result.weatherEvidenceId = weatherEvidenceId;

      set({ result, isCalculating: false });
    }, 500);
  },
  addManualCheckToResult: (checkId) =>
    set((state) => {
      if (!state.result) return state;
      return {
        result: {
          ...state.result,
          manualCheckIds: [...state.result.manualCheckIds, checkId],
        },
      };
    }),
  createReport: (screenshot) => {
    const result = get().result;
    if (!result) throw new Error('No stability result available');

    const report: ExportReport = {
      id: generateId('REPORT'),
      stabilityResultId: result.id,
      shipModelId: result.shipModelId,
      cargoGridId: result.cargoGridId,
      ballastVersionId: result.ballastVersionId,
      screenshot,
      exportedAt: new Date().toISOString(),
      exporter: '当前用户',
    };

    set((state) => ({
      reports: [...state.reports, report],
    }));

    return report;
  },
  clearResult: () => set({ result: null }),
}));
