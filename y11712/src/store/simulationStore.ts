import { create } from 'zustand';
import type {
  SimulationParams,
  GridSize,
  StabilityResult,
  WarningItem,
  ErrorItem,
  CorrectionLog,
  Preset,
  ReportData,
  PointInfo,
  ReportSection,
  ReportItem,
} from '../types/simulation';
import {
  computeGridSize,
  initializeTemperatureField,
  runExplicitEuler,
  computeResultStats,
  computeMaxGradient,
  computeGradient,
} from '../utils/heatTransfer';
import { checkStability, autoCorrectTimeStep } from '../utils/stability';

const DEFAULT_PARAMS: SimulationParams = {
  plateLength: 0.1,
  plateWidth: 0.1,
  thermalConductivity: 205,
  specificHeat: 900,
  density: 2700,
  gridStepX: 0.01,
  gridStepY: 0.01,
  timeStep: 0.01,
  totalTime: 1.0,
  boundaryTempTop: 100,
  boundaryTempBottom: 20,
  boundaryTempLeft: 50,
  boundaryTempRight: 50,
  initialTemp: 25,
  materialName: '铝合金6061',
  source: '默认参数',
};

const STORAGE_KEY = 'heat-sim-presets';
const LOGS_KEY = 'heat-sim-correction-logs';

function loadPresetsFromStorage(): Preset[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function savePresetsToStorage(presets: Preset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function loadLogsFromStorage(): CorrectionLog[] {
  try {
    const data = localStorage.getItem(LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLogsToStorage(logs: CorrectionLog[]): void {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

interface SimulationState {
  params: SimulationParams;
  grid: GridSize;
  temperatureField: number[][][];
  currentTimeStep: number;
  isRunning: boolean;
  isComputing: boolean;
  progress: number;
  stability: StabilityResult;
  correctionLogs: CorrectionLog[];
  presets: Preset[];
  selectedPoint: { i: number; j: number } | null;
  pointInfo: PointInfo | null;
  resultStats: { maxTemp: number; minTemp: number; avgTemp: number } | null;
  correctionsApplied: { field: string; oldValue: string; newValue: string; reason: string }[];
  untouchedFields: string[];
  needsConfirmation: { field: string; value: string; reason: string }[];
  setParams: (params: Partial<SimulationParams>, source?: string) => void;
  runSimulation: () => void;
  pauseSimulation: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  setCurrentTimeStep: (step: number) => void;
  selectPoint: (i: number | null, j: number | null) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  resetToDefault: () => void;
  exportReport: () => ReportData;
  recomputeStability: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => {
  const initialParams = { ...DEFAULT_PARAMS };
  const initialGrid = computeGridSize(initialParams);
  const initialStability = checkStability(initialParams);

  return {
    params: initialParams,
    grid: initialGrid,
    temperatureField: [],
    currentTimeStep: 0,
    isRunning: false,
    isComputing: false,
    progress: 0,
    stability: initialStability,
    correctionLogs: loadLogsFromStorage(),
    presets: loadPresetsFromStorage(),
    selectedPoint: null,
    pointInfo: null,
    resultStats: null,
    correctionsApplied: [],
    untouchedFields: Object.keys(DEFAULT_PARAMS),
    needsConfirmation: [],

    setParams: (newParams, source = '用户修改') => {
      const current = get();
      const oldParams = { ...current.params };
      const updated = { ...oldParams, ...newParams };

      const corrections: { field: string; oldValue: string; newValue: string; reason: string }[] = [];
      const untouched: string[] = [];
      const needsConfirm: { field: string; value: string; reason: string }[] = [];

      for (const key of Object.keys(newParams) as (keyof SimulationParams)[]) {
        const oldVal = String(oldParams[key]);
        const newVal = String(updated[key]);
        if (oldVal !== newVal) {
          const log: CorrectionLog = {
            id: crypto.randomUUID(),
            paramId: 'current',
            fieldName: key,
            oldValue: oldVal,
            newValue: newVal,
            reason: source,
            source,
            correctedAt: new Date().toISOString(),
          };
          const updatedLogs = [...current.correctionLogs, log];
          saveLogsToStorage(updatedLogs);
          set({ correctionLogs: updatedLogs });
        }
      }

      const newGrid = computeGridSize(updated);
      const newStability = checkStability(updated);

      if (newStability.warnings.some((w) => w.id === 'von-neumann')) {
        const correction = autoCorrectTimeStep(updated);
        if (correction.corrected) {
          corrections.push({
            field: 'timeStep',
            oldValue: correction.originalTimeStep.toString(),
            newValue: correction.correctedTimeStep.toString(),
            reason: '时间步长超出稳定性条件，已自动修正至安全值',
          });
          updated.timeStep = correction.correctedTimeStep;
        }
      }

      if (newStability.warnings.some((w) => w.id === 'coarse-grid')) {
        needsConfirm.push({
          field: 'gridStepX',
          value: String(updated.gridStepX),
          reason: '网格过粗，可能影响计算精度',
        });
        needsConfirm.push({
          field: 'gridStepY',
          value: String(updated.gridStepY),
          reason: '网格过粗，可能影响计算精度',
        });
      }

      for (const key of Object.keys(DEFAULT_PARAMS) as (keyof SimulationParams)[]) {
        if (String(updated[key]) === String(DEFAULT_PARAMS[key])) {
          untouched.push(key);
        }
      }

      set({
        params: updated,
        grid: newGrid,
        stability: newStability,
        temperatureField: [],
        currentTimeStep: 0,
        isRunning: false,
        progress: 0,
        resultStats: null,
        correctionsApplied: corrections,
        untouchedFields: untouched,
        needsConfirmation: needsConfirm,
      });
    },

    runSimulation: () => {
      const { params, grid, stability } = get();

      if (stability.errors.length > 0) {
        return;
      }

      set({ isComputing: true, progress: 0 });

      setTimeout(() => {
        const field = initializeTemperatureField(params, grid);

        runExplicitEuler(params, grid, field, (step, total) => {
          set({ progress: step / total });
        });

        const stats = computeResultStats(field, grid);

        set({
          temperatureField: field,
          currentTimeStep: grid.nt - 1,
          isComputing: false,
          isRunning: true,
          progress: 1,
          resultStats: stats,
        });
      }, 50);
    },

    pauseSimulation: () => {
      set({ isRunning: false });
    },

    stepForward: () => {
      const { currentTimeStep, grid } = get();
      const next = Math.min(currentTimeStep + 1, grid.nt - 1);
      set({ currentTimeStep: next });
    },

    stepBackward: () => {
      const { currentTimeStep } = get();
      const prev = Math.max(currentTimeStep - 1, 0);
      set({ currentTimeStep: prev });
    },

    setCurrentTimeStep: (step: number) => {
      const { grid } = get();
      const clamped = Math.max(0, Math.min(step, grid.nt - 1));
      set({ currentTimeStep: clamped });
    },

    selectPoint: (i, j) => {
      if (i === null || j === null) {
        set({ selectedPoint: null, pointInfo: null });
        return;
      }

      const { temperatureField, currentTimeStep, grid, params } = get();
      if (temperatureField.length === 0) {
        set({ selectedPoint: { i, j }, pointInfo: null });
        return;
      }

      const slice = temperatureField[currentTimeStep];
      if (i < 0 || i >= grid.nx || j < 0 || j >= grid.ny) {
        return;
      }

      const temp = slice[j][i];
      const grad = computeGradient(slice, i, j, grid, params);
      const info: PointInfo = {
        x: i * params.gridStepX,
        y: j * params.gridStepY,
        temperature: temp,
        gradX: grad.gradX,
        gradY: grad.gradY,
        gradientMagnitude: grad.magnitude,
      };

      set({ selectedPoint: { i, j }, pointInfo: info });
    },

    savePreset: (name: string) => {
      const { params, presets } = get();
      const preset: Preset = {
        id: crypto.randomUUID(),
        name,
        params: { ...params },
        source: '用户保存',
        savedAt: new Date().toISOString(),
      };
      const updated = [...presets, preset];
      savePresetsToStorage(updated);
      set({ presets: updated });
    },

    loadPreset: (id: string) => {
      const { presets } = get();
      const preset = presets.find((p) => p.id === id);
      if (preset) {
        get().setParams(preset.params, `加载预设: ${preset.name}`);
      }
    },

    deletePreset: (id: string) => {
      const { presets } = get();
      const updated = presets.filter((p) => p.id !== id);
      savePresetsToStorage(updated);
      set({ presets: updated });
    },

    resetToDefault: () => {
      get().setParams({ ...DEFAULT_PARAMS }, '重置为默认值');
    },

    exportReport: () => {
      const { params, grid, stability, resultStats, temperatureField, correctionsApplied, untouchedFields, needsConfirmation, correctionLogs } = get();

      const sections: ReportSection[] = [];

      const untouchedItems: ReportItem[] = untouchedFields.map((f) => ({
        name: f,
        value: String(params[f as keyof SimulationParams]),
        description: '使用默认值，未做修改',
      }));
      if (untouchedItems.length > 0) {
        sections.push({
          type: 'untouched',
          title: '未处理项（使用默认值）',
          items: untouchedItems,
        });
      }

      const correctedItems: ReportItem[] = correctionsApplied.map((c) => ({
        name: c.field,
        value: `${c.oldValue} → ${c.newValue}`,
        description: c.reason,
      }));
      if (correctedItems.length > 0) {
        sections.push({
          type: 'corrected',
          title: '已修正项（系统自动调整）',
          items: correctedItems,
        });
      }

      const confirmItems: ReportItem[] = needsConfirmation.map((n) => ({
        name: n.field,
        value: n.value,
        description: n.reason,
      }));
      if (confirmItems.length > 0) {
        sections.push({
          type: 'needs_confirmation',
          title: '需确认项（请人工审核）',
          items: confirmItems,
        });
      }

      const finalMaxGradient = temperatureField.length > 0
        ? computeMaxGradient(temperatureField[grid.nt - 1], grid, params)
        : 0;

      const report: ReportData = {
        simulationId: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        params,
        grid,
        stability,
        resultSummary: {
          maxTemp: resultStats?.maxTemp ?? 0,
          minTemp: resultStats?.minTemp ?? 0,
          avgTemp: resultStats?.avgTemp ?? 0,
          finalMaxGradient,
        },
        sections,
        correctionLogs,
      };

      return report;
    },

    recomputeStability: () => {
      const { params } = get();
      const newStability = checkStability(params);
      set({ stability: newStability });
    },
  };
});
