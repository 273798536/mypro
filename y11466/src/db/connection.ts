import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface DatabaseConfig {
  dbPath?: string;
  readonly?: boolean;
  timeout?: number;
}

let dbInstance: Database.Database | null = null;

const DEFAULT_DB_FILENAME = 'garment_inspection.db';

export function getDatabase(config: DatabaseConfig = {}): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = config.dbPath || path.join(process.cwd(), DEFAULT_DB_FILENAME);
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(dbPath, {
    readonly: config.readonly || false,
    timeout: config.timeout || 5000,
    fileMustExist: false
  });

  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');

  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function isDatabaseInitialized(config: DatabaseConfig = {}): boolean {
  const dbPath = config.dbPath || path.join(process.cwd(), DEFAULT_DB_FILENAME);
  if (!fs.existsSync(dbPath)) {
    return false;
  }
  
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const result = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='migrations'
    `).get();
    db.close();
    return !!result;
  } catch {
    return false;
  }
}
