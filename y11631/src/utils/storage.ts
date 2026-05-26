import { GameRecord, ReplayData } from '../engine/types';

const RECORDS_KEY = 'market_maker_records';
const MAX_RECORDS = 50;

export function saveGameRecord(record: GameRecord): void {
  try {
    const records = getGameRecords();
    records.unshift(record);
    if (records.length > MAX_RECORDS) {
      records.splice(MAX_RECORDS);
    }
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save game record:', e);
  }
}

export function getGameRecords(): GameRecord[] {
  try {
    const data = localStorage.getItem(RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load game records:', e);
    return [];
  }
}

export function getBestScore(difficulty?: string): number {
  const records = getGameRecords();
  const filtered = difficulty
    ? records.filter(r => r.difficulty === difficulty)
    : records;
  if (filtered.length === 0) return 0;
  return Math.max(...filtered.map(r => r.score));
}

export function clearGameRecords(): void {
  localStorage.removeItem(RECORDS_KEY);
}

export function exportRecordsToJson(): string {
  const records = getGameRecords();
  return JSON.stringify(records, null, 2);
}

export function downloadRecords(): void {
  const json = exportRecordsToJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `game_records_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
