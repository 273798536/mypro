import Database from 'better-sqlite3';
import { BaseRepository } from './baseRepository';
import { SampleFlowRecord, ImportSource, ConflictStrategy } from '../types';

interface SampleFlowRow {
  id: string;
  sample_no: string;
  style_no: string;
  style_name: string | null;
  brand: string | null;
  season: string | null;
  sample_type: string;
  status: string;
  deposit_amount: number;
  deposit_currency: string;
  deposit_paid_at: string | null;
  deposit_refunded_at: string | null;
  deposit_refund_amount: number | null;
  assigned_to: string | null;
  pattern_maker: string | null;
  cutter: string | null;
  sewer: string | null;
  received_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  import_source: string;
  source_row_number: number;
  version: number;
  is_latest: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export class SampleRepository extends BaseRepository<SampleFlowRecord, SampleFlowRow> {
  protected tableName = 'sample_flow_records';

  constructor(db: Database.Database) {
    super(db);
  }

  protected rowToEntity(row: SampleFlowRow): SampleFlowRecord {
    return {
      id: row.id,
      sampleNo: row.sample_no,
      styleNo: row.style_no,
      styleName: row.style_name || undefined,
      brand: row.brand || undefined,
      season: row.season || undefined,
      sampleType: row.sample_type as SampleFlowRecord['sampleType'],
      status: row.status as SampleFlowRecord['status'],
      depositAmount: row.deposit_amount,
      depositCurrency: row.deposit_currency,
      depositPaidAt: row.deposit_paid_at || undefined,
      depositRefundedAt: row.deposit_refunded_at || undefined,
      depositRefundAmount: row.deposit_refund_amount ?? undefined,
      assignedTo: row.assigned_to || undefined,
      patternMaker: row.pattern_maker || undefined,
      cutter: row.cutter || undefined,
      sewer: row.sewer || undefined,
      receivedAt: row.received_at || undefined,
      sentAt: row.sent_at || undefined,
      completedAt: row.completed_at || undefined,
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

  create(data: Partial<SampleFlowRecord>, createdBy: string): SampleFlowRecord {
    const id = this.generateId();
    const now = this.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO sample_flow_records (
        id, sample_no, style_no, style_name, brand, season, sample_type, status,
        deposit_amount, deposit_currency, deposit_paid_at, deposit_refunded_at,
        deposit_refund_amount, assigned_to, pattern_maker, cutter, sewer,
        received_at, sent_at, completed_at, import_source, source_row_number,
        version, is_latest, created_by, updated_by, created_at, updated_at
      ) VALUES (
        @id, @sampleNo, @styleNo, @styleName, @brand, @season, @sampleType, @status,
        @depositAmount, @depositCurrency, @depositPaidAt, @depositRefundedAt,
        @depositRefundAmount, @assignedTo, @patternMaker, @cutter, @sewer,
        @receivedAt, @sentAt, @completedAt, @importSource, @sourceRowNumber,
        1, 1, @createdBy, @createdBy, @createdAt, @createdAt
      )
    `);

    stmt.run({
      id,
      sampleNo: data.sampleNo,
      styleNo: data.styleNo,
      styleName: data.styleName || null,
      brand: data.brand || null,
      season: data.season || null,
      sampleType: data.sampleType,
      status: data.status,
      depositAmount: data.depositAmount || 0,
      depositCurrency: data.depositCurrency || 'CNY',
      depositPaidAt: data.depositPaidAt || null,
      depositRefundedAt: data.depositRefundedAt || null,
      depositRefundAmount: data.depositRefundAmount ?? null,
      assignedTo: data.assignedTo || null,
      patternMaker: data.patternMaker || null,
      cutter: data.cutter || null,
      sewer: data.sewer || null,
      receivedAt: data.receivedAt || null,
      sentAt: data.sentAt || null,
      completedAt: data.completedAt || null,
      importSource: this.serialize(data.importSource),
      sourceRowNumber: data.sourceRowNumber,
      createdBy,
      createdAt: now
    });

    return this.findById(id)!;
  }

  update(id: string, data: Partial<SampleFlowRecord>, updatedBy: string): SampleFlowRecord | null {
    const now = this.now();
    const updates: string[] = [];
    const params: Record<string, unknown> = { id, updatedBy, updatedAt: now };

    const fieldMappings: Record<string, string> = {
      sampleNo: 'sample_no',
      styleNo: 'style_no',
      styleName: 'style_name',
      brand: 'brand',
      season: 'season',
      sampleType: 'sample_type',
      status: 'status',
      depositAmount: 'deposit_amount',
      depositCurrency: 'deposit_currency',
      depositPaidAt: 'deposit_paid_at',
      depositRefundedAt: 'deposit_refunded_at',
      depositRefundAmount: 'deposit_refund_amount',
      assignedTo: 'assigned_to',
      patternMaker: 'pattern_maker',
      cutter: 'cutter',
      sewer: 'sewer',
      receivedAt: 'received_at',
      sentAt: 'sent_at',
      completedAt: 'completed_at'
    };

    for (const [key, value] of Object.entries(data)) {
      if (fieldMappings[key] && value !== undefined) {
        updates.push(`${fieldMappings[key]} = @${key}`);
        params[key] = value;
      }
    }

    if (updates.length === 0) return this.findById(id);

    const sql = `
      UPDATE sample_flow_records 
      SET ${updates.join(', ')}, updated_by = @updatedBy, updated_at = @updatedAt 
      WHERE id = @id
    `;

    this.db.prepare(sql).run(params);
    return this.findById(id);
  }

  findById(id: string): SampleFlowRecord | null {
    const row = this.db.prepare(
      'SELECT * FROM sample_flow_records WHERE id = ?'
    ).get(id) as SampleFlowRow | undefined;
    
    return row ? this.rowToEntity(row) : null;
  }

  findBySampleNo(sampleNo: string, latestOnly = true): SampleFlowRecord[] {
    let sql = 'SELECT * FROM sample_flow_records WHERE sample_no = ?';
    const params: (string | number)[] = [sampleNo];
    
    if (latestOnly) {
      sql += ' AND is_latest = 1';
    }
    sql += ' ORDER BY version DESC';

    const rows = this.db.prepare(sql).all(params) as SampleFlowRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  findByStyleNo(styleNo: string, latestOnly = true): SampleFlowRecord[] {
    let sql = 'SELECT * FROM sample_flow_records WHERE style_no = ?';
    const params: (string | number)[] = [styleNo];
    
    if (latestOnly) {
      sql += ' AND is_latest = 1';
    }
    sql += ' ORDER BY sample_no, version DESC';

    const rows = this.db.prepare(sql).all(params) as SampleFlowRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  async upsertWithVersion(
    data: Omit<SampleFlowRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'version' | 'isLatest'>,
    createdBy: string,
    strategy: ConflictStrategy
  ): Promise<{
    created: boolean;
    updated: boolean;
    skipped: boolean;
    version: number;
  }> {
    const dbData: Record<string, unknown> = {
      sample_no: data.sampleNo,
      style_no: data.styleNo,
      style_name: data.styleName || null,
      brand: data.brand || null,
      season: data.season || null,
      sample_type: data.sampleType,
      status: data.status,
      deposit_amount: data.depositAmount,
      deposit_currency: data.depositCurrency,
      deposit_paid_at: data.depositPaidAt || null,
      deposit_refunded_at: data.depositRefundedAt || null,
      deposit_refund_amount: data.depositRefundAmount ?? null,
      assigned_to: data.assignedTo || null,
      pattern_maker: data.patternMaker || null,
      cutter: data.cutter || null,
      sewer: data.sewer || null,
      received_at: data.receivedAt || null,
      sent_at: data.sentAt || null,
      completed_at: data.completedAt || null,
      import_source: this.serialize(data.importSource),
      source_row_number: data.sourceRowNumber
    };

    return this.handleVersionedUpsert('sample_no', data.sampleNo, dbData, createdBy, strategy);
  }
}
