"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompensationService = void 0;
const database_1 = require("../config/database");
const CompensationRecord_1 = require("../entities/CompensationRecord");
const BorrowApplication_1 = require("../entities/BorrowApplication");
const QueueService_1 = require("./QueueService");
const RetryQueue_1 = require("../entities/RetryQueue");
const AuditLogService_1 = require("./AuditLogService");
const OperationLog_1 = require("../entities/OperationLog");
const uuid_1 = require("uuid");
class CompensationService {
    static generateRecordNo() {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = (0, uuid_1.v4)().slice(0, 6).toUpperCase();
        return `COMP-${dateStr}-${random}`;
    }
    static async createCompensationRecord(data, operatorId, operatorName) {
        const application = await this.applicationRepository.findOne({
            where: { id: data.applicationId }
        });
        if (!application) {
            throw new Error('借阅申请不存在');
        }
        const record = this.repository.create({
            recordNo: this.generateRecordNo(),
            ...data,
            status: CompensationRecord_1.CompensationStatus.PENDING,
            paidAmount: 0,
            createdBy: operatorId
        });
        const saved = await this.repository.save(record);
        const beforeApplication = { ...application };
        if (data.compensationType === CompensationRecord_1.CompensationType.OVERDUE) {
            application.overdueFee += data.amount;
        }
        else if (data.compensationType === CompensationRecord_1.CompensationType.DAMAGE || data.compensationType === CompensationRecord_1.CompensationType.LOST) {
            application.damageFee += data.amount;
        }
        application.totalFee = application.overdueFee + application.damageFee + application.shippingFee;
        application.version += 1;
        if (data.compensationType === CompensationRecord_1.CompensationType.DAMAGE || data.compensationType === CompensationRecord_1.CompensationType.LOST) {
            application.isDamaged = true;
        }
        await this.applicationRepository.save(application);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.CREATE, OperationLog_1.EntityType.COMPENSATION_RECORD, saved.id, {
            entityNo: saved.recordNo,
            afterData: saved,
            operatorId,
            operatorName,
            remark: `创建赔偿记录: ${data.compensationType}`,
            batchId: data.batchId
        });
        const feeField = data.compensationType === CompensationRecord_1.CompensationType.OVERDUE ? 'overdueFee' : 'damageFee';
        const feeFieldName = data.compensationType === CompensationRecord_1.CompensationType.OVERDUE ? '逾期费' : '污损/遗失赔偿';
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.FEE_ADJUST, OperationLog_1.EntityType.BORROW_APPLICATION, application.id, {
            entityNo: application.applicationNo,
            beforeData: beforeApplication,
            afterData: application,
            changes: {
                [feeField]: application[feeField],
                totalFee: application.totalFee,
                isDamaged: application.isDamaged,
                version: application.version
            },
            operatorId,
            operatorName,
            remark: `赔偿记录 ${saved.recordNo} 费用入账，${feeFieldName} +${data.amount} 元`,
            batchId: data.batchId
        });
        await QueueService_1.QueueService.enqueue({
            applicationId: data.applicationId,
            payloadType: RetryQueue_1.PayloadType.COMPENSATION_RECORD,
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
    static async confirmCompensation(recordId, operatorId, operatorName) {
        const record = await this.repository.findOne({ where: { id: recordId } });
        if (!record) {
            throw new Error('赔偿记录不存在');
        }
        const beforeData = { ...record };
        record.status = CompensationRecord_1.CompensationStatus.CONFIRMED;
        record.confirmTime = new Date();
        record.updatedBy = operatorId;
        await this.repository.save(record);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.STATUS_CHANGE, OperationLog_1.EntityType.COMPENSATION_RECORD, record.id, {
            entityNo: record.recordNo,
            beforeData,
            afterData: record,
            changes: { status: CompensationRecord_1.CompensationStatus.CONFIRMED },
            operatorId,
            operatorName,
            remark: '确认赔偿记录'
        });
        return record;
    }
    static async processPayment(paymentData, operatorId, operatorName) {
        const record = await this.repository.findOne({ where: { id: paymentData.recordId } });
        if (!record) {
            throw new Error('赔偿记录不存在');
        }
        if (record.status === CompensationRecord_1.CompensationStatus.CANCELLED || record.status === CompensationRecord_1.CompensationStatus.WAIVED) {
            throw new Error('该记录状态不允许支付');
        }
        const beforeData = { ...record };
        record.paidAmount += paymentData.amount;
        record.paymentMethod = paymentData.paymentMethod;
        record.paymentReference = paymentData.paymentReference;
        record.paidTime = new Date();
        if (record.paidAmount >= record.amount) {
            record.status = CompensationRecord_1.CompensationStatus.PAID;
        }
        record.updatedBy = operatorId;
        await this.repository.save(record);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.COMPENSATE, OperationLog_1.EntityType.COMPENSATION_RECORD, record.id, {
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
        });
        return record;
    }
    static async waiveCompensation(recordId, reason, operatorId, operatorName) {
        const record = await this.repository.findOne({ where: { id: recordId } });
        if (!record) {
            throw new Error('赔偿记录不存在');
        }
        const beforeData = { ...record };
        record.status = CompensationRecord_1.CompensationStatus.WAIVED;
        record.updatedBy = operatorId;
        await this.repository.save(record);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.FEE_ADJUST, OperationLog_1.EntityType.COMPENSATION_RECORD, record.id, {
            entityNo: record.recordNo,
            beforeData,
            afterData: record,
            changes: { status: CompensationRecord_1.CompensationStatus.WAIVED, reason },
            operatorId,
            operatorName,
            remark: `豁免赔偿: ${reason}`
        });
        return record;
    }
    static async getCompensationRecordsByApplication(applicationId) {
        return await this.repository.find({
            where: { applicationId },
            order: { createdAt: 'DESC' }
        });
    }
    static async getCompensationRecordById(id) {
        const record = await this.repository.findOne({ where: { id } });
        if (!record) {
            throw new Error('赔偿记录不存在');
        }
        return record;
    }
}
exports.CompensationService = CompensationService;
CompensationService.repository = database_1.AppDataSource.getRepository(CompensationRecord_1.CompensationRecord);
CompensationService.applicationRepository = database_1.AppDataSource.getRepository(BorrowApplication_1.BorrowApplication);
