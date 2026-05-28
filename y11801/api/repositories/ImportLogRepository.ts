import { BaseRepository } from './BaseRepository.js';
import type { ImportLog } from '../../shared/types/index.js';

export class ImportLogRepository extends BaseRepository<ImportLog> {
  protected tableName = 'import_log';

  protected toModel(row: Record<string, unknown>): ImportLog {
    const model = this.convertRowToModel(row);
    return {
      id: model.id as string,
      batchId: model.batchId as string,
      dataType: model.dataType as 'vehicle' | 'contract' | 'residual',
      fileName: model.fileName as string,
      recordCount: model.recordCount as number,
      importOrder: model.importOrder as number,
      importedAt: model.importedAt as string,
      importedBy: model.importedBy as string,
      status: model.status as 'success' | 'failed' | 'partial',
      errorMessage: model.errorMessage as string | undefined,
    };
  }

  protected toDatabase(model: Partial<ImportLog>): Record<string, unknown> {
    return {
      id: model.id,
      batch_id: model.batchId,
      data_type: model.dataType,
      file_name: model.fileName,
      record_count: model.recordCount,
      import_order: model.importOrder,
      imported_by: model.importedBy,
      status: model.status,
      error_message: model.errorMessage,
    };
  }

  findByBatchId(batchId: string): ImportLog | null {
    return this.findOne({ where: { batchId } });
  }

  findByDataType(dataType: 'vehicle' | 'contract' | 'residual'): ImportLog[] {
    return this.findAll({ where: { dataType }, orderBy: 'importOrder', orderDirection: 'DESC' });
  }

  findLatest(): ImportLog[] {
    return this.findAll({ orderBy: 'importOrder', orderDirection: 'DESC', limit: 10 });
  }

  getNextImportOrder(): number {
    const sql = `SELECT COALESCE(MAX(import_order), 0) + 1 as next_order FROM ${this.tableName}`;
    const result = this.queryOne(sql) as { next_order: number } | null;
    return result?.next_order || 1;
  }

  findByStatus(status: 'success' | 'failed' | 'partial'): ImportLog[] {
    return this.findAll({ where: { status }, orderBy: 'importOrder', orderDirection: 'DESC' });
  }

  findAllOrdered(
    orderBy?: string,
    order?: 'asc' | 'desc'
  ): ImportLog[] {
    const orderColumn = orderBy || 'importOrder';
    const orderDirection = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return this.findAll({ orderBy: orderColumn, orderDirection });
  }

  deleteById(id: string): number {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return result.changes;
  }

  updateStatus(
    id: string,
    status: string,
    errorMessage?: string
  ): number {
    const sql = `
      UPDATE ${this.tableName}
      SET status = ?,
          error_message = ?
      WHERE id = ?
    `;
    const result = this.run(sql, status, errorMessage || null, id);
    return result.changes;
  }
}

export default ImportLogRepository;
