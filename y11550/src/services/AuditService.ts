import { Repository } from 'typeorm';
import { AuditLog } from '../entities';
import { AuditAction, ReceiptStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  private auditLogRepository: Repository<AuditLog>;

  constructor(auditLogRepository: Repository<AuditLog>) {
    this.auditLogRepository = auditLogRepository;
  }

  async logStatusChange(
    receiptId: string,
    oldStatus: ReceiptStatus | undefined,
    newStatus: ReceiptStatus,
    operatorId: string,
    operatorName: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    const action = this.getStatusAction(oldStatus, newStatus);
    return this.createLog({
      receiptId,
      action,
      oldStatus,
      newStatus,
      operatorId,
      operatorName,
      reason,
      metadata
    });
  }

  async logCreate(
    receiptId: string,
    operatorId: string,
    operatorName: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.createLog({
      receiptId,
      action: AuditAction.CREATE,
      operatorId,
      operatorName,
      metadata
    });
  }

  async logUpdate(
    receiptId: string,
    operatorId: string,
    operatorName: string,
    changes: Record<string, { old: any; new: any }>,
    reason?: string
  ): Promise<AuditLog> {
    return this.createLog({
      receiptId,
      action: AuditAction.UPDATE,
      operatorId,
      operatorName,
      reason,
      changes
    });
  }

  async logAttachmentAdd(
    receiptId: string,
    operatorId: string,
    operatorName: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.createLog({
      receiptId,
      action: AuditAction.ATTACHMENT_ADD,
      operatorId,
      operatorName,
      metadata
    });
  }

  async logRevert(
    receiptId: string,
    operatorId: string,
    operatorName: string,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.createLog({
      receiptId,
      action: AuditAction.REVERT,
      operatorId,
      operatorName,
      reason,
      metadata
    });
  }

  async getAuditHistory(receiptId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { receiptId },
      order: { timestamp: 'DESC' }
    });
  }

  private async createLog(params: {
    receiptId: string;
    action: AuditAction;
    oldStatus?: ReceiptStatus;
    newStatus?: ReceiptStatus;
    operatorId: string;
    operatorName: string;
    reason?: string;
    changes?: Record<string, { old: any; new: any }>;
    metadata?: Record<string, any>;
  }): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      id: uuidv4(),
      ...params,
      timestamp: new Date()
    });
    return this.auditLogRepository.save(log);
  }

  private getStatusAction(
    oldStatus: ReceiptStatus | undefined,
    newStatus: ReceiptStatus
  ): AuditAction {
    if (newStatus === ReceiptStatus.FROZEN) return AuditAction.FREEZE;
    if (oldStatus === ReceiptStatus.FROZEN) return AuditAction.UNFREEZE;
    if (newStatus === ReceiptStatus.SETTLED) return AuditAction.SETTLE;
    if (newStatus === ReceiptStatus.ARCHIVED) return AuditAction.ARCHIVE;
    return AuditAction.STATUS_CHANGE;
  }
}
