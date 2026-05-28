import type Database from 'better-sqlite3';
import db from '../database/index.js';

export interface QueryOptions {
  where?: Record<string, unknown>;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export abstract class BaseRepository<T> {
  protected db: Database.Database;
  protected abstract tableName: string;

  constructor() {
    this.db = db;
  }

  protected abstract toModel(row: Record<string, unknown>): T;

  protected abstract toDatabase(model: Partial<T>): Record<string, unknown>;

  findById(id: string): T | null {
    const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    return row ? this.toModel(row) : null;
  }

  findAll(options: QueryOptions = {}): T[] {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params: unknown[] = [];

    if (options.where && Object.keys(options.where).length > 0) {
      const conditions = Object.entries(options.where)
        .map(([key]) => `${this.toSnakeCase(key)} = ?`);
      sql += ` WHERE ${conditions.join(' AND ')}`;
      params.push(...Object.values(options.where));
    }

    if (options.orderBy) {
      const direction = options.orderDirection || 'ASC';
      sql += ` ORDER BY ${this.toSnakeCase(options.orderBy)} ${direction}`;
    }

    if (options.limit !== undefined) {
      sql += ` LIMIT ${options.limit}`;
    }

    if (options.offset !== undefined) {
      sql += ` OFFSET ${options.offset}`;
    }

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(row => this.toModel(row));
  }

  findOne(options: QueryOptions = {}): T | null {
    const results = this.findAll({ ...options, limit: 1 });
    return results[0] || null;
  }

  count(where?: Record<string, unknown>): number {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: unknown[] = [];

    if (where && Object.keys(where).length > 0) {
      const conditions = Object.entries(where)
        .map(([key]) => `${this.toSnakeCase(key)} = ?`);
      sql += ` WHERE ${conditions.join(' AND ')}`;
      params.push(...Object.values(where));
    }

    const result = this.db.prepare(sql).get(...params) as { count: number };
    return result.count;
  }

  create(data: Partial<T>): T {
    const dbData = this.toDatabase(data);
    const columns = Object.keys(dbData);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(dbData);

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    this.db.prepare(sql).run(...values);

    const id = dbData.id as string;
    return this.findById(id) as T;
  }

  update(id: string, data: Partial<T>): T | null {
    const dbData = this.toDatabase(data);
    const updates = Object.entries(dbData)
      .filter(([key]) => key !== 'id')
      .map(([key]) => `${key} = ?`);
    const values = Object.values(dbData).filter((_, index) => Object.keys(dbData)[index] !== 'id');
    values.push(id);

    const sql = `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  deleteBy(where: Record<string, unknown>): number {
    const conditions = Object.entries(where)
      .map(([key]) => `${this.toSnakeCase(key)} = ?`);
    const values = Object.values(where);

    const sql = `DELETE FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`;
    const result = this.db.prepare(sql).run(...values);
    return result.changes;
  }

  transaction<R>(callback: () => R): R {
    const transaction = this.db.transaction(callback);
    return transaction() as R;
  }

  run(sql: string, ...params: unknown[]): Database.RunResult {
    return this.db.prepare(sql).run(...params);
  }

  query(sql: string, ...params: unknown[]): Record<string, unknown>[] {
    return this.db.prepare(sql).all(...params) as Record<string, unknown>[];
  }

  queryOne(sql: string, ...params: unknown[]): Record<string, unknown> | null {
    const result = this.db.prepare(sql).get(...params) as Record<string, unknown> | undefined;
    return result || null;
  }

  protected toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  protected toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  protected convertRowToModel(row: Record<string, unknown>): Record<string, unknown> {
    const model: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      model[this.toCamelCase(key)] = value;
    }
    return model;
  }
}

export default BaseRepository;
