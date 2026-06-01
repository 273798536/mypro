import { openDB, IDBPDatabase } from 'idb';
import type {
  ProductArchive,
  YieldRange,
  ExplanationReport,
  HistoryRecord,
} from '../../shared/types';

const DB_NAME = 'financial-spectrum-db';
const DB_VERSION = 1;

const STORES = {
  PRODUCTS: 'products',
  YIELDS: 'yields',
  REPORTS: 'reports',
  HISTORY: 'history',
} as const;

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        productStore.createIndex('type', 'type');
        productStore.createIndex('riskLevel', 'riskLevel');
        productStore.createIndex('createTime', 'createTime');
      }

      if (!db.objectStoreNames.contains(STORES.YIELDS)) {
        const yieldStore = db.createObjectStore(STORES.YIELDS, { keyPath: 'productId' });
        yieldStore.createIndex('productId', 'productId');
      }

      if (!db.objectStoreNames.contains(STORES.REPORTS)) {
        const reportStore = db.createObjectStore(STORES.REPORTS, { keyPath: 'productId' });
        reportStore.createIndex('productId', 'productId');
        reportStore.createIndex('reportTime', 'reportTime');
      }

      if (!db.objectStoreNames.contains(STORES.HISTORY)) {
        const historyStore = db.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
        historyStore.createIndex('timestamp', 'timestamp');
        historyStore.createIndex('checksum', 'checksum', { unique: true });
      }
    },
  });

  return dbInstance;
}

export async function generateChecksum(
  products: ProductArchive[],
  yields: YieldRange[],
  reports: ExplanationReport[]
): Promise<string> {
  const data = JSON.stringify({
    products: products.sort((a, b) => a.id.localeCompare(b.id)),
    yields: yields.sort((a, b) => a.productId.localeCompare(b.productId)),
    reports: reports.sort((a, b) => a.productId.localeCompare(b.productId)),
  });

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

export async function saveProducts(products: ProductArchive[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
  await Promise.all(products.map((p) => tx.store.put(p)));
  await tx.done;
}

export async function loadProducts(): Promise<ProductArchive[]> {
  const db = await getDB();
  return db.getAll(STORES.PRODUCTS);
}

export async function saveYields(yields: YieldRange[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.YIELDS, 'readwrite');
  await Promise.all(yields.map((y) => tx.store.put(y)));
  await tx.done;
}

export async function loadYields(): Promise<YieldRange[]> {
  const db = await getDB();
  return db.getAll(STORES.YIELDS);
}

export async function saveReports(reports: ExplanationReport[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.REPORTS, 'readwrite');
  await Promise.all(reports.map((r) => tx.store.put(r)));
  await tx.done;
}

export async function loadReports(): Promise<ExplanationReport[]> {
  const db = await getDB();
  return db.getAll(STORES.REPORTS);
}

export async function saveHistoryRecord(record: HistoryRecord): Promise<{ success: boolean; id?: string; error?: string }> {
  const db = await getDB();

  try {
    const existing = await db.getFromIndex(STORES.HISTORY, 'checksum', record.checksum);
    if (existing) {
      return {
        success: false,
        error: '重复记录：该数据快照已存在，无法重复保存',
      };
    }

    const tx = db.transaction(STORES.HISTORY, 'readwrite');
    await tx.store.put(record);
    await tx.done;

    return { success: true, id: record.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '保存失败',
    };
  }
}

export async function loadHistoryRecords(): Promise<HistoryRecord[]> {
  const db = await getDB();
  const records = await db.getAll(STORES.HISTORY);
  return records.sort((a, b) => b.timestamp - a.timestamp);
}

export async function deleteHistoryRecord(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    await db.delete(STORES.HISTORY, id);
    return true;
  } catch {
    return false;
  }
}

export async function checkChecksumExists(checksum: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.getFromIndex(STORES.HISTORY, 'checksum', checksum);
  return !!existing;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    [STORES.PRODUCTS, STORES.YIELDS, STORES.REPORTS, STORES.HISTORY],
    'readwrite'
  );
  await Promise.all([
    tx.objectStore(STORES.PRODUCTS).clear(),
    tx.objectStore(STORES.YIELDS).clear(),
    tx.objectStore(STORES.REPORTS).clear(),
    tx.objectStore(STORES.HISTORY).clear(),
  ]);
  await tx.done;
}

export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function syncWithBackend(record: HistoryRecord): Promise<boolean> {
  try {
    const response = await fetch('/api/history/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checksum: record.checksum }),
    });
    const { exists } = await response.json();

    if (exists) {
      return false;
    }

    const saveResponse = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });

    return saveResponse.ok;
  } catch (error) {
    console.error('Backend sync failed, using local storage only:', error);
    return true;
  }
}

export async function loadFromBackend(): Promise<HistoryRecord[]> {
  try {
    const response = await fetch('/api/history');
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.error('Failed to load from backend:', error);
  }
  return [];
}
