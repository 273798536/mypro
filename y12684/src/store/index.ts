import { create } from 'zustand';
import type {
  SceneState,
  ErosionParams,
  MeasurementRecord,
  ExceptionRecord,
  RunRecord,
  LogEntry,
  Vector3Tuple
} from '../types';
import {
  paramLinkageRules,
  defaultCameraPresets,
  generateId,
  formatTimestamp
} from '../utils/constants';

const initialParams: ErosionParams = {
  windSpeed: 8,
  windDirection: 180,
  grainSize: 0.3,
  moisture: 0.15,
  vegetation: 0.1,
  erosionRate: 1.2,
  threshold: 0.75,
  cohesion: 0.32
};

const initialScene: SceneState = {
  voxels: [],
  cameraPosition: defaultCameraPresets[3].position,
  cameraTarget: defaultCameraPresets[3].target,
  isCameraLost: false
};

interface AppStore {
  scene: SceneState;
  params: ErosionParams;
  measurements: MeasurementRecord[];
  exceptions: ExceptionRecord[];
  selectedException: string | null;
  currentRun: RunRecord | null;
  runHistory: RunRecord[];
  logs: LogEntry[];
  activeTab: string;
  isLoading: boolean;
  isSimulating: boolean;

  setCamera: (position: Vector3Tuple, target: Vector3Tuple) => void;
  setCameraLost: (lost: boolean) => void;
  resetCamera: () => void;
  applyCameraPreset: (index: number) => void;
  setVoxels: (voxels: SceneState['voxels']) => void;

  updateParams: (updates: Partial<ErosionParams>) => void;
  triggerParamLinkage: (sourceParam: string) => void;

  addMeasurement: (record: Omit<MeasurementRecord, 'id' | 'timestamp'>) => void;
  removeMeasurement: (id: string) => void;

  addException: (
    exception: Omit<ExceptionRecord, 'id' | 'timestamp' | 'status'> &
      Partial<Pick<ExceptionRecord, 'status'>>
  ) => void;
  resolveException: (id: string) => void;
  selectException: (id: string | null) => void;

  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;

  startRun: () => void;
  endRun: () => void;
  toggleSimulation: () => void;

  setActiveTab: (tab: string) => void;
  setLoading: (loading: boolean) => void;

  exportRunData: (runId: string) => { fileName: string; content: string };
  getCurrentRunFileName: (format: string) => string;
}

export const useAppStore = create<AppStore>((set, get) => ({
  scene: initialScene,
  params: initialParams,
  measurements: [],
  exceptions: [],
  selectedException: null,
  currentRun: null,
  runHistory: [],
  logs: [],
  activeTab: 'demo',
  isLoading: false,
  isSimulating: false,

  setCamera: (position, target) =>
    set((s) => ({
      scene: { ...s.scene, cameraPosition: position, cameraTarget: target, isCameraLost: false }
    })),

  setCameraLost: (lost) => {
    const current = get().scene.isCameraLost;
    if (lost && !current) {
      get().addException({
        type: 'camera_lost',
        title: '相机视角丢失',
        description:
          '三维场景的相机位置或观察目标变为无效值（NaN 或 Infinity），导致无法正常显示沙丘体素。此时视角记录和截图可能失真。',
        impact: '当前三维视图无法正确显示，风蚀模拟渲染结果不可见，已记录的视角参数将在本次运行中标记为异常。',
        suggestion: '点击"恢复默认视角"按钮，或从上方预设视角中选择俯视/侧视/正视/斜视任一视角重置相机。如频繁出现请检查显卡驱动。',
        relatedParams: []
      });
      get().addLog({
        level: 'warn',
        message: '相机视角已丢失，已自动记录异常'
      });
    }
    set((s) => ({ scene: { ...s.scene, isCameraLost: lost } }));
  },

  resetCamera: () => {
    const preset = defaultCameraPresets[3];
    set((s) => ({
      scene: {
        ...s.scene,
        cameraPosition: preset.position,
        cameraTarget: preset.target,
        isCameraLost: false
      }
    }));
    get().addLog({ level: 'info', message: '相机已恢复到默认斜视视角' });
  },

  applyCameraPreset: (index) => {
    const preset = defaultCameraPresets[index];
    if (!preset) return;
    set((s) => ({
      scene: {
        ...s.scene,
        cameraPosition: preset.position,
        cameraTarget: preset.target,
        isCameraLost: false
      }
    }));
    get().addLog({
      level: 'info',
      message: `已应用预设视角：${preset.name}（${preset.description}）`
    });
  },

  setVoxels: (voxels) => set((s) => ({ scene: { ...s.scene, voxels } })),

  updateParams: (updates) => {
    set((s) => ({ params: { ...s.params, ...updates } }));
    Object.keys(updates).forEach((key) => {
      get().triggerParamLinkage(key);
    });
  },

  triggerParamLinkage: (sourceParam) => {
    const state = get();
    const affected = paramLinkageRules.filter((r) => r.source === sourceParam);
    if (affected.length === 0) return;

    const updates: Partial<ErosionParams> = {};
    affected.forEach((rule) => {
      const sourceVal = (state.params as unknown as Record<string, number>)[sourceParam];
      if (sourceVal === undefined) return;
      if (rule.target === 'erosionRate') {
        updates.erosionRate = Number((sourceVal * 0.15).toFixed(4));
      } else if (rule.target === 'threshold') {
        updates.threshold = Number((sourceVal * 2.5).toFixed(4));
      } else if (rule.target === 'cohesion') {
        updates.cohesion = Number((sourceVal * 0.8 + 0.2).toFixed(4));
      }
    });

    if (Object.keys(updates).length > 0) {
      set((s) => ({ params: { ...s.params, ...updates } }));
      const linkedParams = affected
        .map(
          (r) =>
            `${r.target}（${r.description}）`
        )
        .join('、');
      get().addLog({
        level: 'info',
        message: `参数联动：${sourceParam} 变更后，自动更新关联参数 ${linkedParams}`
      });
    }
  },

  addMeasurement: (record) => {
    const full: MeasurementRecord = {
      ...record,
      id: generateId(),
      timestamp: Date.now()
    };
    set((s) => ({ measurements: [...s.measurements, full] }));
    const paramKey = record.paramName as keyof ErosionParams;
    if (paramKey in initialParams) {
      get().updateParams({ [paramKey]: record.value } as Partial<ErosionParams>);
    }
    get().addLog({
      level: 'info',
      message: `补录测量数据：${record.paramName} = ${record.value}${record.unit}（来源：${record.source}）`
    });
  },

  removeMeasurement: (id) => {
    set((s) => ({
      measurements: s.measurements.filter((m) => m.id !== id)
    }));
    get().addLog({ level: 'info', message: `已删除测量记录 ${id}` });
  },

  addException: (exception) => {
    const full: ExceptionRecord = {
      ...exception,
      id: generateId(),
      timestamp: Date.now(),
      status: exception.status ?? 'pending'
    };
    set((s) => ({ exceptions: [full, ...s.exceptions].slice(0, 200) }));
  },

  resolveException: (id) =>
    set((s) => ({
      exceptions: s.exceptions.map((e) =>
        e.id === id ? { ...e, status: 'resolved' } : e
      )
    })),

  selectException: (id) => set({ selectedException: id }),

  addLog: (entry) => {
    const full: LogEntry = {
      ...entry,
      id: generateId(),
      timestamp: Date.now()
    };
    set((s) => ({ logs: [full, ...s.logs].slice(0, 300) }));
  },

  startRun: () => {
    const state = get();
    const run: RunRecord = {
      id: generateId(),
      startTime: Date.now(),
      endTime: 0,
      params: { ...state.params },
      exceptions: [...state.exceptions],
      screenshots: [],
      logs: [...state.logs],
      measurements: [...state.measurements]
    };
    set({ currentRun: run, isSimulating: true });
    state.addLog({ level: 'info', message: `运行已启动，运行编号：${run.id.substring(0, 8)}` });
  },

  endRun: () => {
    const state = get();
    if (!state.currentRun) return;
    const finished: RunRecord = {
      ...state.currentRun,
      endTime: Date.now(),
      params: { ...state.params },
      exceptions: [...state.exceptions],
      logs: [...state.logs],
      measurements: [...state.measurements]
    };
    set((s) => ({
      currentRun: null,
      runHistory: [finished, ...s.runHistory],
      isSimulating: false
    }));
    state.addLog({
      level: 'info',
      message: `运行已结束，共记录 ${finished.exceptions.length} 条异常，${finished.measurements.length} 条测量数据`
    });
  },

  toggleSimulation: () => {
    const state = get();
    if (state.isSimulating) {
      state.endRun();
    } else {
      state.startRun();
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setLoading: (loading) => set({ isLoading: loading }),

  exportRunData: (runId) => {
    const state = get();
    const run =
      state.runHistory.find((r) => r.id === runId) ?? state.currentRun;
    if (!run) return { fileName: '', content: '' };
    const content = JSON.stringify(run, null, 2);
    const fileName = `dune_erosion_${formatTimestamp(run.startTime)}_${run.id.substring(0, 8)}.json`;
    return { fileName, content };
  },

  getCurrentRunFileName: (format) => {
    const state = get();
    const run = state.currentRun ?? state.runHistory[0];
    if (!run) return `dune_erosion_${formatTimestamp(Date.now())}.${format}`;
    return `dune_erosion_${formatTimestamp(run.startTime)}_${run.id.substring(0, 8)}.${format}`;
  }
}));
