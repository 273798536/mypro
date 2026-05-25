"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressOrderService = void 0;
const database_1 = require("../config/database");
const ExpressOrder_1 = require("../entities/ExpressOrder");
const BorrowApplication_1 = require("../entities/BorrowApplication");
const QueueService_1 = require("./QueueService");
const RetryQueue_1 = require("../entities/RetryQueue");
const AuditLogService_1 = require("./AuditLogService");
const OperationLog_1 = require("../entities/OperationLog");
class ExpressOrderService {
    static async createExpressOrder(data, operatorId, operatorName) {
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
            status: ExpressOrder_1.ExpressStatus.CREATED,
            createdBy: operatorId
        });
        const saved = await this.repository.save(order);
        const beforeApplication = { ...application };
        application.shippingFee += data.fee;
        application.totalFee = application.overdueFee + application.damageFee + application.shippingFee;
        application.version += 1;
        await this.applicationRepository.save(application);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.CREATE, OperationLog_1.EntityType.EXPRESS_ORDER, saved.id, {
            entityNo: saved.expressNo,
            afterData: saved,
            operatorId,
            operatorName,
            remark: '创建快递单',
            batchId: data.batchId
        });
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.FEE_ADJUST, OperationLog_1.EntityType.BORROW_APPLICATION, application.id, {
            entityNo: application.applicationNo,
            beforeData: beforeApplication,
            afterData: application,
            changes: {
                shippingFee: application.shippingFee,
                totalFee: application.totalFee,
                version: application.version
            },
            operatorId,
            operatorName,
            remark: `快递单 ${saved.expressNo} 费用入账，快递费 +${data.fee} 元`,
            batchId: data.batchId
        });
        await QueueService_1.QueueService.enqueue({
            applicationId: data.applicationId,
            payloadType: RetryQueue_1.PayloadType.EXPRESS_ORDER,
            payload: { action: 'create', expressNo: data.expressNo, fee: data.fee },
            batchId: data.batchId,
            externalReference: data.externalReference,
            operatorId,
            operatorName
        });
        return saved;
    }
    static async updateExpressStatus(expressId, status, trackingInfo, operatorId, operatorName) {
        const order = await this.repository.findOne({ where: { id: expressId } });
        if (!order) {
            throw new Error('快递单不存在');
        }
        const beforeData = { ...order };
        order.status = status;
        order.trackingInfo = trackingInfo || order.trackingInfo;
        order.updatedBy = operatorId;
        if (status === ExpressOrder_1.ExpressStatus.SHIPPED) {
            order.shipTime = new Date();
        }
        else if (status === ExpressOrder_1.ExpressStatus.DELIVERED) {
            order.deliverTime = new Date();
        }
        await this.repository.save(order);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.STATUS_CHANGE, OperationLog_1.EntityType.EXPRESS_ORDER, order.id, {
            entityNo: order.expressNo,
            beforeData,
            afterData: order,
            changes: { status },
            operatorId,
            operatorName,
            remark: `更新快递状态: ${status}`
        });
        return order;
    }
    static async getExpressOrdersByApplication(applicationId) {
        return await this.repository.find({
            where: { applicationId },
            order: { createdAt: 'DESC' }
        });
    }
    static async getExpressOrderById(id) {
        const order = await this.repository.findOne({ where: { id } });
        if (!order) {
            throw new Error('快递单不存在');
        }
        return order;
    }
}
exports.ExpressOrderService = ExpressOrderService;
ExpressOrderService.repository = database_1.AppDataSource.getRepository(ExpressOrder_1.ExpressOrder);
ExpressOrderService.applicationRepository = database_1.AppDataSource.getRepository(BorrowApplication_1.BorrowApplication);
