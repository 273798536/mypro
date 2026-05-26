const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDB() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      contracts: {},
      paymentNodes: {},
      acceptanceEmails: {},
      confirmations: {},
      versionHistory: [],
      failedRecords: [],
      users: {
        'admin': { id: 'admin', role: 'director', name: '系统管理员' },
        'operator': { id: 'operator', role: 'operator', name: '录入员张三' },
        'reviewer': { id: 'reviewer', role: 'reviewer', name: '复核员李四' },
        'viewer': { id: 'viewer', role: 'viewer', name: '只读用户王五' }
      },
      _meta: { lastUpdated: new Date().toISOString() }
    };
    saveDB(initial);
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(db) {
  ensureDataDir();
  db._meta = db._meta || {};
  db._meta.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

let dbCache = null;

function getDB() {
  if (!dbCache) {
    dbCache = loadDB();
  }
  return dbCache;
}

function persist() {
  saveDB(dbCache);
}

function resetCache() {
  dbCache = null;
}

function addFailedRecord(entityType, rawData, error, userId) {
  const db = getDB();
  const record = {
    id: `FAIL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    entityType: entityType,
    rawData: JSON.stringify(rawData),
    error: error.message || String(error),
    errorCode: error.code || 'UNKNOWN_ERROR',
    reportedBy: userId || 'system',
    reportedAt: new Date().toISOString(),
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: ''
  };
  db.failedRecords.push(record);
  persist();
  return record;
}

module.exports = { getDB, persist, resetCache, loadDB, saveDB, addFailedRecord };
