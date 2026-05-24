import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { ImportRecord, ImportSource, ConflictStrategy } from '../types';

interface ImportRecordRow {
  id: string;
  batch_id: string;
  source_type: string;
  file_name: string;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  skipped_rows: number;
  status: string;
  conflict_strategy: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export class ImportRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  private generateId(): string {
    return uuidv4();
  }

  private now(): string {
    return dayjs().toISOString();
  }

  create(
    batchId: string,
    sourceType: ImportSource['type'],
    fileName: string,
    conflictStrategy: ConflictStrategy,
    createdBy: string
  ): ImportRecord {
    const id = this.generateId();
    const now = this.now();

    const stmt = this.db.prepare(`
      INSERT INTO import_records (
        id, batch_id, source_type, file_name, total_rows, success_rows, 
        failed_rows, skipped_rows, status, conflict_strategy,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 'processing', ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      batchId,
      sourceType,
      fileName,
      conflictStrategy,
      createdBy,
      createdBy,
      now,
      now
    );

    return this.findById(id)!;
  }

  update(
    id: string,
    data: Partial<{
      totalRows: number;
      successRows: number;
      failedRows: number;
      skippedRows: number;
      status: 'pending' | 'processing' | 'completed' | 'failed';
    }>,
    updatedBy: string
  ): ImportRecord | null {
    const now = this.now();
    const updates: string[] = [];
    const params: Record<string, unknown> = { id, updatedBy, updatedAt: now };

    const fieldMappings: Record<string, string> = {
      totalRows: 'total_rows',
      successRows: 'success_rows',
      failedRows: 'failed_rows',
      skippedRows: 'skipped_rows',
      status: 'status'
    };

    for (const [key, value] of Object.entries(data)) {
      if (fieldMappings[key] && value !== undefined) {
        updates.push(`${fieldMappings[key]} = @${key}`);
        params[key] = value;
      }
    }

    if (updates.length === 0) return this.findById(id);

    const sql = `
      UPDATE import_records 
      SET ${updates.join(', ')}, updated_by = @updatedBy, updated_at = @updatedAt 
      WHERE id = @id
    `;

    this.db.prepare(sql).run(params);
    return this.findById(id);
  }

  findById(id: string): ImportRecord | null {
    const row = this.db.prepare(
      'SELECT * FROM import_records WHERE id = ?'
    ).get(id) as ImportRecordRow | undefined;

    return row ? this.rowToEntity(row) : null;
  }

  findByBatchId(batchId: string): ImportRecord | null {
    const row = this.db.prepare(
      'SELECT * FROM import_records WHERE batch_id = ?'
    ).get(batchId) as ImportRecordRow | undefined;

    return row ? this.rowToEntity(row) : null;
  }

  findAll(): ImportRecord[] {
    const rows = this.db.prepare(
      'SELECT * FROM import_records ORDER BY created_at DESC'
    ).all() as ImportRecordRow[];

    return rows.map(row => this.rowToEntity(row));
  }

  findBySourceType(sourceType: ImportSource['type']): ImportRecord[] {
    const rows = this.db.prepare(`
      SELECT * FROM import_records 
      WHERE source_type = ? 
      ORDER BY created_at DESC
    `).all(sourceType) as ImportRecordRow[];

    return rows.map(row => this.rowToEntity(row));
  }

  private rowToEntity(row: ImportRecordRow): ImportRecord {
    return {
      id: row.id,
      batchId: row.batch_id,
      sourceType: row.source_type as ImportRecord['sourceType'],
      fileName: row.file_name,
      totalRows: row.total_rows,
      successRows: row.success_rows,
      failedRows: row.failed_rows,
      skippedRows: row.skipped_rows,
      status: row.status as ImportRecord['status'],
      conflictStrategy: row.conflict_strategy as ConflictStrategy,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
