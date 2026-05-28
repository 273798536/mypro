import { BaseRepository } from './BaseRepository.js';
import type { ExportTask } from '../../shared/types/index.js';

export class ExportTaskRepository extends BaseRepository<ExportTask> {
  protected tableName = 'export_task';

  protected toModel(row: Record<string, unknown>): ExportTask {
    const model = this.convertRowToModel(row);
    return {
      id: model.id as string,
      taskName: model.taskName as string,
      exportType: model.exportType as 'excel' | 'pdf',
      recordIds: typeof model.recordIds === 'string'
        ? JSON.parse(model.recordIds as string)
        : (model.recordIds as string[]),
      status: model.status as 'pending' | 'processing' | 'completed' | 'failed',
      createdAt: model.createdAt as string,
      completedAt: model.completedAt as string | undefined,
      downloadUrl: model.downloadUrl as string | undefined,
      fileSize: model.fileSize as number | undefined,
      createdBy: model.createdBy as string,
    };
  }

  protected toDatabase(model: Partial<ExportTask>): Record<string, unknown> {
    return {
      id: model.id,
      task_name: model.taskName,
      export_type: model.exportType,
      record_ids: model.recordIds ? JSON.stringify(model.recordIds) : undefined,
      status: model.status,
      completed_at: model.completedAt,
      download_url: model.downloadUrl,
      file_size: model.fileSize,
      created_by: model.createdBy,
    };
  }

  findByStatus(status: 'pending' | 'processing' | 'completed' | 'failed'): ExportTask[] {
    return this.findAll({ where: { status }, orderBy: 'createdAt', orderDirection: 'DESC' });
  }

  findByExportType(exportType: 'excel' | 'pdf'): ExportTask[] {
    return this.findAll({ where: { exportType }, orderBy: 'createdAt', orderDirection: 'DESC' });
  }

  findByCreatedBy(createdBy: string): ExportTask[] {
    return this.findAll({ where: { createdBy }, orderBy: 'createdAt', orderDirection: 'DESC' });
  }

  findPending(): ExportTask[] {
    return this.findByStatus('pending');
  }

  findProcessing(): ExportTask[] {
    return this.findByStatus('processing');
  }

  findCompleted(): ExportTask[] {
    return this.findByStatus('completed');
  }

  startProcessing(id: string): boolean {
    const sql = `
      UPDATE ${this.tableName}
      SET status = 'processing'
      WHERE id = ? AND status = 'pending'
    `;
    const result = this.run(sql, id);
    return result.changes > 0;
  }

  complete(id: string, downloadUrl: string, fileSize: number): boolean {
    const sql = `
      UPDATE ${this.tableName}
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          download_url = ?,
          file_size = ?
      WHERE id = ? AND status = 'processing'
    `;
    const result = this.run(sql, downloadUrl, fileSize, id);
    return result.changes > 0;
  }

  fail(id: string): boolean {
    const sql = `
      UPDATE ${this.tableName}
      SET status = 'failed',
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = this.run(sql, id);
    return result.changes > 0;
  }

  createTask(
    taskName: string,
    exportType: 'excel' | 'pdf',
    recordIds: string[],
    createdBy: string
  ): ExportTask {
    const id = crypto.randomUUID();
    return this.create({
      id,
      taskName,
      exportType,
      recordIds,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy,
    });
  }

  getRecent(limit: number = 20): ExportTask[] {
    return this.findAll({ orderBy: 'createdAt', orderDirection: 'DESC', limit });
  }

  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM ${this.tableName}
    `;
    const result = this.queryOne(sql) as Record<string, number> | null;
    return {
      total: result?.total || 0,
      pending: result?.pending || 0,
      processing: result?.processing || 0,
      completed: result?.completed || 0,
      failed: result?.failed || 0,
    };
  }

  updateStatus(
    id: string,
    status: string,
    completedAt?: string,
    downloadUrl?: string,
    fileSize?: number
  ): number {
    const sql = `
      UPDATE ${this.tableName}
      SET status = ?,
          completed_at = ?,
          download_url = ?,
          file_size = ?
      WHERE id = ?
    `;
    const result = this.run(sql, status, completedAt || null, downloadUrl || null, fileSize || null, id);
    return result.changes;
  }

  findAllOrdered(
    orderBy?: string,
    order?: 'asc' | 'desc'
  ): ExportTask[] {
    const orderColumn = orderBy || 'createdAt';
    const orderDirection = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return this.findAll({ orderBy: orderColumn, orderDirection });
  }
}

export default ExportTaskRepository;
