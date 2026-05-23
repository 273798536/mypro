import sqlite3 from 'sqlite3';
import { CREATE_TABLES_SQL } from './schema';
import * as path from 'path';
import * as fs from 'fs';

sqlite3.verbose();

class Database {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new sqlite3.Database(dbPath);
    this.initTables();
  }

  private initTables(): void {
    this.db.exec(CREATE_TABLES_SQL, (err) => {
      if (err) {
        console.error('Failed to create tables:', err);
      } else {
        console.log('Database tables initialized successfully');
      }
    });
  }

  getConnection(): sqlite3.Database {
    return this.db;
  }

  run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  serialize(callback: () => void): void {
    this.db.serialize(callback);
  }
}

let dbInstance: Database | null = null;

export function getDatabase(dbPath?: string): Database {
  if (!dbInstance) {
    if (!dbPath) {
      throw new Error('Database path is required for first initialization');
    }
    dbInstance = new Database(dbPath);
  }
  return dbInstance;
}

export default Database;
