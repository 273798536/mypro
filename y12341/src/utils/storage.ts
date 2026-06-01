import type { AppState } from '@/types';

const STORAGE_KEY = 'heat-conduction-app-state';

export function saveState(state: AppState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('保存状态到localStorage失败:', error);
  }
}

export function loadState(): AppState | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized === null) {
      return null;
    }
    return JSON.parse(serialized) as AppState;
  } catch (error) {
    console.error('从localStorage加载状态失败:', error);
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('清除localStorage状态失败:', error);
  }
}
