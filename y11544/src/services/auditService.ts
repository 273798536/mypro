import { v4 as uuidv4 } from 'uuid';
import { Database, getDatabase } from '../database';
import { AuditRecord, AuditRequest, ManagerComment, ManagerCommentRequest } from '../types';

export class AuditService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  async addAuditRecord(request: AuditRequest): Promise<AuditRecord> {
    const now = new Date().toISOString();
    const id = uuidv4();

    await this.db.run(
      `INSERT INTO audit_records (id, materialId, auditResult, auditComment, auditedBy, auditedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, request.materialId, request.auditResult, request.auditComment, request.auditedBy, now]
    );

    return this.db.get<AuditRecord>(
      'SELECT * FROM audit_records WHERE id = ?',
      [id]
    ) as Promise<AuditRecord>;
  }

  async getAuditRecords(materialId: string): Promise<AuditRecord[]> {
    return this.db.all<AuditRecord>(
      'SELECT * FROM audit_records WHERE materialId = ? ORDER BY auditedAt DESC',
      [materialId]
    );
  }

  async addManagerComment(request: ManagerCommentRequest): Promise<ManagerComment> {
    const now = new Date().toISOString();
    const id = uuidv4();

    await this.db.run(
      `INSERT INTO manager_comments (id, materialId, comment, evidence, commentedBy, commentedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, request.materialId, request.comment, request.evidence || null, request.commentedBy, now]
    );

    return this.db.get<ManagerComment>(
      'SELECT * FROM manager_comments WHERE id = ?',
      [id]
    ) as Promise<ManagerComment>;
  }

  async getManagerComments(materialId: string): Promise<ManagerComment[]> {
    return this.db.all<ManagerComment>(
      'SELECT * FROM manager_comments WHERE materialId = ? ORDER BY commentedAt DESC',
      [materialId]
    );
  }
}

export const auditService = new AuditService();
