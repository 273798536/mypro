import { create } from 'zustand';
import { RiskAssessmentResult, WaterRecord, RiskMatrixCell } from '../types/risk';
import { generateMockTideData } from '../data/mockTideData';
import { generateMockWaterData } from '../data/mockWaterData';
import { assessRisk, buildRiskMatrix } from '../core/riskAssessment';
import { ZONE_NAMES } from '../data/mockMapData';
import { TaskStatus } from '../types/common';
import { useTaskStore } from './useTaskStore';

interface RiskState {
  waterRecords: WaterRecord[];
  riskMatrix: RiskMatrixCell[][];
  assessmentResult: RiskAssessmentResult | null;
  isLoading: boolean;

  loadWaterData: (taskId: string) => void;
  runAssessment: (taskId: string) => void;
}

export const useRiskStore = create<RiskState>((set, get) => ({
  waterRecords: [],
  riskMatrix: [],
  assessmentResult: null,
  isLoading: false,

  loadWaterData: (taskId) => {
    const records = generateMockWaterData(taskId);
    const tideLevels = ['低潮', '中低潮', '中潮', '中高潮', '高潮'];
    const salinityLevels = ['低盐', '中低盐', '中盐', '中高盐', '高盐'];
    const matrix = buildRiskMatrix(tideLevels, salinityLevels, ZONE_NAMES);
    set({ waterRecords: records, riskMatrix: matrix });
  },

  runAssessment: (taskId) => {
    set({ isLoading: true });
    setTimeout(() => {
      const tideData = generateMockTideData(taskId)
        .filter(r => r.tideLevel !== null)
        .map(r => ({ recordTime: r.recordTime, tideLevel: r.tideLevel as number }));
      const waterData = get().waterRecords.length > 0
        ? get().waterRecords
        : generateMockWaterData(taskId);

      const result = assessRisk(taskId, tideData, waterData, ZONE_NAMES);
      const tideLevels = ['低潮', '中低潮', '中潮', '中高潮', '高潮'];
      const salinityLevels = ['低盐', '中低盐', '中盐', '中高盐', '高盐'];
      const matrix = buildRiskMatrix(tideLevels, salinityLevels, ZONE_NAMES);

      set({
        assessmentResult: result,
        riskMatrix: matrix,
        isLoading: false,
      });

      useTaskStore.getState().updateTaskStatus(taskId, TaskStatus.RISK_ASSESSED);
    }, 500);
  },
}));
