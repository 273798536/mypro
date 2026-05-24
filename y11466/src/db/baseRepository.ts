import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { ConflictStrategy } from '../types';

export interface FindOptions {
  where?: Record<string, unknown>;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export abstract class BaseRepository<T extends { id?: string }, TRow = Record<string, unknown>> {
  protected db: Database.Database;
  protected abstract tableName: string;

  constructor(db: Database.Database) {
    this.db = db;
  }

  protected abstract rowToEntity(row: TRow): T;

  protected generateId(): string {
    return uuidv4();
  }

  protected now(): string {
    return dayjs().toISOString();
  }

  protected serialize(value: unknown): string {
    return JSON.stringify(value);
  }

  protected deserialize<T>(value: string | null | undefined): T | null {
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  abstract create(data: Partial<T>, createdBy: string): T;
  abstract update(id: string, data: Partial<T>, updatedBy: string): T | null;
  abstract findById(id: string): T | null;

  protected buildWhereClause(options: FindOptions): {
    clause: string;
    params: Record<string, unknown>;
  } {
    if (!options.where || Object.keys(options.where).length === 0) {
      return { clause: '', params: {} };
    }

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(options.where)) {
      if (value === undefined) continue;
      conditions.push(`${key} = @${key}`);
      params[key] = value;
    }

    return {
      clause: `WHERE ${conditions.join(' AND ')}`,
      params
    };
  }

  findMany(options: FindOptions = {}): T[] {
    const { clause, params } = this.buildWhereClause(options);
    let sql = `SELECT * FROM ${this.tableName} ${clause}`;

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'DESC'}`;
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }

    const rows = this.db.prepare(sql).all(params) as TRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  findOne(options: FindOptions = {}): T | null {
    const result = this.findMany({ ...options, limit: 1 });
    return result[0] || null;
  }

  count(options: FindOptions = {}): number {
    const { clause, params } = this.buildWhereClause(options);
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} ${clause}`;
    const result = this.db.prepare(sql).get(params) as { count: number };
    return result.count;
  }

  delete(id: string): boolean {
    const result = this.db.prepare(
      `DELETE FROM ${this.tableName} WHERE id = ?`
    ).run(id);
    return result.changes > 0;
  }

  protected async handleVersionedUpsert(
    uniqueKey: string,
    uniqueValue: string,
    data: Record<string, unknown>,
    createdBy: string,
    strategy: ConflictStrategy
  ): Promise<{
    created: boolean;
    updated: boolean;
    skipped: boolean;
    version: number;
  }> {
    const existing = this.db.prepare(
      `SELECT MAX(version) as max_version, is_latest FROM ${this.tableName} WHERE ${uniqueKey} = ?`
    ).get(uniqueValue) as { max_version: number; is_latest: number } | undefined;

    const currentVersion = existing?.max_version || 0;

    if (existing && strategy === 'ignore') {
      return { created: false, updated: false, skipped: true, version: currentVersion };
    }

    if (existing && strategy === 'append') {
      return { created: false, updated: false, skipped: true, version: currentVersion };
    }

    const newVersion = currentVersion + 1;

    const updateStmt = this.db.prepare(`
      UPDATE ${this.tableName} 
      SET is_latest = 0 
      WHERE ${uniqueKey} = ? AND is_latest = 1
    `);

    const insertStmt = this.db.prepare(`
      INSERT INTO ${this.tableName} 
      (${Object.keys(data).join(', ')}, id, version, is_latest, created_by, updated_by, created_at, updated_at)
      VALUES (${Object.keys(data).map(k => `@${k}`).join(', ')}, @id, @version, 1, @created_by, @updated_by, @created_at, @updated_at)
    `);

    const transaction = this.db.transaction(() => {
      if (existing) {
        updateStmt.run(uniqueValue);
      }

      insertStmt.run({
        ...data,
        id: this.generateId(),
        version: newVersion,
        created_by: createdBy,
        updated_by: createdBy,
        created_at: this.now(),
        updated_at: this.now()
      });
    });

    transaction();

    return {
      created: !existing,
      updated: !!existing,
      skipped: false,
      version: newVersion
    };
  }
}
