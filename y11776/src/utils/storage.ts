import type { Preset, HistoryEntry, InterpolationConfig } from '../engine/types';

const STORAGE_KEYS = {
  CUSTOM_PRESETS: 'interpolator_custom_presets',
  HISTORY: 'interpolator_history',
  CURRENT_CONFIG: 'interpolator_current_config',
};

export function saveCustomPresets(presets: Preset[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(presets));
  } catch (e) {
    console.error('保存预设失败:', e);
  }
}

export function loadCustomPresets(): Preset[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_PRESETS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('加载预设失败:', e);
    return [];
  }
}

export function saveHistory(history: HistoryEntry[]): void {
  try {
    const recentHistory = history.slice(-50);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(recentHistory));
  } catch (e) {
    console.error('保存历史失败:', e);
  }
}

export function loadHistory(): HistoryEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('加载历史失败:', e);
    return [];
  }
}

export function saveCurrentConfig(config: InterpolationConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('保存当前配置失败:', e);
  }
}

export function loadCurrentConfig(): InterpolationConfig | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_CONFIG);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('加载当前配置失败:', e);
    return null;
  }
}

export function clearAllStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_PRESETS);
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_CONFIG);
}
