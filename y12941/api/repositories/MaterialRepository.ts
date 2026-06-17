import { getDb } from '../db/connection';
import { nanoid } from 'nanoid';
import type { MaterialBatch, MaterialSource, BatchStatus } from '../../shared/types';

interface MaterialBatchRow {
  id: string;
  name: string;
  source_type: MaterialSource;
  file_name: string;
  total_records: number;
  processed_records: number;
  error_records: number;
  status: BatchStatus;
  error_message: string | null;
  imported_at: string;
}

function mapRowToMaterialBatch(row: MaterialBatchRow): MaterialBatch {
  return {
    id: row.id,
    name: row.name,
    sourceType: row.source_type,
    fileName: row.file_name,
    totalRecords: row.total_records,
    processedRecords: row.processed_records,
    errorRecords: row.error_records,
    status: row.status,
    errorMessage: row.error_message || undefined,
    importedAt: row.imported_at
  };
}

export class MaterialRepository {
  private db = getDb();

  findAll(options: { page?: number; pageSize?: number } = {}): { items: MaterialBatch[]; total: number } {
    const { page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;

    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM material_batches');
    const { count } = countStmt.get() as { count: number };

    const queryStmt = this.db.prepare(`
      SELECT * FROM material_batches 
      ORDER BY imported_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = queryStmt.all(pageSize, offset) as MaterialBatchRow[];

    return {
      items: rows.map(mapRowToMaterialBatch),
      total: count
    };
  }

  findById(id: string): MaterialBatch | null {
    const stmt = this.db.prepare('SELECT * FROM material_batches WHERE id = ?');
    const row = stmt.get(id) as MaterialBatchRow | undefined;
    return row ? mapRowToMaterialBatch(row) : null;
  }

  create(data: Omit<MaterialBatch, 'id' | 'importedAt'>): MaterialBatch {
    const id = 'batch_' + nanoid(6);
    const stmt = this.db.prepare(`
      INSERT INTO material_batches
      (id, name, source_type, file_name, total_records, processed_records, error_records, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.name,
      data.sourceType,
      data.fileName,
      data.totalRecords,
      data.processedRecords,
      data.errorRecords,
      data.status,
      data.errorMessage || null
    );
    return this.findById(id)!;
  }

  updateStatus(id: string, status: BatchStatus, errorMessage?: string): void {
    const stmt = this.db.prepare(`
      UPDATE material_batches 
      SET status = ?, error_message = ? 
      WHERE id = ?
    `);
    stmt.run(status, errorMessage || null, id);
  }

  incrementProcessed(id: string, success: boolean): void {
    const field = success ? 'processed_records' : 'error_records';
    const stmt = this.db.prepare(`
      UPDATE material_batches 
      SET ${field} = ${field} + 1 
      WHERE id = ?
    `);
    stmt.run(id);
  }

  getTotalCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM material_batches');
    const { count } = stmt.get() as { count: number };
    return count;
  }
}
