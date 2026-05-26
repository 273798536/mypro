"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_source_1 = require("../data-source");
const AcceptanceEmail_1 = require("../entities/AcceptanceEmail");
const CustomerRemark_1 = require("../entities/CustomerRemark");
const ManualOpinion_1 = require("../entities/ManualOpinion");
const SupplementaryAgreement_1 = require("../entities/SupplementaryAgreement");
const OperationTrace_1 = require("../entities/OperationTrace");
const router = (0, express_1.Router)();
const acceptanceEmailRepo = data_source_1.AppDataSource.getRepository(AcceptanceEmail_1.AcceptanceEmail);
const customerRemarkRepo = data_source_1.AppDataSource.getRepository(CustomerRemark_1.CustomerRemark);
const manualOpinionRepo = data_source_1.AppDataSource.getRepository(ManualOpinion_1.ManualOpinion);
const supplementaryAgreementRepo = data_source_1.AppDataSource.getRepository(SupplementaryAgreement_1.SupplementaryAgreement);
const operationTraceRepo = data_source_1.AppDataSource.getRepository(OperationTrace_1.OperationTrace);
const traceOperation = async (operationType, entityType, entityId, beforeSnapshot, afterSnapshot, changeSummary, operator) => {
    const trace = {
        operationType,
        entityType,
        entityId,
        beforeSnapshot: beforeSnapshot ? JSON.stringify(beforeSnapshot) : undefined,
        afterSnapshot: afterSnapshot ? JSON.stringify(afterSnapshot) : undefined,
        changeSummary,
        operator,
    };
    return await operationTraceRepo.save(trace);
};
// ==================== 验收邮件 ====================
router.post("/acceptance-emails", async (req, res) => {
    try {
        const { contractId, paymentNodeId, emailSubject, emailContent, sender, receiver } = req.body;
        const email = {
            contractId,
            paymentNodeId,
            emailSubject,
            emailContent,
            sender,
            receiver,
            status: "DRAFT",
            createdBy: req.headers["x-operator"] || "system",
        };
        const saved = await acceptanceEmailRepo.save(email);
        await traceOperation("CREATE", "AcceptanceEmail", saved.id, null, saved, "创建验收邮件", req.headers["x-operator"]);
        res.json({ success: true, data: saved });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/acceptance-emails", async (req, res) => {
    try {
        const { contractId, status, page = 1, limit = 20 } = req.query;
        const where = { isDeleted: false };
        if (contractId)
            where.contractId = contractId;
        if (status)
            where.status = status;
        const [items, total] = await acceptanceEmailRepo.findAndCount({
            where,
            order: { createdAt: "DESC" },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/acceptance-emails/:id", async (req, res) => {
    try {
        const email = await acceptanceEmailRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!email) {
            return res.status(404).json({ success: false, error: "验收邮件不存在" });
        }
        res.json({ success: true, data: email });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.put("/acceptance-emails/:id", async (req, res) => {
    try {
        const email = await acceptanceEmailRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!email) {
            return res.status(404).json({ success: false, error: "验收邮件不存在" });
        }
        const before = { ...email };
        Object.assign(email, req.body);
        email.updatedBy = req.headers["x-operator"] || "system";
        const saved = await acceptanceEmailRepo.save(email);
        await traceOperation("UPDATE", "AcceptanceEmail", saved.id, before, saved, "更新验收邮件", req.headers["x-operator"]);
        res.json({ success: true, data: saved });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/acceptance-emails/:id/send", async (req, res) => {
    try {
        const email = await acceptanceEmailRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!email) {
            return res.status(404).json({ success: false, error: "验收邮件不存在" });
        }
        const before = { ...email };
        email.status = "SENT";
        email.sentAt = new Date().toISOString();
        email.updatedBy = req.headers["x-operator"] || "system";
        const saved = await acceptanceEmailRepo.save(email);
        await traceOperation("UPDATE", "AcceptanceEmail", saved.id, before, saved, "发送验收邮件", req.headers["x-operator"]);
        res.json({ success: true, data: saved });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/acceptance-emails/:id/confirm", async (req, res) => {
    try {
        const email = await acceptanceEmailRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!email) {
            return res.status(404).json({ success: false, error: "验收邮件不存在" });
        }
        const before = { ...email };
        email.status = "CONFIRMED";
        email.receivedAt = new Date().toISOString();
        email.updatedBy = req.headers["x-operator"] || "system";
        const saved = await acceptanceEmailRepo.save(email);
        await traceOperation("UPDATE", "AcceptanceEmail", saved.id, before, saved, "确认验收邮件", req.headers["x-operator"]);
        res.json({ success: true, data: saved });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.delete("/acceptance-emails/:id", async (req, res) => {
    try {
        const email = await acceptanceEmailRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!email) {
            return res.status(404).json({ success: false, error: "验收邮件不存在" });
        }
        email.isDeleted = true;
        await acceptanceEmailRepo.save(email);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// ==================== 客服备注 ====================
router.post("/customer-remarks", async (req, res) => {
    try {
        const { contractId, paymentNodeId, content, isInternal } = req.body;
        const remark = {
            contractId,
            paymentNodeId,
            content,
            isInternal: isInternal || false,
            createdBy: req.headers["x-operator"] || "system",
        };
        const saved = await customerRemarkRepo.save(remark);
        await traceOperation("CREATE", "CustomerRemark", saved.id, null, saved, "创建客服备注", req.headers["x-operator"]);
        res.json({ success: true, data: saved });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/customer-remarks", async (req, res) => {
    try {
        const { contractId, paymentNodeId, page = 1, limit = 20 } = req.query;
        const where = { isDeleted: false };
        if (contractId)
            where.contractId = contractId;
        if (paymentNodeId)
            where.paymentNodeId = paymentNodeId;
        const [items, total] = await customerRemarkRepo.findAndCount({
            where,
            order: { createdAt: "DESC" },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/customer-remarks/:id", async (req, res) => {
    try {
        const remark = await customerRemarkRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!remark) {
            return res.status(404).json({ success: false, error: "客服备注不存在" });
        }
        res.json({ success: true, data: remark });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.put("/customer-remarks/:id", async (req, res) => {
    try {
        const remark = await customerRemarkRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!remark) {
            return res.status(404).json({ success: false, error: "客服备注不存在" });
        }
        const before = { ...remark };
        Object.assign(remark, req.body);
        remark.updatedBy = req.headers["x-operator"] || "system";
        const saved = await customerRemarkRepo.save(remark);
        await traceOperation("UPDATE", "CustomerRemark", saved.id, before, saved, "更新客服备注", req.headers["x-operator"]);
        res.json({ success: true, data: saved });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.delete("/customer-remarks/:id", async (req, res) => {
    try {
        const remark = await customerRemarkRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!remark) {
            return res.status(404).json({ success: false, error: "客服备注不存在" });
        }
        remark.isDeleted = true;
        await customerRemarkRepo.save(remark);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// ==================== 人工意见 ====================
router.post("/manual-opinions", async (req, res) => {
    try {
        const { contractId, paymentNodeId, retryQueueId, content, opinionType, handler, department } = req.body;
        const opinion = {
            contractId,
            paymentNodeId,
            retryQueueId,
            content,
            opinionType: opinionType || "INFORMATION",
            handler,
            department,
        };
        const saved = await manualOpinionRepo.save(opinion);
        await traceOperation("CREATE", "ManualOpinion", saved.id, null, saved, "创建人工意见", req.headers["x-operator"]);
        res.json({ success: true, data: saved });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/manual-opinions", async (req, res) => {
    try {
        const { contractId, retryQueueId, opinionType, page = 1, limit = 20 } = req.query;
        const where = { isDeleted: false };
        if (contractId)
            where.contractId = contractId;
        if (retryQueueId)
            where.retryQueueId = retryQueueId;
        if (opinionType)
            where.opinionType = opinionType;
        const [items, total] = await manualOpinionRepo.findAndCount({
            where,
            order: { createdAt: "DESC" },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/manual-opinions/:id", async (req, res) => {
    try {
        const opinion = await manualOpinionRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!opinion) {
            return res.status(404).json({ success: false, error: "人工意见不存在" });
        }
        res.json({ success: true, data: opinion });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.put("/manual-opinions/:id", async (req, res) => {
    try {
        const opinion = await manualOpinionRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!opinion) {
            return res.status(404).json({ success: false, error: "人工意见不存在" });
        }
        const before = { ...opinion };
        Object.assign(opinion, req.body);
        const saved = await manualOpinionRepo.save(opinion);
        await traceOperation("UPDATE", "ManualOpinion", saved.id, before, saved, "更新人工意见", req.headers["x-operator"]);
        res.json({ success: true, data: saved });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.delete("/manual-opinions/:id", async (req, res) => {
    try {
        const opinion = await manualOpinionRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!opinion) {
            return res.status(404).json({ success: false, error: "人工意见不存在" });
        }
        opinion.isDeleted = true;
        await manualOpinionRepo.save(opinion);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// ==================== 补充协议 ====================
router.post("/supplementary-agreements", async (req, res) => {
    try {
        const { contractId, agreementNo, agreementName, signDate, effectiveDate, amountChange, description } = req.body;
        const agreement = {
            contractId,
            agreementNo,
            agreementName,
            signDate,
            effectiveDate,
            amountChange: amountChange || 0,
            description,
            status: "DRAFT",
            createdBy: req.headers["x-operator"] || "system",
        };
        const saved = await supplementaryAgreementRepo.save(agreement);
        await traceOperation("CREATE", "SupplementaryAgreement", saved.id, null, saved, "创建补充协议", req.headers["x-operator"]);
        res.json({ success: true, data: saved });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/supplementary-agreements", async (req, res) => {
    try {
        const { contractId, status, page = 1, limit = 20 } = req.query;
        const where = { isDeleted: false };
        if (contractId)
            where.contractId = contractId;
        if (status)
            where.status = status;
        const [items, total] = await supplementaryAgreementRepo.findAndCount({
            where,
            order: { createdAt: "DESC" },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/supplementary-agreements/:id", async (req, res) => {
    try {
        const agreement = await supplementaryAgreementRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!agreement) {
            return res.status(404).json({ success: false, error: "补充协议不存在" });
        }
        res.json({ success: true, data: agreement });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.put("/supplementary-agreements/:id", async (req, res) => {
    try {
        const agreement = await supplementaryAgreementRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!agreement) {
            return res.status(404).json({ success: false, error: "补充协议不存在" });
        }
        const before = { ...agreement };
        Object.assign(agreement, req.body);
        agreement.updatedBy = req.headers["x-operator"] || "system";
        const saved = await supplementaryAgreementRepo.save(agreement);
        await traceOperation("UPDATE", "SupplementaryAgreement", saved.id, before, saved, "更新补充协议", req.headers["x-operator"]);
        res.json({ success: true, data: saved });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/supplementary-agreements/:id/sign", async (req, res) => {
    try {
        const agreement = await supplementaryAgreementRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!agreement) {
            return res.status(404).json({ success: false, error: "补充协议不存在" });
        }
        const before = { ...agreement };
        agreement.status = "SIGNED";
        agreement.signDate = new Date().toISOString().split('T')[0];
        agreement.updatedBy = req.headers["x-operator"] || "system";
        const saved = await supplementaryAgreementRepo.save(agreement);
        await traceOperation("UPDATE", "SupplementaryAgreement", saved.id, before, saved, "签署补充协议", req.headers["x-operator"]);
        res.json({ success: true, data: saved });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.delete("/supplementary-agreements/:id", async (req, res) => {
    try {
        const agreement = await supplementaryAgreementRepo.findOneBy({ id: req.params.id, isDeleted: false });
        if (!agreement) {
            return res.status(404).json({ success: false, error: "补充协议不存在" });
        }
        agreement.isDeleted = true;
        await supplementaryAgreementRepo.save(agreement);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
exports.default = router;
