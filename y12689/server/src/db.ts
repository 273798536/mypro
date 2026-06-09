import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';

let SQL: SqlJsStatic;
let db: Database;
let saveInterval: NodeJS.Timeout;

const dbPath = path.join(__dirname, '..', 'database.db');

interface StatementWrapper {
  run(...params: any[]): void;
  get(...params: any[]): any;
  all(...params: any[]): any[];
}

function prepare(sql: string): StatementWrapper {
  const stmt = db!.prepare(sql);
  return {
    run(...params: any[]) {
      stmt.bind(params);
      stmt.step();
      stmt.free();
    },
    get(...params: any[]): any {
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all(...params: any[]): any[] {
      const results: any[] = [];
      stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    },
  };
}

function run(sql: string, params?: any[]): void {
  if (params) {
    db!.run(sql, params);
  } else {
    db!.run(sql);
  }
}

function exec(sql: string): void {
  db!.exec(sql);
}

function saveDatabase(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('Failed to save database:', e);
  }
}

export async function initDatabaseInstance(): Promise<void> {
  SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      const uint8Array = new Uint8Array(fileBuffer);
      db = new SQL.Database(uint8Array);
    } catch (e) {
      console.error('Failed to load existing database, creating new one:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
}

export function initDatabase(): void {
  exec(`
    CREATE TABLE IF NOT EXISTS normal_records (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      device_id TEXT NOT NULL,
      device_x REAL NOT NULL,
      device_y REAL NOT NULL,
      device_z REAL NOT NULL,
      operator TEXT NOT NULL,
      status TEXT NOT NULL,
      point_count INTEGER DEFAULT 0,
      normal_deviation REAL DEFAULT 0,
      occlusion_reason TEXT,
      occlusion_detected INTEGER DEFAULT 0,
      occlusion_severity TEXT,
      occlusion_affected_area TEXT,
      occlusion_device_relation TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS normal_vectors (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      pos_x REAL NOT NULL,
      pos_y REAL NOT NULL,
      pos_z REAL NOT NULL,
      dir_x REAL NOT NULL,
      dir_y REAL NOT NULL,
      dir_z REAL NOT NULL,
      deviation REAL NOT NULL,
      is_valid INTEGER NOT NULL,
      explanation TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES normal_records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS screenshots (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      url TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      annotation TEXT,
      has_issue INTEGER DEFAULT 0,
      FOREIGN KEY (record_id) REFERENCES normal_records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS point_cloud_slices (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      slice_index INTEGER NOT NULL,
      data TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES normal_records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS history_items (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      version TEXT,
      timestamp TEXT NOT NULL,
      details TEXT,
      snapshot TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES normal_records(id) ON DELETE CASCADE
    );
  `);

  saveDatabase();
}

export function isDatabaseEmpty(): boolean {
  const row = prepare('SELECT COUNT(*) as count FROM normal_records').get();
  return row.count === 0;
}

export function startAutoSave(intervalMs: number = 5000): void {
  if (saveInterval) {
    clearInterval(saveInterval);
  }
  saveInterval = setInterval(saveDatabase, intervalMs);
}

export function stopAutoSave(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = undefined as any;
  }
}

export function getDbPath(): string {
  return dbPath;
}

const dbWrapper = {
  prepare,
  run,
  exec,
};

export default dbWrapper;
