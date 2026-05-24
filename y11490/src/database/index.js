const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../../config');
const { createTables } = require('./schema');
const logger = require('../utils/logger');

let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    const dbDir = path.dirname(config.database.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(config.database.path, (err) => {
      if (err) {
        logger.error('Failed to open database:', err);
        reject(err);
        return;
      }

      db.serialize(() => {
        db.exec('PRAGMA foreign_keys = ON');
        db.exec(createTables, (err) => {
          if (err) {
            logger.error('Failed to create tables:', err);
            reject(err);
            return;
          }
          logger.info('Database initialized successfully');
          resolve(db);
        });
      });
    });
  });
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        logger.info('Database closed');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

async function runInTransaction(callback) {
  await run('BEGIN TRANSACTION');
  try {
    const result = await callback();
    await run('COMMIT');
    return result;
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }
}

module.exports = {
  initDatabase,
  getDb,
  closeDatabase,
  run,
  get,
  all,
  runInTransaction
};
