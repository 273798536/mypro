import { STORAGE_KEYS, MAX_HISTORY_ITEMS } from '../physics/constants';
import type { SimulationResult, SimulationParams, SimulationMetrics, Warning } from '../physics';

export interface HistoryItem {
  id: string;
  timestamp: number;
  params: SimulationParams;
  metrics: SimulationMetrics;
  warnings: Warning[];
  note?: string;
}

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const saveToHistory = (result: {
  params: SimulationParams;
  metrics: SimulationMetrics;
  warnings: Warning[];
}): HistoryItem => {
  const history = loadHistory();
  const item: HistoryItem = {
    id: generateId(),
    timestamp: Date.now(),
    params: result.params,
    metrics: result.metrics,
    warnings: result.warnings,
  };

  history.unshift(item);
  const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmedHistory));
  } catch (e) {
    console.warn('Failed to save to history:', e);
  }

  return item;
};

export const loadHistory = (): HistoryItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to load history:', e);
  }
  return [];
};

export const deleteHistoryItem = (id: string): void => {
  const history = loadHistory();
  const filtered = history.filter((item) => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to delete history item:', e);
  }
};

export const clearHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  } catch (e) {
    console.warn('Failed to clear history:', e);
  }
};

export interface UserPreferences {
  animationSpeed: number;
  showGrid: boolean;
  showLabels: boolean;
  theme: 'dark' | 'light';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  animationSpeed: 1,
  showGrid: true,
  showLabels: true,
  theme: 'dark',
};

export const savePreferences = (prefs: Partial<UserPreferences>): void => {
  const current = loadPreferences();
  const updated = { ...current, ...prefs };
  try {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save preferences:', e);
  }
};

export const loadPreferences = (): UserPreferences => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (data) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(data) };
    }
  } catch (e) {
    console.warn('Failed to load preferences:', e);
  }
  return DEFAULT_PREFERENCES;
};
