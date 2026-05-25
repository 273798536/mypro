"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BorrowApplicationService = void 0;
const database_1 = require("../config/database");
const BorrowApplication_1 = require("../entities/BorrowApplication");
const ExpressOrder_1 = require("../entities/ExpressOrder");
const CompensationRecord_1 = require("../entities/CompensationRecord");
const SupervisorComment_1 = require("../entities/SupervisorComment");
const QueueService_1 = require("./QueueService");
const RetryQueue_1 = require("../entities/RetryQueue");
const FeeCalculationService_1 = require("./FeeCalculationService");
const AuditLogService_1 = require("./AuditLogService");
const OperationLog_1 = require("../entities/OperationLog");
class BorrowApplicationService {
    static async submitApplication(data, duplicateHandling = { strategy: 'append' }, operatorId, operatorName) {
        const existing = await this.repository.findOne({
            where: { applicationNo: data.applicationNo }
        });
        if (existing) {
            switch (duplicateHandling.strategy) {
                case 'ignore':
                    await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.SUBMIT, OperationLog_1.EntityType.BORROW_APPLICATION, existing.id, {
                        entityNo: existing.applicationNo,
                        beforeData: existing,
                        operatorId,
                        operatorName,
                        remark: '重复提交已忽略',
                        batchId: data.batchId
                    });
                    return { application: existing, isNew: false, action: 'ignored' };
                case 'reject':
                    throw new Error(`申请编号 ${data.applicationNo} 已存在`);
                case 'overwrite':
                    const beforeData = { ...existing };
                    Object.assign(existing, data);
                    existing.version += 1;
                    existing.updatedBy = operatorId;
                    existing.status = BorrowApplication_1.BorrowStatus.SUBMITTED;
                    await this.repository.save(existing);
                    await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.UPDATE, OperationLog_1.EntityType.BORROW_APPLICATION, existing.id, {
                        entityNo: existing.applicationNo,
                        beforeData,
                        afterData: existing,
                        operatorId,
                        operatorName,
                        remark: '重复提交已覆盖',
                        batchId: data.batchId
                    });
                    return { application: existing, isNew: false, action: 'overwritten' };
                case 'append':
                default:
                    const beforeAppend = { ...existing };
                    if (data.rawData) {
                        existing.rawData = { ...existing.rawData, ...data.rawData };
                    }
                    existing.version += 1;
                    existing.updatedBy = operatorId;
                    existing.batchId = data.batchId || existing.batchId;
                    if (existing.status === BorrowApplication_1.BorrowStatus.PENDING || existing.status === BorrowApplication_1.BorrowStatus.WITHDRAWN) {
                        existing.status = BorrowApplication_1.BorrowStatus.SUBMITTED;
                    }
                    await this.repository.save(existing);
                    await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.UPDATE, OperationLog_1.EntityType.BORROW_APPLICATION, existing.id, {
                        entityNo: existing.applicationNo,
                        beforeData: beforeAppend,
                        afterData: existing,
                        operatorId,
                        operatorName,
                        remark: '重复提交已追加合并',
                        batchId: data.batchId
                    });
                    await QueueService_1.QueueService.enqueue({
                        applicationId: existing.id,
                        payloadType: RetryQueue_1.PayloadType.BORROW_APPLICATION,
                        payload: { action: 'update', applicationNo: data.applicationNo },
                        batchId: data.batchId,
                        externalReference: data.externalReference,
                        operatorId,
                        operatorName
                    });
                    return { application: existing, isNew: false, action: 'appended' };
            }
        }
        const application = this.repository.create({
            ...data,
            status: BorrowApplication_1.BorrowStatus.SUBMITTED,
            createdBy: operatorId,
            version: 1
        });
        const saved = await this.repository.save(application);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.CREATE, OperationLog_1.EntityType.BORROW_APPLICATION, saved.id, {
            entityNo: saved.applicationNo,
            afterData: saved,
            operatorId,
            operatorName,
            remark: '创建借阅申请',
            batchId: data.batchId
        });
        await QueueService_1.QueueService.enqueue({
            applicationId: saved.id,
            payloadType: RetryQueue_1.PayloadType.BORROW_APPLICATION,
            payload: { action: 'create', applicationNo: data.applicationNo },
            batchId: data.batchId,
            externalReference: data.externalReference,
            operatorId,
            operatorName
        });
        return { application: saved, isNew: true, action: 'created' };
    }
    static async withdrawApplication(applicationId, reason, operatorId, operatorName) {
        const application = await this.repository.findOne({ where: { id: applicationId } });
        if (!application) {
            throw new Error('申请不存在');
        }
        if (application.status === BorrowApplication_1.BorrowStatus.COMPLETED || application.status === BorrowApplication_1.BorrowStatus.CANCELLED) {
            throw new Error('该状态下无法撤回');
        }
        const beforeData = { ...application };
        application.status = BorrowApplication_1.BorrowStatus.WITHDRAWN;
        application.updatedBy = operatorId;
        application.version += 1;
        await this.repository.save(application);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.WITHDRAW, OperationLog_1.EntityType.BORROW_APPLICATION, application.id, {
            entityNo: application.applicationNo,
            beforeData,
            afterData: application,
            changes: { status: BorrowApplication_1.BorrowStatus.WITHDRAWN, reason },
            operatorId,
            operatorName,
            remark: `撤回申请: ${reason}`
        });
        return application;
    }
    static async resubmitAfterWithdraw(applicationId, operatorId, operatorName) {
        const application = await this.repository.findOne({ where: { id: applicationId } });
        if (!application) {
            throw new Error('申请不存在');
        }
        if (application.status !== BorrowApplication_1.BorrowStatus.WITHDRAWN) {
            throw new Error('只有已撤回的申请可以重新提交');
        }
        const beforeData = { ...application };
        application.status = BorrowApplication_1.BorrowStatus.SUBMITTED;
        application.updatedBy = operatorId;
        application.version += 1;
        await this.repository.save(application);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.SUBMIT, OperationLog_1.EntityType.BORROW_APPLICATION, application.id, {
            entityNo: application.applicationNo,
            beforeData,
            afterData: application,
            changes: { status: BorrowApplication_1.BorrowStatus.SUBMITTED },
            operatorId,
            operatorName,
            remark: '撤回后重新提交'
        });
        await QueueService_1.QueueService.enqueue({
            applicationId: application.id,
            payloadType: RetryQueue_1.PayloadType.BORROW_APPLICATION,
            payload: { action: 'resubmit', applicationNo: application.applicationNo },
            operatorId,
            operatorName
        });
        return application;
    }
    static async closeApplication(applicationId, reason, operatorId, operatorName) {
        const application = await this.repository.findOne({ where: { id: applicationId } });
        if (!application) {
            throw new Error('申请不存在');
        }
        const beforeData = { ...application };
        application.status = BorrowApplication_1.BorrowStatus.COMPLETED;
        application.updatedBy = operatorId;
        application.version += 1;
        await this.repository.save(application);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.CLOSE, OperationLog_1.EntityType.BORROW_APPLICATION, application.id, {
            entityNo: application.applicationNo,
            beforeData,
            afterData: application,
            changes: { status: BorrowApplication_1.BorrowStatus.COMPLETED, reason },
            operatorId,
            operatorName,
            remark: `关闭申请: ${reason}`
        });
        return application;
    }
    static async getApplicationWithDetails(applicationId) {
        const application = await this.repository.findOne({ where: { id: applicationId } });
        if (!application) {
            throw new Error('申请不存在');
        }
        const [expressOrders, compensationRecords, supervisorComments] = await Promise.all([
            this.expressRepository.find({ where: { applicationId } }),
            this.compensationRepository.find({ where: { applicationId } }),
            this.commentRepository.find({ where: { applicationId }, order: { createdAt: 'DESC' } })
        ]);
        const feeResult = await FeeCalculationService_1.FeeCalculationService.calculateTotalFee(application, expressOrders, compensationRecords, supervisorComments);
        const history = await AuditLogService_1.AuditLogService.getEntityHistory(OperationLog_1.EntityType.BORROW_APPLICATION, applicationId);
        return {
            application,
            expressOrders,
            compensationRecords,
            supervisorComments,
            feeCalculation: feeResult,
            history
        };
    }
    static async addSupervisorComment(applicationId, commentType, content, supervisorId, supervisorName, isDecision = false, changes) {
        const application = await this.repository.findOne({ where: { id: applicationId } });
        if (!application) {
            throw new Error('申请不存在');
        }
        const comment = this.commentRepository.create({
            applicationId,
            commentType,
            content,
            supervisorId,
            supervisorName,
            isDecision,
            changes,
            decisionTime: isDecision ? new Date() : undefined,
            createdBy: supervisorId
        });
        const saved = await this.commentRepository.save(comment);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.CREATE, OperationLog_1.EntityType.SUPERVISOR_COMMENT, saved.id, {
            entityNo: application.applicationNo,
            afterData: saved,
            operatorId: supervisorId,
            operatorName: supervisorName,
            remark: `添加主管批注: ${commentType}`
        });
        return saved;
    }
    static async batchSubmit(applications, duplicateHandling, batchId, operatorId, operatorName) {
        const results = {
            success: [],
            failed: []
        };
        for (const app of applications) {
            try {
                app.batchId = batchId;
                const result = await this.submitApplication(app, duplicateHandling, operatorId, operatorName);
                results.success.push({
                    applicationNo: app.applicationNo,
                    action: result.action
                });
            }
            catch (error) {
                results.failed.push({
                    applicationNo: app.applicationNo,
                    error: error.message
                });
            }
        }
        return results;
    }
}
exports.BorrowApplicationService = BorrowApplicationService;
BorrowApplicationService.repository = database_1.AppDataSource.getRepository(BorrowApplication_1.BorrowApplication);
BorrowApplicationService.expressRepository = database_1.AppDataSource.getRepository(ExpressOrder_1.ExpressOrder);
BorrowApplicationService.compensationRepository = database_1.AppDataSource.getRepository(CompensationRecord_1.CompensationRecord);
BorrowApplicationService.commentRepository = database_1.AppDataSource.getRepository(SupervisorComment_1.SupervisorComment);
