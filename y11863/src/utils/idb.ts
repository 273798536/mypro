import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { HistoryRecord } from '../types';

interface EnergyDB extends DBSchema {
  historyRecords: {
    key: string;
    value: HistoryRecord;
    indexes: { 'by-timestamp': string };
  };
}

const DB_NAME = 'energy-heatmap-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<EnergyDB> | null = null;

const getDB = async (): Promise<IDBPDatabase<EnergyDB>> => {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<EnergyDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('historyRecords')) {
        const store = db.createObjectStore('historyRecords', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      }
    },
  });
  
  return dbInstance;
};

export const saveHistoryRecord = async (record: HistoryRecord): Promise<void> => {
  const db = await getDB();
  await db.put('historyRecords', record);
};

export const getAllHistoryRecords = async (): Promise<HistoryRecord[]> => {
  const db = await getDB();
  const records = await db.getAllFromIndex('historyRecords', 'by-timestamp');
  return records.reverse();
};

export const getHistoryRecordById = async (id: string): Promise<HistoryRecord | undefined> => {
  const db = await getDB();
  return db.get('historyRecords', id);
};

export const deleteHistoryRecord = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('historyRecords', id);
};

export const isDuplicateRecord = async (
  cameraPosition: [number, number, number],
  energyType: string,
  timeRange: { start: string; end: string }
): Promise<boolean> => {
  const records = await getAllHistoryRecords();
  const recentRecords = records.slice(0, 10);
  
  for (const record of recentRecords) {
    const posMatch = 
      Math.abs(record.cameraState.position[0] - cameraPosition[0]) < 1 &&
      Math.abs(record.cameraState.position[1] - cameraPosition[1]) < 1 &&
      Math.abs(record.cameraState.position[2] - cameraPosition[2]) < 1;
    
    const paramsMatch = 
      record.parameters.energyType === energyType &&
      record.parameters.timeRange.start === timeRange.start &&
      record.parameters.timeRange.end === timeRange.end;
    
    if (posMatch && paramsMatch) {
      return true;
    }
  }
  
  return false;
};

export const generateRecordId = (): string => {
  return `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
