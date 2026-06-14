import type { AppState } from '../types';

const STORAGE_KEY = 'tour-earpiece-archive:v1';

const defaultState: AppState = {
  items: [],
  versions: [],
  selectedItemId: null,
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw) as AppState;
    return {
      items: parsed.items ?? [],
      versions: parsed.versions ?? [],
      selectedItemId: parsed.selectedItemId ?? null,
    };
  } catch {
    return { ...defaultState };
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
