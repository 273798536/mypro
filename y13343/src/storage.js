const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const EXCEPTIONS_FILE = path.join(DATA_DIR, 'exceptions.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const METADATA_FILE = path.join(DATA_DIR, 'metadata.json');

const STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  WITHDRAWN: 'withdrawn',
  EXCEPTION: 'exception'
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON(filePath, defaultValue) {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`读取 ${filePath} 失败:`, e.message);
    return defaultValue;
  }
}

function writeJSON(filePath, data) {
  ensureDataDir();
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function loadRecords() {
  return readJSON(RECORDS_FILE, []);
}

function saveRecords(records) {
  writeJSON(RECORDS_FILE, records);
}

function loadExceptions() {
  return readJSON(EXCEPTIONS_FILE, []);
}

function saveExceptions(exceptions) {
  writeJSON(EXCEPTIONS_FILE, exceptions);
}

function loadHistory() {
  return readJSON(HISTORY_FILE, []);
}

function saveHistory(history) {
  writeJSON(HISTORY_FILE, history);
}

function loadMetadata() {
  return readJSON(METADATA_FILE, { version: 1, lastModified: null, importBatches: [] });
}

function saveMetadata(meta) {
  meta.lastModified = new Date().toISOString();
  writeJSON(METADATA_FILE, meta);
}

function addHistoryEntry(recordId, action, operator, remark, extra = {}) {
  const history = loadHistory();
  history.push({
    id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    recordId,
    action,
    operator,
    remark,
    timestamp: new Date().toISOString(),
    ...extra
  });
  saveHistory(history);
}

function getHistoryByRecordId(recordId) {
  return loadHistory().filter(h => h.recordId === recordId);
}

module.exports = {
  STATUS,
  loadRecords,
  saveRecords,
  loadExceptions,
  saveExceptions,
  loadHistory,
  saveHistory,
  loadMetadata,
  saveMetadata,
  addHistoryEntry,
  getHistoryByRecordId
};
