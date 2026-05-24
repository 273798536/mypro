const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
  }
});

class DatabaseWrapper {
  constructor(db) {
    this.db = db;
  }

  prepare(sql) {
    const stmt = this.db.prepare(sql);
    return {
      run: (...params) => {
        return new Promise((resolve, reject) => {
          stmt.run(...params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      },
      get: (...params) => {
        return new Promise((resolve, reject) => {
          stmt.get(...params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      },
      all: (...params) => {
        return new Promise((resolve, reject) => {
          stmt.all(...params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      }
    };
  }

  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  run(sql, ...params) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, ...params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, ...params) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, ...params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, ...params) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, ...params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  pragma(statement) {
    return new Promise((resolve, reject) => {
      this.db.run(`PRAGMA ${statement}`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

const wrappedDb = new DatabaseWrapper(db);

module.exports = wrappedDb;
