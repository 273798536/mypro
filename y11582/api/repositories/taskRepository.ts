
import { getDatabase } from '../db/database';
import type { QueueTask, TaskStatus, SourceType } from '../../shared/types';
import { randomUUID } from 'crypto';

function rowToTask(row: any): QueueTask {
  return {
    id: row.id,
    sourceType: row.source_type as SourceType,
    sourceFile: row.source_file,
    sourceLine: row.source_line,
    rawData: JSON.parse(row.raw_data),
    standardData: JSON.parse(row.standard_data),
    status: row.status as TaskStatus,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    processedAt: row.processed_at,
  };
}

export const taskRepository = {
  create(data: {
    sourceType: SourceType;
    sourceFile: string;
    sourceLine: number;
    rawData: Record<string, any>;
    standardData: Record<string, any>;
    maxRetries?: number;
  }): QueueTask {
    const db = getDatabase();
    const id = randomUUID();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO queue_task (id, source_type, source_file, source_line, raw_data, standard_data, status, retry_count, max_retries, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      data.sourceType,
      data.sourceFile,
      data.sourceLine,
      JSON.stringify(data.rawData),
      JSON.stringify(data.standardData),
      'pending',
      0,
      data.maxRetries ?? 3,
      now,
      now
    );
    
    return this.findById(id)!;
  },

  findById(id: string): QueueTask | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM queue_task WHERE id = ?').get(id);
    return row ? rowToTask(row) : null;
  },

  findBySource(sourceType: SourceType, sourceFile: string, sourceLine: number): QueueTask | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT * FROM queue_task 
      WHERE source_type = ? AND source_file = ? AND source_line = ?
    `).get(sourceType, sourceFile, sourceLine);
    return row ? rowToTask(row) : null;
  },

  findAll(filters?: { status?: TaskStatus; sourceType?: SourceType }): QueueTask[] {
    const db = getDatabase();
    let query = 'SELECT * FROM queue_task WHERE 1=1';
    const params: any[] = [];
    
    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.sourceType) {
      query += ' AND source_type = ?';
      params.push(filters.sourceType);
    }
    query += ' ORDER BY created_at DESC';
    
    const rows = db.prepare(query).all(...params);
    return rows.map(rowToTask);
  },

  findPendingTasks(): QueueTask[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM queue_task 
      WHERE status IN ('pending', 'waiting_retry')
      ORDER BY created_at ASC
    `).all();
    return rows.map(rowToTask);
  },

  findDeadLetters(): QueueTask[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM queue_task 
      WHERE status = 'permanent_failed'
      ORDER BY created_at DESC
    `).all();
    return rows.map(rowToTask);
  },

  updateStatus(id: string, status: TaskStatus, lastError?: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    let query = 'UPDATE queue_task SET status = ?, updated_at = ?';
    const params: any[] = [status, now];
    
    if (lastError !== undefined) {
      query += ', last_error = ?';
      params.push(lastError);
    }
    if (status === 'success' || status === 'closed') {
      query += ', processed_at = ?';
      params.push(now);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    db.prepare(query).run(...params);
  },

  incrementRetry(id: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE queue_task 
      SET retry_count = retry_count + 1, updated_at = ?
      WHERE id = ?
    `).run(now, id);
  },

  updateStandardData(id: string, standardData: Record<string, any>): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE queue_task 
      SET standard_data = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(standardData), now, id);
  },

  delete(id: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM queue_task WHERE id = ?').run(id);
  },

  getStats(): Record<string, number> {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM queue_task 
      GROUP BY status
    `).all() as { status: string; count: number }[];
    
    const stats: Record<string, number> = {
      total: 0,
      pending: 0,
      processing: 0,
      waiting_retry: 0,
      waiting_manual: 0,
      permanent_failed: 0,
      success: 0,
      closed: 0,
    };
    
    for (const row of rows) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }
    
    return stats;
  },

  getRetryCategories(): { category: string; count: number; status: TaskStatus }[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT 
        source_type as category, 
        status,
        COUNT(*) as count 
      FROM queue_task 
      WHERE status IN ('waiting_retry', 'waiting_manual', 'permanent_failed')
      GROUP BY source_type, status
      ORDER BY count DESC
    `).all() as { category: string; status: TaskStatus; count: number }[];
    
    return rows;
  },
};
