import { AppState } from '@/types';

const STORAGE_KEY = 'music_festival_review_data_v1';

export function loadState(): AppState | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized === null) {
      return null;
    }
    return JSON.parse(serialized);
  } catch (err) {
    console.error('Failed to load state from localStorage:', err);
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportBackup(): string {
  const state = loadState();
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: state,
    },
    null,
    2
  );
}

export function importBackup(jsonStr: string): AppState | null {
  try {
    const backup = JSON.parse(jsonStr);
    if (backup.version === 1 && backup.data) {
      return backup.data;
    }
    return null;
  } catch (err) {
    console.error('Failed to import backup:', err);
    return null;
  }
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
