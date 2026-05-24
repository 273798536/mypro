import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || './data/bid_tracking.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
  }
});

export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`PRAGMA foreign_keys = ON`);

      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          department TEXT,
          phone TEXT,
          email TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_no TEXT UNIQUE NOT NULL,
          project_name TEXT NOT NULL,
          client_name TEXT,
          bid_deadline TEXT,
          project_manager_id INTEGER,
          status TEXT DEFAULT 'draft',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_manager_id) REFERENCES users(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          document_type TEXT NOT NULL,
          document_no TEXT,
          version INTEGER DEFAULT 1,
          title TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER,
          file_hash TEXT,
          status TEXT DEFAULT 'draft',
          amount REAL,
          quantity INTEGER,
          supplier_name TEXT,
          effective_date TEXT,
          expiry_date TEXT,
          page_count INTEGER,
          is_dirty INTEGER DEFAULT 0,
          created_by INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS change_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          project_id INTEGER NOT NULL,
          operator_id INTEGER NOT NULL,
          operator_name TEXT NOT NULL,
          field_name TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          change_reason TEXT,
          changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (operator_id) REFERENCES users(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS dirty_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          project_id INTEGER NOT NULL,
          dirty_type TEXT NOT NULL,
          field_name TEXT,
          original_value TEXT,
          current_value TEXT,
          description TEXT,
          handler_id INTEGER,
          handler_name TEXT,
          handling_opinion TEXT,
          handled_at TEXT,
          is_resolved INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (handler_id) REFERENCES users(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS status_transitions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          project_id INTEGER NOT NULL,
          from_status TEXT NOT NULL,
          to_status TEXT NOT NULL,
          operator_id INTEGER NOT NULL,
          operator_name TEXT NOT NULL,
          reason TEXT,
          transitioned_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (operator_id) REFERENCES users(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          user_name TEXT NOT NULL,
          action TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id INTEGER,
          ip TEXT,
          user_agent TEXT,
          details TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS export_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          exported_by INTEGER NOT NULL,
          exporter_name TEXT NOT NULL,
          export_type TEXT NOT NULL,
          is_desensitized INTEGER DEFAULT 0,
          file_hash TEXT,
          file_size INTEGER,
          document_ids TEXT,
          exported_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (exported_by) REFERENCES users(id)
        )
      `);

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id)
      `);
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type)
      `);
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_change_records_document ON change_records(document_id)
      `);
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_status_transitions_document ON status_transitions(document_id)
      `);
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)
      `);
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_dirty_records_document ON dirty_records(document_id)
      `);

      resolve();
    });
  });
};

export const runQuery = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const getOne = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const getAll = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export default db;
