import type Database from 'better-sqlite3';
import type { ExportJob } from '../../../shared/types.js';

export class ExportRepository {
  constructor(private db: Database.Database) {}

  private mapRowToExportJob(row: any): ExportJob {
    return {
      id: row.id,
      format: row.format,
      filter: row.filter_json ? JSON.parse(row.filter_json) : null,
      filePath: row.file_path,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }

  create(job: ExportJob): ExportJob {
    this.db
      .prepare(
        `INSERT INTO export_jobs (id, format, filter_json, file_path, status, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        job.id,
        job.format,
        job.filter ? JSON.stringify(job.filter) : null,
        job.filePath,
        job.status,
        job.createdAt,
        job.completedAt
      );
    return job;
  }

  findById(id: string): ExportJob | null {
    const row = this.db.prepare('SELECT * FROM export_jobs WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRowToExportJob(row);
  }

  findAll(): ExportJob[] {
    const rows = this.db.prepare('SELECT * FROM export_jobs ORDER BY created_at DESC').all() as any[];
    return rows.map((row) => this.mapRowToExportJob(row));
  }

  updateStatus(id: string, status: ExportJob['status'], filePath?: string): boolean {
    const fields: string[] = ['status = ?'];
    const params: any[] = [status];

    if (filePath !== undefined) {
      fields.push('file_path = ?');
      params.push(filePath);
    }

    if (status === 'completed' || status === 'failed') {
      fields.push('completed_at = ?');
      params.push(new Date().toISOString());
    }

    params.push(id);

    const result = this.db.prepare(`UPDATE export_jobs SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return result.changes > 0;
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM export_jobs WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
