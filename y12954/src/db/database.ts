import fs from 'fs';
import path from 'path';
import {
  IndexSuggestion,
  AnomalyRecord,
  SchemaSnapshot,
  MetricsSupplement,
  AuditLogEntry,
  RunContext,
  RunStatus,
} from '../types';

const DATA_DIR = path.join(process.cwd(), '.index-coverage-data');
const DB_FILE = path.join(DATA_DIR, 'datastore.json');

export interface DataStoreSchema {
  runs: Array<RunContext & { status: RunStatus }>;
  suggestions: IndexSuggestion[];
  anomalies: AnomalyRecord[];
  schemas: SchemaSnapshot[];
  supplements: MetricsSupplement[];
  auditLogs: AuditLogEntry[];
}

let storeInstance: DataStoreSchema | null = null;

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function emptyStore(): DataStoreSchema {
  return {
    runs: [],
    suggestions: [],
    anomalies: [],
    schemas: [],
    supplements: [],
    auditLogs: [],
  };
}

export function getStore(): DataStoreSchema {
  if (storeInstance) return storeInstance;
  ensureDir();

  if (fs.existsSync(DB_FILE)) {
    try {
      storeInstance = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DataStoreSchema;
    } catch {
      storeInstance = emptyStore();
    }
  } else {
    storeInstance = emptyStore();
  }

  if (!storeInstance.runs) storeInstance = emptyStore();

  return storeInstance;
}

export function saveStore(): void {
  ensureDir();
  const data = getStore();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function resetStoreForTest(): void {
  storeInstance = emptyStore();
  saveStore();
}

export function closeDb(): void {
  storeInstance = null;
}
