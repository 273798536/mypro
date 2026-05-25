import { AppDataSource } from '../config/database';
import { ExpressOrder, ExpressStatus, ExpressType } from '../entities/ExpressOrder';
import { BorrowApplication } from '../entities/BorrowApplication';
import { QueueService } from './QueueService';
import { PayloadType } from '../entities/RetryQueue';
import { AuditLogService } from './AuditLogService';
import { OperationType, EntityType } from '../entities/OperationLog';

export interface CreateExpressOrderData {
  expressNo: string;
  applicationId: string;
  expressType: ExpressType;
  courierCompany: string;
  receiver: string;
  receiverPhone: string;
  receiverAddress: string;
  fee: number;
  sender?: string;
  senderPhone?: string;
  senderAddress?: string;
  rawData?: any;
  externalReference?: string;
  batchId?: string;
}

export class ExpressOrderService {
  private static repository = AppDataSource.getRepository(ExpressOrder);
  private static applicationRepository = AppDataSource.getRepository(BorrowApplication);

  static async createExpressOrder(
    data: CreateExpressOrderData,
    operatorId?: string,
    operatorName?: string
  ): Promise<ExpressOrder> {
    const application = await this.applicationRepository.findOne({
      where: { id: data.applicationId }
    });

    if (!application) {
      throw new Error('借阅申请不存在');
    }

    const existing = await this.repository.findOne({
      where: { expressNo: data.expressNo }
    });

    if (existing) {
      throw new Error(`快递单号 ${data.expressNo} 已存在`);
    }

    const order = this.repository.create({
      ...data,
      status: ExpressStatus.CREATED,
      createdBy: operatorId
    });

    const saved = await this.repository.save(order);

    application.shippingFee += data.fee;
    application.totalFee = application.overdueFee + application.damageFee + application.shippingFee;
    application.version += 1;
    await this.applicationRepository.save(application);

    await AuditLogService.log(
      OperationType.CREATE,
      EntityType.EXPRESS_ORDER,
      saved.id,
      {
        entityNo: saved.expressNo,
        afterData: saved,
        operatorId,
        operatorName,
        remark: '创建快递单',
        batchId: data.batchId
      }
    );

    await QueueService.enqueue({
      applicationId: data.applicationId,
      payloadType: PayloadType.EXPRESS_ORDER,
      payload: { action: 'create', expressNo: data.expressNo, fee: data.fee },
      batchId: data.batchId,
      externalReference: data.externalReference,
      operatorId,
      operatorName
    });

    return saved;
  }

  static async updateExpressStatus(
    expressId: string,
    status: ExpressStatus,
    trackingInfo?: string,
    operatorId?: string,
    operatorName?: string
  ): Promise<ExpressOrder> {
    const order = await this.repository.findOne({ where: { id: expressId } });
    if (!order) {
      throw new Error('快递单不存在');
    }

    const beforeData = { ...order };
    order.status = status;
    order.trackingInfo = trackingInfo || order.trackingInfo;
    order.updatedBy = operatorId;

    if (status === ExpressStatus.SHIPPED) {
      order.shipTime = new Date();
    } else if (status === ExpressStatus.DELIVERED) {
      order.deliverTime = new Date();
    }

    await this.repository.save(order);

    await AuditLogService.log(
      OperationType.STATUS_CHANGE,
      EntityType.EXPRESS_ORDER,
      order.id,
      {
        entityNo: order.expressNo,
        beforeData,
        afterData: order,
        changes: { status },
        operatorId,
        operatorName,
        remark: `更新快递状态: ${status}`
      }
    );

    return order;
  }

  static async getExpressOrdersByApplication(applicationId: string): Promise<ExpressOrder[]> {
    return await this.repository.find({
      where: { applicationId },
      order: { createdAt: 'DESC' }
    });
  }

  static async getExpressOrderById(id: string): Promise<ExpressOrder> {
    const order = await this.repository.findOne({ where: { id } });
    if (!order) {
      throw new Error('快递单不存在');
    }
    return order;
  }
}
