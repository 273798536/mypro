import { GameState, GameReport } from '../types/game';

const STORAGE_KEYS = {
  CURRENT_GAME: 'crystal_mining:current_game',
  HISTORY: 'crystal_mining:history',
  MINECART_ID: 'crystal_mining:minecart_id',
};

export function saveCurrentGame(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_GAME, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

export function loadCurrentGame(): GameState | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_GAME);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load game state:', e);
    return null;
  }
}

export function clearCurrentGame(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_GAME);
}

export function saveGameReport(report: GameReport): void {
  try {
    const history = loadGameHistory();
    history.push(report);
    if (history.length > 10) {
      history.shift();
    }
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save game report:', e);
  }
}

export function loadGameHistory(): GameReport[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load game history:', e);
    return [];
  }
}

export function getLastGameReport(): GameReport | null {
  const history = loadGameHistory();
  return history.length > 0 ? history[history.length - 1] : null;
}

export function getPreviousMinecartReport(
  currentMinecartId: string
): GameReport | null {
  const history = loadGameHistory();
  const previousReports = history.filter(
    (r) => r.minecartId !== currentMinecartId
  );
  return previousReports.length > 0
    ? previousReports[previousReports.length - 1]
    : null;
}

export function clearGameHistory(): void {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
}

export function getMinecartId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEYS.MINECART_ID);
    return id || 'minecart-default';
  } catch (e) {
    return 'minecart-default';
  }
}

export function setMinecartId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MINECART_ID, id);
  } catch (e) {
    console.error('Failed to save minecart id:', e);
  }
}
