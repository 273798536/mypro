const Database = require('better-sqlite3');
const path = require('path');
const { SCHEMA_SQL } = require('./schema');

const DB_PATH = path.join(__dirname, '../../data/deposit-refund.db');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}

function initDatabase() {
  const db = getDb();
  db.exec(SCHEMA_SQL);
  console.log('数据库初始化完成');
  return db;
}

function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function generateNo(prefix) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

module.exports = {
  getDb,
  initDatabase,
  closeDatabase,
  generateNo,
  DB_PATH
};
