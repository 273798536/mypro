const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDB() {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    return {
      orders: [],
      depositFlows: [],
      damageReports: [],
      channelReceipts: [],
      releaseRecords: [],
      alerts: [],
      auditLogs: []
    };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(db) {
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function audit(db, entityType, entityId, action, details) {
  db.auditLogs.push({
    id: genId('AUD'),
    entityType,
    entityId,
    action,
    details: details || {},
    timestamp: nowIso()
  });
}

module.exports = {
  loadDB,
  saveDB,
  genId,
  nowIso,
  audit,
  DATA_DIR
};