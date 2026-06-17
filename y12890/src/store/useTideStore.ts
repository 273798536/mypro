import { create } from 'zustand';
import { TideRecord, TideChartPoint, HighLowTide, HarmonicComponent, TideCalculationResponse } from '../types/tide';
import { TideUnit, TaskStatus } from '../types/common';
import { generateMockTideData } from '../data/mockTideData';
import { calculateTideRecords } from '../core/tideCalculator';
import { useTaskStore } from './useTaskStore';

interface TideState {
  rawRecords: TideRecord[];
  calculatedRecords: TideRecord[];
  chartData: TideChartPoint[];
  highLowTides: HighLowTide[];
  harmonicComponents: HarmonicComponent[];
  calculationResult: TideCalculationResponse | null;
  isLoading: boolean;
  showOriginalTimezone: boolean;

  loadTideData: (taskId: string) => void;
  runCalculation: (taskId: string) => void;
  correctTimezone: (recordId: string, targetZone: string) => void;
  interpolateMissing: (recordIds: string[]) => void;
  toggleTimezoneDisplay: () => void;
}

export const useTideStore = create<TideState>((set, get) => ({
  rawRecords: [],
  calculatedRecords: [],
  chartData: [],
  highLowTides: [],
  harmonicComponents: [],
  calculationResult: null,
  isLoading: false,
  showOriginalTimezone: false,

  loadTideData: (taskId) => {
    const records = generateMockTideData(taskId);
    set({ rawRecords: records, calculatedRecords: records });
  },

  runCalculation: (taskId) => {
    set({ isLoading: true });
    setTimeout(() => {
      const rawRecords = get().rawRecords.length > 0 ? get().rawRecords : generateMockTideData(taskId);
      const result = calculateTideRecords(rawRecords, 'Asia/Shanghai', TideUnit.METER);

      const combinedRecords = rawRecords.map((record, index) => {
        const calcResult = result.results[index];
        return {
          ...record,
          tideLevel: calcResult?.tideLevel ?? record.tideLevel,
          explanation: calcResult?.explanation ?? record.note ?? '',
        };
      });

      set({
        rawRecords,
        calculatedRecords: combinedRecords,
        chartData: result.chartData,
        highLowTides: result.highLows,
        harmonicComponents: result.harmonicComponents,
        calculationResult: result,
        isLoading: false,
      });

      useTaskStore.getState().updateTaskStatus(taskId, TaskStatus.TIDE_CALCULATED);
    }, 500);
  },

  correctTimezone: (recordId, targetZone) => {
    set(state => ({
      calculatedRecords: state.calculatedRecords.map(r => {
        if (r.id !== recordId) return r;
        const corrected = calculateTideRecords(
          state.rawRecords.filter(raw => raw.id === recordId),
          targetZone
        );
        return { ...r, tideLevel: corrected.results[0]?.tideLevel ?? r.tideLevel };
      }),
    }));
  },

  interpolateMissing: (recordIds) => {
    const { rawRecords } = get();
    const updated = rawRecords.map(r => {
      if (!recordIds.includes(r.id)) return r;
      return { ...r, tideLevel: 1.5 };
    });
    set({ rawRecords: updated });
  },

  toggleTimezoneDisplay: () => {
    set(state => ({ showOriginalTimezone: !state.showOriginalTimezone }));
  },
}));
