import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ReconciliationReceiptModel,
  StatusTransitionModel,
  OriginalEvidenceModel,
  AttachmentModel
} from '../models';
import { StateMachine } from './stateMachine';
import {
  ReconciliationReceipt,
  Operator,
  ReceiptStatus,
  StatusTransition,
  OriginalEvidence,
  Attachment
} from '../types';
import { logger } from '../utils/logger';

export class DuplicateSubmissionError extends Error {
  constructor(batchNo: string) {
    super(`批次 ${batchNo} 已存在重复提交记录`);
    this.name = 'DuplicateSubmissionError';
  }
}

export class ReceiptNotFoundError extends Error {
  constructor(receiptId: string) {
    super(`回执记录不存在: ${receiptId}`);
    this.name = 'ReceiptNotFoundError';
  }
}

export class FrozenReceiptError extends Error {
  constructor(receiptId: string, action: string) {
    super(`回执 ${receiptId} 已冻结，无法执行${action}操作`);
    this.name = 'FrozenReceiptError';
  }
}

export class ReconciliationService {
  private receiptModel: ReconciliationReceiptModel;
  private transitionModel: StatusTransitionModel;
  private evidenceModel: OriginalEvidenceModel;
  private attachmentModel: AttachmentModel;

  constructor() {
    this.receiptModel = new ReconciliationReceiptModel();
    this.transitionModel = new StatusTransitionModel();
    this.evidenceModel = new OriginalEvidenceModel();
    this.attachmentModel = new AttachmentModel();
  }

  async createReceipt(
    data: {
      batchNo: string;
      semiProductCode: string;
      semiProductName: string;
      supplierId: string;
      supplierName: string;
      quantity: number;
      abnormalAmount: number;
      deductionAmount: number;
      customerServiceNotes?: string;
    },
    operator: Operator
  ): Promise<ReconciliationReceipt> {
    const existing = await this.receiptModel.findByBatchNo(data.batchNo);
    if (existing.length > 0) {
      logger.warn(`批次 ${data.batchNo} 已存在，创建新记录`);
    }

    const receipt = await this.receiptModel.create({
      ...data,
      status: ReceiptStatus.DRAFT,
      currentStatus: ReceiptStatus.DRAFT,
      confirmedAmount: 0,
      isManualModified: false,
      createdBy: operator
    });

    await this.transitionModel.create({
      receiptId: receipt.id,
      fromStatus: ReceiptStatus.DRAFT,
      toStatus: ReceiptStatus.DRAFT,
      operator,
      reason: '人工创建回执记录',
      metadata: { action: 'create' }
    });

    logger.info(`已创建回执 ${receipt.id}，批次: ${data.batchNo}`);
    return receipt;
  }

  async submitReceipt(receiptId: string, operator: Operator, reason: string = '提交审核'): Promise<ReconciliationReceipt> {
    const receipt = await this.getReceiptOrThrow(receiptId);
    
    this.ensureNotFrozen(receipt, '提交');
    
    if (receipt.status === ReceiptStatus.SUBMITTED) {
      throw new DuplicateSubmissionError(receipt.batchNo);
    }

    StateMachine.validateTransition(receipt.status, ReceiptStatus.SUBMITTED, receiptId);

    const updated = await this.receiptModel.updateStatus(
      receiptId,
      ReceiptStatus.SUBMITTED,
      operator,
      reason
    );

    await this.transitionModel.create({
      receiptId,
      fromStatus: receipt.status,
      toStatus: ReceiptStatus.SUBMITTED,
      operator,
      reason
    });

    logger.info(`回执 ${receiptId} 已提交，状态变更: ${receipt.status} -> ${ReceiptStatus.SUBMITTED}`);
    return updated!;
  }

  async submitForReview(receiptId: string, operator: Operator, reason: string = '提交复核'): Promise<ReconciliationReceipt> {
    const receipt = await this.getReceiptOrThrow(receiptId);
    
    this.ensureNotFrozen(receipt, '提交复核');

    if (receipt.status !== ReceiptStatus.SUBMITTED && receipt.status !== ReceiptStatus.MODIFIED) {
      throw new Error(`当前状态 ${receipt.status} 不允许提交复核`);
    }

    StateMachine.validateTransition(receipt.status, ReceiptStatus.PENDING_REVIEW, receiptId);

    const updated = await this.receiptModel.updateStatus(
      receiptId,
      ReceiptStatus.PENDING_REVIEW,
      operator,
      reason
    );

    await this.transitionModel.create({
      receiptId,
      fromStatus: receipt.status,
      toStatus: ReceiptStatus.PENDING_REVIEW,
      operator,
      reason
    });

    logger.info(`回执 ${receiptId} 已提交复核`);
    return updated!;
  }

  async approveReceipt(receiptId: string, operator: Operator, reason: string = '复核通过'): Promise<ReconciliationReceipt> {
    const receipt = await this.getReceiptOrThrow(receiptId);
    
    this.ensureNotFrozen(receipt, '审核通过');

    if (receipt.status !== ReceiptStatus.PENDING_REVIEW) {
      throw new Error('只有待复核状态的记录可以审核通过');
    }

    StateMachine.validateTransition(receipt.status, ReceiptStatus.APPROVED, receiptId);

    const updated = await this.receiptModel.updateStatus(
      receiptId,
      ReceiptStatus.APPROVED,
      operator,
      reason,
      { confirmedAmount: receipt.deductionAmount }
    );

    await this.transitionModel.create({
      receiptId,
      fromStatus: receipt.status,
      toStatus: ReceiptStatus.APPROVED,
      operator,
      reason
    });

    logger.info(`回执 ${receiptId} 已审核通过，确认扣款金额: ${receipt.deductionAmount}`);
    return updated!;
  }

  async rejectReceipt(receiptId: string, operator: Operator, reason: string): Promise<ReconciliationReceipt> {
    const receipt = await this.getReceiptOrThrow(receiptId);
    
    this.ensureNotFrozen(receipt, '驳回');

    if (receipt.status !== ReceiptStatus.PENDING_REVIEW) {
      throw new Error('只有待复核状态的记录可以驳回');
    }

    StateMachine.validateTransition(receipt.status, ReceiptStatus.REJECTED, receiptId);

    const updated = await this.receiptModel.updateStatus(
      receiptId,
      ReceiptStatus.REJECTED,
      operator,
      reason,
      { confirmedAmount: 0 }
    );

    await this.transitionModel.create({
      receiptId,
      fromStatus: receipt.status,
      toStatus: ReceiptStatus.REJECTED,
      operator,
      reason
    });

    logger.info(`回执 ${receiptId} 已驳回，原因: ${reason}`);
    return updated!;
  }

  async manualModify(
    receiptId: string,
    operator: Operator,
    modifications: {
      confirmedAmount?: number;
      deductionAmount?: number;
      manualReason: string;
    }
  ): Promise<ReconciliationReceipt> {
    const receipt = await this.getReceiptOrThrow(receiptId);
    
    this.ensureNotFrozen(receipt, '人工改判');

    if (!StateMachine.canModify(receipt.status)) {
      throw new Error(`当前状态 ${receipt.status} 不允许人工改判`);
    }

    StateMachine.validateTransition(receipt.status, ReceiptStatus.MODIFIED, receiptId);

    const updated = await this.receiptModel.updateStatus(
      receiptId,
      ReceiptStatus.MODIFIED,
      operator,
      modifications.manualReason,
      {
        confirmedAmount: modifications.confirmedAmount,
        deductionAmount: modifications.deductionAmount,
        manualReason: modifications.manualReason,
        isManualModified: true
      }
    );

    await this.transitionModel.create({
      receiptId,
      fromStatus: receipt.status,
      toStatus: ReceiptStatus.MODIFIED,
      operator,
      reason: modifications.manualReason,
      metadata: {
        originalConfirmedAmount: receipt.confirmedAmount,
        newConfirmedAmount: modifications.confirmedAmount,
        originalDeductionAmount: receipt.deductionAmount,
        newDeductionAmount: modifications.deductionAmount
      }
    });

    logger.info(`回执 ${receiptId} 已人工改判，理由: ${modifications.manualReason}`);
    return updated!;
  }

  async freezeReceipt(receiptId: string, operator: Operator, reason: string): Promise<ReconciliationReceipt> {
    const receipt = await this.getReceiptOrThrow(receiptId);

    if (receipt.status === ReceiptStatus.FROZEN) {
      logger.warn(`回执 ${receiptId} 已处于冻结状态`);
      return receipt;
    }

    if (!StateMachine.canFreeze(receipt.status)) {
      throw new Error(`当前状态 ${receipt.status} 不允许冻结`);
    }

    const updated = await this.receiptModel.freeze(receiptId, operator, reason);

    await this.transitionModel.create({
      receiptId,
      fromStatus: receipt.status,
      toStatus: ReceiptStatus.FROZEN,
      operator,
      reason,
      metadata: {
        statusBeforeFrozen: receipt.status
      }
    });

    logger.info(`回执 ${receiptId} 已冻结，冻结前状态: ${receipt.status}`);
    return updated!;
  }

  async unfreezeReceipt(receiptId: string, operator: Operator, reason: string, targetStatus?: ReceiptStatus): Promise<ReconciliationReceipt> {
    const receipt = await this.getReceiptOrThrow(receiptId);

    if (receipt.status !== ReceiptStatus.FROZEN) {
      throw new Error('只有冻结状态的记录可以解冻');
    }

    const restoreStatus = targetStatus || receipt.statusBeforeFrozen || ReceiptStatus.DRAFT;
    
    StateMachine.validateTransition(ReceiptStatus.FROZEN, restoreStatus, receiptId);

    const updated = await this.receiptModel.unfreeze(receiptId, operator, reason, restoreStatus);

    await this.transitionModel.create({
      receiptId,
      fromStatus: ReceiptStatus.FROZEN,
      toStatus: restoreStatus,
      operator,
      reason,
      metadata: {
        unfreezeTo: restoreStatus
      }
    });

    logger.info(`回执 ${receiptId} 已解冻，恢复状态: ${restoreStatus}`);
    return updated!;
  }

  async withdrawReceipt(receiptId: string, operator: Operator, reason: string): Promise<ReconciliationReceipt> {
    const receipt = await this.getReceiptOrThrow(receiptId);
    
    this.ensureNotFrozen(receipt, '撤回');

    if (!StateMachine.canWithdraw(receipt.status)) {
      throw new Error(`当前状态 ${receipt.status} 不允许撤回`);
    }

    StateMachine.validateTransition(receipt.status, ReceiptStatus.WITHDRAWN, receiptId);

    const updated = await this.receiptModel.updateStatus(
      receiptId,
      ReceiptStatus.WITHDRAWN,
      operator,
      reason
    );

    await this.transitionModel.create({
      receiptId,
      fromStatus: receipt.status,
      toStatus: ReceiptStatus.WITHDRAWN,
      operator,
      reason
    });

    logger.info(`回执 ${receiptId} 已撤回`);
    return updated!;
  }

  async resubmitAfterWithdraw(receiptId: string, operator: Operator, reason: string = '撤回后重新提交'): Promise<ReconciliationReceipt> {
    const receipt = await this.getReceiptOrThrow(receiptId);
    
    this.ensureNotFrozen(receipt, '重新提交');

    if (receipt.status !== ReceiptStatus.WITHDRAWN) {
      throw new Error('只有已撤回状态的记录可以重新提交');
    }

    StateMachine.validateTransition(receipt.status, ReceiptStatus.SUBMITTED, receiptId);

    const updated = await this.receiptModel.updateStatus(
      receiptId,
      ReceiptStatus.SUBMITTED,
      operator,
      reason
    );

    await this.transitionModel.create({
      receiptId,
      fromStatus: receipt.status,
      toStatus: ReceiptStatus.SUBMITTED,
      operator,
      reason
    });

    logger.info(`回执 ${receiptId} 已撤回后重新提交`);
    return updated!;
  }

  async archiveReceipt(receiptId: string, operator: Operator, reason: string = '归档'): Promise<ReconciliationReceipt> {
    const receipt = await this.getReceiptOrThrow(receiptId);

    if (!StateMachine.canArchive(receipt.status)) {
      throw new Error(`当前状态 ${receipt.status} 不允许归档`);
    }

    StateMachine.validateTransition(receipt.status, ReceiptStatus.ARCHIVED, receiptId);

    const updated = await this.receiptModel.updateStatus(
      receiptId,
      ReceiptStatus.ARCHIVED,
      operator,
      reason,
      { archivedBy: operator }
    );

    await this.transitionModel.create({
      receiptId,
      fromStatus: receipt.status,
      toStatus: ReceiptStatus.ARCHIVED,
      operator,
      reason
    });

    logger.info(`回执 ${receiptId} 已归档`);
    return updated!;
  }

  async uploadAttachment(
    receiptId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer?: Buffer;
      path?: string;
    },
    operator: Operator,
    description?: string
  ): Promise<Attachment> {
    const receipt = await this.getReceiptOrThrow(receiptId);

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExt = path.extname(file.originalname);
    const storagePath = path.join(uploadDir, `${uuidv4()}${fileExt}`);

    if (file.buffer) {
      fs.writeFileSync(storagePath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, storagePath);
    }

    const attachment = await this.attachmentModel.create({
      receiptId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      storagePath,
      uploadedBy: operator,
      description
    });

    logger.info(`已为回执 ${receiptId} 上传附件: ${file.originalname}`);
    return attachment;
  }

  async getReceiptDetail(receiptId: string): Promise<{
    receipt: ReconciliationReceipt;
    transitions: StatusTransition[];
    evidences: OriginalEvidence[];
    attachments: Attachment[];
  }> {
    const receipt = await this.getReceiptOrThrow(receiptId);
    const transitions = await this.transitionModel.findByReceiptId(receiptId);
    const evidences = await this.evidenceModel.findByReceiptId(receiptId);
    const attachments = await this.attachmentModel.findByReceiptId(receiptId);

    return { receipt, transitions, evidences, attachments };
  }

  async listReceipts(filters?: {
    supplierId?: string;
    status?: ReceiptStatus;
    batchNo?: string;
  }): Promise<ReconciliationReceipt[]> {
    return this.receiptModel.findAll(filters);
  }

  private async getReceiptOrThrow(receiptId: string): Promise<ReconciliationReceipt> {
    const receipt = await this.receiptModel.findById(receiptId);
    if (!receipt) {
      throw new ReceiptNotFoundError(receiptId);
    }
    return receipt;
  }

  private ensureNotFrozen(receipt: ReconciliationReceipt, action: string): void {
    if (receipt.status === ReceiptStatus.FROZEN) {
      throw new FrozenReceiptError(receipt.id, action);
    }
  }
}
