import { getDb } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import type { Report, ReportType } from '../../shared/types';

export class ReportRepository {
  private db = getDb();

  create(params: {
    batchId: string;
    type: ReportType;
    data: Record<string, any>;
    generatedBy: string;
  }): Report {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO reports (id, batch_id, type, data, generated_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.batchId,
      params.type,
      JSON.stringify(params.data),
      params.generatedBy,
      now
    );

    return this.findById(id)!;
  }

  findById(id: string): Report | null {
    const stmt = this.db.prepare('SELECT * FROM reports WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByBatchId(batchId: string): Report[] {
    const rows = this.db.prepare(`
      SELECT * FROM reports
      WHERE batch_id = ?
      ORDER BY created_at DESC
    `).all(batchId) as any[];
    return rows.map(row => this.mapRow(row));
  }

  findAll(params: {
    page?: number;
    pageSize?: number;
    type?: ReportType;
    batchId?: string;
  } = {}): { data: Report[]; total: number } {
    const { page = 1, pageSize = 20, type, batchId } = params;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (type) {
      whereClause += ' AND type = ?';
      queryParams.push(type);
    }
    if (batchId) {
      whereClause += ' AND batch_id = ?';
      queryParams.push(batchId);
    }

    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM reports ${whereClause}`);
    const { count } = countStmt.get(...queryParams) as { count: number };

    const dataStmt = this.db.prepare(`
      SELECT * FROM reports ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = dataStmt.all(...queryParams, pageSize, offset) as any[];

    return {
      data: rows.map(row => this.mapRow(row)),
      total: count
    };
  }

  private mapRow(row: any): Report {
    return {
      id: row.id,
      batchId: row.batch_id,
      type: row.type,
      data: JSON.parse(row.data),
      generatedBy: row.generated_by,
      createdAt: row.created_at
    };
  }
}

export default new ReportRepository();
