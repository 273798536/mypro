import { create } from 'zustand';
import type { AppState, AppActions, ErrorRecord, OperationRecord } from '../types';
import { defaultMotorConfig, STORAGE_KEYS } from './defaultConfig';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const loadStoredConfig = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MOTOR_CONFIG);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn('[useAppStore:loadStoredConfig] 无法加载存储的配置');
  }
  return null;
};

const initialConfig = loadStoredConfig() || defaultMotorConfig;

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  motorConfig: initialConfig,
  errors: [],
  operations: [],
  currentReport: null,
  isPlaying: false,
  animationSpeed: 1,

  setMotorConfig: (config) => {
    set((state) => ({
      motorConfig: { ...state.motorConfig, ...config },
    }));
  },

  updateCoil: (coilId, updates) => {
    const coil = get().motorConfig.coils.find((c) => c.id === coilId);
    if (!coil) return;

    set((state) => ({
      motorConfig: {
        ...state.motorConfig,
        coils: state.motorConfig.coils.map((c) =>
          c.id === coilId ? { ...c, ...updates } : c
        ),
      },
    }));
  },

  addError: (error) => {
    const newError: ErrorRecord = {
      ...error,
      id: generateId(),
      timestamp: Date.now(),
    };
    set((state) => ({
      errors: [newError, ...state.errors].slice(0, 50),
    }));

    try {
      const errors = get().errors;
      localStorage.setItem(STORAGE_KEYS.ERROR_LOGS, JSON.stringify(errors.slice(0, 100)));
    } catch {
      console.warn('[useAppStore:addError] 无法保存错误日志');
    }
  },

  clearError: (errorId) => {
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== errorId),
    }));
  },

  clearAllErrors: () => {
    set({ errors: [] });
  },

  addOperation: (operation) => {
    const newOperation: OperationRecord = {
      ...operation,
      id: generateId(),
      timestamp: Date.now(),
    };
    set((state) => ({
      operations: [newOperation, ...state.operations].slice(0, 100),
    }));

    try {
      const operations = get().operations;
      localStorage.setItem(
        STORAGE_KEYS.OPERATION_HISTORY,
        JSON.stringify(operations.slice(0, 200))
      );
    } catch {
      console.warn('[useAppStore:addOperation] 无法保存操作历史');
    }
  },

  setCurrentReport: (report) => {
    set({ currentReport: report });
  },

  resetConfig: () => {
    set({ motorConfig: defaultMotorConfig });
    localStorage.removeItem(STORAGE_KEYS.MOTOR_CONFIG);
  },

  saveConfig: () => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.MOTOR_CONFIG,
        JSON.stringify(get().motorConfig)
      );
    } catch {
      console.warn('[useAppStore:saveConfig] 无法保存配置');
    }
  },

  loadConfig: () => {
    const config = loadStoredConfig();
    if (config) {
      set({ motorConfig: config });
      return true;
    }
    return false;
  },

  togglePlaying: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  setAnimationSpeed: (speed) => {
    set({ animationSpeed: speed });
  },
}));
