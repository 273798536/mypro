"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const external_receipt_service_1 = require("../services/external-receipt.service");
const data_source_1 = require("../data-source");
const ExternalReceipt_1 = require("../entities/ExternalReceipt");
const CompensationRecord_1 = require("../entities/CompensationRecord");
const router = (0, express_1.Router)();
const externalReceiptService = new external_receipt_service_1.ExternalReceiptService();
const receiptRepo = data_source_1.AppDataSource.getRepository(ExternalReceipt_1.ExternalReceipt);
const compensationRepo = data_source_1.AppDataSource.getRepository(CompensationRecord_1.CompensationRecord);
router.post("/submit", async (req, res) => {
    try {
        const { receiptType, payload, contractId, paymentNodeId, sourceSystem, sourceRefNo, signature } = req.body;
        const receipt = await externalReceiptService.submitReceipt(receiptType, payload, {
            contractId,
            paymentNodeId,
            sourceSystem: sourceSystem || "external",
            sourceRefNo,
            signature,
            submittedBy: req.headers["x-operator"],
        });
        res.json({ success: true, data: receipt });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/", async (req, res) => {
    try {
        const { status, receiptType, contractId, page = 1, limit = 20 } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (receiptType)
            where.receiptType = receiptType;
        if (contractId)
            where.contractId = contractId;
        const [items, total] = await receiptRepo.findAndCount({
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
router.post("/compensation", async (req, res) => {
    try {
        const { compensationType, amount, contractId, paymentNodeId, retryQueueId, externalReceiptId, reason, currency } = req.body;
        const compensation = await externalReceiptService.createCompensation(compensationType, amount, {
            contractId,
            paymentNodeId,
            retryQueueId,
            externalReceiptId,
            reason,
            createdBy: req.headers["x-operator"] || "system",
            currency,
        });
        res.json({ success: true, data: compensation });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/compensation", async (req, res) => {
    try {
        const { status, contractId, page = 1, limit = 20 } = req.query;
        const where = { isDeleted: false };
        if (status)
            where.status = status;
        if (contractId)
            where.contractId = contractId;
        const [items, total] = await compensationRepo.findAndCount({
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
router.get("/compensation/:id", async (req, res) => {
    try {
        const compensation = await compensationRepo.findOneBy({
            id: req.params.id,
            isDeleted: false,
        });
        if (!compensation) {
            return res.status(404).json({ success: false, error: "补偿记录不存在" });
        }
        res.json({ success: true, data: compensation });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/compensation/:id/approve", async (req, res) => {
    try {
        const { remark } = req.body;
        const compensation = await externalReceiptService.approveCompensation(req.params.id, req.headers["x-operator"] || "system", remark);
        res.json({ success: true, data: compensation });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/compensation/:id/process", async (req, res) => {
    try {
        const compensation = await externalReceiptService.processCompensation(req.params.id, req.headers["x-operator"] || "system");
        res.json({ success: true, data: compensation });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/compensation/:id/complete", async (req, res) => {
    try {
        const { accountingRef } = req.body;
        const compensation = await externalReceiptService.completeCompensation(req.params.id, accountingRef, req.headers["x-operator"] || "system");
        res.json({ success: true, data: compensation });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const receipt = await receiptRepo.findOneBy({ id: req.params.id });
        if (!receipt) {
            return res.status(404).json({ success: false, error: "回执不存在" });
        }
        res.json({ success: true, data: receipt });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/:id/verify", async (req, res) => {
    try {
        const receipt = await externalReceiptService.verifyReceipt(req.params.id, req.headers["x-operator"] || "system");
        res.json({ success: true, data: receipt });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/:id/close", async (req, res) => {
    try {
        const receipt = await externalReceiptService.closeReceipt(req.params.id, req.headers["x-operator"] || "system");
        res.json({ success: true, data: receipt });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
exports.default = router;
