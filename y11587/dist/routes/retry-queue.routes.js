"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const retry_queue_service_1 = require("../services/retry-queue.service");
const data_source_1 = require("../data-source");
const RetryQueue_1 = require("../entities/RetryQueue");
const RetryLog_1 = require("../entities/RetryLog");
const DeadLetter_1 = require("../entities/DeadLetter");
const router = (0, express_1.Router)();
const retryQueueService = new retry_queue_service_1.RetryQueueService();
const retryQueueRepo = data_source_1.AppDataSource.getRepository(RetryQueue_1.RetryQueue);
const retryLogRepo = data_source_1.AppDataSource.getRepository(RetryLog_1.RetryLog);
const deadLetterRepo = data_source_1.AppDataSource.getRepository(DeadLetter_1.DeadLetter);
router.post("/enqueue", async (req, res) => {
    try {
        const { itemType, payload, contractId, paymentNodeId, maxRetries, retryInterval, source } = req.body;
        const item = await retryQueueService.enqueue(itemType, payload, {
            contractId,
            paymentNodeId,
            maxRetries,
            retryInterval,
            source,
            createdBy: req.headers["x-operator"],
        });
        res.json({ success: true, data: item });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/", async (req, res) => {
    try {
        const { status, itemType, contractId, page = 1, limit = 20 } = req.query;
        const where = { isDeleted: false };
        if (status)
            where.status = status;
        if (itemType)
            where.itemType = itemType;
        if (contractId)
            where.contractId = contractId;
        const [items, total] = await retryQueueRepo.findAndCount({
            where,
            order: { createdAt: "DESC" },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        res.json({
            success: true,
            data: {
                items,
                total,
                page: Number(page),
                limit: Number(limit),
            },
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/stats", async (req, res) => {
    try {
        const stats = await retryQueueService.getQueueStats();
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/dead-letter", async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const where = {};
        if (status)
            where.status = status;
        const [items, total] = await deadLetterRepo.findAndCount({
            where,
            order: { createdAt: "DESC" },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        res.json({
            success: true,
            data: {
                items,
                total,
                page: Number(page),
                limit: Number(limit),
            },
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/dead-letter/:id/resurrect", async (req, res) => {
    try {
        const { newMaxRetries } = req.body;
        const item = await retryQueueService.resurrectDeadLetter(req.params.id, req.headers["x-operator"] || "unknown", newMaxRetries);
        res.json({ success: true, data: item });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/dead-letter/:id/resolve", async (req, res) => {
    try {
        const { resolution, remark } = req.body;
        const deadLetter = await deadLetterRepo.findOneBy({ id: req.params.id });
        if (!deadLetter) {
            return res.status(404).json({ success: false, error: "死信记录不存在" });
        }
        deadLetter.status = "RESOLVED";
        deadLetter.resolvedBy = req.headers["x-operator"] || "unknown";
        deadLetter.resolvedAt = new Date().toISOString();
        deadLetter.resolveRemark = remark;
        deadLetter.resolution = resolution;
        await deadLetterRepo.save(deadLetter);
        res.json({ success: true, data: deadLetter });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const item = await retryQueueRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!item) {
            return res.status(404).json({ success: false, error: "任务不存在" });
        }
        res.json({ success: true, data: item });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/:id/logs", async (req, res) => {
    try {
        const logs = await retryLogRepo.find({
            where: { retryQueueId: req.params.id },
            order: { createdAt: "ASC" },
        });
        res.json({ success: true, data: logs });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/:id/manual-intervention", async (req, res) => {
    try {
        const { handler, remark } = req.body;
        const item = await retryQueueService.manualIntervention(req.params.id, handler || req.headers["x-operator"] || "unknown", remark);
        res.json({ success: true, data: item });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/:id/resolve", async (req, res) => {
    try {
        const { resolution, isSuccess } = req.body;
        const item = await retryQueueService.manualResolve(req.params.id, req.headers["x-operator"] || "unknown", resolution, isSuccess !== false);
        res.json({ success: true, data: item });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/:id/retry", async (req, res) => {
    try {
        const item = await retryQueueRepo.findOneBy({ id: req.params.id });
        if (!item) {
            return res.status(404).json({ success: false, error: "任务不存在" });
        }
        item.status = "PENDING";
        item.retryCount = 0;
        item.nextRetryAt = undefined;
        item.lastError = undefined;
        await retryQueueRepo.save(item);
        res.json({ success: true, data: item });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
exports.default = router;
