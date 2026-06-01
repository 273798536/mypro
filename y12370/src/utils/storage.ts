import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'rehearsal-booking-db';
const DB_VERSION = 1;

interface DBSchema {
  dataSources: {
    key: string;
    value: unknown;
  };
  rooms: {
    key: string;
    value: unknown;
  };
  bands: {
    key: string;
    value: unknown;
  };
  courses: {
    key: string;
    value: unknown;
  };
  bookings: {
    key: string;
    value: unknown;
    indexes: { 'by-room': string; 'by-band': string };
  };
  conflicts: {
    key: string;
    value: unknown;
  };
  changeHistory: {
    key: string;
    value: unknown;
    indexes: { 'by-booking': string };
  };
  teacherLeaves: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<DBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<DBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('dataSources')) {
          db.createObjectStore('dataSources', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('rooms')) {
          db.createObjectStore('rooms', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('bands')) {
          db.createObjectStore('bands', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('courses')) {
          db.createObjectStore('courses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('bookings')) {
          const bookingStore = db.createObjectStore('bookings', { keyPath: 'id' });
          bookingStore.createIndex('by-room', 'roomId');
          bookingStore.createIndex('by-band', 'bandId');
        }
        if (!db.objectStoreNames.contains('conflicts')) {
          db.createObjectStore('conflicts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('changeHistory')) {
          const historyStore = db.createObjectStore('changeHistory', { keyPath: 'id' });
          historyStore.createIndex('by-booking', 'bookingId');
        }
        if (!db.objectStoreNames.contains('teacherLeaves')) {
          db.createObjectStore('teacherLeaves', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveToStore<T>(
  storeName: keyof DBSchema,
  data: T[],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  for (const item of data) {
    await tx.store.put(item);
  }
  await tx.done;
}

export async function saveSingleToStore<T>(
  storeName: keyof DBSchema,
  item: T,
): Promise<void> {
  const db = await getDB();
  await db.put(storeName, item);
}

export async function getAllFromStore<T>(
  storeName: keyof DBSchema,
): Promise<T[]> {
  const db = await getDB();
  return (await db.getAll(storeName)) as T[];
}

export async function getFromStoreById<T>(
  storeName: keyof DBSchema,
  id: string,
): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get(storeName, id)) as T | undefined;
}

export async function deleteFromStore(
  storeName: keyof DBSchema,
  id: string,
): Promise<void> {
  const db = await getDB();
  await db.delete(storeName, id);
}

export async function clearStore(storeName: keyof DBSchema): Promise<void> {
  const db = await getDB();
  await db.clear(storeName);
}

export async function clearAllStores(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(db.objectStoreNames, 'readwrite');
  for (const storeName of db.objectStoreNames) {
    await tx.objectStore(storeName).clear();
  }
  await tx.done;
}

export function saveToLocalStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function getFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Failed to read from localStorage:', e);
    return defaultValue;
  }
}

export function removeFromLocalStorage(key: string): void {
  localStorage.removeItem(key);
}
