import { getDb } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import type { Document, DocumentType, DocumentStatus, DiffField, DocumentDiff } from '../../shared/types';
import auditLogRepository from './AuditLogRepository';

export class DocumentRepository {
  private db = getDb();

  create(params: {
    batchId: string;
    documentType: DocumentType;
    documentNo: string;
    styleCode: string;
    version: number;
    data: Record<string, any>;
    createdBy: string;
  }): Document {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO documents (id, batch_id, document_type, document_no, style_code, version, data, status, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, ?, ?)
    `);

    stmt.run(
      id,
      params.batchId,
      params.documentType,
      params.documentNo,
      params.styleCode,
      params.version,
      JSON.stringify(params.data),
      params.createdBy,
      now,
      now
    );

    const doc = this.findById(id)!;

    auditLogRepository.create({
      entityType: 'DOCUMENT',
      entityId: id,
      action: 'CREATE',
      afterData: doc,
      operatedBy: params.createdBy,
      reason: '创建单据'
    });

    return doc;
  }

  findById(id: string): Document | null {
    const stmt = this.db.prepare('SELECT * FROM documents WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByBatchId(batchId: string): Document[] {
    const stmt = this.db.prepare(`
      SELECT * FROM documents 
      WHERE batch_id = ?
      ORDER BY document_type, version DESC
    `);
    const rows = stmt.all(batchId) as any[];
    return rows.map(row => this.mapRow(row));
  }

  findAll(params: {
    page?: number;
    pageSize?: number;
    documentType?: DocumentType;
    status?: DocumentStatus;
    styleCode?: string;
  } = {}): { data: Document[]; total: number } {
    const { page = 1, pageSize = 20, documentType, status, styleCode } = params;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (documentType) {
      whereClause += ' AND document_type = ?';
      queryParams.push(documentType);
    }
    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }
    if (styleCode) {
      whereClause += ' AND style_code LIKE ?';
      queryParams.push(`%${styleCode}%`);
    }

    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM documents ${whereClause}`);
    const { count } = countStmt.get(...queryParams) as { count: number };

    const dataStmt = this.db.prepare(`
      SELECT * FROM documents ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = dataStmt.all(...queryParams, pageSize, offset) as any[];

    return {
      data: rows.map(row => this.mapRow(row)),
      total: count
    };
  }

  findPendingReview(params: {
    page?: number;
    pageSize?: number;
  } = {}): { data: Document[]; total: number } {
    return this.findAll({ ...params, status: 'PENDING_REVIEW' });
  }

  updateStatus(id: string, status: DocumentStatus, reviewReason: string | undefined, operatedBy: string, reason?: string): Document {
    const before = this.findById(id);
    if (!before) throw new Error('Document not found');

    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE documents 
      SET status = ?, review_reason = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(status, reviewReason || null, now, id);

    const after = this.findById(id)!;

    auditLogRepository.create({
      entityType: 'DOCUMENT',
      entityId: id,
      action: 'STATUS_CHANGE',
      beforeData: before,
      afterData: after,
      operatedBy,
      reason
    });

    return after;
  }

  updateData(id: string, data: Record<string, any>, operatedBy: string, reason: string): Document {
    const before = this.findById(id);
    if (!before) throw new Error('Document not found');

    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE documents 
      SET data = ?, status = 'MODIFIED', version = version + 1, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(data), now, id);

    const after = this.findById(id)!;

    auditLogRepository.create({
      entityType: 'DOCUMENT',
      entityId: id,
      action: 'MODIFY',
      beforeData: before,
      afterData: after,
      operatedBy,
      reason
    });

    return after;
  }

  getDiff(documentId: string, fromVersion: number, toVersion: number): DocumentDiff | null {
    const docs = this.db.prepare(`
      SELECT * FROM documents 
      WHERE id = ? OR (style_code = (SELECT style_code FROM documents WHERE id = ?) AND document_no = (SELECT document_no FROM documents WHERE id = ?))
      ORDER BY version
    `).all(documentId, documentId, documentId) as any[];

    if (docs.length < 2) return null;

    const fromDoc = docs.find(d => d.version === fromVersion);
    const toDoc = docs.find(d => d.version === toVersion);

    if (!fromDoc || !toDoc) return null;

    const fromData = JSON.parse(fromDoc.data);
    const toData = JSON.parse(toDoc.data);

    const fields = this.calculateDiff(fromData, toData);

    const auditLogs = auditLogRepository.findByEntity('document', toDoc.id);
    const lastLog = auditLogs[0];

    return {
      fields,
      modifiedBy: lastLog?.operatedBy || toDoc.created_by,
      modifiedAt: toDoc.updated_at,
      reason: lastLog?.reason || '数据更新'
    };
  }

  private calculateDiff(fromData: Record<string, any>, toData: Record<string, any>): DiffField[] {
    const fields: DiffField[] = [];
    const allKeys = new Set([...Object.keys(fromData), ...Object.keys(toData)]);

    for (const key of allKeys) {
      const oldVal = fromData[key];
      const newVal = toData[key];

      if (oldVal === undefined && newVal !== undefined) {
        fields.push({ field: key, oldValue: undefined, newValue: newVal, changeType: 'ADD' });
      } else if (newVal === undefined && oldVal !== undefined) {
        fields.push({ field: key, oldValue: oldVal, newValue: undefined, changeType: 'DELETE' });
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        fields.push({ field: key, oldValue: oldVal, newValue: newVal, changeType: 'MODIFY' });
      }
    }

    return fields;
  }

  getVersionsByStyleAndDocNo(styleCode: string, documentNo: string): Document[] {
    const rows = this.db.prepare(`
      SELECT * FROM documents
      WHERE style_code = ? AND document_no = ?
      ORDER BY version DESC
    `).all(styleCode, documentNo) as any[];
    return rows.map(row => this.mapRow(row));
  }

  private mapRow(row: any): Document {
    return {
      id: row.id,
      batchId: row.batch_id,
      documentType: row.document_type,
      documentNo: row.document_no,
      styleCode: row.style_code,
      version: row.version,
      data: JSON.parse(row.data),
      status: row.status,
      reviewReason: row.review_reason,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default new DocumentRepository();
