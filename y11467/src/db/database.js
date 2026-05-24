const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const SCHEMA_SQL = require('./schema');

const DB_PATH = path.join(process.cwd(), 'data', 'garment_sample.db');

class Database {
  constructor() {
    this.db = null;
    this.inTransaction = false;
  }

  async init() {
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          this.db.exec('PRAGMA foreign_keys = ON;', (err) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      this.db.exec(SCHEMA_SQL, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async prepare(sql) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(sql, (err) => {
        if (err) reject(err);
        else resolve(stmt);
      });
    });
  }

  async beginTransaction() {
    if (!this.inTransaction) {
      await this.run('BEGIN TRANSACTION');
      this.inTransaction = true;
    }
  }

  async commit() {
    if (this.inTransaction) {
      await this.run('COMMIT');
      this.inTransaction = false;
    }
  }

  async rollback() {
    if (this.inTransaction) {
      await this.run('ROLLBACK');
      this.inTransaction = false;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

const dbInstance = new Database();

module.exports = dbInstance;
