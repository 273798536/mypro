"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueWorker = void 0;
const retry_queue_service_1 = require("./retry-queue.service");
const external_receipt_service_1 = require("./external-receipt.service");
const data_source_1 = require("../data-source");
const CompensationRecord_1 = require("../entities/CompensationRecord");
class QueueWorker {
    constructor(pollInterval = 5000) {
        this.isRunning = false;
        this.intervalId = null;
        this.pollInterval = 5000;
        this.retryQueueService = new retry_queue_service_1.RetryQueueService();
        this.externalReceiptService = new external_receipt_service_1.ExternalReceiptService();
        this.compensationRepo = data_source_1.AppDataSource.getRepository(CompensationRecord_1.CompensationRecord);
        this.pollInterval = pollInterval;
    }
    start() {
        if (this.isRunning) {
            console.log("[Worker] 队列处理器已在运行");
            return;
        }
        this.isRunning = true;
        console.log(`[Worker] 队列处理器启动，轮询间隔: ${this.pollInterval}ms`);
        this.processLoop();
        this.intervalId = setInterval(() => this.processLoop(), this.pollInterval);
    }
    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log("[Worker] 队列处理器已停止");
    }
    async processLoop() {
        if (!this.isRunning)
            return;
        try {
            let processedCount = 0;
            const maxBatchSize = 5;
            while (processedCount < maxBatchSize) {
                const item = await this.retryQueueService.processNext();
                if (!item)
                    break;
                console.log(`[Worker] 处理任务 ${item.id} [${item.itemType}]`);
                processedCount++;
                await this.simulateProcessing(item);
            }
            if (processedCount > 0) {
                console.log(`[Worker] 批次处理完成，共处理 ${processedCount} 个任务`);
            }
        }
        catch (error) {
            console.error("[Worker] 处理队列时出错:", error);
        }
    }
    async simulateProcessing(item) {
        try {
            const payload = JSON.parse(item.payload || "{}");
            switch (item.itemType) {
                case "PAYMENT_PROCESS":
                    await this.processPayment(item, payload);
                    break;
                case "CONTRACT_ARCHIVE":
                    await this.processArchive(item, payload);
                    break;
                case "EMAIL_REMINDER":
                    await this.processEmail(item, payload);
                    break;
                case "PDF_GENERATE":
                    await this.processPdfGenerate(item, payload);
                    break;
                case "EXTERNAL_RECEIPT":
                    await this.processExternalReceipt(item, payload);
                    break;
                case "COMPENSATION":
                    await this.processCompensation(item, payload);
                    break;
                default:
                    await this.processDefault(item, payload);
            }
            await this.retryQueueService.markSuccess(item.id, "任务处理成功", "worker");
            console.log(`[Worker] 任务 ${item.id} 处理成功`);
        }
        catch (error) {
            console.error(`[Worker] 任务 ${item.id} 处理失败:`, error.message);
            await this.retryQueueService.markFailed(item.id, error, "worker");
        }
    }
    async processPayment(item, payload) {
        console.log(`[Worker] 执行付款处理: 金额=${payload.amount || "N/A"}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    async processArchive(item, payload) {
        console.log(`[Worker] 执行合同归档: 合同ID=${payload.contractId || "N/A"}`);
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    async processEmail(item, payload) {
        console.log(`[Worker] 发送邮件提醒: 收件人=${payload.email || "N/A"}`);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    async processPdfGenerate(item, payload) {
        console.log(`[Worker] 生成PDF: 合同=${payload.contractNo || "N/A"}`);
        await new Promise((resolve) => setTimeout(resolve, 800));
    }
    async processExternalReceipt(item, payload) {
        const receiptId = payload.receiptId;
        console.log(`[Worker] 处理外部回执: 单号=${payload.receiptNo || "N/A"}, ID=${receiptId}`);
        if (!receiptId) {
            throw new Error("回执ID不存在，无法处理");
        }
        console.log(`[Worker] 步骤1: 验证回执 ${receiptId}`);
        const verified = await this.externalReceiptService.verifyReceipt(receiptId, "worker");
        console.log(`[Worker] 回执验证结果: ${verified.status}`);
        if (verified.status === "VERIFIED") {
            console.log(`[Worker] 步骤2: 关闭回执 ${receiptId}`);
            await this.externalReceiptService.closeReceipt(receiptId, "worker");
            console.log(`[Worker] 回执已关闭，状态更新为 COMPLETED`);
        }
        else if (verified.status === "REJECTED") {
            console.log(`[Worker] 回执验证被拒绝: ${verified.rejectReason}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    async processCompensation(item, payload) {
        const receiptId = payload.receiptId;
        console.log(`[Worker] 处理补偿入账: 关联回执=${payload.receiptNo || "N/A"}, ID=${receiptId}`);
        const compensation = await this.compensationRepo.findOne({
            where: [{ externalReceiptId: receiptId }, { retryQueueId: item.id }],
            order: { createdAt: "DESC" },
        });
        if (!compensation) {
            console.log(`[Worker] 未找到关联补偿记录，尝试直接从回执创建...`);
            if (receiptId) {
                const compensation2 = await this.compensationRepo.findOneBy({ externalReceiptId: receiptId });
                if (compensation2) {
                    await this.processCompensationFlow(compensation2);
                }
                else {
                    throw new Error(`未找到回执 ${receiptId} 关联的补偿记录`);
                }
            }
            else {
                throw new Error("补偿记录不存在，无法处理");
            }
        }
        else {
            await this.processCompensationFlow(compensation);
        }
    }
    async processCompensationFlow(compensation) {
        console.log(`[Worker] 补偿记录: ${compensation.compensationNo}, 当前状态: ${compensation.status}`);
        if (compensation.status === "PENDING") {
            console.log(`[Worker] 步骤1: 审批补偿 ${compensation.id}`);
            compensation = await this.externalReceiptService.approveCompensation(compensation.id, "worker", "系统自动审批");
            console.log(`[Worker] 补偿已批准: ${compensation.status}`);
        }
        if (compensation.status === "APPROVED") {
            console.log(`[Worker] 步骤2: 执行补偿 ${compensation.id}`);
            compensation = await this.externalReceiptService.processCompensation(compensation.id, "worker");
            console.log(`[Worker] 补偿执行中: ${compensation.status}`);
        }
        if (compensation.status === "PROCESSING") {
            console.log(`[Worker] 步骤3: 完成补偿 ${compensation.id}`);
            const accountingRef = `ACC-${Date.now()}`;
            compensation = await this.externalReceiptService.completeCompensation(compensation.id, accountingRef, "worker");
            console.log(`[Worker] 补偿已完成: ${compensation.status}, 入账凭证: ${accountingRef}`);
        }
        if (compensation.status === "COMPLETED") {
            console.log(`[Worker] 补偿流程已完成: ${compensation.compensationNo}, 金额: ${compensation.amount}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    async processDefault(item, payload) {
        console.log(`[Worker] 处理默认任务: 类型=${item.itemType}`);
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    getStatus() {
        return {
            isRunning: this.isRunning,
            pollInterval: this.pollInterval,
        };
    }
}
exports.QueueWorker = QueueWorker;
