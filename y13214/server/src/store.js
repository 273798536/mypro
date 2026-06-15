import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const RECORDS_FILE = join(DATA_DIR, 'records.json');
const HISTORY_FILE = join(DATA_DIR, 'history.json');
const VERSIONS_FILE = join(DATA_DIR, 'versions.json');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');

function safeRead(path, fallback) {
  try {
    if (fs.existsSync(path)) {
      const raw = fs.readFileSync(path, 'utf8');
      return raw ? JSON.parse(raw) : fallback;
    }
  } catch (e) {
    console.error(`[store] read error ${path}:`, e.message);
  }
  return fallback;
}

function safeWrite(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

export function getRecords() {
  return safeRead(RECORDS_FILE, []);
}

export function saveRecords(records) {
  safeWrite(RECORDS_FILE, records);
}

export function getHistory() {
  return safeRead(HISTORY_FILE, []);
}

export function appendHistory(entry) {
  const all = getHistory();
  all.unshift({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...entry
  });
  safeWrite(HISTORY_FILE, all);
  return all;
}

export function getVersions() {
  return safeRead(VERSIONS_FILE, []);
}

export function saveVersions(versions) {
  safeWrite(VERSIONS_FILE, versions);
}

export function createVersionSnapshot(records, label, operator = 'system') {
  const versions = getVersions();
  const snapshot = {
    id: uuidv4(),
    label,
    operator,
    createdAt: new Date().toISOString(),
    recordCount: records.length,
    records: JSON.parse(JSON.stringify(records))
  };
  versions.unshift(snapshot);
  saveVersions(versions);
  return snapshot;
}

export function getSettings() {
  return safeRead(SETTINGS_FILE, { filters: {}, notes: {}, screenshots: {} });
}

export function saveSettings(settings) {
  safeWrite(SETTINGS_FILE, settings);
}

export function generateRecordId() {
  return uuidv4();
}
