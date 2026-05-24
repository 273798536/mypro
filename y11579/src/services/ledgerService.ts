import {
  Ledger,
  LedgerStatus,
  DeliveryNote,
  ReworkRecord,
  DeductionDetail,
  HandoverPaper,
  SmsEvidence,
  Role,
  BatchStrategy,
  ProcessResult
} from '../types';
import {
  LedgerRepository,
  DeliveryNoteRepository,
  ReworkRecordRepository,
  DeductionDetailRepository,
  HandoverPaperRepository,
  SmsEvidenceRepository,
  ChangeHistoryRepository,
  LedgerSnapshotRepository
} from '../db/repositories';
import { compareObjects, generateDiffSummary } from '../utils/diff';
import { logger } from '../utils/logger';

export interface CreateLedgerData {
  batchNo: string;
  deliveryNotes: Omit<DeliveryNote, 'id' | 'createdAt' | 'updatedAt'>[];
  reworkRecords: Omit<ReworkRecord, 'id' | 'createdAt' | 'updatedAt'>[];
  deductionDetails: Omit<DeductionDetail, 'id' | 'createdAt' | 'updatedAt'>[];
  handoverPapers?: Omit<HandoverPaper, 'id' | 'createdAt' | 'updatedAt'>[];
  smsEvidences?: Omit<SmsEvidence, 'id' | 'createdAt'>[];
}

export class LedgerService {
  static async getFullLedger(ledgerId: string): Promise<Ledger | null> {
    const ledger = await LedgerRepository.findById(ledgerId);
    if (!ledger) return null;
    
    ledger.deliveryNotes = await DeliveryNoteRepository.findByLedgerId(ledgerId);
    ledger.reworkRecords = await ReworkRecordRepository.findByLedgerId(ledgerId);
    ledger.deductionDetails = await DeductionDetailRepository.findByLedgerId(ledgerId);
    ledger.handoverPapers = await HandoverPaperRepository.findByLedgerId(ledgerId);
    ledger.smsEvidences = await SmsEvidenceRepository.findByLedgerId(ledgerId);
    
    return ledger;
  }

  private static async getFullLedgerOrThrow(ledgerId: string): Promise<Ledger> {
    const ledger = await this.getFullLedger(ledgerId);
    if (!ledger) throw new Error('台账不存在');
    return ledger;
  }

  static async createLedger(
    data: CreateLedgerData,
    userId: string,
    userRole: Role
  ): Promise<Ledger> {
    const existingLedger = await LedgerRepository.findByBatchNo(data.batchNo);
    if (existingLedger) {
      throw new Error(`批次号 ${data.batchNo} 已存在`);
    }
    
    const ledger = await LedgerRepository.create({
      batchNo: data.batchNo,
      status: LedgerStatus.DRAFT,
      createdBy: userId,
      createdByRole: userRole,
      sensitiveFieldsMasked: false,
      deliveryNotes: [],
      reworkRecords: [],
      deductionDetails: [],
      handoverPapers: [],
      smsEvidences: []
    });
    
    await this.saveRelations(ledger.id, data);
    
    logger.info(`创建台账成功: ${ledger.batchNo}, 创建人: ${userId}`);
    return this.getFullLedgerOrThrow(ledger.id);
  }

  static async processBatch(
    data: CreateLedgerData,
    userId: string,
    userRole: Role,
    strategy: BatchStrategy
  ): Promise<{ ledger: Ledger; action: string }> {
    const existingLedger = await LedgerRepository.findByBatchNo(data.batchNo);
    
    if (!existingLedger) {
      return {
        ledger: await this.createLedger(data, userId, userRole),
        action: 'created'
      };
    }
    
    switch (strategy) {
      case BatchStrategy.IGNORE:
        logger.info(`批次 ${data.batchNo} 已存在，忽略处理`);
        return {
          ledger: await this.getFullLedgerOrThrow(existingLedger.id),
          action: 'ignored'
        };
        
      case BatchStrategy.OVERWRITE:
        return {
          ledger: await this.overwriteLedger(existingLedger.id, data, userId, userRole),
          action: 'overwritten'
        };
        
      case BatchStrategy.APPEND:
        return {
          ledger: await this.appendToLedger(existingLedger.id, data, userId, userRole),
          action: 'appended'
        };
        
      default:
        throw new Error(`未知的批次处理策略: ${strategy}`);
    }
  }

  static async overwriteLedger(
    ledgerId: string,
    data: CreateLedgerData,
    userId: string,
    userRole: Role
  ): Promise<Ledger> {
    const ledger = await LedgerRepository.findById(ledgerId);
    if (!ledger) throw new Error('台账不存在');
    
    await this.createSnapshot(ledgerId, 'before', 'overwrite', userId);
    const oldData = await this.getFullLedgerOrThrow(ledgerId);
    
    await DeliveryNoteRepository.deleteByLedgerId(ledgerId);
    await ReworkRecordRepository.deleteByLedgerId(ledgerId);
    await DeductionDetailRepository.deleteByLedgerId(ledgerId);
    await HandoverPaperRepository.deleteByLedgerId(ledgerId);
    
    await this.saveRelations(ledgerId, data);
    
    const newData = await this.getFullLedgerOrThrow(ledgerId);
    await this.recordChanges(ledgerId, oldData, newData, userId, userRole, '覆盖更新批次数据');
    await this.createSnapshot(ledgerId, 'after', 'overwrite', userId);
    
    logger.info(`覆盖更新台账成功: ${data.batchNo}`);
    return newData;
  }

  static async appendToLedger(
    ledgerId: string,
    data: CreateLedgerData,
    userId: string,
    userRole: Role
  ): Promise<Ledger> {
    const ledger = await LedgerRepository.findById(ledgerId);
    if (!ledger) throw new Error('台账不存在');
    
    await this.createSnapshot(ledgerId, 'before', 'append', userId);
    const oldData = await this.getFullLedgerOrThrow(ledgerId);
    
    await this.saveRelations(ledgerId, data);
    
    const newData = await this.getFullLedgerOrThrow(ledgerId);
    await this.recordChanges(ledgerId, oldData, newData, userId, userRole, '追加批次数据');
    await this.createSnapshot(ledgerId, 'after', 'append', userId);
    
    logger.info(`追加台账数据成功: ${data.batchNo}`);
    return newData;
  }

  static async submit(ledgerId: string, userId: string, userRole: Role): Promise<Ledger> {
    const ledger = await LedgerRepository.findById(ledgerId);
    if (!ledger) throw new Error('台账不存在');
    
    if (ledger.status !== LedgerStatus.DRAFT && ledger.status !== LedgerStatus.REJECTED) {
      throw new Error('只有草稿或驳回状态的台账才能提交');
    }
    
    await this.createSnapshot(ledgerId, 'before', 'submit', userId);
    const oldData = await this.getFullLedgerOrThrow(ledgerId);
    
    const now = new Date().toISOString();
    await LedgerRepository.update(ledgerId, {
      status: LedgerStatus.SUBMITTED,
      submittedAt: now
    });
    
    const newData = await this.getFullLedgerOrThrow(ledgerId);
    await this.recordChanges(ledgerId, oldData, newData, userId, userRole, '提交台账');
    await this.createSnapshot(ledgerId, 'after', 'submit', userId);
    
    logger.info(`台账提交成功: ${ledger.batchNo}, 提交人: ${userId}`);
    return newData;
  }

  static async reject(ledgerId: string, reason: string, userId: string, userRole: Role): Promise<Ledger> {
    const ledger = await LedgerRepository.findById(ledgerId);
    if (!ledger) throw new Error('台账不存在');
    
    if (ledger.status !== LedgerStatus.SUBMITTED) {
      throw new Error('只有已提交状态的台账才能驳回');
    }
    
    await this.createSnapshot(ledgerId, 'before', 'reject', userId);
    const oldData = await this.getFullLedgerOrThrow(ledgerId);
    
    await LedgerRepository.update(ledgerId, {
      status: LedgerStatus.REJECTED,
      rejectReason: reason
    });
    
    const newData = await this.getFullLedgerOrThrow(ledgerId);
    await this.recordChanges(ledgerId, oldData, newData, userId, userRole, `驳回台账: ${reason}`);
    await this.createSnapshot(ledgerId, 'after', 'reject', userId);
    
    logger.info(`台账驳回成功: ${ledger.batchNo}, 原因: ${reason}`);
    return newData;
  }

  static async confirm(ledgerId: string, userId: string, userRole: Role): Promise<Ledger> {
    const ledger = await LedgerRepository.findById(ledgerId);
    if (!ledger) throw new Error('台账不存在');
    
    if (ledger.status !== LedgerStatus.SUBMITTED) {
      throw new Error('只有已提交状态的台账才能确认');
    }
    
    await this.createSnapshot(ledgerId, 'before', 'confirm', userId);
    const oldData = await this.getFullLedgerOrThrow(ledgerId);
    
    const now = new Date().toISOString();
    await LedgerRepository.update(ledgerId, {
      status: LedgerStatus.CONFIRMED,
      confirmedAt: now
    });
    
    const newData = await this.getFullLedgerOrThrow(ledgerId);
    await this.recordChanges(ledgerId, oldData, newData, userId, userRole, '确认台账');
    await this.createSnapshot(ledgerId, 'after', 'confirm', userId);
    
    logger.info(`台账确认成功: ${ledger.batchNo}`);
    return newData;
  }

  static async setAuditMode(ledgerId: string, userId: string, userRole: Role): Promise<Ledger> {
    const ledger = await LedgerRepository.findById(ledgerId);
    if (!ledger) throw new Error('台账不存在');
    
    await this.createSnapshot(ledgerId, 'before', 'audit', userId);
    const oldData = await this.getFullLedgerOrThrow(ledgerId);
    
    await LedgerRepository.update(ledgerId, {
      status: LedgerStatus.AUDIT,
      sensitiveFieldsMasked: true
    });
    
    const newData = await this.getFullLedgerOrThrow(ledgerId);
    await this.recordChanges(ledgerId, oldData, newData, userId, userRole, '设置审计模式');
    await this.createSnapshot(ledgerId, 'after', 'audit', userId);
    
    logger.info(`台账设置审计模式: ${ledger.batchNo}`);
    return newData;
  }

  static async setProcessResult(
    ledgerId: string,
    result: ProcessResult,
    message: string,
    userId: string,
    userRole: Role
  ): Promise<Ledger> {
    const ledger = await LedgerRepository.findById(ledgerId);
    if (!ledger) throw new Error('台账不存在');
    
    const oldData = await this.getFullLedgerOrThrow(ledgerId);
    
    await LedgerRepository.update(ledgerId, {
      processResult: result,
      processMessage: message
    });
    
    const newData = await this.getFullLedgerOrThrow(ledgerId);
    await this.recordChanges(ledgerId, oldData, newData, userId, userRole, `设置处理结果: ${result}`);
    
    logger.info(`台账处理结果设置: ${ledger.batchNo} -> ${result}`);
    return newData;
  }

  static async addHandoverPaper(
    ledgerId: string,
    paper: Omit<HandoverPaper, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string,
    userRole: Role
  ): Promise<Ledger> {
    const ledger = await LedgerRepository.findById(ledgerId);
    if (!ledger) throw new Error('台账不存在');
    
    await this.createSnapshot(ledgerId, 'before', 'add_handover', userId);
    const oldData = await this.getFullLedgerOrThrow(ledgerId);
    
    await HandoverPaperRepository.create(paper, ledgerId);
    
    const newData = await this.getFullLedgerOrThrow(ledgerId);
    await this.recordChanges(ledgerId, oldData, newData, userId, userRole, '追加门店交接纸');
    await this.createSnapshot(ledgerId, 'after', 'add_handover', userId);
    
    logger.info(`追加门店交接纸成功: ${ledger.batchNo}`);
    return newData;
  }

  static async addSmsEvidence(
    ledgerId: string,
    evidence: Omit<SmsEvidence, 'id' | 'createdAt'>,
    userId: string,
    userRole: Role
  ): Promise<Ledger> {
    const ledger = await LedgerRepository.findById(ledgerId);
    if (!ledger) throw new Error('台账不存在');
    
    const oldData = await this.getFullLedgerOrThrow(ledgerId);
    
    await SmsEvidenceRepository.create(evidence, ledgerId);
    
    const newData = await this.getFullLedgerOrThrow(ledgerId);
    await this.recordChanges(ledgerId, oldData, newData, userId, userRole, '追加短信证据');
    
    logger.info(`追加短信证据成功: ${ledger.batchNo}`);
    return newData;
  }

  private static async saveRelations(ledgerId: string, data: CreateLedgerData): Promise<void> {
    for (const note of data.deliveryNotes) {
      await DeliveryNoteRepository.create(note, ledgerId);
    }
    for (const record of data.reworkRecords) {
      await ReworkRecordRepository.create(record, ledgerId);
    }
    for (const detail of data.deductionDetails) {
      await DeductionDetailRepository.create(detail, ledgerId);
    }
    for (const paper of (data.handoverPapers || [])) {
      await HandoverPaperRepository.create(paper, ledgerId);
    }
    for (const evidence of (data.smsEvidences || [])) {
      await SmsEvidenceRepository.create(evidence, ledgerId);
    }
  }

  private static async createSnapshot(
    ledgerId: string,
    snapshotType: 'before' | 'after',
    action: string,
    userId: string
  ): Promise<void> {
    const ledger = await this.getFullLedger(ledgerId);
    if (!ledger) return;
    
    await LedgerSnapshotRepository.create({
      ledgerId,
      ledgerData: JSON.stringify(ledger),
      status: ledger.status,
      snapshotType,
      action,
      createdBy: userId
    });
  }

  private static async recordChanges(
    ledgerId: string,
    oldData: Ledger,
    newData: Ledger,
    userId: string,
    userRole: Role,
    reason: string
  ): Promise<void> {
    const oldSimple = {
      status: oldData.status,
      rejectReason: oldData.rejectReason,
      processResult: oldData.processResult,
      deliveryNoteCount: oldData.deliveryNotes.length,
      reworkRecordCount: oldData.reworkRecords.length,
      deductionCount: oldData.deductionDetails.length,
      handoverPaperCount: oldData.handoverPapers.length
    };
    
    const newSimple = {
      status: newData.status,
      rejectReason: newData.rejectReason,
      processResult: newData.processResult,
      deliveryNoteCount: newData.deliveryNotes.length,
      reworkRecordCount: newData.reworkRecords.length,
      deductionCount: newData.deductionDetails.length,
      handoverPaperCount: newData.handoverPapers.length
    };
    
    const diffs = compareObjects(oldSimple, newSimple);
    
    for (const diff of diffs) {
      await ChangeHistoryRepository.create({
        ledgerId,
        fieldName: diff.field,
        oldValue: JSON.stringify(diff.oldValue),
        newValue: JSON.stringify(diff.newValue),
        changedBy: userId,
        changedByRole: userRole,
        changeReason: reason,
        diffSummary: generateDiffSummary([diff])
      });
    }
  }

  static async getChangeHistory(ledgerId: string) {
    return ChangeHistoryRepository.findByLedgerId(ledgerId);
  }

  static async getSnapshots(ledgerId: string) {
    return LedgerSnapshotRepository.findByLedgerId(ledgerId);
  }

  static async getBeforeAfterSnapshots(ledgerId: string, action: string) {
    return LedgerSnapshotRepository.getBeforeAfterPair(ledgerId, action);
  }
}
