import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { ApprovalEmail, ActionType } from '../types';
import { auditService } from './auditService';
import logger from '../utils/logger';

export class ApprovalEmailService {
  async addApprovalEmail(
    receiptId: string,
    emailData: {
      emailSubject: string;
      emailFrom: string;
      emailTo: string[];
      emailCc?: string[];
      emailBody: string;
      sentAt: Date;
      sentBy: string;
      sentByName: string;
    }
  ): Promise<string> {
    const existingReceipt = await db('exception_receipts')
      .where('id', receiptId)
      .andWhere('is_deleted', false)
      .first();

    if (!existingReceipt) {
      throw new Error('Exception receipt not found');
    }

    const id = uuidv4();
    const now = new Date();

    const email: ApprovalEmail = {
      id,
      receiptId,
      emailSubject: emailData.emailSubject,
      emailFrom: emailData.emailFrom,
      emailTo: emailData.emailTo,
      emailCc: emailData.emailCc,
      emailBody: emailData.emailBody,
      sentAt: emailData.sentAt,
      sentBy: emailData.sentBy,
      createdAt: now,
    };

    await db('approval_emails').insert({
      id: email.id,
      receipt_id: email.receiptId,
      email_subject: email.emailSubject,
      email_from: email.emailFrom,
      email_to: JSON.stringify(email.emailTo),
      email_cc: email.emailCc ? JSON.stringify(email.emailCc) : null,
      email_body: email.emailBody,
      sent_at: email.sentAt,
      sent_by: email.sentBy,
      created_at: email.createdAt,
    });

    await auditService.createLog({
      receiptId,
      actionType: ActionType.ATTACHMENT_UPLOAD,
      operatorId: emailData.sentBy,
      operatorName: emailData.sentByName,
      newState: {
        emailId: id,
        emailSubject: emailData.emailSubject,
        emailFrom: emailData.emailFrom,
      },
      reason: 'Add approval email',
    });

    logger.info('Approval email added', { id, receiptId });
    return id;
  }

  async getEmailsByReceiptId(receiptId: string): Promise<ApprovalEmail[]> {
    const rows = await db('approval_emails')
      .where('receipt_id', receiptId)
      .orderBy('sent_at', 'desc');

    return rows.map(this.deserializeEmail);
  }

  async getEmailById(id: string): Promise<ApprovalEmail | null> {
    const row = await db('approval_emails').where('id', id).first();
    return row ? this.deserializeEmail(row) : null;
  }

  private deserializeEmail(row: any): ApprovalEmail {
    return {
      id: row.id,
      receiptId: row.receipt_id,
      emailSubject: row.email_subject,
      emailFrom: row.email_from,
      emailTo: row.email_to ? JSON.parse(row.email_to) : [],
      emailCc: row.email_cc ? JSON.parse(row.email_cc) : undefined,
      emailBody: row.email_body,
      sentAt: new Date(row.sent_at),
      sentBy: row.sent_by,
      createdAt: new Date(row.created_at),
    };
  }
}

export const approvalEmailService = new ApprovalEmailService();
