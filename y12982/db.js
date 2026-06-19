const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'inspection.db');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('数据库连接失败:', err.message);
      }
    });
    dbInstance.run('PRAGMA journal_mode = WAL');
    dbInstance.run('PRAGMA foreign_keys = ON');
  }
  return dbInstance;
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    getDb().exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function closeDb() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      dbInstance.close((err) => {
        if (err) reject(err);
        else {
          dbInstance = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

function generateId(prefix) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${timestamp}-${random}`;
}

async function recordAudit(actionType, targetType, targetId, oldValue, newValue, operator, reason, ip) {
  const trailId = generateId('AUDIT');
  await run(
    `INSERT INTO audit_trail 
     (trail_id, action_type, target_type, target_id, old_value, new_value, operator, reason, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [trailId, actionType, targetType, targetId, oldValue, newValue, operator, reason, ip || '127.0.0.1']
  );
  return trailId;
}

module.exports = {
  DB_PATH,
  getDb,
  run,
  get,
  all,
  exec,
  closeDb,
  generateId,
  recordAudit
};
