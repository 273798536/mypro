import Database from 'better-sqlite3';
import { getDb } from '../db/index.js';

export abstract class BaseRepository<T> {
  protected db: Database.Database;
  protected abstract tableName: string;

  constructor() {
    this.db = getDb();
  }

  protected abstract rowToEntity(row: unknown): T;

  findById(id: string): T | null {
    const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
    return row ? this.rowToEntity(row) : null;
  }

  findAll(): T[] {
    const rows = this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY created_at DESC`).all();
    return rows.map(row => this.rowToEntity(row));
  }

  delete(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  count(): number {
    const row = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`).get() as { count: number };
    return row.count;
  }
}
