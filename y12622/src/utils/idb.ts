import { openDB, IDBPDatabase } from 'idb';
import type { Equipment, SourceImage, Processing, Anomaly, Opinion, Conclusion } from '../types';

const DB_NAME = 'microscope-image-board';
const DB_VERSION = 1;

export interface DBSchema {
  equipment: { key: string; value: Equipment };
  sourceImages: { key: string; value: SourceImage; indexes: { 'by-hash-coords': [string, string] } };
  processings: { key: string; value: Processing; indexes: { 'by-source-image': string } };
  anomalies: { key: string; value: Anomaly; indexes: { 'by-processing': string } };
  opinions: { key: string; value: Opinion; indexes: { 'by-anomaly': string } };
  conclusions: { key: string; value: Conclusion; indexes: { 'by-anomaly': string } };
}

let db: IDBPDatabase<DBSchema> | null = null;

export async function initDB(): Promise<IDBPDatabase<DBSchema>> {
  if (db) return db;

  db = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('equipment')) {
        db.createObjectStore('equipment', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('sourceImages')) {
        const store = db.createObjectStore('sourceImages', { keyPath: 'id' });
        store.createIndex('by-hash-coords', ['image_hash', 'coordinates'], { unique: true });
      }

      if (!db.objectStoreNames.contains('processings')) {
        const store = db.createObjectStore('processings', { keyPath: 'id' });
        store.createIndex('by-source-image', 'source_image_id');
      }

      if (!db.objectStoreNames.contains('anomalies')) {
        const store = db.createObjectStore('anomalies', { keyPath: 'id' });
        store.createIndex('by-processing', 'processing_id');
      }

      if (!db.objectStoreNames.contains('opinions')) {
        const store = db.createObjectStore('opinions', { keyPath: 'id' });
        store.createIndex('by-anomaly', 'anomaly_id');
      }

      if (!db.objectStoreNames.contains('conclusions')) {
        const store = db.createObjectStore('conclusions', { keyPath: 'id' });
        store.createIndex('by-anomaly', 'anomaly_id');
      }
    },
  });

  return db;
}

export async function getAllFromStore<T extends keyof DBSchema>(storeName: T): Promise<DBSchema[T]['value'][]> {
  const database = await initDB();
  return database.getAll(storeName);
}

export async function addToStore<T extends keyof DBSchema>(
  storeName: T,
  value: DBSchema[T]['value']
): Promise<string> {
  const database = await initDB();
  const key = await database.add(storeName, value);
  return String(key);
}

export async function putToStore<T extends keyof DBSchema>(
  storeName: T,
  value: DBSchema[T]['value']
): Promise<string> {
  const database = await initDB();
  const key = await database.put(storeName, value);
  return String(key);
}

export async function getFromStore<T extends keyof DBSchema>(
  storeName: T,
  key: string
): Promise<DBSchema[T]['value'] | undefined> {
  const database = await initDB();
  return database.get(storeName, key);
}

export async function getFromIndex<T extends keyof DBSchema>(
  storeName: T,
  indexName: string,
  key: IDBValidKey | IDBKeyRange
): Promise<DBSchema[T]['value'][]> {
  const database = await initDB();
  return database.getAllFromIndex(storeName, indexName as any, key);
}

export async function closeDB(): Promise<void> {
  if (db) {
    db.close();
    db = null;
  }
}
