const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../../data/finance-audit.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath);
    this.db.run(`PRAGMA foreign_keys = ON`);
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    return this.run(sql, values);
  }

  async update(table, data, where, whereParams = []) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    return this.run(sql, values);
  }

  async delete(table, where, whereParams = []) {
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    return this.run(sql, whereParams);
  }

  async findById(table, id) {
    return this.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  }

  async findByNo(table, noField, noValue) {
    return this.get(`SELECT * FROM ${table} WHERE ${noField} = ?`, [noValue]);
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

const db = new Database();

const hashContent = (content) => {
  return crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
};

const generateNo = (prefix) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

module.exports = { db, hashContent, generateNo };
