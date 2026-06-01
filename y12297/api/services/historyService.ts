import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { HistoryRecord } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

interface HistoryStore {
  records: HistoryRecord[];
  checksumIndex: Record<string, string>;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(HISTORY_FILE)) {
    const initialData: HistoryStore = {
      records: [],
      checksumIndex: {},
    };
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(initialData, null, 2));
  }
}

function readStore(): HistoryStore {
  ensureDataDir();
  try {
    const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read history store:', error);
    return { records: [], checksumIndex: {} };
  }
}

function writeStore(store: HistoryStore): void {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(store, null, 2));
}

export async function checkChecksumExists(checksum: string): Promise<boolean> {
  const store = readStore();
  return !!store.checksumIndex[checksum];
}

export async function saveHistoryRecord(record: HistoryRecord): Promise<{ success: boolean; id?: string; error?: string }> {
  const store = readStore();

  if (store.checksumIndex[record.checksum]) {
    return {
      success: false,
      error: '重复记录：该数据快照已存在，无法重复保存',
    };
  }

  store.records.push(record);
  store.checksumIndex[record.checksum] = record.id;
  store.records.sort((a, b) => b.timestamp - a.timestamp);

  writeStore(store);

  return { success: true, id: record.id };
}

export async function getAllHistoryRecords(): Promise<HistoryRecord[]> {
  const store = readStore();
  return store.records.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getHistoryRecordById(id: string): Promise<HistoryRecord | null> {
  const store = readStore();
  return store.records.find((r) => r.id === id) || null;
}

export async function deleteHistoryRecord(id: string): Promise<boolean> {
  const store = readStore();
  const record = store.records.find((r) => r.id === id);

  if (!record) {
    return false;
  }

  store.records = store.records.filter((r) => r.id !== id);
  delete store.checksumIndex[record.checksum];

  writeStore(store);

  return true;
}

export async function clearAllHistory(): Promise<void> {
  const store: HistoryStore = {
    records: [],
    checksumIndex: {},
  };
  writeStore(store);
}

export async function syncRecords(localRecords: HistoryRecord[]): Promise<HistoryRecord[]> {
  const store = readStore();
  const newRecords: HistoryRecord[] = [];

  for (const record of localRecords) {
    if (!store.checksumIndex[record.checksum]) {
      store.records.push(record);
      store.checksumIndex[record.checksum] = record.id;
      newRecords.push(record);
    }
  }

  store.records.sort((a, b) => b.timestamp - a.timestamp);
  writeStore(store);

  return newRecords;
}
