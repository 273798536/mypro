import { BaseRepository } from './BaseRepository.js';
import type { LedgerRecord, RecordStatus, AnomalyType, GetLedgerParams, PaginatedResponse, UpdateLedgerRequest } from '../../shared/types.js';

interface LedgerRecordRow {
  id: string;
  record_no: string;
  anomaly_type: AnomalyType;
  status: RecordStatus;
  source_file: string;
  original_line_no: number;
  source_type: 'SLOW_QUERY_LOG' | 'SCHEMA_SNAPSHOT';
  import_batch_id: string;
  slow_query_sql?: string;
  schema_snapshot?: string;
  conflict_details?: string;
  handling_opinion?: string;
  business_notes?: string;
  source_remark?: string;
  image_name?: string;
  created_at: string;
  updated_at: string;
  handled_by?: string;
  handled_at?: string;
}

export class LedgerRepository extends BaseRepository<LedgerRecord> {
  protected tableName = 'ledger_records';

  protected rowToEntity(row: unknown): LedgerRecord {
    const r = row as LedgerRecordRow;
    return {
      id: r.id,
      recordNo: r.record_no,
      anomalyType: r.anomaly_type,
      status: r.status,
      sourceFile: r.source_file,
      originalLineNo: r.original_line_no,
      sourceType: r.source_type,
      importBatchId: r.import_batch_id,
      slowQuerySql: r.slow_query_sql,
      schemaSnapshot: r.schema_snapshot,
      conflictDetails: r.conflict_details,
      handlingOpinion: r.handling_opinion,
      businessNotes: r.business_notes,
      sourceRemark: r.source_remark,
      imageName: r.image_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      handledBy: r.handled_by,
      handledAt: r.handled_at,
    };
  }

  findPaginated(params: GetLedgerParams): PaginatedResponse<LedgerRecord> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }
    if (params.anomalyType) {
      conditions.push('anomaly_type = ?');
      values.push(params.anomalyType);
    }
    if (params.sourceFile) {
      conditions.push('source_file LIKE ?');
      values.push(`%${params.sourceFile}%`);
    }
    if (params.startDate) {
      conditions.push('created_at >= ?');
      values.push(params.startDate);
    }
    if (params.endDate) {
      conditions.push('created_at <= ?');
      values.push(params.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`);
    const total = (countStmt.get(...values) as { count: number }).count;

    const query = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const rows = this.db.prepare(query).all(...values, pageSize, offset) as LedgerRecordRow[];

    return {
      data: rows.map(row => this.rowToEntity(row)),
      total,
      page,
      pageSize,
    };
  }

  create(record: Omit<LedgerRecord, 'createdAt' | 'updatedAt'>): LedgerRecord {
    const stmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (
        id, record_no, anomaly_type, status, source_file, original_line_no,
        source_type, import_batch_id, slow_query_sql, schema_snapshot,
        conflict_details, handling_opinion, business_notes, source_remark,
        image_name, handled_by, handled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id, record.recordNo, record.anomalyType, record.status,
      record.sourceFile, record.originalLineNo, record.sourceType,
      record.importBatchId, record.slowQuerySql || null, record.schemaSnapshot || null,
      record.conflictDetails || null, record.handlingOpinion || null,
      record.businessNotes || null, record.sourceRemark || null,
      record.imageName || null, record.handledBy || null, record.handledAt || null
    );

    return this.findById(record.id)!;
  }

  update(id: string, updates: UpdateLedgerRequest): LedgerRecord | null {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.handlingOpinion !== undefined) {
      fields.push('handling_opinion = ?');
      values.push(updates.handlingOpinion);
    }
    if (updates.businessNotes !== undefined) {
      fields.push('business_notes = ?');
      values.push(updates.businessNotes);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  findByRecordNo(recordNo: string): LedgerRecord | null {
    const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE record_no = ?`).get(recordNo) as LedgerRecordRow | undefined;
    return row ? this.rowToEntity(row) : null;
  }

  findByAnomalyType(anomalyType: AnomalyType): LedgerRecord[] {
    const rows = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE anomaly_type = ? ORDER BY created_at DESC`)
      .all(anomalyType) as LedgerRecordRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  countByStatus(): Record<RecordStatus, number> {
    const rows = this.db.prepare(`SELECT status, COUNT(*) as count FROM ${this.tableName} GROUP BY status`)
      .all() as { status: RecordStatus; count: number }[];
    
    const result: Record<RecordStatus, number> = {
      AVAILABLE: 0,
      NEEDS_REVIEW: 0,
      UNAVAILABLE: 0,
    };
    
    rows.forEach(row => {
      result[row.status] = row.count;
    });
    
    return result;
  }

  findGaps(): LedgerRecord[] {
    return this.findByAnomalyType('BACKUP_GAP');
  }
}
