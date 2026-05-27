import { GameRecord } from '@/types/game';

const STORAGE_KEY = 'insurance_detective_records';

export const saveRecords = (records: GameRecord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save records:', e);
  }
};

export const loadRecords = (): GameRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load records:', e);
  }
  return [];
};

export const addRecord = (record: GameRecord): GameRecord[] => {
  const records = loadRecords();
  records.unshift(record);
  saveRecords(records);
  return records;
};

export const updateRecord = (id: string, updates: Partial<GameRecord>): GameRecord[] => {
  const records = loadRecords();
  const index = records.findIndex(r => r.id === id);
  if (index !== -1) {
    records[index] = { ...records[index], ...updates };
    saveRecords(records);
  }
  return records;
};

export const deleteRecord = (id: string): GameRecord[] => {
  const records = loadRecords();
  const filtered = records.filter(r => r.id !== id);
  saveRecords(filtered);
  return filtered;
};

export const getRecord = (id: string): GameRecord | undefined => {
  const records = loadRecords();
  return records.find(r => r.id === id);
};
