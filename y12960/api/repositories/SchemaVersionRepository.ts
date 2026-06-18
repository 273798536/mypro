import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { SchemaVersion, SchemaField } from '../../shared/types';

interface DbSchemaVersion {
  id: string;
  version: string;
  table_name: string;
  fields: string;
  created_at: string;
  created_by: string;
}

export class SchemaVersionRepository {
  private mapToSchemaVersion(dbRecord: DbSchemaVersion): SchemaVersion {
    return {
      id: dbRecord.id,
      version: dbRecord.version,
      tableName: dbRecord.table_name,
      fields: JSON.parse(dbRecord.fields),
      createdAt: dbRecord.created_at,
      createdBy: dbRecord.created_by,
    };
  }

  async findAll(tableName?: string): Promise<SchemaVersion[]> {
    let sql = 'SELECT * FROM schema_version';
    const params: string[] = [];

    if (tableName) {
      sql += ' WHERE table_name = ?';
      params.push(tableName);
    }

    sql += ' ORDER BY created_at DESC';

    const records = db.prepare(sql).all(...params) as DbSchemaVersion[];
    return records.map((r) => this.mapToSchemaVersion(r));
  }

  async findById(id: string): Promise<SchemaVersion | null> {
    const record = db
      .prepare('SELECT * FROM schema_version WHERE id = ?')
      .get(id) as DbSchemaVersion | undefined;
    return record ? this.mapToSchemaVersion(record) : null;
  }

  async findByVersion(version: string, tableName: string): Promise<SchemaVersion | null> {
    const record = db
      .prepare('SELECT * FROM schema_version WHERE version = ? AND table_name = ?')
      .get(version, tableName) as DbSchemaVersion | undefined;
    return record ? this.mapToSchemaVersion(record) : null;
  }

  async create(
    data: Omit<SchemaVersion, 'id' | 'createdAt'>
  ): Promise<SchemaVersion> {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO schema_version (id, version, table_name, fields, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.version, data.tableName, JSON.stringify(data.fields), now, data.createdBy);

    return this.findById(id) as Promise<SchemaVersion>;
  }

  async getDistinctTableNames(): Promise<string[]> {
    const result = db
      .prepare('SELECT DISTINCT table_name FROM schema_version ORDER BY table_name')
      .all() as Array<{ table_name: string }>;
    return result.map((r) => r.table_name);
  }

  async getVersionsForTable(tableName: string): Promise<Array<{ id: string; version: string; createdAt: string }>> {
    const result = db
      .prepare('SELECT id, version, created_at FROM schema_version WHERE table_name = ? ORDER BY created_at DESC')
      .all(tableName) as Array<{ id: string; version: string; created_at: string }>;
    return result;
  }
}

export const schemaVersionRepository = new SchemaVersionRepository();
