const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const dbPath = path.join(DATA_DIR, 'gas_absorption.db');

let SQL = null;
let db = null;
let inTransaction = false;

async function initDB() {
  SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    db.run(fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf8'));
    saveDB();
  }
  console.log('数据库初始化完成:', dbPath);
  return db;
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function run(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const result = stmt.step();
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0] || null;
  stmt.free();
  if (!inTransaction) saveDB();
  return { lastInsertRowid: lastId, changes: 1 };
}

function get(sql, params = []) {
  const results = all(sql, params);
  return results.length ? results[0] : undefined;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  const cols = stmt.getColumnNames();
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();
  return results;
}

function exec(sql) {
  db.run(sql);
  if (!inTransaction) saveDB();
}

function beginTransaction() { db.run('BEGIN TRANSACTION'); inTransaction = true; }
function commit() { db.run('COMMIT'); inTransaction = false; saveDB(); }
function rollback() { try { db.run('ROLLBACK'); inTransaction = false; } catch(e) {} inTransaction = false; }

module.exports = { initDB, run, get, all, exec, saveDB, beginTransaction, commit, rollback };
