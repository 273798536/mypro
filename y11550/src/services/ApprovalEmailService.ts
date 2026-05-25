import { Repository, EntityManager } from 'typeorm';
import { ApprovalEmail, ExceptionRecord, FailedRecord } from '../entities';
import { DataSource, ExceptionType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface ImportApprovalEmailParams {
  emailId: string;
  subject: string;
  body: string;
  fromAddress: string;
  toAddresses?: string[];
  ccAddresses?: string[];
  approverName?: string;
  approverEmail?: string;
  approvalDecision?: string;
  approvalNote?: string;
  emailTime: Date;
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    contentType: string;
  }>;
  rawData: Record<string, any>;
  receiptId?: string;
  importedBy?: string;
}

export class ApprovalEmailService {
  private approvalEmailRepository: Repository<ApprovalEmail>;
  private exceptionRepository: Repository<ExceptionRecord>;
  private failedRecordRepository: Repository<FailedRecord>;
  private entityManager: EntityManager;

  constructor(
    approvalEmailRepository: Repository<ApprovalEmail>,
    exceptionRepository: Repository<ExceptionRecord>,
    failedRecordRepository: Repository<FailedRecord>,
    entityManager: EntityManager
  ) {
    this.approvalEmailRepository = approvalEmailRepository;
    this.exceptionRepository = exceptionRepository;
    this.failedRecordRepository = failedRecordRepository;
    this.entityManager = entityManager;
  }

  async importApprovalEmail(params: ImportApprovalEmailParams): Promise<{
    success: boolean;
    email?: ApprovalEmail;
    error?: string;
    failedRecord?: FailedRecord;
  }> {
    return await this.entityManager.transaction(async (tx) => {
      const existing = await tx.findOne(ApprovalEmail, {
        where: { emailId: params.emailId }
      });

      if (existing) {
        const failedRecord = await this.createFailedRecord(
          tx,
          'DUPLICATE_EMAIL',
          `邮件ID ${params.emailId} 已存在`,
          params.rawData,
          params.importedBy
        );

        return {
          success: false,
          error: '重复邮件导入',
          failedRecord
        };
      }

      const email = tx.create(ApprovalEmail, {
        id: uuidv4(),
        emailId: params.emailId,
        subject: params.subject,
        body: params.body,
        fromAddress: params.fromAddress,
        toAddresses: params.toAddresses,
        ccAddresses: params.ccAddresses,
        approverName: params.approverName,
        approverEmail: params.approverEmail,
        approvalDecision: params.approvalDecision,
        approvalNote: params.approvalNote,
        emailTime: params.emailTime,
        attachments: params.attachments,
        rawData: params.rawData,
        receiptId: params.receiptId,
        importedBy: params.importedBy,
        isProcessed: false,
        isException: false
      });

      if (this.isApprovalRejected(params.approvalDecision)) {
        email.isException = true;
        email.exceptionReason = `审批被拒绝: ${params.approvalNote || '无详细说明'}`;

        const exception = tx.create(ExceptionRecord, {
          id: uuidv4(),
          receiptId: params.receiptId,
          source: DataSource.APPROVAL_EMAIL,
          type: ExceptionType.NETWORK_ERROR,
          description: '审批邮件异常',
          detail: email.exceptionReason,
          rawData: {
            emailId: params.emailId,
            decision: params.approvalDecision,
            note: params.approvalNote
          },
          relatedRecordId: email.id,
          resolved: false,
          affectsSummary: true,
          isRetained: true,
          createdAt: new Date()
        });

        await tx.save(exception);
      }

      const savedEmail = await tx.save(email);

      return {
        success: true,
        email: savedEmail
      };
    });
  }

  async importApprovalEmailsBatch(
    emails: ImportApprovalEmailParams[]
  ): Promise<{
    imported: ApprovalEmail[];
    failed: FailedRecord[];
    exceptions: ExceptionRecord[];
  }> {
    return await this.entityManager.transaction(async (tx) => {
      const imported: ApprovalEmail[] = [];
      const failed: FailedRecord[] = [];
      const exceptions: ExceptionRecord[] = [];

      for (const params of emails) {
        const result = await this.importApprovalEmail(params);
        
        if (result.success && result.email) {
          imported.push(result.email);
          
          if (result.email.isException) {
            const emailExceptions = await tx.find(ExceptionRecord, {
              where: { relatedRecordId: result.email.id }
            });
            exceptions.push(...emailExceptions);
          }
        } else if (result.failedRecord) {
          failed.push(result.failedRecord);
        }
      }

      return { imported, failed, exceptions };
    });
  }

  async getApprovalEmails(params: {
    receiptId?: string;
    isException?: boolean;
    isProcessed?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: ApprovalEmail[]; total: number }> {
    const { page = 1, pageSize = 20, ...filters } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (filters.receiptId) where.receiptId = filters.receiptId;
    if (filters.isException !== undefined) where.isException = filters.isException;
    if (filters.isProcessed !== undefined) where.isProcessed = filters.isProcessed;

    const [data, total] = await this.approvalEmailRepository.findAndCount({
      where,
      order: { emailTime: 'DESC' },
      skip,
      take: pageSize
    });

    return { data, total };
  }

  async linkEmailToReceipt(emailId: string, receiptId: string, operatorId: string): Promise<ApprovalEmail> {
    return await this.entityManager.transaction(async (tx) => {
      const email = await tx.findOne(ApprovalEmail, { where: { emailId } });
      if (!email) throw new Error('邮件不存在');

      email.receiptId = receiptId;
      email.isProcessed = true;
      email.processedAt = new Date();
      email.processedBy = operatorId;

      return tx.save(email);
    });
  }

  private async createFailedRecord(
    tx: EntityManager,
    errorType: string,
    errorMessage: string,
    rawData: Record<string, any>,
    importedBy?: string
  ): Promise<FailedRecord> {
    const failedRecord = tx.create(FailedRecord, {
      id: uuidv4(),
      source: DataSource.APPROVAL_EMAIL,
      errorType,
      errorMessage,
      rawData,
      importedBy,
      createdAt: new Date()
    });

    return tx.save(failedRecord);
  }

  private isApprovalRejected(decision?: string): boolean {
    if (!decision) return false;
    const rejectedKeywords = ['reject', 'rejected', 'denied', 'refused', '不通过', '拒绝', '驳回', '否决'];
    const lowerDecision = decision.toLowerCase();
    return rejectedKeywords.some(keyword => lowerDecision.includes(keyword.toLowerCase()));
  }
}
