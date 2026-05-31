import type { AnalysisSession, AppState } from '@/types';

const STORAGE_KEYS = {
  SESSIONS: 'risk-heatmap-sessions',
  STATE: 'risk-heatmap-state',
};

export function computeSessionHash(session: Omit<AnalysisSession, 'hash'>): string {
  const data = {
    viewState: session.viewState,
    parameters: session.parameters,
    anomalies: session.anomalies,
  };
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function isDuplicateSession(hash: string, existing: AnalysisSession[]): boolean {
  return existing.some((s) => s.hash === hash);
}

export function saveSessionsToStorage(sessions: AnalysisSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions:', e);
  }
}

export function loadSessionsFromStorage(): AnalysisSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load sessions:', e);
    return [];
  }
}

export function saveStateToStorage(state: Partial<AppState>): void {
  try {
    const persistData = {
      parameters: state.parameters,
      filters: state.filters,
      currentTime: state.currentTime,
      playSpeed: state.playSpeed,
    };
    localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(persistData));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function loadStateFromStorage(): Partial<AppState> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STATE);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Failed to load state:', e);
    return {};
  }
}
