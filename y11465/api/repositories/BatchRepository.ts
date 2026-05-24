import { getDb } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import type { Batch, BatchStatus, DuplicateStrategy } from '../../shared/types';
import auditLogRepository from './AuditLogRepository';

export class BatchRepository {
  private db = getDb();

  create(params: {
    batchNo: string;
    styleCode: string;
    brand: string;
    duplicateStrategy: DuplicateStrategy;
    createdBy: string;
  }): Batch {
    const existing = this.findByBatchNo(params.batchNo);
    
    if (existing) {
      switch (params.duplicateStrategy) {
        case 'IGNORE':
          return existing;
        case 'OVERWRITE':
          return this.update(existing.id, {
            styleCode: params.styleCode,
            brand: params.brand,
            status: 'DRAFT'
          }, params.createdBy, '覆盖更新批次');
        case 'APPEND':
          return existing;
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO batches (id, batch_no, style_code, brand, status, duplicate_strategy, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.batchNo,
      params.styleCode,
      params.brand,
      params.duplicateStrategy,
      params.createdBy,
      now,
      now
    );

    const batch = this.findById(id)!;
    
    auditLogRepository.create({
      entityType: 'batch',
      entityId: id,
      action: 'CREATE',
      afterData: batch,
      operatedBy: params.createdBy,
      reason: '创建批次'
    });

    return batch;
  }

  findById(id: string): Batch | null {
    const stmt = this.db.prepare('SELECT * FROM batches WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByBatchNo(batchNo: string): Batch | null {
    const stmt = this.db.prepare('SELECT * FROM batches WHERE batch_no = ?');
    const row = stmt.get(batchNo) as any;
    return row ? this.mapRow(row) : null;
  }

  findAll(params: {
    page?: number;
    pageSize?: number;
    status?: BatchStatus;
    brand?: string;
    styleCode?: string;
  } = {}): { data: Batch[]; total: number } {
    const { page = 1, pageSize = 20, status, brand, styleCode } = params;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }
    if (brand) {
      whereClause += ' AND brand = ?';
      queryParams.push(brand);
    }
    if (styleCode) {
      whereClause += ' AND style_code LIKE ?';
      queryParams.push(`%${styleCode}%`);
    }

    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM batches ${whereClause}`);
    const { count } = countStmt.get(...queryParams) as { count: number };

    const dataStmt = this.db.prepare(`
      SELECT * FROM batches ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = dataStmt.all(...queryParams, pageSize, offset) as any[];

    return {
      data: rows.map(row => this.mapRow(row)),
      total: count
    };
  }

  update(id: string, updates: Partial<{
    styleCode: string;
    brand: string;
    status: BatchStatus;
    frozen: boolean;
    frozenReason: string;
    frozenAt: string;
  }>, operatedBy: string, reason?: string): Batch {
    const before = this.findById(id);
    if (!before) throw new Error('Batch not found');

    const now = new Date().toISOString();
    const setClauses: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.styleCode !== undefined) {
      setClauses.push('style_code = ?');
      values.push(updates.styleCode);
    }
    if (updates.brand !== undefined) {
      setClauses.push('brand = ?');
      values.push(updates.brand);
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.frozen !== undefined) {
      setClauses.push('frozen = ?');
      values.push(updates.frozen ? 1 : 0);
    }
    if (updates.frozenReason !== undefined) {
      setClauses.push('frozen_reason = ?');
      values.push(updates.frozenReason);
    }
    if (updates.frozenAt !== undefined) {
      setClauses.push('frozen_at = ?');
      values.push(updates.frozenAt);
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE batches SET ${setClauses.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    const after = this.findById(id)!;

    auditLogRepository.create({
      entityType: 'batch',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: after,
      operatedBy,
      reason
    });

    return after;
  }

  getStats(): {
    total: number;
    pendingReview: number;
    frozen: number;
    settled: number;
  } {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PENDING_REVIEW' THEN 1 ELSE 0 END) as pendingReview,
        SUM(CASE WHEN frozen = 1 THEN 1 ELSE 0 END) as frozen,
        SUM(CASE WHEN status = 'SETTLED' THEN 1 ELSE 0 END) as settled
      FROM batches
    `).get() as any;

    return {
      total: row.total,
      pendingReview: row.pendingReview,
      frozen: row.frozen,
      settled: row.settled
    };
  }

  private mapRow(row: any): Batch {
    return {
      id: row.id,
      batchNo: row.batch_no,
      styleCode: row.style_code,
      brand: row.brand,
      status: row.status,
      duplicateStrategy: row.duplicate_strategy,
      frozen: !!row.frozen,
      frozenReason: row.frozen_reason,
      frozenAt: row.frozen_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default new BatchRepository();
