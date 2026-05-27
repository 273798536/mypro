import type { GameRecord, GameStats } from './types';

const STORAGE_KEY = 'em_maze_escape_records';
const MAX_RECORDS = 100;

export const saveGameRecord = (record: GameRecord): void => {
  try {
    const records = loadGameRecords();
    records.unshift(record);
    
    if (records.length > MAX_RECORDS) {
      records.splice(MAX_RECORDS);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Failed to save game record:', error);
  }
};

export const loadGameRecords = (): GameRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as GameRecord[];
  } catch (error) {
    console.error('Failed to load game records:', error);
    return [];
  }
};

export const loadRecordsByLevel = (levelId: number): GameRecord[] => {
  return loadGameRecords().filter(r => r.levelId === levelId);
};

export const getBestRecordForLevel = (levelId: number): GameRecord | null => {
  const records = loadRecordsByLevel(levelId).filter(r => r.success);
  if (records.length === 0) return null;
  return records.reduce((best, current) => 
    current.score > best.score ? current : best
  );
};

export const getCompletedLevelIds = (): number[] => {
  const records = loadGameRecords().filter(r => r.success);
  return [...new Set(records.map(r => r.levelId))];
};

export const calculateGameStats = (): GameStats => {
  const records = loadGameRecords();
  
  if (records.length === 0) {
    return {
      totalGames: 0,
      successRate: 0,
      averageScore: 0,
      totalStars: 0,
    };
  }

  const successfulGames = records.filter(r => r.success);
  
  return {
    totalGames: records.length,
    successRate: Math.round((successfulGames.length / records.length) * 100),
    averageScore: Math.round(records.reduce((sum, r) => sum + r.score, 0) / records.length),
    totalStars: records.reduce((sum, r) => sum + r.stars, 0),
  };
};

export const clearAllRecords = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const deleteRecord = (recordId: string): void => {
  try {
    const records = loadGameRecords().filter(r => r.id !== recordId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Failed to delete record:', error);
  }
};
