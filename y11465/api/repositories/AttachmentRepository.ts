import { getDb } from '../db/connection.js';
import auditLogRepository from './AuditLogRepository.js';
import { randomUUID } from 'crypto';
import type { Attachment } from '../../shared/types';

class AttachmentRepository {
  private db = getDb();

  create(params: {
    documentId?: string;
    batchId?: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    filePath: string;
    uploadedBy: string;
  }): Attachment {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO attachments (id, document_id, batch_id, file_name, file_type, file_size, file_path, uploaded_by, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.documentId || null,
      params.batchId || null,
      params.fileName,
      params.fileType,
      params.fileSize,
      params.filePath,
      params.uploadedBy,
      now
    );

    auditLogRepository.create({
      entityType: 'ATTACHMENT',
      entityId: id,
      action: 'UPLOAD',
      afterData: {
        fileName: params.fileName,
        fileSize: params.fileSize,
        uploadedBy: params.uploadedBy
      },
      reason: `上传附件: ${params.fileName}`,
      operatedBy: params.uploadedBy
    });

    return this.findById(id)!;
  }

  findById(id: string): Attachment | null {
    const row: any = this.db.prepare(`SELECT * FROM attachments WHERE id = ?`).get(id);
    return row ? this.mapRow(row) : null;
  }

  findByDocumentId(documentId: string): Attachment[] {
    const rows: any[] = this.db.prepare(`
      SELECT * FROM attachments WHERE document_id = ? ORDER BY uploaded_at DESC
    `).all(documentId);
    return rows.map(row => this.mapRow(row));
  }

  findByBatchId(batchId: string): Attachment[] {
    const rows: any[] = this.db.prepare(`
      SELECT * FROM attachments WHERE batch_id = ? ORDER BY uploaded_at DESC
    `).all(batchId);
    return rows.map(row => this.mapRow(row));
  }

  delete(id: string, operatedBy: string): void {
    const attachment = this.findById(id);
    if (!attachment) return;

    auditLogRepository.create({
      entityType: 'ATTACHMENT',
      entityId: id,
      action: 'DELETE',
      beforeData: { fileName: attachment.fileName },
      reason: '删除附件',
      operatedBy
    });

    this.db.prepare(`DELETE FROM attachments WHERE id = ?`).run(id);
  }

  private mapRow(row: any): Attachment {
    return {
      id: row.id,
      documentId: row.document_id || undefined,
      batchId: row.batch_id || undefined,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      filePath: row.file_path,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at
    };
  }
}

export default new AttachmentRepository();
