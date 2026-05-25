"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_source_1 = require("../data-source");
const ApprovalEmail_1 = require("../entities/ApprovalEmail");
const WorkOrder_1 = require("../entities/WorkOrder");
const AuditService_1 = require("../services/AuditService");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const approvalEmailRepo = data_source_1.AppDataSource.getRepository(ApprovalEmail_1.ApprovalEmail);
const workOrderRepo = data_source_1.AppDataSource.getRepository(WorkOrder_1.WorkOrder);
const auditService = new AuditService_1.AuditService();
router.get("/", async (req, res) => {
    try {
        const { page = 1, pageSize = 20, workOrderId, approvalType, approvalStatus } = req.query;
        const where = {};
        if (workOrderId)
            where.workOrderId = workOrderId;
        if (approvalType)
            where.approvalType = approvalType;
        if (approvalStatus)
            where.approvalStatus = approvalStatus;
        const [data, total] = await approvalEmailRepo.findAndCount({
            where,
            order: { sentTime: "DESC" },
            skip: (Number(page) - 1) * Number(pageSize),
            take: Number(pageSize),
        });
        res.json({
            success: true,
            data: {
                list: data,
                total,
                page: Number(page),
                pageSize: Number(pageSize),
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const email = await approvalEmailRepo.findOne({
            where: { id: req.params.id },
        });
        if (!email) {
            return res
                .status(404)
                .json({ success: false, message: "审批邮件不存在" });
        }
        res.json({ success: true, data: email });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/workorder/:workOrderNo", async (req, res) => {
    try {
        const emails = await approvalEmailRepo.find({
            where: { workOrderNo: req.params.workOrderNo },
            order: { sentTime: "ASC" },
        });
        res.json({ success: true, data: emails });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const { workOrderNo, ...emailData } = req.body;
        if (workOrderNo) {
            const workOrder = await workOrderRepo.findOne({
                where: { orderNo: workOrderNo },
            });
            if (!workOrder) {
                return res
                    .status(404)
                    .json({ success: false, message: "关联工单不存在" });
            }
        }
        const email = approvalEmailRepo.create({
            ...emailData,
            workOrderNo: workOrderNo || null,
            sentTime: emailData.sentTime || new Date(),
        });
        email.rawData = req.body;
        const saved = await approvalEmailRepo.save(email);
        await auditService.createSnapshot("after_create", "approval_email", saved.id, saved, undefined, {
            operationId,
            operationName: "create_approval_email",
            operator: req.headers["x-operator"] || "system",
        });
        res.json({ success: true, data: saved, operationId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/append", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const { workOrderNo, messages } = req.body;
        if (!workOrderNo) {
            return res
                .status(400)
                .json({ success: false, message: "必须指定workOrderNo" });
        }
        const workOrder = await workOrderRepo.findOne({
            where: { orderNo: workOrderNo },
        });
        if (!workOrder) {
            return res
                .status(404)
                .json({ success: false, message: "关联工单不存在" });
        }
        const results = [];
        for (const msg of messages) {
            const email = approvalEmailRepo.create({
                ...msg,
                workOrderNo: workOrderNo,
                sentTime: msg.sentTime || new Date(),
            });
            email.rawData = msg;
            const saved = await approvalEmailRepo.save(email);
            results.push(saved);
            await auditService.createSnapshot("after_create", "approval_email", saved.id, saved, undefined, {
                operationId,
                operationName: "append_approval_email",
                operator: req.headers["x-operator"] || "system",
            });
        }
        res.json({
            success: true,
            data: results,
            count: results.length,
            operationId,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.put("/:id", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const email = await approvalEmailRepo.findOne({
            where: { id: req.params.id },
        });
        if (!email) {
            return res
                .status(404)
                .json({ success: false, message: "审批邮件不存在" });
        }
        const previousData = { ...email };
        await auditService.createSnapshot("before_update", "approval_email", email.id, previousData, undefined, {
            operationId,
            operationName: "update_approval_email",
            operator: req.headers["x-operator"] || "system",
        });
        approvalEmailRepo.merge(email, req.body);
        email.rawData = { ...email.rawData, ...req.body };
        const saved = await approvalEmailRepo.save(email);
        await auditService.createSnapshot("after_update", "approval_email", saved.id, saved, previousData, {
            operationId,
            operationName: "update_approval_email",
            operator: req.headers["x-operator"] || "system",
        });
        res.json({ success: true, data: saved, operationId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.delete("/:id", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const email = await approvalEmailRepo.findOne({
            where: { id: req.params.id },
        });
        if (!email) {
            return res
                .status(404)
                .json({ success: false, message: "审批邮件不存在" });
        }
        await auditService.createSnapshot("before_delete", "approval_email", email.id, email, undefined, {
            operationId,
            operationName: "delete_approval_email",
            operator: req.headers["x-operator"] || "system",
        });
        await approvalEmailRepo.remove(email);
        await auditService.createSnapshot("after_delete", "approval_email", email.id, { deleted: true, id: email.id }, email, {
            operationId,
            operationName: "delete_approval_email",
            operator: req.headers["x-operator"] || "system",
        });
        res.json({ success: true, operationId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
