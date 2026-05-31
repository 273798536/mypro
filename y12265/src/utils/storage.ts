import { Scene, GameRecord } from '../types/game';

const STORAGE_KEYS = {
  SCENES: 'robot_game_scenes',
  HISTORY: 'robot_game_history',
  VERSION: 'robot_game_version',
};

const CURRENT_VERSION = '1.0.0';

function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item) as T;
    }
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
  }
  return defaultValue;
}

function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

function deduplicateRecords(records: GameRecord[]): GameRecord[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = `${record.sceneId}-${record.startTime}-${record.playerName}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function checkVersion(): void {
  const storedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
  if (storedVersion !== CURRENT_VERSION) {
    migrateData(storedVersion);
    localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_VERSION);
  }
}

function migrateData(oldVersion: string | null): void {
  if (!oldVersion) {
    return;
  }
}

export function saveScenes(scenes: Scene[]): void {
  setStorageItem(STORAGE_KEYS.SCENES, scenes);
}

export function loadScenes(): Scene[] {
  return getStorageItem<Scene[]>(STORAGE_KEYS.SCENES, []);
}

export function saveGameRecord(record: GameRecord): void {
  const records = loadGameHistory();
  records.push(record);
  const deduplicated = deduplicateRecords(records);
  setStorageItem(STORAGE_KEYS.HISTORY, deduplicated);
}

export function loadGameHistory(): GameRecord[] {
  const records = getStorageItem<GameRecord[]>(STORAGE_KEYS.HISTORY, []);
  return deduplicateRecords(records);
}

export function getGameRecordById(id: string): GameRecord | undefined {
  const records = loadGameHistory();
  return records.find((r) => r.id === id);
}

export function deleteGameRecord(id: string): void {
  const records = loadGameHistory();
  const filtered = records.filter((r) => r.id !== id);
  setStorageItem(STORAGE_KEYS.HISTORY, filtered);
}

export function clearGameHistory(): void {
  setStorageItem(STORAGE_KEYS.HISTORY, []);
}

export function exportGameRecord(record: GameRecord): string {
  return JSON.stringify(record, null, 2);
}

export function importGameRecord(jsonString: string): GameRecord | null {
  try {
    const record = JSON.parse(jsonString) as GameRecord;
    if (record.id && record.sceneId && record.steps) {
      return record;
    }
  } catch (error) {
    console.error('Error importing game record:', error);
  }
  return null;
}
