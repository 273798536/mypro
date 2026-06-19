import { BaseRepository } from './BaseRepository.js';
import type { ImportBatch, SourceType } from '../../shared/types.js';

interface ImportBatchRow {
  id: string;
  file_name: string;
  source_type: SourceType;
  total_records: number;
  new_records: number;
  duplicate_records: number;
  anomaly_count: number;
  imported_at: string;
  imported_by: string;
}

export class ImportBatchRepository extends BaseRepository<ImportBatch> {
  protected tableName = 'import_batches';

  protected rowToEntity(row: unknown): ImportBatch {
    const r = row as ImportBatchRow;
    return {
      id: r.id,
      fileName: r.file_name,
      sourceType: r.source_type,
      totalRecords: r.total_records,
      newRecords: r.new_records,
      duplicateRecords: r.duplicate_records,
      anomalyCount: r.anomaly_count,
      importedAt: r.imported_at,
      importedBy: r.imported_by,
    };
  }

  create(batch: Omit<ImportBatch, 'importedAt'>): ImportBatch {
    const stmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (
        id, file_name, source_type, total_records, new_records,
        duplicate_records, anomaly_count, imported_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      batch.id, batch.fileName, batch.sourceType, batch.totalRecords,
      batch.newRecords, batch.duplicateRecords, batch.anomalyCount, batch.importedBy
    );

    return this.findById(batch.id)!;
  }

  findAll(): ImportBatch[] {
    const rows = this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY imported_at DESC`).all() as ImportBatchRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  findLatest(limit: number = 10): ImportBatch[] {
    const rows = this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY imported_at DESC LIMIT ?`)
      .all(limit) as ImportBatchRow[];
    return rows.map(row => this.rowToEntity(row));
  }
}
