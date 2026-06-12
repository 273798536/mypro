import sqlite3 from 'sqlite3';
import { join, dirname } from 'path';
import fs from 'fs';

let db: sqlite3.Database | null = null;
let initPromise: Promise<void> | null = null;

function ensureDataDir(dbPath: string): void {
  const dataDir = dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function getDatabase(): sqlite3.Database {
  if (!db) {
    initDatabase();
  }
  return db!;
}

export function initDatabase(): Promise<void> {
  if (initPromise) return initPromise;
  
  initPromise = new Promise((resolve, reject) => {
    const dbPath = join(__dirname, '../data/database.db');
    ensureDataDir(dbPath);
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
      } else {
        console.log('Database connected');
        initializeTables();
        setTimeout(resolve, 100);
      }
    });
  });
  
  return initPromise;
}

function initializeTables(): void {
  const database = getDatabase();
  
  database.serialize(() => {
    database.run(`
      CREATE TABLE IF NOT EXISTS route_corridors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        start_point TEXT NOT NULL,
        end_point TEXT NOT NULL,
        length REAL NOT NULL,
        altitude_min REAL NOT NULL,
        altitude_max REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    database.run(`
      CREATE TABLE IF NOT EXISTS inspection_records (
        id TEXT PRIMARY KEY,
        corridor_id TEXT NOT NULL,
        record_date TEXT NOT NULL,
        record_type TEXT NOT NULL CHECK(record_type IN ('normal', 'abnormal', 'temporary')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'rejected', 'modified')),
        is_overlapping INTEGER NOT NULL DEFAULT 0,
        confirmed_by TEXT,
        confirmed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        FOREIGN KEY (corridor_id) REFERENCES route_corridors(id)
      )
    `);

    database.run(`
      CREATE TABLE IF NOT EXISTS material_versions (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        material_type TEXT NOT NULL CHECK(material_type IN ('photo', 'document', 'note', 'screenshot')),
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        remark TEXT,
        is_caliber_modified INTEGER NOT NULL DEFAULT 0,
        modified_description TEXT,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        FOREIGN KEY (record_id) REFERENCES inspection_records(id)
      )
    `);

    database.run(`
      CREATE TABLE IF NOT EXISTS manual_notes (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (record_id) REFERENCES inspection_records(id)
      )
    `);

    database.run(`
      CREATE TABLE IF NOT EXISTS history_changes (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        change_type TEXT NOT NULL CHECK(change_type IN ('create', 'update', 'confirm', 'reject', 'status_change')),
        changed_by TEXT NOT NULL,
        changed_at TEXT NOT NULL,
        remark TEXT,
        FOREIGN KEY (record_id) REFERENCES inspection_records(id)
      )
    `);

    database.run(`
      CREATE TABLE IF NOT EXISTS screenshot_exports (
        id TEXT PRIMARY KEY,
        record_id TEXT,
        filter_criteria TEXT NOT NULL,
        image_url TEXT NOT NULL,
        annotation TEXT,
        remark TEXT,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        FOREIGN KEY (record_id) REFERENCES inspection_records(id)
      )
    `);

    database.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('manager', 'inspector', 'viewer')),
        avatar TEXT
      )
    `);

    database.run(`CREATE INDEX IF NOT EXISTS idx_records_corridor ON inspection_records(corridor_id)`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_records_date ON inspection_records(record_date)`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_records_overlap ON inspection_records(is_overlapping)`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_materials_record ON material_versions(record_id)`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_history_record ON history_changes(record_id)`);
  });
}

export function runQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export function runQueryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

export function runExecute(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes || 0 });
    });
  });
}
