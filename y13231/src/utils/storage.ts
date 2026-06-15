import { openDB, IDBPDatabase } from 'idb';
import type { ConflictRecord } from '@/types';

const DB_NAME = 'sampling-conflict-db';
const DB_VERSION = 1;
const STORE_RECORDS = 'conflictRecords';
const LOCAL_STORAGE_KEY = 'sampling-conflict-meta';

export interface StorageMeta {
  lastSync: string;
  recordCount: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_RECORDS)) {
          db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveToIndexedDB(records: ConflictRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_RECORDS, 'readwrite');
  const store = tx.objectStore(STORE_RECORDS);
  
  await store.clear();
  
  for (const record of records) {
    await store.put(record);
  }
  
  await tx.done;
  saveMeta({
    lastSync: new Date().toISOString(),
    recordCount: records.length,
  });
}

export async function loadFromIndexedDB(): Promise<ConflictRecord[]> {
  try {
    const db = await getDB();
    const records = await db.getAll(STORE_RECORDS);
    return records as ConflictRecord[];
  } catch (error) {
    console.error('Failed to load from IndexedDB:', error);
    return [];
  }
}

export function saveMeta(meta: StorageMeta): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(meta));
  } catch (error) {
    console.error('Failed to save meta to localStorage:', error);
  }
}

export function loadMeta(): StorageMeta | null {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load meta from localStorage:', error);
    return null;
  }
}

export function saveFilters(filters: Record<string, unknown>): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}-filters`, JSON.stringify(filters));
  } catch (error) {
    console.error('Failed to save filters:', error);
  }
}

export function loadFilters(): Record<string, unknown> | null {
  try {
    const data = localStorage.getItem(`${LOCAL_STORAGE_KEY}-filters`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load filters:', error);
    return null;
  }
}
