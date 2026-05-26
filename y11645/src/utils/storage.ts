import { GameRecord, GameState } from '../types';

const STORAGE_KEYS = {
  HISTORY: 'baggage_trainer_history',
  BEST_SCORES: 'baggage_trainer_best_scores',
  UNLOCKED_LEVELS: 'baggage_trainer_unlocked_levels',
  SETTINGS: 'baggage_trainer_settings',
};

export function loadGameHistory(): GameRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveGameHistory(history: GameRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

export function addGameRecord(record: GameRecord): void {
  const history = loadGameHistory();
  history.unshift(record);
  saveGameHistory(history);
}

export function loadBestScores(): Record<number, number> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BEST_SCORES);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveBestScore(levelId: number, score: number): void {
  const bestScores = loadBestScores();
  if (!bestScores[levelId] || score > bestScores[levelId]) {
    bestScores[levelId] = score;
    localStorage.setItem(STORAGE_KEYS.BEST_SCORES, JSON.stringify(bestScores));
  }
}

export function loadUnlockedLevels(): number[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.UNLOCKED_LEVELS);
    return data ? JSON.parse(data) : [1];
  } catch {
    return [1];
  }
}

export function unlockLevel(levelId: number): void {
  const unlocked = loadUnlockedLevels();
  if (!unlocked.includes(levelId)) {
    unlocked.push(levelId);
    localStorage.setItem(STORAGE_KEYS.UNLOCKED_LEVELS, JSON.stringify(unlocked));
  }
}

export function clearAllStorage(): void {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}

export function getGameRecordById(recordId: string): GameRecord | undefined {
  const history = loadGameHistory();
  return history.find(r => r.id === recordId);
}

export function deleteGameRecord(recordId: string): void {
  const history = loadGameHistory();
  const filtered = history.filter(r => r.id !== recordId);
  saveGameHistory(filtered);
}

export function loadStorageState(): Partial<GameState> {
  return {
    gameHistory: loadGameHistory(),
    bestScores: loadBestScores(),
    unlockedLevels: loadUnlockedLevels(),
  };
}
