import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import db from '../db';
import { Attachment, ActionType } from '../types';
import { auditService } from './auditService';
import { config } from '../config';
import logger from '../utils/logger';

export class AttachmentService {
  constructor() {
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(config.upload.dir)) {
      fs.mkdirSync(config.upload.dir, { recursive: true });
    }
  }

  async uploadAttachment(
    receiptId: string,
    file: Express.Multer.File,
    uploadedBy: string,
    uploaderName: string
  ): Promise<string> {
    const id = uuidv4();
    const now = new Date();
    const fileExt = path.extname(file.originalname);
    const fileName = `${id}${fileExt}`;
    const filePath = path.join(config.upload.dir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const attachment: Attachment = {
      id,
      receiptId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      filePath,
      uploadedBy,
      createdAt: now,
    };

    await db('attachments').insert({
      id: attachment.id,
      receipt_id: attachment.receiptId,
      file_name: attachment.fileName,
      file_type: attachment.fileType,
      file_size: attachment.fileSize,
      file_path: attachment.filePath,
      uploaded_by: attachment.uploadedBy,
      created_at: attachment.createdAt,
    });

    await auditService.createLog({
      receiptId,
      actionType: ActionType.ATTACHMENT_UPLOAD,
      operatorId: uploadedBy,
      operatorName: uploaderName,
      newState: { attachmentId: id, fileName: file.originalname },
      reason: 'Upload attachment',
    });

    logger.info('Attachment uploaded', { id, receiptId, fileName: file.originalname });
    return id;
  }

  async getAttachmentsByReceiptId(receiptId: string): Promise<Attachment[]> {
    const rows = await db('attachments')
      .where('receipt_id', receiptId)
      .orderBy('created_at', 'desc');

    return rows.map((row: any) => ({
      id: row.id,
      receiptId: row.receipt_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      filePath: row.file_path,
      uploadedBy: row.uploaded_by,
      createdAt: new Date(row.created_at),
    }));
  }

  async getAttachmentById(id: string): Promise<Attachment | null> {
    const row = await db('attachments').where('id', id).first();

    if (!row) return null;

    return {
      id: row.id,
      receiptId: row.receipt_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      filePath: row.file_path,
      uploadedBy: row.uploaded_by,
      createdAt: new Date(row.created_at),
    };
  }

  async deleteAttachment(id: string): Promise<boolean> {
    const attachment = await this.getAttachmentById(id);
    if (!attachment) return false;

    if (fs.existsSync(attachment.filePath)) {
      fs.unlinkSync(attachment.filePath);
    }

    await db('attachments').where('id', id).delete();
    logger.info('Attachment deleted', { id });
    return true;
  }
}

export const attachmentService = new AttachmentService();
