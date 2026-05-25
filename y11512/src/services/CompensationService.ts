import { AppDataSource } from '../config/database';
import { CompensationRecord, CompensationType, CompensationStatus } from '../entities/CompensationRecord';
import { BorrowApplication } from '../entities/BorrowApplication';
import { QueueService } from './QueueService';
import { PayloadType } from '../entities/RetryQueue';
import { AuditLogService } from './AuditLogService';
import { OperationType, EntityType } from '../entities/OperationLog';
import { v4 as uuidv4 } from 'uuid';

export interface CreateCompensationData {
  applicationId: string;
  compensationType: CompensationType;
  amount: number;
  reason?: string;
  evidence?: string;
  rawData?: any;
  batchId?: string;
}

export interface PaymentData {
  recordId: string;
  amount: number;
  paymentMethod: string;
  paymentReference?: string;
}

export class CompensationService {
  private static repository = AppDataSource.getRepository(CompensationRecord);
  private static applicationRepository = AppDataSource.getRepository(BorrowApplication);

  static generateRecordNo(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = uuidv4().slice(0, 6).toUpperCase();
    return `COMP-${dateStr}-${random}`;
  }

  static async createCompensationRecord(
    data: CreateCompensationData,
    operatorId?: string,
    operatorName?: string
  ): Promise<CompensationRecord> {
    const application = await this.applicationRepository.findOne({
      where: { id: data.applicationId }
    });

    if (!application) {
      throw new Error('借阅申请不存在');
    }

    const record = this.repository.create({
      recordNo: this.generateRecordNo(),
      ...data,
      status: CompensationStatus.PENDING,
      paidAmount: 0,
      createdBy: operatorId
    });

    const saved = await this.repository.save(record);

    if (data.compensationType === CompensationType.OVERDUE) {
      application.overdueFee += data.amount;
    } else if (data.compensationType === CompensationType.DAMAGE || data.compensationType === CompensationType.LOST) {
      application.damageFee += data.amount;
    }
    application.totalFee = application.overdueFee + application.damageFee + application.shippingFee;
    application.version += 1;

    if (data.compensationType === CompensationType.DAMAGE || data.compensationType === CompensationType.LOST) {
      application.isDamaged = true;
    }
    await this.applicationRepository.save(application);

    await AuditLogService.log(
      OperationType.CREATE,
      EntityType.COMPENSATION_RECORD,
      saved.id,
      {
        entityNo: saved.recordNo,
        afterData: saved,
        operatorId,
        operatorName,
        remark: `创建赔偿记录: ${data.compensationType}`,
        batchId: data.batchId
      }
    );

    await QueueService.enqueue({
      applicationId: data.applicationId,
      payloadType: PayloadType.COMPENSATION_RECORD,
      payload: {
        action: 'create',
        recordNo: saved.recordNo,
        type: data.compensationType,
        amount: data.amount
      },
      batchId: data.batchId,
      operatorId,
      operatorName
    });

    return saved;
  }

  static async confirmCompensation(
    recordId: string,
    operatorId: string,
    operatorName: string
  ): Promise<CompensationRecord> {
    const record = await this.repository.findOne({ where: { id: recordId } });
    if (!record) {
      throw new Error('赔偿记录不存在');
    }

    const beforeData = { ...record };
    record.status = CompensationStatus.CONFIRMED;
    record.confirmTime = new Date();
    record.updatedBy = operatorId;
    await this.repository.save(record);

    await AuditLogService.log(
      OperationType.STATUS_CHANGE,
      EntityType.COMPENSATION_RECORD,
      record.id,
      {
        entityNo: record.recordNo,
        beforeData,
        afterData: record,
        changes: { status: CompensationStatus.CONFIRMED },
        operatorId,
        operatorName,
        remark: '确认赔偿记录'
      }
    );

    return record;
  }

  static async processPayment(
    paymentData: PaymentData,
    operatorId: string,
    operatorName: string
  ): Promise<CompensationRecord> {
    const record = await this.repository.findOne({ where: { id: paymentData.recordId } });
    if (!record) {
      throw new Error('赔偿记录不存在');
    }

    if (record.status === CompensationStatus.CANCELLED || record.status === CompensationStatus.WAIVED) {
      throw new Error('该记录状态不允许支付');
    }

    const beforeData = { ...record };
    record.paidAmount += paymentData.amount;
    record.paymentMethod = paymentData.paymentMethod;
    record.paymentReference = paymentData.paymentReference;
    record.paidTime = new Date();

    if (record.paidAmount >= record.amount) {
      record.status = CompensationStatus.PAID;
    }

    record.updatedBy = operatorId;
    await this.repository.save(record);

    await AuditLogService.log(
      OperationType.COMPENSATE,
      EntityType.COMPENSATION_RECORD,
      record.id,
      {
        entityNo: record.recordNo,
        beforeData,
        afterData: record,
        changes: {
          paidAmount: record.paidAmount,
          paymentMethod: paymentData.paymentMethod,
          status: record.status
        },
        operatorId,
        operatorName,
        remark: `赔偿支付: ${paymentData.amount}元`
      }
    );

    return record;
  }

  static async waiveCompensation(
    recordId: string,
    reason: string,
    operatorId: string,
    operatorName: string
  ): Promise<CompensationRecord> {
    const record = await this.repository.findOne({ where: { id: recordId } });
    if (!record) {
      throw new Error('赔偿记录不存在');
    }

    const beforeData = { ...record };
    record.status = CompensationStatus.WAIVED;
    record.updatedBy = operatorId;
    await this.repository.save(record);

    await AuditLogService.log(
      OperationType.FEE_ADJUST,
      EntityType.COMPENSATION_RECORD,
      record.id,
      {
        entityNo: record.recordNo,
        beforeData,
        afterData: record,
        changes: { status: CompensationStatus.WAIVED, reason },
        operatorId,
        operatorName,
        remark: `豁免赔偿: ${reason}`
      }
    );

    return record;
  }

  static async getCompensationRecordsByApplication(applicationId: string): Promise<CompensationRecord[]> {
    return await this.repository.find({
      where: { applicationId },
      order: { createdAt: 'DESC' }
    });
  }

  static async getCompensationRecordById(id: string): Promise<CompensationRecord> {
    const record = await this.repository.findOne({ where: { id } });
    if (!record) {
      throw new Error('赔偿记录不存在');
    }
    return record;
  }
}
