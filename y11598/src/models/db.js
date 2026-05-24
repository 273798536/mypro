const Database = require('better-sqlite3');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(config.db.path);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}

function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function generateId() {
  return uuidv4();
}

function transaction(fn) {
  const db = getDb();
  const wrapped = db.transaction(fn);
  return wrapped();
}

module.exports = {
  getDb,
  closeDb,
  generateId,
  transaction,
};
