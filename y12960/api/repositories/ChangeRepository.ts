import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { ChangeRecord, ChangeRecordListItem, FilterParams, RecordStatus } from '../../shared/types';

interface DbChangeRecord {
  id: string;
  record_no: string;
  table_name: string;
  field_name: string;
  change_type: string;
  status: string;
  source_info: string;
  schema_before: string;
  schema_after: string;
  handling_opinion: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface DbAnomaly {
  id: string;
  change_record_id: string;
  type: string;
  description: string;
  severity: string;
  detected_at: string;
}

export class ChangeRepository {
  private mapToChangeRecord(dbRecord: DbChangeRecord, anomalies: DbAnomaly[]): ChangeRecord {
    return {
      id: dbRecord.id,
      recordNo: dbRecord.record_no,
      tableName: dbRecord.table_name,
      fieldName: dbRecord.field_name,
      changeType: dbRecord.change_type as ChangeRecord['changeType'],
      status: dbRecord.status as RecordStatus,
      anomalies: anomalies.map((a) => ({
        id: a.id,
        type: a.type as ChangeRecord['anomalies'][0]['type'],
        description: a.description,
        severity: a.severity as ChangeRecord['anomalies'][0]['severity'],
        detectedAt: a.detected_at,
      })),
      sourceInfo: JSON.parse(dbRecord.source_info),
      schemaBefore: JSON.parse(dbRecord.schema_before),
      schemaAfter: JSON.parse(dbRecord.schema_after),
      handlingOpinion: dbRecord.handling_opinion || '',
      createdBy: dbRecord.created_by,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }

  async findAll(
    filters: FilterParams = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ data: ChangeRecordListItem[]; total: number }> {
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (filters.status) {
      whereClauses.push('cr.status = ?');
      params.push(filters.status);
    }

    if (filters.tableName) {
      whereClauses.push('cr.table_name LIKE ?');
      params.push(`%${filters.tableName}%`);
    }

    if (filters.search) {
      whereClauses.push(
        '(cr.table_name LIKE ? OR cr.field_name LIKE ? OR cr.record_no LIKE ?)'
      );
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.startDate) {
      whereClauses.push('cr.created_at >= ?');
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClauses.push('cr.created_at <= ?');
      params.push(filters.endDate);
    }

    if (filters.createdBy) {
      whereClauses.push('cr.created_by = ?');
      params.push(filters.createdBy);
    }

    const anomalyJoin = filters.anomalyType
      ? 'INNER JOIN anomaly a ON a.change_record_id = cr.id'
      : 'LEFT JOIN anomaly a ON a.change_record_id = cr.id';

    if (filters.anomalyType) {
      whereClauses.push('a.type = ?');
      params.push(filters.anomalyType);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(DISTINCT cr.id) as count
      FROM change_record cr
      ${anomalyJoin}
      ${whereSql}
    `;

    const totalResult = db.prepare(countSql).get(...params) as { count: number };
    const total = totalResult.count;

    const offset = (page - 1) * pageSize;
    const dataSql = `
      SELECT cr.*,
             COUNT(a.id) as anomaly_count,
             MAX(CASE WHEN a.severity = 'HIGH' THEN 1 ELSE 0 END) as has_high_severity
      FROM change_record cr
      LEFT JOIN anomaly a ON a.change_record_id = cr.id
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
      GROUP BY cr.id
      ORDER BY cr.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const records = db.prepare(dataSql).all(...params, pageSize, offset) as Array<
      DbChangeRecord & { anomaly_count: number; has_high_severity: number }
    >;

    const data: ChangeRecordListItem[] = records.map((r) => ({
      id: r.id,
      recordNo: r.record_no,
      tableName: r.table_name,
      fieldName: r.field_name,
      changeType: r.change_type as ChangeRecord['changeType'],
      status: r.status as RecordStatus,
      sourceInfo: JSON.parse(r.source_info),
      handlingOpinion: r.handling_opinion || '',
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      anomalyCount: r.anomaly_count,
      hasHighSeverity: r.has_high_severity === 1,
    }));

    return { data, total };
  }

  async findById(id: string): Promise<ChangeRecord | null> {
    const record = db
      .prepare('SELECT * FROM change_record WHERE id = ?')
      .get(id) as DbChangeRecord | undefined;

    if (!record) return null;

    const anomalies = db
      .prepare('SELECT * FROM anomaly WHERE change_record_id = ? ORDER BY severity DESC')
      .all(id) as DbAnomaly[];

    return this.mapToChangeRecord(record, anomalies);
  }

  async findByRecordNo(recordNo: string): Promise<ChangeRecord | null> {
    const record = db
      .prepare('SELECT * FROM change_record WHERE record_no = ?')
      .get(recordNo) as DbChangeRecord | undefined;

    if (!record) return null;

    const anomalies = db
      .prepare('SELECT * FROM anomaly WHERE change_record_id = ? ORDER BY severity DESC')
      .all(record.id) as DbAnomaly[];

    return this.mapToChangeRecord(record, anomalies);
  }

  async create(record: Omit<ChangeRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChangeRecord> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const insertRecord = db.prepare(`
      INSERT INTO change_record (
        id, record_no, table_name, field_name, change_type, status,
        source_info, schema_before, schema_after, handling_opinion,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRecord.run(
      id,
      record.recordNo,
      record.tableName,
      record.fieldName,
      record.changeType,
      record.status,
      JSON.stringify(record.sourceInfo),
      JSON.stringify(record.schemaBefore),
      JSON.stringify(record.schemaAfter),
      record.handlingOpinion,
      record.createdBy,
      now,
      now
    );

    const insertAnomaly = db.prepare(`
      INSERT INTO anomaly (id, change_record_id, type, description, severity, detected_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const anomaly of record.anomalies) {
      insertAnomaly.run(
        uuidv4(),
        id,
        anomaly.type,
        anomaly.description,
        anomaly.severity,
        anomaly.detectedAt || now
      );
    }

    return this.findById(id) as Promise<ChangeRecord>;
  }

  async update(
    id: string,
    updates: Partial<Pick<ChangeRecord, 'status' | 'handlingOpinion'>>
  ): Promise<ChangeRecord | null> {
    const updateFields: string[] = [];
    const params: unknown[] = [];

    if (updates.status) {
      updateFields.push('status = ?');
      params.push(updates.status);
    }

    if (updates.handlingOpinion !== undefined) {
      updateFields.push('handling_opinion = ?');
      params.push(updates.handlingOpinion);
    }

    updateFields.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(id);

    const sql = `UPDATE change_record SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...params);

    return this.findById(id);
  }

  async bulkUpdateStatus(ids: string[], status: RecordStatus): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => '?').join(', ');
    const sql = `
      UPDATE change_record
      SET status = ?, updated_at = ?
      WHERE id IN (${placeholders})
    `;

    const result = db.prepare(sql).run(status, new Date().toISOString(), ...ids);
    return result.changes;
  }

  async delete(id: string): Promise<boolean> {
    db.prepare('DELETE FROM anomaly WHERE change_record_id = ?').run(id);
    db.prepare('DELETE FROM migration_log WHERE change_record_id = ?').run(id);
    const result = db.prepare('DELETE FROM change_record WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

export const changeRepository = new ChangeRepository();
