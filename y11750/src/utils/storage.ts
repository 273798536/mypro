import { GameState, GameHistoryMeta, RoundRecord } from '@/types/game';
import { STORAGE_KEYS } from '@/constants/config';

export function saveCurrentGame(game: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_GAME, JSON.stringify(game));
  } catch (e) {
    console.error('Failed to save current game:', e);
  }
}

export function loadCurrentGame(): GameState | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_GAME);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load current game:', e);
    return null;
  }
}

export function clearCurrentGame(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_GAME);
}

export function saveGameToHistory(game: GameState, finalScore: number): void {
  try {
    const historyList = getHistoryList();
    const meta: GameHistoryMeta = {
      id: game.id,
      finalScore,
      finalCash: game.cash,
      totalRounds: game.round,
      status: game.status === 'bankrupt' ? 'bankrupt' : 'completed',
      endReason: game.endReason,
      createdAt: game.createdAt,
    };

    const existingIndex = historyList.findIndex(h => h.id === game.id);
    if (existingIndex >= 0) {
      historyList[existingIndex] = meta;
    } else {
      historyList.unshift(meta);
    }

    localStorage.setItem(STORAGE_KEYS.HISTORY_LIST, JSON.stringify(historyList));
    localStorage.setItem(
      STORAGE_KEYS.GAME_DETAIL_PREFIX + game.id,
      JSON.stringify(game)
    );
  } catch (e) {
    console.error('Failed to save game to history:', e);
  }
}

export function getHistoryList(): GameHistoryMeta[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY_LIST);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to get history list:', e);
    return [];
  }
}

export function getGameDetail(id: string): GameState | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GAME_DETAIL_PREFIX + id);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to get game detail:', e);
    return null;
  }
}

export function deleteGameFromHistory(id: string): void {
  try {
    const historyList = getHistoryList().filter(h => h.id !== id);
    localStorage.setItem(STORAGE_KEYS.HISTORY_LIST, JSON.stringify(historyList));
    localStorage.removeItem(STORAGE_KEYS.GAME_DETAIL_PREFIX + id);
  } catch (e) {
    console.error('Failed to delete game from history:', e);
  }
}

export function clearAllHistory(): void {
  try {
    const historyList = getHistoryList();
    historyList.forEach(h => {
      localStorage.removeItem(STORAGE_KEYS.GAME_DETAIL_PREFIX + h.id);
    });
    localStorage.removeItem(STORAGE_KEYS.HISTORY_LIST);
  } catch (e) {
    console.error('Failed to clear all history:', e);
  }
}

export function calculateFinalScore(game: GameState): number {
  if (game.status === 'bankrupt') {
    return Math.round(game.cash / 10000);
  }
  const baseScore = game.cash;
  const roundBonus = game.round * 10000;
  const profitBonus = game.history.reduce((sum, h) => sum + Math.max(0, h.netProfit), 0);
  return Math.round((baseScore + roundBonus + profitBonus) / 10000);
}
