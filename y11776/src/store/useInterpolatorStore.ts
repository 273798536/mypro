import { create } from 'zustand';
import type {
  InterpolationConfig,
  InterpolationPoint,
  AnomalyRecord,
  HistoryEntry,
  Preset,
  CalculationResult,
} from '../engine/types';
import { performCalculation, resolveAnomaly } from '../engine/interpolation';
import { loadCustomPresets, saveCustomPresets, loadHistory, saveHistory, loadCurrentConfig, saveCurrentConfig } from '../utils/storage';
import { classicPresets, createCustomPreset } from '../utils/presets';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createDefaultConfig(): InterpolationConfig {
  const saved = loadCurrentConfig();
  if (saved) return saved;

  return {
    id: generateId(),
    functionExpression: '1/(1+25*x^2)',
    order: 10,
    sampleStart: -5,
    sampleEnd: 5,
    pointCount: 11,
    method: 'lagrange',
    source: '默认配置 - 龙格函数示例',
    note: '',
    createdAt: Date.now(),
  };
}

interface InterpolatorState {
  config: InterpolationConfig;
  calculationResult: CalculationResult | null;
  customPresets: Preset[];
  classicPresets: Preset[];
  history: HistoryEntry[];
  isCalculating: boolean;
  activeTab: 'history' | 'notes' | 'presets';
  showReportModal: boolean;
  showPresetModal: boolean;

  setConfig: (config: Partial<InterpolationConfig>) => void;
  loadPreset: (preset: Preset) => void;
  saveAsPreset: (name: string, description: string) => void;
  deletePreset: (presetId: string) => void;
  importConfig: (config: InterpolationConfig) => void;
  calculate: () => void;
  resolveAnomaly: (anomalyId: string, note: string) => void;
  addHistoryEntry: (action: string, diff: Partial<InterpolationConfig>, userNote?: string) => void;
  revertToHistory: (entryId: string) => void;
  setActiveTab: (tab: 'history' | 'notes' | 'presets') => void;
  setShowReportModal: (show: boolean) => void;
  setShowPresetModal: (show: boolean) => void;
  updateNote: (note: string) => void;
  updateSource: (source: string) => void;
}

export const useInterpolatorStore = create<InterpolatorState>((set, get) => ({
  config: createDefaultConfig(),
  calculationResult: null,
  customPresets: loadCustomPresets(),
  classicPresets: classicPresets,
  history: loadHistory(),
  isCalculating: false,
  activeTab: 'history',
  showReportModal: false,
  showPresetModal: false,

  setConfig: (partialConfig) => {
    const prevConfig = get().config;
    const newConfig = { ...prevConfig, ...partialConfig, id: generateId(), createdAt: Date.now() };
    
    if (partialConfig.order !== undefined) {
      newConfig.order = Math.max(1, Math.min(20, partialConfig.order));
      if (newConfig.pointCount < newConfig.order + 1) {
        newConfig.pointCount = newConfig.order + 1;
      }
    }
    
    if (partialConfig.pointCount !== undefined) {
      newConfig.pointCount = Math.max(2, Math.min(50, partialConfig.pointCount));
    }

    const diff: Partial<InterpolationConfig> = {};
    Object.keys(partialConfig).forEach(key => {
      const k = key as keyof InterpolationConfig;
      if (prevConfig[k] !== newConfig[k]) {
        (diff as any)[k] = partialConfig[k];
      }
    });

    if (Object.keys(diff).length > 0) {
      const action = `修改参数: ${Object.keys(diff).join(', ')}`;
      get().addHistoryEntry(action, diff);
    }

    saveCurrentConfig(newConfig);
    set({ config: newConfig });
    
    requestAnimationFrame(() => {
      get().calculate();
    });
  },

  loadPreset: (preset) => {
    const newConfig = { ...preset.config, id: generateId(), createdAt: Date.now() };
    saveCurrentConfig(newConfig);
    get().addHistoryEntry(`加载预设: ${preset.name}`, preset.config, preset.description);
    set({ config: newConfig, showPresetModal: false });
    
    requestAnimationFrame(() => {
      get().calculate();
    });
  },

  saveAsPreset: (name, description) => {
    const { config, customPresets } = get();
    const newPreset = createCustomPreset(name, description, config);
    const updatedPresets = [...customPresets, newPreset];
    saveCustomPresets(updatedPresets);
    get().addHistoryEntry(`保存预设: ${name}`, {}, description);
    set({ customPresets: updatedPresets, showPresetModal: false });
  },

  deletePreset: (presetId) => {
    const { customPresets } = get();
    const updatedPresets = customPresets.filter(p => p.id !== presetId);
    saveCustomPresets(updatedPresets);
    set({ customPresets: updatedPresets });
  },

  importConfig: (importedConfig) => {
    const newConfig = { ...importedConfig, id: generateId(), createdAt: Date.now() };
    saveCurrentConfig(newConfig);
    get().addHistoryEntry('导入配置', importedConfig, importedConfig.source);
    set({ config: newConfig });
    
    requestAnimationFrame(() => {
      get().calculate();
    });
  },

  calculate: () => {
    set({ isCalculating: true });
    
    try {
      const result = performCalculation(get().config);
      set({ calculationResult: result, isCalculating: false });
    } catch (error) {
      console.error('计算失败:', error);
      set({ calculationResult: null, isCalculating: false });
    }
  },

  resolveAnomaly: (anomalyId, note) => {
    const { calculationResult } = get();
    if (!calculationResult) return;

    const updatedAnomalies = calculationResult.anomalies.map(a =>
      a.id === anomalyId ? resolveAnomaly(a, note) : a
    );

    const resolvedAnomaly = calculationResult.anomalies.find(a => a.id === anomalyId);
    if (resolvedAnomaly) {
      get().addHistoryEntry(
        `修正异常: ${resolvedAnomaly.type}`,
        {},
        note
      );
    }

    set({
      calculationResult: {
        ...calculationResult,
        anomalies: updatedAnomalies,
      },
    });
  },

  addHistoryEntry: (action, diff, userNote) => {
    const { config, history } = get();
    const entry: HistoryEntry = {
      id: generateId(),
      action,
      configSnapshot: { ...config },
      diff,
      timestamp: Date.now(),
      userNote,
    };
    const updatedHistory = [...history, entry];
    saveHistory(updatedHistory);
    set({ history: updatedHistory });
  },

  revertToHistory: (entryId) => {
    const { history } = get();
    const entry = history.find(h => h.id === entryId);
    if (!entry) return;

    const revertedConfig = { ...entry.configSnapshot, id: generateId(), createdAt: Date.now() };
    saveCurrentConfig(revertedConfig);
    get().addHistoryEntry(`回退到: ${entry.action}`, {});
    set({ config: revertedConfig });
    
    requestAnimationFrame(() => {
      get().calculate();
    });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowReportModal: (show) => set({ showReportModal: show }),
  setShowPresetModal: (show) => set({ showPresetModal: show }),

  updateNote: (note) => {
    const { config } = get();
    const newConfig = { ...config, note, id: generateId(), createdAt: Date.now() };
    saveCurrentConfig(newConfig);
    get().addHistoryEntry('更新备注', {}, note);
    set({ config: newConfig });
  },

  updateSource: (source) => {
    const { config } = get();
    const newConfig = { ...config, source, id: generateId(), createdAt: Date.now() };
    saveCurrentConfig(newConfig);
    set({ config: newConfig });
  },
}));
