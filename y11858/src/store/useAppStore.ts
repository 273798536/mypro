import { create } from 'zustand';
import type {
  OrbitalParams,
  VisualizationSettings,
  SliceSettings,
  RunResult,
  ColorMapName,
} from '../types';
import { generateVolumeData, numericalIntegral } from '../utils/orbitalCalculations';
import {
  checkNormalization,
  checkColorScale,
  checkSliceBounds,
  classifyResult,
  compareRuns,
} from '../utils/analysis';
import { getPresetById } from '../utils/presets';

const DEFAULT_PARAMS: OrbitalParams = {
  id: '1s',
  name: '1s 轨道',
  n: 1,
  l: 0,
  m: 0,
  isNormalized: true,
  description: '基态氢原子轨道，球对称分布',
};

const DEFAULT_VIZ: VisualizationSettings = {
  resolution: 48,
  gridSize: 10,
  colorMap: 'quantum',
  colorRange: [0, 1],
  useLogScale: false,
  isoThreshold: 0.15,
  isoOpacity: 0.6,
  volumeOpacity: 0.4,
  showIsosurface: true,
  showVolume: true,
};

const DEFAULT_SLICE: SliceSettings = {
  xEnabled: false,
  yEnabled: false,
  zEnabled: false,
  xPosition: 0,
  yPosition: 0,
  zPosition: 0,
  sliceOpacity: 0.8,
  showGrid: true,
};

interface AppState {
  currentParams: OrbitalParams;
  vizSettings: VisualizationSettings;
  sliceSettings: SliceSettings;
  volumeData: Float32Array | null;
  currentResult: RunResult | null;
  runHistory: RunResult[];
  selectedRuns: string[];
  isCalculating: boolean;
  comparisonChanges: ReturnType<typeof compareRuns> | null;

  setParams: (params: Partial<OrbitalParams>) => void;
  setVizSettings: (settings: Partial<VisualizationSettings>) => void;
  setSliceSettings: (settings: Partial<SliceSettings>) => void;
  runCalculation: () => void;
  loadPreset: (presetId: string) => void;
  selectRun: (runId: string) => void;
  deselectRun: (runId: string) => void;
  compareSelected: () => void;
  clearHistory: () => void;
  setColorMap: (name: ColorMapName) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentParams: DEFAULT_PARAMS,
  vizSettings: DEFAULT_VIZ,
  sliceSettings: DEFAULT_SLICE,
  volumeData: null,
  currentResult: null,
  runHistory: [],
  selectedRuns: [],
  isCalculating: false,
  comparisonChanges: null,

  setParams: (params) => {
    const current = get().currentParams;
    const newParams = { ...current, ...params };
    if (params.n !== undefined) {
      if (newParams.l >= newParams.n) newParams.l = newParams.n - 1;
      if (Math.abs(newParams.m) > newParams.l) newParams.m = 0;
    }
    if (params.l !== undefined) {
      if (Math.abs(newParams.m) > newParams.l) newParams.m = 0;
    }
    set({ currentParams: newParams, comparisonChanges: null });
  },

  setVizSettings: (settings) => {
    set((state) => ({
      vizSettings: { ...state.vizSettings, ...settings },
      comparisonChanges: null,
    }));
  },

  setSliceSettings: (settings) => {
    set((state) => ({
      sliceSettings: { ...state.sliceSettings, ...settings },
      comparisonChanges: null,
    }));
  },

  runCalculation: () => {
    const { currentParams, vizSettings, sliceSettings, runHistory } = get();
    set({ isCalculating: true });

    try {
      const volumeData = generateVolumeData(currentParams, vizSettings);

      const normCheck = checkNormalization(
        volumeData,
        vizSettings.gridSize,
        vizSettings.resolution
      );

      const colorCheck = checkColorScale(
        volumeData,
        vizSettings.colorRange,
        vizSettings.useLogScale
      );

      const sliceCheck = checkSliceBounds(sliceSettings, vizSettings.gridSize);

      const classification = classifyResult(normCheck, colorCheck, sliceCheck);

      const warnings: string[] = [];
      if (!normCheck.passed) {
        warnings.push(
          `归一化积分值 = ${normCheck.integralValue.toFixed(4)}，偏离1超过容差${normCheck.tolerance}`
        );
      }
      colorCheck.issues.forEach((issue) => {
        warnings.push(`[${issue.severity === 'error' ? '严重' : '警告'}] ${issue.message}`);
      });
      sliceCheck.violations.forEach((v) => {
        warnings.push(
          `${v.axis.toUpperCase()}切片位置${v.requestedValue.toFixed(2)}越界，已修正为${v.correctedValue.toFixed(2)}`
        );
      });

      const integralVal = numericalIntegral(volumeData, vizSettings.gridSize, vizSettings.resolution);

      const result: RunResult = {
        id: `run-${Date.now()}`,
        timestamp: Date.now(),
        params: { ...currentParams },
        vizSettings: { ...vizSettings },
        sliceSettings: { ...sliceSettings },
        normalizationCheck: normCheck,
        colorScaleCheck: colorCheck,
        sliceBoundsCheck: sliceCheck,
        classification,
        warnings,
      };

      const newHistory = [result, ...runHistory].slice(0, 20);

      let comparisonChanges = null;
      if (runHistory.length > 0) {
        comparisonChanges = compareRuns(runHistory[0], result);
      }

      set({
        volumeData,
        currentResult: result,
        runHistory: newHistory,
        isCalculating: false,
        comparisonChanges,
      });
    } catch {
      set({ isCalculating: false });
    }
  },

  loadPreset: (presetId) => {
    const preset = getPresetById(presetId);
    if (preset) {
      set({
        currentParams: { ...preset },
        comparisonChanges: null,
      });
    }
  },

  selectRun: (runId) => {
    set((state) => ({
      selectedRuns: [...state.selectedRuns, runId].slice(0, 4),
    }));
  },

  deselectRun: (runId) => {
    set((state) => ({
      selectedRuns: state.selectedRuns.filter((id) => id !== runId),
    }));
  },

  compareSelected: () => {
    const { runHistory, selectedRuns } = get();
    if (selectedRuns.length >= 2) {
      const run1 = runHistory.find((r) => r.id === selectedRuns[0]);
      const run2 = runHistory.find((r) => r.id === selectedRuns[selectedRuns.length - 1]);
      if (run1 && run2) {
        set({ comparisonChanges: compareRuns(run1, run2) });
      }
    }
  },

  clearHistory: () => {
    set({ runHistory: [], selectedRuns: [], comparisonChanges: null });
  },

  setColorMap: (name) => {
    set((state) => ({
      vizSettings: { ...state.vizSettings, colorMap: name },
    }));
  },
}));
