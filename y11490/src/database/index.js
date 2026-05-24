const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../../config');
const { createTables } = require('./schema');
const logger = require('../utils/logger');

let db;

function initDatabase() {
  const dbDir = path.dirname(config.database.path);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.database.path, {
    verbose: (msg) => logger.debug(msg)
  });

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(createTables);
  
  logger.info('Database initialized successfully');
  return db;
}

function getDb() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    logger.info('Database closed');
  }
}

function runInTransaction(callback) {
  const db = getDb();
  const result = db.transaction(callback)();
  return result;
}

module.exports = {
  initDatabase,
  getDb,
  closeDatabase,
  runInTransaction
};
