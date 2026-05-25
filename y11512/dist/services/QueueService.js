"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
const RetryQueue_1 = require("../entities/RetryQueue");
const DeadLetter_1 = require("../entities/DeadLetter");
const AuditLogService_1 = require("./AuditLogService");
const OperationLog_1 = require("../entities/OperationLog");
const typeorm_1 = require("typeorm");
class QueueService {
    static async enqueue(options) {
        const existingTask = await this.retryRepository.findOne({
            where: {
                applicationId: options.applicationId,
                payloadType: options.payloadType,
                status: (0, typeorm_1.In)([RetryQueue_1.QueueStatus.PENDING, RetryQueue_1.QueueStatus.PROCESSING])
            }
        });
        if (existingTask) {
            existingTask.payload = { ...existingTask.payload, ...options.payload };
            existingTask.updatedBy = options.operatorId;
            existingTask.batchId = options.batchId || existingTask.batchId;
            await this.retryRepository.save(existingTask);
            await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.UPDATE, OperationLog_1.EntityType.RETRY_QUEUE, existingTask.id, {
                entityNo: existingTask.taskId,
                afterData: existingTask,
                operatorId: options.operatorId,
                operatorName: options.operatorName,
                remark: '更新队列任务（合并提交）',
                batchId: options.batchId
            });
            return existingTask;
        }
        const task = this.retryRepository.create({
            taskId: (0, uuid_1.v4)(),
            applicationId: options.applicationId,
            payloadType: options.payloadType,
            payload: options.payload,
            status: RetryQueue_1.QueueStatus.PENDING,
            maxRetryCount: options.maxRetryCount || 3,
            retryIntervalSeconds: options.retryIntervalSeconds || 60,
            batchId: options.batchId,
            externalReference: options.externalReference,
            createdBy: options.operatorId,
            nextRetryTime: new Date()
        });
        const savedTask = await this.retryRepository.save(task);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.CREATE, OperationLog_1.EntityType.RETRY_QUEUE, savedTask.id, {
            entityNo: savedTask.taskId,
            afterData: savedTask,
            operatorId: options.operatorId,
            operatorName: options.operatorName,
            remark: '创建队列任务',
            batchId: options.batchId
        });
        return savedTask;
    }
    static async getTaskById(taskId) {
        return await this.retryRepository.findOne({ where: { taskId } });
    }
    static async getPendingTasks(limit = 10) {
        const now = new Date();
        return await this.retryRepository.find({
            where: {
                status: RetryQueue_1.QueueStatus.PENDING,
                isFrozen: false,
                nextRetryTime: (0, typeorm_1.LessThanOrEqual)(now)
            },
            order: { createdAt: 'ASC' },
            take: limit
        });
    }
    static async classifyError(error) {
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('timeout') || message.includes('econnrefused')) {
            return RetryQueue_1.RetryCategory.NETWORK_ERROR;
        }
        if (message.includes('api') || message.includes('external') || message.includes('500')) {
            return RetryQueue_1.RetryCategory.EXTERNAL_API_ERROR;
        }
        if (message.includes('validation') || message.includes('invalid') || message.includes('400')) {
            return RetryQueue_1.RetryCategory.DATA_VALIDATION_ERROR;
        }
        if (message.includes('business') || message.includes('rule') || message.includes('422')) {
            return RetryQueue_1.RetryCategory.BUSINESS_RULE_ERROR;
        }
        if (message.includes('system') || message.includes('database') || message.includes('503')) {
            return RetryQueue_1.RetryCategory.SYSTEM_ERROR;
        }
        return RetryQueue_1.RetryCategory.UNKNOWN_ERROR;
    }
    static async processTask(taskId, processor, operatorId) {
        const task = await this.retryRepository.findOne({ where: { taskId } });
        if (!task) {
            return { success: false, taskId, error: 'Task not found' };
        }
        if (task.status === RetryQueue_1.QueueStatus.SUCCESS || task.status === RetryQueue_1.QueueStatus.CANCELLED) {
            return { success: true, taskId };
        }
        if (task.isFrozen) {
            return { success: false, taskId, error: 'Task is frozen' };
        }
        const beforeData = { ...task };
        task.status = RetryQueue_1.QueueStatus.PROCESSING;
        task.retryCount += 1;
        task.lastProcessedAt = new Date();
        await this.retryRepository.save(task);
        try {
            const processResult = await processor(task.payload);
            task.status = RetryQueue_1.QueueStatus.SUCCESS;
            task.lastError = undefined;
            task.errorDetails = undefined;
            await this.retryRepository.save(task);
            await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.STATUS_CHANGE, OperationLog_1.EntityType.RETRY_QUEUE, task.id, {
                entityNo: task.taskId,
                beforeData,
                afterData: task,
                changes: { status: RetryQueue_1.QueueStatus.SUCCESS, processResult },
                operatorId,
                remark: '任务处理成功'
            });
            return { success: true, taskId, errorDetails: processResult };
        }
        catch (error) {
            task.status = RetryQueue_1.QueueStatus.FAILED;
            task.lastError = error.message;
            task.errorDetails = { stack: error.stack };
            task.retryCategory = await this.classifyError(error);
            if (task.retryCount >= task.maxRetryCount) {
                await this.moveToDeadLetter(task, DeadLetter_1.DeadLetterReason.MAX_RETRY_EXCEEDED, operatorId);
            }
            else {
                task.nextRetryTime = new Date(Date.now() + task.retryIntervalSeconds * 1000 * task.retryCount);
                task.status = RetryQueue_1.QueueStatus.PENDING;
                await this.retryRepository.save(task);
            }
            await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.STATUS_CHANGE, OperationLog_1.EntityType.RETRY_QUEUE, task.id, {
                entityNo: task.taskId,
                beforeData,
                afterData: task,
                changes: { status: task.status, error: error.message },
                operatorId,
                remark: `任务处理失败: ${error.message}`
            });
            return {
                success: false,
                taskId,
                error: error.message,
                errorDetails: { stack: error.stack }
            };
        }
    }
    static async moveToDeadLetter(task, reason, operatorId, note) {
        const deadLetter = this.deadLetterRepository.create({
            deadLetterId: (0, uuid_1.v4)(),
            originalTaskId: task.taskId,
            applicationId: task.applicationId,
            payloadType: task.payloadType,
            payload: task.payload,
            reason,
            retryCategory: task.retryCategory,
            status: DeadLetter_1.DeadLetterStatus.OPEN,
            lastError: task.lastError,
            errorDetails: task.errorDetails,
            retryCount: task.retryCount,
            resolvedBy: operatorId,
            resolutionNote: note
        });
        const saved = await this.deadLetterRepository.save(deadLetter);
        task.status = RetryQueue_1.QueueStatus.FAILED;
        await this.retryRepository.save(task);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.CREATE, OperationLog_1.EntityType.DEAD_LETTER, saved.id, {
            entityNo: saved.deadLetterId,
            afterData: saved,
            operatorId,
            remark: `移入死信队列，原因: ${reason}`
        });
        return saved;
    }
    static async requeueFromDeadLetter(deadLetterId, operatorId, operatorName, note) {
        const deadLetter = await this.deadLetterRepository.findOne({ where: { deadLetterId } });
        if (!deadLetter) {
            throw new Error('Dead letter not found');
        }
        const task = await this.enqueue({
            applicationId: deadLetter.applicationId,
            payloadType: deadLetter.payloadType,
            payload: deadLetter.payload,
            maxRetryCount: 3,
            operatorId,
            operatorName
        });
        deadLetter.status = DeadLetter_1.DeadLetterStatus.REQUEUED;
        deadLetter.requeuedTaskId = task.taskId;
        deadLetter.resolvedBy = operatorId;
        deadLetter.resolvedAt = new Date();
        deadLetter.resolutionNote = note;
        await this.deadLetterRepository.save(deadLetter);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.STATUS_CHANGE, OperationLog_1.EntityType.DEAD_LETTER, deadLetter.id, {
            entityNo: deadLetter.deadLetterId,
            changes: { status: DeadLetter_1.DeadLetterStatus.REQUEUED, requeuedTaskId: task.taskId },
            operatorId,
            operatorName,
            remark: '死信重新入队'
        });
        return task;
    }
    static async freezeTask(taskId, operatorId, operatorName, reason) {
        const task = await this.retryRepository.findOne({ where: { taskId } });
        if (!task) {
            throw new Error('Task not found');
        }
        const beforeData = { ...task };
        task.isFrozen = true;
        task.frozenBy = operatorId;
        task.frozenAt = new Date();
        task.frozenReason = reason;
        await this.retryRepository.save(task);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.FREEZE, OperationLog_1.EntityType.RETRY_QUEUE, task.id, {
            entityNo: task.taskId,
            beforeData,
            afterData: task,
            operatorId,
            operatorName,
            remark: `冻结任务: ${reason}`
        });
        return task;
    }
    static async unfreezeTask(taskId, operatorId, operatorName) {
        const task = await this.retryRepository.findOne({ where: { taskId } });
        if (!task) {
            throw new Error('Task not found');
        }
        const beforeData = { ...task };
        task.isFrozen = false;
        task.nextRetryTime = new Date();
        await this.retryRepository.save(task);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.UNFREEZE, OperationLog_1.EntityType.RETRY_QUEUE, task.id, {
            entityNo: task.taskId,
            beforeData,
            afterData: task,
            operatorId,
            operatorName,
            remark: '解冻任务'
        });
        return task;
    }
    static async manualOverride(taskId, operatorId, operatorName, note, markAsSuccess = false) {
        const task = await this.retryRepository.findOne({ where: { taskId } });
        if (!task) {
            throw new Error('Task not found');
        }
        const beforeData = { ...task };
        task.status = markAsSuccess ? RetryQueue_1.QueueStatus.SUCCESS : RetryQueue_1.QueueStatus.MANUAL;
        task.manualOperator = operatorId;
        task.manualOperatedAt = new Date();
        task.manualNote = note;
        await this.retryRepository.save(task);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.MANUAL_DECISION, OperationLog_1.EntityType.RETRY_QUEUE, task.id, {
            entityNo: task.taskId,
            beforeData,
            afterData: task,
            operatorId,
            operatorName,
            remark: `人工干预: ${note}`
        });
        return task;
    }
    static async resolveDeadLetter(deadLetterId, operatorId, operatorName, note) {
        const deadLetter = await this.deadLetterRepository.findOne({ where: { deadLetterId } });
        if (!deadLetter) {
            throw new Error('死信记录不存在');
        }
        const beforeData = { ...deadLetter };
        deadLetter.status = DeadLetter_1.DeadLetterStatus.RESOLVED;
        deadLetter.resolvedBy = operatorId;
        deadLetter.resolvedAt = new Date();
        deadLetter.resolutionNote = note || '人工处理解决';
        await this.deadLetterRepository.save(deadLetter);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.MANUAL_DECISION, OperationLog_1.EntityType.DEAD_LETTER, deadLetter.id, {
            entityNo: deadLetter.deadLetterId,
            beforeData,
            afterData: deadLetter,
            changes: {
                status: DeadLetter_1.DeadLetterStatus.RESOLVED,
                resolvedBy: operatorId,
                resolutionNote: deadLetter.resolutionNote
            },
            operatorId,
            operatorName,
            remark: `人工解决死信: ${deadLetter.resolutionNote}`
        });
        return deadLetter;
    }
    static async discardDeadLetter(deadLetterId, operatorId, operatorName, note) {
        const deadLetter = await this.deadLetterRepository.findOne({ where: { deadLetterId } });
        if (!deadLetter) {
            throw new Error('死信记录不存在');
        }
        const beforeData = { ...deadLetter };
        deadLetter.status = DeadLetter_1.DeadLetterStatus.DISCARDED;
        deadLetter.resolvedBy = operatorId;
        deadLetter.resolvedAt = new Date();
        deadLetter.resolutionNote = note || '人工丢弃';
        await this.deadLetterRepository.save(deadLetter);
        await AuditLogService_1.AuditLogService.log(OperationLog_1.OperationType.MANUAL_DECISION, OperationLog_1.EntityType.DEAD_LETTER, deadLetter.id, {
            entityNo: deadLetter.deadLetterId,
            beforeData,
            afterData: deadLetter,
            changes: {
                status: DeadLetter_1.DeadLetterStatus.DISCARDED,
                resolvedBy: operatorId,
                resolutionNote: deadLetter.resolutionNote
            },
            operatorId,
            operatorName,
            remark: `丢弃死信: ${deadLetter.resolutionNote}`
        });
        return deadLetter;
    }
    static async getTaskStats() {
        const [pending, processing, success, failed, manual, frozen] = await Promise.all([
            this.retryRepository.count({ where: { status: RetryQueue_1.QueueStatus.PENDING, isFrozen: false } }),
            this.retryRepository.count({ where: { status: RetryQueue_1.QueueStatus.PROCESSING } }),
            this.retryRepository.count({ where: { status: RetryQueue_1.QueueStatus.SUCCESS } }),
            this.retryRepository.count({ where: { status: RetryQueue_1.QueueStatus.FAILED } }),
            this.retryRepository.count({ where: { status: RetryQueue_1.QueueStatus.MANUAL } }),
            this.retryRepository.count({ where: { isFrozen: true } })
        ]);
        const deadLetterStats = await this.deadLetterRepository
            .createQueryBuilder('dl')
            .select('dl.retryCategory, COUNT(*) as count')
            .where('dl.status = :status', { status: DeadLetter_1.DeadLetterStatus.OPEN })
            .groupBy('dl.retryCategory')
            .getRawMany();
        return {
            queue: { pending, processing, success, failed, manual, frozen },
            deadLetter: {
                total: await this.deadLetterRepository.count({ where: { status: DeadLetter_1.DeadLetterStatus.OPEN } }),
                byCategory: deadLetterStats
            }
        };
    }
}
exports.QueueService = QueueService;
QueueService.retryRepository = database_1.AppDataSource.getRepository(RetryQueue_1.RetryQueue);
QueueService.deadLetterRepository = database_1.AppDataSource.getRepository(DeadLetter_1.DeadLetter);
