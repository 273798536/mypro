import { BaseRepository } from './BaseRepository.js';
import type { MigrationTask, MigrationStatus, MigrationSummary } from '../../shared/types.js';

interface MigrationTaskRow {
  id: string;
  table_name: string;
  status: MigrationStatus;
  total_records: number;
  processed_records: number;
  failed_records: number;
  started_at?: string;
  completed_at?: string;
}

export class MigrationTaskRepository extends BaseRepository<MigrationTask> {
  protected tableName = 'migration_tasks';

  protected rowToEntity(row: unknown): MigrationTask {
    const r = row as MigrationTaskRow;
    return {
      id: r.id,
      tableName: r.table_name,
      status: r.status,
      totalRecords: r.total_records,
      processedRecords: r.processed_records,
      failedRecords: r.failed_records,
      startedAt: r.started_at,
      completedAt: r.completed_at,
    };
  }

  create(task: Omit<MigrationTask, 'id'>): MigrationTask {
    const existing = this.db.prepare(`SELECT id FROM ${this.tableName} WHERE table_name = ?`).get(task.tableName);
    if (existing) {
      return this.update(task.tableName, {
        status: task.status,
        totalRecords: task.totalRecords,
        processedRecords: task.processedRecords,
        failedRecords: task.failedRecords,
      })!;
    }

    const id = `mig_${Date.now()}_${task.tableName}`;
    const stmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (
        id, table_name, status, total_records, processed_records,
        failed_records, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, task.tableName, task.status, task.totalRecords,
      task.processedRecords, task.failedRecords, task.startedAt || null, task.completedAt || null
    );

    return this.findById(id)!;
  }

  update(tableName: string, updates: Partial<Omit<MigrationTask, 'id' | 'tableName'>>): MigrationTask | null {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.totalRecords !== undefined) {
      fields.push('total_records = ?');
      values.push(updates.totalRecords);
    }
    if (updates.processedRecords !== undefined) {
      fields.push('processed_records = ?');
      values.push(updates.processedRecords);
    }
    if (updates.failedRecords !== undefined) {
      fields.push('failed_records = ?');
      values.push(updates.failedRecords);
    }
    if (updates.startedAt !== undefined) {
      fields.push('started_at = ?');
      values.push(updates.startedAt);
    }
    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completedAt);
    }

    values.push(tableName);

    const stmt = this.db.prepare(`UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE table_name = ?`);
    stmt.run(...values);

    const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE table_name = ?`).get(tableName) as MigrationTaskRow | undefined;
    return row ? this.rowToEntity(row) : null;
  }

  findAll(): MigrationTask[] {
    const rows = this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY table_name`).all() as MigrationTaskRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  getSummary(): MigrationSummary {
    const rows = this.db.prepare(`SELECT status, COUNT(*) as count FROM ${this.tableName} GROUP BY status`)
      .all() as { status: MigrationStatus; count: number }[];

    const summary: MigrationSummary = {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      failed: 0,
    };

    rows.forEach(row => {
      summary.total += row.count;
      if (row.status === 'COMPLETED') summary.completed = row.count;
      else if (row.status === 'IN_PROGRESS') summary.inProgress = row.count;
      else if (row.status === 'PENDING') summary.pending = row.count;
      else if (row.status === 'FAILED') summary.failed = row.count;
    });

    return summary;
  }
}
