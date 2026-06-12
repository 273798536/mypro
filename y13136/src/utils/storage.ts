import type { HistoryVersion } from '@/types';

const STORAGE_KEY = 'markov_boundary_checker_versions';
const CURRENT_VERSION_KEY = 'markov_boundary_checker_current';

export function loadVersions(): HistoryVersion[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveVersions(versions: HistoryVersion[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  } catch (e) {
    console.error('Failed to save versions:', e);
  }
}

export function loadCurrentVersionId(): string | null {
  return localStorage.getItem(CURRENT_VERSION_KEY);
}

export function saveCurrentVersionId(id: string): void {
  localStorage.setItem(CURRENT_VERSION_KEY, id);
}

export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CURRENT_VERSION_KEY);
}
