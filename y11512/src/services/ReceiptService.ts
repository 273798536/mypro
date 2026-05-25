import { AppDataSource } from '../config/database';
import { BorrowApplication, BorrowStatus } from '../entities/BorrowApplication';
import { ExpressOrder, ExpressStatus } from '../entities/ExpressOrder';
import { CompensationRecord, CompensationType, CompensationStatus } from '../entities/CompensationRecord';
import { QueueService } from './QueueService';
import { PayloadType } from '../entities/RetryQueue';
import { FeeCalculationService } from './FeeCalculationService';
import { AuditLogService } from './AuditLogService';
import { OperationType, EntityType } from '../entities/OperationLog';
import { v4 as uuidv4 } from 'uuid';

export interface ExternalReceiptData {
  applicationNo: string;
  receiptType: 'express' | 'compensation' | 'status_update';
  externalReference: string;
  timestamp: string;
  data: any;
  operatorId?: string;
  operatorName?: string;
}

export interface ReceiptProcessResult {
  success: boolean;
  applicationId: string;
  applicationNo: string;
  action: string;
  details?: any;
  error?: string;
}

export class ReceiptService {
  private static applicationRepository = AppDataSource.getRepository(BorrowApplication);
  private static expressRepository = AppDataSource.getRepository(ExpressOrder);
  private static compensationRepository = AppDataSource.getRepository(CompensationRecord);

  static async submitExternalReceipt(
    receipt: ExternalReceiptData
  ): Promise<ReceiptProcessResult> {
    const application = await this.applicationRepository.findOne({
      where: { applicationNo: receipt.applicationNo }
    });

    if (!application) {
      throw new Error(`申请编号 ${receipt.applicationNo} 不存在`);
    }

    const taskId = uuidv4();

    await QueueService.enqueue({
      applicationId: application.id,
      payloadType: PayloadType.EXTERNAL_RECEIPT,
      payload: {
        taskId,
        receiptType: receipt.receiptType,
        externalReference: receipt.externalReference,
        timestamp: receipt.timestamp,
        data: receipt.data
      },
      externalReference: receipt.externalReference,
      operatorId: receipt.operatorId,
      operatorName: receipt.operatorName
    });

    await AuditLogService.log(
      OperationType.IMPORT,
      EntityType.BORROW_APPLICATION,
      application.id,
      {
        entityNo: application.applicationNo,
        changes: {
          receiptType: receipt.receiptType,
          externalReference: receipt.externalReference
        },
        operatorId: receipt.operatorId,
        operatorName: receipt.operatorName,
        remark: `提交外部回执: ${receipt.receiptType}`
      }
    );

    return {
      success: true,
      applicationId: application.id,
      applicationNo: receipt.applicationNo,
      action: 'queued',
      details: { taskId, receiptType: receipt.receiptType }
    };
  }

  static async processExpressReceipt(
    applicationId: string,
    data: any,
    operatorId?: string,
    operatorName?: string
  ): Promise<ReceiptProcessResult> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId }
    });

    if (!application) {
      return {
        success: false,
        applicationId,
        applicationNo: '',
        action: 'failed',
        error: '申请不存在'
      };
    }

    const expressNo = data.expressNo || `EXT-${Date.now()}`;
    const existingExpress = await this.expressRepository.findOne({
      where: { expressNo }
    });

    if (existingExpress) {
      await this.expressRepository.save({
        ...existingExpress,
        status: data.status || existingExpress.status,
        trackingInfo: data.trackingInfo || existingExpress.trackingInfo,
        updatedBy: operatorId
      });

      return {
        success: true,
        applicationId,
        applicationNo: application.applicationNo,
        action: 'updated',
        details: { expressNo, status: data.status }
      };
    }

    const order = this.expressRepository.create({
      expressNo,
      applicationId,
      expressType: data.expressType || 'forward',
      courierCompany: data.courierCompany || '未知',
      receiver: data.receiver || application.readerName,
      receiverPhone: data.receiverPhone || '',
      receiverAddress: data.receiverAddress || '',
      fee: data.fee || 0,
      sender: data.sender,
      senderPhone: data.senderPhone,
      senderAddress: data.senderAddress,
      trackingInfo: data.trackingInfo,
      status: data.status || ExpressStatus.CREATED,
      externalReference: data.externalReference,
      createdBy: operatorId
    });

    const saved = await this.expressRepository.save(order);

    if (data.fee) {
      application.shippingFee += data.fee;
      application.totalFee = application.overdueFee + application.damageFee + application.shippingFee;
      application.version += 1;
      await this.applicationRepository.save(application);
    }

    await AuditLogService.log(
      OperationType.CREATE,
      EntityType.EXPRESS_ORDER,
      saved.id,
      {
        entityNo: saved.expressNo,
        afterData: saved,
        operatorId,
        operatorName,
        remark: '外部回执创建快递单'
      }
    );

    return {
      success: true,
      applicationId,
      applicationNo: application.applicationNo,
      action: 'created',
      details: { expressNo, id: saved.id }
    };
  }

  static async processCompensationReceipt(
    applicationId: string,
    data: any,
    operatorId?: string,
    operatorName?: string
  ): Promise<ReceiptProcessResult> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId }
    });

    if (!application) {
      return {
        success: false,
        applicationId,
        applicationNo: '',
        action: 'failed',
        error: '申请不存在'
      };
    }

    const recordNo = data.recordNo || `COMP-${Date.now()}`;
    const compensationType = data.compensationType as CompensationType || CompensationType.OTHER;
    const amount = data.amount || 0;

    const record = this.compensationRepository.create({
      recordNo,
      applicationId,
      compensationType,
      amount,
      reason: data.reason,
      evidence: data.evidence,
      status: CompensationStatus.PENDING,
      paidAmount: 0,
      rawData: data,
      createdBy: operatorId
    });

    const saved = await this.compensationRepository.save(record);

    if (compensationType === CompensationType.OVERDUE) {
      application.overdueFee += amount;
    } else {
      application.damageFee += amount;
      if (compensationType === CompensationType.DAMAGE || compensationType === CompensationType.LOST) {
        application.isDamaged = true;
      }
    }
    application.totalFee = application.overdueFee + application.damageFee + application.shippingFee;
    application.version += 1;
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
        remark: '外部回执创建赔偿记录'
      }
    );

    return {
      success: true,
      applicationId,
      applicationNo: application.applicationNo,
      action: 'created',
      details: { recordNo, id: saved.id, compensationType, amount }
    };
  }

  static async processStatusUpdateReceipt(
    applicationId: string,
    data: any,
    operatorId?: string,
    operatorName?: string
  ): Promise<ReceiptProcessResult> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId }
    });

    if (!application) {
      return {
        success: false,
        applicationId,
        applicationNo: '',
        action: 'failed',
        error: '申请不存在'
      };
    }

    const beforeData = { ...application };
    const newStatus = data.status as BorrowStatus;
    const validStatuses = Object.values(BorrowStatus);

    if (!validStatuses.includes(newStatus)) {
      return {
        success: false,
        applicationId,
        applicationNo: application.applicationNo,
        action: 'failed',
        error: `无效状态: ${data.status}`
      };
    }

    application.status = newStatus;
    if (data.borrowDate) application.borrowDate = new Date(data.borrowDate);
    if (data.dueDate) application.dueDate = new Date(data.dueDate);
    if (data.returnDate) application.returnDate = new Date(data.returnDate);
    if (data.renewalCount) application.renewalCount = data.renewalCount;
    if (typeof data.isOverdue === 'boolean') application.isOverdue = data.isOverdue;
    if (typeof data.isDamaged === 'boolean') application.isDamaged = data.isDamaged;
    application.updatedBy = operatorId;
    application.version += 1;

    await this.applicationRepository.save(application);

    await AuditLogService.log(
      OperationType.STATUS_CHANGE,
      EntityType.BORROW_APPLICATION,
      application.id,
      {
        entityNo: application.applicationNo,
        beforeData,
        afterData: application,
        changes: { status: newStatus },
        operatorId,
        operatorName,
        remark: `外部回执更新状态: ${newStatus}`
      }
    );

    return {
      success: true,
      applicationId,
      applicationNo: application.applicationNo,
      action: 'updated',
      details: { status: newStatus, version: application.version }
    };
  }

  static async processReceiptPayload(
    applicationId: string,
    payload: any,
    operatorId?: string,
    operatorName?: string
  ): Promise<ReceiptProcessResult> {
    switch (payload.receiptType) {
      case 'express':
        return this.processExpressReceipt(applicationId, payload.data, operatorId, operatorName);
      case 'compensation':
        return this.processCompensationReceipt(applicationId, payload.data, operatorId, operatorName);
      case 'status_update':
        return this.processStatusUpdateReceipt(applicationId, payload.data, operatorId, operatorName);
      default:
        return {
          success: false,
          applicationId,
          applicationNo: '',
          action: 'failed',
          error: `未知回执类型: ${payload.receiptType}`
        };
    }
  }

  static async calculateAndRecordFees(
    applicationId: string,
    operatorId: string,
    operatorName: string
  ): Promise<ReceiptProcessResult> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['expressOrders', 'compensationRecords', 'supervisorComments']
    });

    if (!application) {
      return {
        success: false,
        applicationId,
        applicationNo: '',
        action: 'failed',
        error: '申请不存在'
      };
    }

    const expressOrders = await this.expressRepository.find({
      where: { applicationId }
    });

    const compensationRecords = await this.compensationRepository.find({
      where: { applicationId }
    });

    const feeResult = await FeeCalculationService.calculateTotalFee(
      application,
      expressOrders,
      compensationRecords,
      application.supervisorComments || []
    );

    const beforeData = { ...application };
    application.overdueFee = feeResult.overdueFee;
    application.damageFee = feeResult.damageFee;
    application.shippingFee = feeResult.shippingFee;
    application.totalFee = feeResult.totalFee;
    application.updatedBy = operatorId;
    application.version += 1;
    await this.applicationRepository.save(application);

    await AuditLogService.log(
      OperationType.FEE_ADJUST,
      EntityType.BORROW_APPLICATION,
      application.id,
      {
        entityNo: application.applicationNo,
        beforeData,
        afterData: application,
        changes: {
          overdueFee: feeResult.overdueFee,
          damageFee: feeResult.damageFee,
          shippingFee: feeResult.shippingFee,
          totalFee: feeResult.totalFee,
          breakdown: feeResult.breakdown
        },
        operatorId,
        operatorName,
        remark: '费用重新计算'
      }
    );

    await QueueService.enqueue({
      applicationId,
      payloadType: PayloadType.FEE_CALCULATION,
      payload: {
        action: 'recalculate',
        result: {
          overdueFee: feeResult.overdueFee,
          damageFee: feeResult.damageFee,
          shippingFee: feeResult.shippingFee,
          totalFee: feeResult.totalFee
        }
      },
      operatorId,
      operatorName
    });

    return {
      success: true,
      applicationId,
      applicationNo: application.applicationNo,
      action: 'fees_recalculated',
      details: feeResult
    };
  }
}
