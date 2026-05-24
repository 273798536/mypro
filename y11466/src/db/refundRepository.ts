import Database from 'better-sqlite3';
import { BaseRepository } from './baseRepository';
import { RefundRecord, ImportSource, ConflictStrategy } from '../types';

interface RefundRecordRow {
  id: string;
  refund_no: string;
  related_sample_no: string | null;
  related_style_no: string | null;
  related_contract_no: string | null;
  type: string;
  status: string;
  original_amount: number;
  refund_amount: number;
  currency: string;
  applicant: string;
  applicant_department: string;
  applied_at: string;
  approved_by: string | null;
  approved_at: string | null;
  paid_by: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  reason: string;
  remarks: string | null;
  import_source: string;
  source_row_number: number;
  version: number;
  is_latest: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export class RefundRepository extends BaseRepository<RefundRecord> {
  protected tableName = 'refund_records';

  constructor(db: Database.Database) {
    super(db);
  }

  private rowToEntity(row: RefundRecordRow): RefundRecord {
    return {
      id: row.id,
      refundNo: row.refund_no,
      relatedSampleNo: row.related_sample_no || undefined,
      relatedStyleNo: row.related_style_no || undefined,
      relatedContractNo: row.related_contract_no || undefined,
      type: row.type as RefundRecord['type'],
      status: row.status as RefundRecord['status'],
      originalAmount: row.original_amount,
      refundAmount: row.refund_amount,
      currency: row.currency,
      applicant: row.applicant,
      applicantDepartment: row.applicant_department,
      appliedAt: row.applied_at,
      approvedBy: row.approved_by || undefined,
      approvedAt: row.approved_at || undefined,
      paidBy: row.paid_by || undefined,
      paidAt: row.paid_at || undefined,
      paymentMethod: row.payment_method || undefined,
      paymentReference: row.payment_reference || undefined,
      reason: row.reason,
      remarks: row.remarks || undefined,
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

  create(data: Partial<RefundRecord>, createdBy: string): RefundRecord {
    const id = this.generateId();
    const now = this.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO refund_records (
        id, refund_no, related_sample_no, related_style_no, related_contract_no,
        type, status, original_amount, refund_amount, currency,
        applicant, applicant_department, applied_at, approved_by, approved_at,
        paid_by, paid_at, payment_method, payment_reference, reason, remarks,
        import_source, source_row_number,
        version, is_latest, created_by, updated_by, created_at, updated_at
      ) VALUES (
        @id, @refundNo, @relatedSampleNo, @relatedStyleNo, @relatedContractNo,
        @type, @status, @originalAmount, @refundAmount, @currency,
        @applicant, @applicantDepartment, @appliedAt, @approvedBy, @approvedAt,
        @paidBy, @paidAt, @paymentMethod, @paymentReference, @reason, @remarks,
        @importSource, @sourceRowNumber,
        1, 1, @createdBy, @createdBy, @createdAt, @createdAt
      )
    `);

    stmt.run({
      id,
      refundNo: data.refundNo,
      relatedSampleNo: data.relatedSampleNo || null,
      relatedStyleNo: data.relatedStyleNo || null,
      relatedContractNo: data.relatedContractNo || null,
      type: data.type,
      status: data.status || 'pending',
      originalAmount: data.originalAmount,
      refundAmount: data.refundAmount,
      currency: data.currency || 'CNY',
      applicant: data.applicant,
      applicantDepartment: data.applicantDepartment,
      appliedAt: data.appliedAt,
      approvedBy: data.approvedBy || null,
      approvedAt: data.approvedAt || null,
      paidBy: data.paidBy || null,
      paidAt: data.paidAt || null,
      paymentMethod: data.paymentMethod || null,
      paymentReference: data.paymentReference || null,
      reason: data.reason,
      remarks: data.remarks || null,
      importSource: this.serialize(data.importSource),
      sourceRowNumber: data.sourceRowNumber,
      createdBy,
      createdAt: now
    });

    return this.findById(id)!;
  }

  update(id: string, data: Partial<RefundRecord>, updatedBy: string): RefundRecord | null {
    const now = this.now();
    const updates: string[] = [];
    const params: Record<string, unknown> = { id, updatedBy, updatedAt: now };

    const fieldMappings: Record<string, string> = {
      refundNo: 'refund_no',
      relatedSampleNo: 'related_sample_no',
      relatedStyleNo: 'related_style_no',
      relatedContractNo: 'related_contract_no',
      type: 'type',
      status: 'status',
      originalAmount: 'original_amount',
      refundAmount: 'refund_amount',
      currency: 'currency',
      applicant: 'applicant',
      applicantDepartment: 'applicant_department',
      appliedAt: 'applied_at',
      approvedBy: 'approved_by',
      approvedAt: 'approved_at',
      paidBy: 'paid_by',
      paidAt: 'paid_at',
      paymentMethod: 'payment_method',
      paymentReference: 'payment_reference',
      reason: 'reason',
      remarks: 'remarks'
    };

    for (const [key, value] of Object.entries(data)) {
      if (fieldMappings[key] && value !== undefined) {
        updates.push(`${fieldMappings[key]} = @${key}`);
        params[key] = value;
      }
    }

    if (updates.length === 0) return this.findById(id);

    const sql = `
      UPDATE refund_records 
      SET ${updates.join(', ')}, updated_by = @updatedBy, updated_at = @updatedAt 
      WHERE id = @id
    `;

    this.db.prepare(sql).run(params);
    return this.findById(id);
  }

  findById(id: string): RefundRecord | null {
    const row = this.db.prepare(
      'SELECT * FROM refund_records WHERE id = ?'
    ).get(id) as RefundRecordRow | undefined;
    
    return row ? this.rowToEntity(row) : null;
  }

  findByRefundNo(refundNo: string, latestOnly = true): RefundRecord[] {
    let sql = 'SELECT * FROM refund_records WHERE refund_no = ?';
    const params: (string | number)[] = [refundNo];
    
    if (latestOnly) {
      sql += ' AND is_latest = 1';
    }
    sql += ' ORDER BY version DESC';

    const rows = this.db.prepare(sql).all(params) as RefundRecordRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  findBySampleNo(sampleNo: string, latestOnly = true): RefundRecord[] {
    let sql = 'SELECT * FROM refund_records WHERE related_sample_no = ?';
    const params: (string | number)[] = [sampleNo];
    
    if (latestOnly) {
      sql += ' AND is_latest = 1';
    }
    sql += ' ORDER BY applied_at DESC, version DESC';

    const rows = this.db.prepare(sql).all(params) as RefundRecordRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  async upsertWithVersion(
    data: Omit<RefundRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'version' | 'isLatest'>,
    createdBy: string,
    strategy: ConflictStrategy
  ): Promise<{
    created: boolean;
    updated: boolean;
    skipped: boolean;
    version: number;
  }> {
    const dbData: Record<string, unknown> = {
      refund_no: data.refundNo,
      related_sample_no: data.relatedSampleNo || null,
      related_style_no: data.relatedStyleNo || null,
      related_contract_no: data.relatedContractNo || null,
      type: data.type,
      status: data.status,
      original_amount: data.originalAmount,
      refund_amount: data.refundAmount,
      currency: data.currency,
      applicant: data.applicant,
      applicant_department: data.applicantDepartment,
      applied_at: data.appliedAt,
      approved_by: data.approvedBy || null,
      approved_at: data.approvedAt || null,
      paid_by: data.paidBy || null,
      paid_at: data.paidAt || null,
      payment_method: data.paymentMethod || null,
      payment_reference: data.paymentReference || null,
      reason: data.reason,
      remarks: data.remarks || null,
      import_source: this.serialize(data.importSource),
      source_row_number: data.sourceRowNumber
    };

    return this.handleVersionedUpsert('refund_no', data.refundNo, dbData, createdBy, strategy);
  }
}
