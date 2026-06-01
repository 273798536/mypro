import { create } from 'zustand';
import { AppState, WindParams, StreamLine, RiskPoint, ExportRecord } from '../types';
import { generateStreamLines } from '../utils/streamGenerator';
import { detectAllRisks } from '../utils/riskDetector';

const initialWindParams: WindParams = {
  speed: 30,
  yawAngle: 0,
  pitchAngle: 0,
  density: 1.225,
};

export const useAppStore = create<AppState & {
  setWindParams: (params: Partial<WindParams>) => void;
  setCompareWindParams: (params: WindParams | null) => void;
  updateStreamLines: () => void;
  toggleRiskLabels: () => void;
  toggleLegend: () => void;
  setViewMode: (mode: 'single' | 'compare') => void;
  addExportRecord: (record: ExportRecord) => void;
  setModelName: (name: string) => void;
}>((set, get) => ({
  currentWindParams: initialWindParams,
  compareWindParams: null,
  streamLines: [],
  riskPoints: [],
  dataGaps: [
    '注意：当前使用简化势流模型，未考虑真实湍流效应',
    '尾流区域数据精度有限，仅供教学参考',
  ],
  exportRecords: [],
  showRiskLabels: true,
  showLegend: true,
  viewMode: 'single',
  modelName: 'F1 概念赛车 v1.0',

  setWindParams: (params) => {
    set((state) => ({
      currentWindParams: { ...state.currentWindParams, ...params },
    }));
    get().updateStreamLines();
  },

  setCompareWindParams: (params) => {
    set({ compareWindParams: params });
  },

  updateStreamLines: () => {
    const { currentWindParams } = get();
    const streamLines = generateStreamLines(currentWindParams);
    const riskPoints = detectAllRisks(streamLines, currentWindParams);
    set({ streamLines, riskPoints });
  },

  toggleRiskLabels: () => {
    set((state) => ({ showRiskLabels: !state.showRiskLabels }));
  },

  toggleLegend: () => {
    set((state) => ({ showLegend: !state.showLegend }));
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  addExportRecord: (record) => {
    set((state) => ({
      exportRecords: [...state.exportRecords, record],
    }));
  },

  setModelName: (name) => {
    set({ modelName: name });
  },
}));
