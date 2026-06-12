const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let SQL = null;

async function initSQL() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: file => path.join(path.dirname(require.resolve('sql.js')), file)
    });
  }
  return SQL;
}

class Statement {
  constructor(stmt, db) {
    this.stmt = stmt;
    this.db = db;
  }

  run(...params) {
    const flatParams = params.flat();
    this.stmt.bind(flatParams);
    let changes = 0;
    try {
      while (this.stmt.step()) {
        changes++;
      }
    } catch (e) {
    }
    const lastInsertRowid = this.db.lastInsertRowid;
    this.stmt.reset();
    return { changes, lastInsertRowid };
  }

  get(...params) {
    const flatParams = params.flat();
    this.stmt.bind(flatParams);
    let result = undefined;
    if (this.stmt.step()) {
      result = this.stmt.getAsObject();
    }
    this.stmt.reset();
    return result;
  }

  all(...params) {
    const flatParams = params.flat();
    this.stmt.bind(flatParams);
    const results = [];
    while (this.stmt.step()) {
      results.push(this.stmt.getAsObject());
    }
    this.stmt.reset();
    return results;
  }

  free() {
    this.stmt.free();
  }
}

class Database {
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.db = null;
    this.stmts = new Map();
    this._transactionDepth = 0;
  }

  async init() {
    const SQL = await initSQL();

    if (fs.existsSync(this.filePath)) {
      const buf = fs.readFileSync(this.filePath);
      this.db = new SQL.Database(buf);
    } else {
      this.db = new SQL.Database();
    }

    return this;
  }

  prepare(sql) {
    const stmt = this.db.prepare(sql);
    return new Statement(stmt, this);
  }

  exec(sql) {
    this.db.exec(sql);
  }

  pragma(statement) {
    try {
      this.db.exec(`PRAGMA ${statement}`);
    } catch (e) {
    }
  }

  transaction(fn) {
    return (...args) => {
      const inTransaction = this._transactionDepth > 0;
      if (!inTransaction) {
        this.db.exec('BEGIN TRANSACTION');
      }
      this._transactionDepth++;
      try {
        const result = fn.apply(this, args);
        if (this._transactionDepth === 1) {
          this.db.exec('COMMIT');
        }
        return result;
      } catch (e) {
        if (this._transactionDepth === 1) {
          this.db.exec('ROLLBACK');
        }
        throw e;
      } finally {
        this._transactionDepth--;
        if (this._transactionDepth === 0) {
          this.save();
        }
      }
    };
  }

  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, buffer);
  }

  close() {
    this.save();
    this.db.close();
  }

  get lastInsertRowid() {
    try {
      const stmt = this.db.prepare('SELECT last_insert_rowid() as id');
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row.id;
      }
      stmt.free();
    } catch (e) {}
    return null;
  }
}

module.exports = Database;
