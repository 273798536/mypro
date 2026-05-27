import { GameRecord } from '@/types';

const STORAGE_KEY = 'tax-audit-game-records';

export function saveGameRecord(record: GameRecord): void {
  try {
    const records = getGameRecords();
    records.unshift(record);
    const limitedRecords = records.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedRecords));
  } catch (error) {
    console.error('Failed to save game record:', error);
  }
}

export function getGameRecords(): GameRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get game records:', error);
    return [];
  }
}

export function getGameRecord(id: string): GameRecord | null {
  try {
    const records = getGameRecords();
    return records.find(r => r.id === id) || null;
  } catch (error) {
    console.error('Failed to get game record:', error);
    return null;
  }
}

export function clearGameRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear game records:', error);
  }
}
