"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryQueueService = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../data-source");
const RetryQueue_1 = require("../entities/RetryQueue");
const RetryLog_1 = require("../entities/RetryLog");
const DeadLetter_1 = require("../entities/DeadLetter");
const OperationTrace_1 = require("../entities/OperationTrace");
const date_fns_1 = require("date-fns");
class RetryQueueService {
    constructor() {
        this.retryQueueRepo = data_source_1.AppDataSource.getRepository(RetryQueue_1.RetryQueue);
        this.retryLogRepo = data_source_1.AppDataSource.getRepository(RetryLog_1.RetryLog);
        this.deadLetterRepo = data_source_1.AppDataSource.getRepository(DeadLetter_1.DeadLetter);
        this.operationTraceRepo = data_source_1.AppDataSource.getRepository(OperationTrace_1.OperationTrace);
    }
    async enqueue(itemType, payload, options = {}) {
        const queueItem = this.retryQueueRepo.create({
            itemType,
            contractId: options.contractId,
            paymentNodeId: options.paymentNodeId,
            payload: JSON.stringify(payload),
            status: "PENDING",
            maxRetries: options.maxRetries || 3,
            retryInterval: options.retryInterval || 60,
            source: options.source,
            sourceRef: options.sourceRef,
        });
        const saved = await this.retryQueueRepo.save(queueItem);
        await this.logAction(saved.id, "ENQUEUE", null, "PENDING", `任务入队成功，类型: ${itemType}`, options.createdBy, saved.payload);
        await this.traceOperation("ENQUEUE", "RetryQueue", saved.id, null, JSON.stringify(saved), "任务入队", options.createdBy);
        return saved;
    }
    async processNext() {
        const now = (0, date_fns_1.formatISO)(new Date());
        const pendingItems = await this.retryQueueRepo.find({
            where: [
                { status: "PENDING", isDeleted: false },
                {
                    status: "RETRYING",
                    isDeleted: false,
                    nextRetryAt: (0, typeorm_1.LessThanOrEqual)(now),
                },
            ],
            order: { createdAt: "ASC" },
            take: 10,
        });
        for (const item of pendingItems) {
            if (item.nextRetryAt && new Date(item.nextRetryAt) > new Date()) {
                continue;
            }
            try {
                item.status = "PROCESSING";
                await this.retryQueueRepo.save(item);
                await this.logAction(item.id, "PROCESS", item.status, "PROCESSING", "开始处理任务", "system", item.payload);
                return item;
            }
            catch (error) {
                console.error(`处理任务 ${item.id} 失败:`, error);
            }
        }
        return null;
    }
    async markSuccess(itemId, message = "处理成功", operator) {
        const item = await this.retryQueueRepo.findOneBy({ id: itemId });
        if (!item)
            throw new Error("任务不存在");
        const previousStatus = item.status;
        item.status = "SUCCESS";
        item.processedAt = (0, date_fns_1.formatISO)(new Date());
        const saved = await this.retryQueueRepo.save(item);
        await this.logAction(itemId, "SUCCESS", previousStatus, "SUCCESS", message, operator || "system");
        await this.traceOperation("UPDATE", "RetryQueue", itemId, JSON.stringify({ status: previousStatus }), JSON.stringify({ status: "SUCCESS" }), message, operator);
        return saved;
    }
    async markFailed(itemId, error, operator) {
        const item = await this.retryQueueRepo.findOneBy({ id: itemId });
        if (!item)
            throw new Error("任务不存在");
        const previousStatus = item.status;
        const errorMessage = error instanceof Error ? error.message : error;
        const errorStack = error instanceof Error ? error.stack : undefined;
        item.retryCount = item.retryCount + 1;
        item.lastError = errorMessage;
        item.errorStack = errorStack;
        item.retryCategory = this.categorizeError(errorMessage);
        if (item.retryCount >= item.maxRetries) {
            item.status = "DEAD_LETTER";
            await this.moveToDeadLetter(item, errorMessage);
            await this.logAction(itemId, "DEAD_LETTER", previousStatus, "DEAD_LETTER", `重试次数已达上限(${item.maxRetries})，移入死信队列`, operator || "system");
        }
        else {
            item.status = "RETRYING";
            item.nextRetryAt = (0, date_fns_1.formatISO)((0, date_fns_1.addSeconds)(new Date(), item.retryInterval * Math.pow(2, item.retryCount)));
            await this.logAction(itemId, "RETRY", previousStatus, "RETRYING", `第 ${item.retryCount} 次重试失败，下次重试时间: ${item.nextRetryAt}`, operator || "system", item.payload);
        }
        return await this.retryQueueRepo.save(item);
    }
    async manualIntervention(itemId, handler, remark) {
        const item = await this.retryQueueRepo.findOneBy({ id: itemId });
        if (!item)
            throw new Error("任务不存在");
        const previousStatus = item.status;
        item.status = "MANUAL_INTERVENTION";
        item.isManuallyHandled = true;
        item.handledBy = handler;
        item.handleRemark = remark;
        const saved = await this.retryQueueRepo.save(item);
        await this.logAction(itemId, "MANUAL_INTERVENTION", previousStatus, "MANUAL_INTERVENTION", `人工接管: ${remark}`, handler);
        await this.traceOperation("MANUAL_CORRECT", "RetryQueue", itemId, null, JSON.stringify({ status: "MANUAL_INTERVENTION", handler, remark }), remark, handler);
        return saved;
    }
    async manualResolve(itemId, resolvedBy, resolution, isSuccess = true) {
        const item = await this.retryQueueRepo.findOneBy({ id: itemId });
        if (!item)
            throw new Error("任务不存在");
        const previousStatus = item.status;
        if (isSuccess) {
            item.status = "SUCCESS";
            item.processedAt = (0, date_fns_1.formatISO)(new Date());
        }
        else {
            item.status = "CANCELLED";
        }
        const saved = await this.retryQueueRepo.save(item);
        await this.logAction(itemId, isSuccess ? "SUCCESS" : "CANCEL", previousStatus, item.status, `人工处理完成: ${resolution}`, resolvedBy);
        return saved;
    }
    async resurrectDeadLetter(deadLetterId, resurrectedBy, newMaxRetries) {
        const deadLetter = await this.deadLetterRepo.findOneBy({ id: deadLetterId });
        if (!deadLetter)
            throw new Error("死信记录不存在");
        const newQueueItem = this.retryQueueRepo.create({
            itemType: deadLetter.itemType,
            contractId: deadLetter.contractId,
            paymentNodeId: deadLetter.paymentNodeId,
            payload: deadLetter.originalPayload,
            status: "PENDING",
            retryCategory: deadLetter.retryCategory,
            retryCount: 0,
            maxRetries: newMaxRetries || 3,
            retryInterval: 60,
            source: "dead_letter_resurrection",
            sourceRef: deadLetterId,
        });
        const saved = await this.retryQueueRepo.save(newQueueItem);
        deadLetter.status = "RESOLVED";
        deadLetter.isResurrected = true;
        deadLetter.resurrectedToQueueId = saved.id;
        deadLetter.resolvedBy = resurrectedBy;
        deadLetter.resolvedAt = (0, date_fns_1.formatISO)(new Date());
        deadLetter.resolveRemark = "死信复活，重新入队";
        await this.deadLetterRepo.save(deadLetter);
        await this.logAction(saved.id, "RESURRECT", null, "PENDING", `从死信队列复活，原死信ID: ${deadLetterId}`, resurrectedBy, saved.payload);
        return saved;
    }
    async moveToDeadLetter(item, finalError) {
        const deadLetter = this.deadLetterRepo.create({
            retryQueueId: item.id,
            itemType: item.itemType,
            contractId: item.contractId,
            paymentNodeId: item.paymentNodeId,
            originalPayload: item.payload,
            retryCategory: item.retryCategory,
            retryCount: item.retryCount,
            finalError,
            status: "PENDING",
        });
        return await this.deadLetterRepo.save(deadLetter);
    }
    categorizeError(errorMessage) {
        const msg = errorMessage.toLowerCase();
        if (msg.includes("network") || msg.includes("timeout") || msg.includes("connection")) {
            return "NETWORK_ERROR";
        }
        if (msg.includes("validation") || msg.includes("invalid")) {
            return "VALIDATION_ERROR";
        }
        if (msg.includes("missing") || msg.includes("required") || msg.includes("null")) {
            return "MISSING_DATA";
        }
        if (msg.includes("cross") || msg.includes("day") || msg.includes("date")) {
            return "CROSS_DAY_ISSUE";
        }
        if (msg.includes("name") || msg.includes("duplicate")) {
            return "NAME_CONFLICT";
        }
        if (msg.includes("amount") || msg.includes("price")) {
            return "AMOUNT_CONFLICT";
        }
        if (msg.includes("quantity") || msg.includes("count")) {
            return "QUANTITY_CONFLICT";
        }
        if (msg.includes("system") || msg.includes("internal")) {
            return "SYSTEM_ERROR";
        }
        if (msg.includes("business") || msg.includes("rule")) {
            return "BUSINESS_RULE";
        }
        return "UNKNOWN";
    }
    async logAction(retryQueueId, actionType, previousStatus, newStatus, message, performedBy, payloadSnapshot) {
        const log = {
            retryQueueId,
            actionType,
            previousStatus: previousStatus || undefined,
            newStatus,
            message,
            performedBy,
            payloadSnapshot,
        };
        return await this.retryLogRepo.save(log);
    }
    async traceOperation(operationType, entityType, entityId, beforeSnapshot, afterSnapshot, changeSummary, operator) {
        const trace = {
            operationType,
            entityType,
            entityId,
            beforeSnapshot: beforeSnapshot || undefined,
            afterSnapshot: afterSnapshot || undefined,
            changeSummary,
            operator,
        };
        return await this.operationTraceRepo.save(trace);
    }
    async getQueueStats() {
        const total = await this.retryQueueRepo.count({ where: { isDeleted: false } });
        const pending = await this.retryQueueRepo.count({
            where: { status: "PENDING", isDeleted: false },
        });
        const processing = await this.retryQueueRepo.count({
            where: { status: "PROCESSING", isDeleted: false },
        });
        const retrying = await this.retryQueueRepo.count({
            where: { status: "RETRYING", isDeleted: false },
        });
        const success = await this.retryQueueRepo.count({
            where: { status: "SUCCESS", isDeleted: false },
        });
        const failed = await this.retryQueueRepo.count({
            where: { status: "FAILED", isDeleted: false },
        });
        const manual = await this.retryQueueRepo.count({
            where: { status: "MANUAL_INTERVENTION", isDeleted: false },
        });
        const deadLetter = await this.deadLetterRepo.count({
            where: { status: "PENDING" },
        });
        const byCategory = await this.retryQueueRepo
            .createQueryBuilder("q")
            .select("q.retryCategory", "category")
            .addSelect("COUNT(*)", "count")
            .where("q.isDeleted = :isDeleted", { isDeleted: false })
            .andWhere("q.retryCategory IS NOT NULL")
            .groupBy("q.retryCategory")
            .getRawMany();
        return {
            total,
            pending,
            processing,
            retrying,
            success,
            failed,
            manualIntervention: manual,
            deadLetter,
            byCategory,
        };
    }
}
exports.RetryQueueService = RetryQueueService;
