import Database from 'better-sqlite3';
import { BaseRepository } from './baseRepository';
import { SizeModificationRecord, ImportSource, ConflictStrategy, SizeMeasurement } from '../types';

interface SizeModificationRow {
  id: string;
  modification_no: string;
  sample_no: string;
  style_no: string;
  original_measurements: string | null;
  modified_measurements: string | null;
  modification_reason: string | null;
  requested_by: string;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  status: string;
  priority: string;
  affected_fabrics: string | null;
  estimated_impact: string | null;
  import_source: string;
  source_row_number: number;
  version: number;
  is_latest: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export class SizeModificationRepository extends BaseRepository<SizeModificationRecord, SizeModificationRow> {
  protected tableName = 'size_modification_records';

  constructor(db: Database.Database) {
    super(db);
  }

  protected rowToEntity(row: SizeModificationRow): SizeModificationRecord {
    return {
      id: row.id,
      modificationNo: row.modification_no,
      sampleNo: row.sample_no,
      styleNo: row.style_no,
      originalMeasurements: this.deserialize<SizeMeasurement[]>(row.original_measurements) || [],
      modifiedMeasurements: this.deserialize<SizeMeasurement[]>(row.modified_measurements) || [],
      modificationReason: row.modification_reason || '',
      requestedBy: row.requested_by,
      requestedAt: row.requested_at,
      approvedBy: row.approved_by || undefined,
      approvedAt: row.approved_at || undefined,
      status: row.status as SizeModificationRecord['status'],
      priority: row.priority as SizeModificationRecord['priority'],
      affectedFabrics: this.deserialize<string[]>(row.affected_fabrics) || undefined,
      estimatedImpact: row.estimated_impact || undefined,
      importSource: this.deserialize<ImportSource>(row.import_source)!,
      sourceRowNumber: row.source_row_number,
      version: row.version,
      isLatest: row.is_latest === 1,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  create(data: Partial<SizeModificationRecord>, createdBy: string): SizeModificationRecord {
    const id = this.generateId();
    const now = this.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO size_modification_records (
        id, modification_no, sample_no, style_no, original_measurements, modified_measurements,
        modification_reason, requested_by, requested_at, approved_by, approved_at,
        status, priority, affected_fabrics, estimated_impact, import_source, source_row_number,
        version, is_latest, created_by, updated_by, created_at, updated_at
      ) VALUES (
        @id, @modificationNo, @sampleNo, @styleNo, @originalMeasurements, @modifiedMeasurements,
        @modificationReason, @requestedBy, @requestedAt, @approvedBy, @approvedAt,
        @status, @priority, @affectedFabrics, @estimatedImpact, @importSource, @sourceRowNumber,
        1, 1, @createdBy, @createdBy, @createdAt, @createdAt
      )
    `);

    stmt.run({
      id,
      modificationNo: data.modificationNo,
      sampleNo: data.sampleNo,
      styleNo: data.styleNo,
      originalMeasurements: this.serialize(data.originalMeasurements || []),
      modifiedMeasurements: this.serialize(data.modifiedMeasurements || []),
      modificationReason: data.modificationReason || null,
      requestedBy: data.requestedBy,
      requestedAt: data.requestedAt,
      approvedBy: data.approvedBy || null,
      approvedAt: data.approvedAt || null,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      affectedFabrics: data.affectedFabrics ? this.serialize(data.affectedFabrics) : null,
      estimatedImpact: data.estimatedImpact || null,
      importSource: this.serialize(data.importSource),
      sourceRowNumber: data.sourceRowNumber,
      createdBy,
      createdAt: now
    });

    return this.findById(id)!;
  }

  update(id: string, data: Partial<SizeModificationRecord>, updatedBy: string): SizeModificationRecord | null {
    const now = this.now();
    const updates: string[] = [];
    const params: Record<string, unknown> = { id, updatedBy, updatedAt: now };

    const fieldMappings: Record<string, [string, boolean]> = {
      modificationNo: ['modification_no', false],
      sampleNo: ['sample_no', false],
      styleNo: ['style_no', false],
      originalMeasurements: ['original_measurements', true],
      modifiedMeasurements: ['modified_measurements', true],
      modificationReason: ['modification_reason', false],
      requestedBy: ['requested_by', false],
      requestedAt: ['requested_at', false],
      approvedBy: ['approved_by', false],
      approvedAt: ['approved_at', false],
      status: ['status', false],
      priority: ['priority', false],
      affectedFabrics: ['affected_fabrics', true],
      estimatedImpact: ['estimated_impact', false]
    };

    for (const [key, value] of Object.entries(data)) {
      const mapping = fieldMappings[key];
      if (mapping && value !== undefined) {
        const [field, serialize] = mapping;
        updates.push(`${field} = @${key}`);
        params[key] = serialize ? this.serialize(value) : value;
      }
    }

    if (updates.length === 0) return this.findById(id);

    const sql = `
      UPDATE size_modification_records 
      SET ${updates.join(', ')}, updated_by = @updatedBy, updated_at = @updatedAt 
      WHERE id = @id
    `;

    this.db.prepare(sql).run(params);
    return this.findById(id);
  }

  findById(id: string): SizeModificationRecord | null {
    const row = this.db.prepare(
      'SELECT * FROM size_modification_records WHERE id = ?'
    ).get(id) as SizeModificationRow | undefined;
    
    return row ? this.rowToEntity(row) : null;
  }

  findByModificationNo(modificationNo: string, latestOnly = true): SizeModificationRecord[] {
    let sql = 'SELECT * FROM size_modification_records WHERE modification_no = ?';
    const params: (string | number)[] = [modificationNo];
    
    if (latestOnly) {
      sql += ' AND is_latest = 1';
    }
    sql += ' ORDER BY version DESC';

    const rows = this.db.prepare(sql).all(params) as SizeModificationRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  findBySampleNo(sampleNo: string, latestOnly = true): SizeModificationRecord[] {
    let sql = 'SELECT * FROM size_modification_records WHERE sample_no = ?';
    const params: (string | number)[] = [sampleNo];
    
    if (latestOnly) {
      sql += ' AND is_latest = 1';
    }
    sql += ' ORDER BY modification_no, version DESC';

    const rows = this.db.prepare(sql).all(params) as SizeModificationRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  async upsertWithVersion(
    data: Omit<SizeModificationRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'version' | 'isLatest'>,
    createdBy: string,
    strategy: ConflictStrategy
  ): Promise<{
    created: boolean;
    updated: boolean;
    skipped: boolean;
    version: number;
  }> {
    const dbData: Record<string, unknown> = {
      modification_no: data.modificationNo,
      sample_no: data.sampleNo,
      style_no: data.styleNo,
      original_measurements: this.serialize(data.originalMeasurements),
      modified_measurements: this.serialize(data.modifiedMeasurements),
      modification_reason: data.modificationReason || null,
      requested_by: data.requestedBy,
      requested_at: data.requestedAt,
      approved_by: data.approvedBy || null,
      approved_at: data.approvedAt || null,
      status: data.status,
      priority: data.priority,
      affected_fabrics: data.affectedFabrics ? this.serialize(data.affectedFabrics) : null,
      estimated_impact: data.estimatedImpact || null,
      import_source: this.serialize(data.importSource),
      source_row_number: data.sourceRowNumber
    };

    return this.handleVersionedUpsert('modification_no', data.modificationNo, dbData, createdBy, strategy);
  }
}
