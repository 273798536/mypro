import type { AppState, CorrosionTestRecord, Reagent, ReagentLedger } from '../types';

const STORAGE_KEY = 'salt-spray-corrosion-rating-v1';

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch (e) {
    console.error('加载数据失败:', e);
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('保存数据失败:', e);
    throw new Error('数据保存失败，请检查浏览器存储空间是否充足');
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
