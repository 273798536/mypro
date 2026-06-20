import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { ChorusAlertRecord, FilterCriteria, HistoryAction } from '../types';

const DB_NAME = 'chorus-alert-db';
const DB_VERSION = 1;
const STORE_RECORDS = 'records';
const STORE_HISTORY = 'history';
const STORE_FILTERS = 'filters';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_RECORDS)) {
          const recordStore = db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
          recordStore.createIndex('voicePart', 'voicePart');
          recordStore.createIndex('alertLevel', 'alertLevel');
          recordStore.createIndex('status', 'status');
          recordStore.createIndex('rehearsalDate', 'rehearsalDate');
          recordStore.createIndex('studentName', 'studentName');
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          const historyStore = db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
          historyStore.createIndex('recordId', 'recordId');
          historyStore.createIndex('timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains(STORE_FILTERS)) {
          db.createObjectStore(STORE_FILTERS, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveRecords(records: ChorusAlertRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_RECORDS, 'readwrite');
  for (const record of records) {
    await tx.store.put(record);
  }
  await tx.done;
}

export async function saveRecord(record: ChorusAlertRecord): Promise<void> {
  const db = await getDB();
  await db.put(STORE_RECORDS, record);
}

export async function getAllRecords(): Promise<ChorusAlertRecord[]> {
  const db = await getDB();
  return db.getAll(STORE_RECORDS);
}

export async function getRecordById(id: string): Promise<ChorusAlertRecord | undefined> {
  const db = await getDB();
  return db.get(STORE_RECORDS, id);
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_RECORDS, id);
}

export async function saveHistory(actions: HistoryAction[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_HISTORY, 'readwrite');
  for (const action of actions) {
    await tx.store.put(action);
  }
  await tx.done;
}

export async function addHistoryAction(action: HistoryAction): Promise<void> {
  const db = await getDB();
  await db.put(STORE_HISTORY, action);
}

export async function getAllHistory(): Promise<HistoryAction[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_HISTORY, 'timestamp');
}

export async function getHistoryByRecordId(recordId: string): Promise<HistoryAction[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_HISTORY, 'recordId', IDBKeyRange.only(recordId));
}

export async function saveFilterCriteria(criteria: FilterCriteria): Promise<void> {
  const db = await getDB();
  await db.put(STORE_FILTERS, { id: 'current', ...criteria });
}

export async function getFilterCriteria(): Promise<FilterCriteria | null> {
  const db = await getDB();
  const result = await db.get(STORE_FILTERS, 'current');
  if (!result) return null;
  const { id, ...rest } = result as { id: string } & FilterCriteria;
  void id;
  return rest;
}

export function filterRecords(
  records: ChorusAlertRecord[],
  criteria: FilterCriteria
): ChorusAlertRecord[] {
  return records.filter((record) => {
    if (criteria.voicePart && record.voicePart !== criteria.voicePart) return false;
    if (criteria.alertLevel && record.alertLevel !== criteria.alertLevel) return false;
    if (criteria.status && record.status !== criteria.status) return false;
    if (criteria.versionSource) {
      if (criteria.versionSource === 'old_master') {
        if (!record.versionInfo || record.versionInfo.source !== 'old_master') return false;
      } else if (!record.versionInfo || record.versionInfo.source !== criteria.versionSource) {
        return false;
      }
    }
    if (criteria.hasLateAttachment === true) {
      if (!record.screenshots.some((s) => s.isLate)) return false;
    }
    if (criteria.hasOldMaster === true) {
      if (!record.versionInfo || record.versionInfo.source !== 'old_master') return false;
    }
    if (criteria.studentName) {
      if (!record.studentName.includes(criteria.studentName)) return false;
    }
    if (criteria.dateFrom) {
      if (record.rehearsalDate < criteria.dateFrom) return false;
    }
    if (criteria.dateTo) {
      if (record.rehearsalDate > criteria.dateTo) return false;
    }
    return true;
  });
}
