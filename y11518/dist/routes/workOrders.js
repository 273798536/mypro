"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_source_1 = require("../data-source");
const WorkOrder_1 = require("../entities/WorkOrder");
const MaterialUsage_1 = require("../entities/MaterialUsage");
const DirtyRecordService_1 = require("../services/DirtyRecordService");
const AuditService_1 = require("../services/AuditService");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const workOrderRepo = data_source_1.AppDataSource.getRepository(WorkOrder_1.WorkOrder);
const materialUsageRepo = data_source_1.AppDataSource.getRepository(MaterialUsage_1.MaterialUsage);
const dirtyRecordService = new DirtyRecordService_1.DirtyRecordService();
const auditService = new AuditService_1.AuditService();
router.get("/", async (req, res) => {
    try {
        const { page = 1, pageSize = 20, status, siteName } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (siteName)
            where.siteName = siteName;
        const [data, total] = await workOrderRepo.findAndCount({
            where,
            order: { createdAt: "DESC" },
            skip: (Number(page) - 1) * Number(pageSize),
            take: Number(pageSize),
            relations: ["materialUsages"],
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
        const workOrder = await workOrderRepo.findOne({
            where: { id: req.params.id },
            relations: ["materialUsages", "photos"],
        });
        if (!workOrder) {
            return res
                .status(404)
                .json({ success: false, message: "工单不存在" });
        }
        res.json({ success: true, data: workOrder });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/no/:orderNo", async (req, res) => {
    try {
        const workOrder = await workOrderRepo.findOne({
            where: { orderNo: req.params.orderNo },
            relations: ["materialUsages", "photos"],
        });
        if (!workOrder) {
            return res
                .status(404)
                .json({ success: false, message: "工单不存在" });
        }
        res.json({ success: true, data: workOrder });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const { materialUsages, ...orderData } = req.body;
        const workOrder = workOrderRepo.create(orderData);
        workOrder.rawData = req.body;
        const saved = await workOrderRepo.save(workOrder);
        await auditService.createSnapshot("after_create", "work_order", saved.id, saved, undefined, {
            operationId,
            operationName: "create_work_order",
            operator: req.headers["x-operator"] || "system",
        });
        if (materialUsages && materialUsages.length > 0) {
            for (const mu of materialUsages) {
                const usage = materialUsageRepo.create({
                    ...mu,
                    workOrderId: saved.id,
                    totalAmount: mu.quantity * mu.unitPrice,
                });
                const savedUsage = await materialUsageRepo.save(usage);
                await dirtyRecordService.validateMaterialUsage(savedUsage);
            }
            const totalAmount = materialUsages.reduce((sum, mu) => sum + mu.quantity * mu.unitPrice, 0);
            await workOrderRepo.update(saved.id, {
                materialTotalAmount: totalAmount,
            });
        }
        const dirtyRecords = await dirtyRecordService.validateWorkOrder(saved);
        if (dirtyRecords.length > 0) {
            await workOrderRepo.update(saved.id, {
                isDirty: true,
                dirtyReasons: dirtyRecords.map((d) => d.dirtyType),
            });
        }
        const result = await workOrderRepo.findOne({
            where: { id: saved.id },
            relations: ["materialUsages"],
        });
        res.json({
            success: true,
            data: result,
            dirtyRecords: dirtyRecords.length,
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
        const workOrder = await workOrderRepo.findOne({
            where: { id: req.params.id },
        });
        if (!workOrder) {
            return res
                .status(404)
                .json({ success: false, message: "工单不存在" });
        }
        const previousData = { ...workOrder };
        await auditService.createSnapshot("before_update", "work_order", workOrder.id, previousData, undefined, {
            operationId,
            operationName: "update_work_order",
            operator: req.headers["x-operator"] || "system",
        });
        const { materialUsages, ...updateData } = req.body;
        workOrderRepo.merge(workOrder, updateData);
        workOrder.rawData = { ...workOrder.rawData, ...updateData };
        const saved = await workOrderRepo.save(workOrder);
        await auditService.createSnapshot("after_update", "work_order", saved.id, saved, previousData, {
            operationId,
            operationName: "update_work_order",
            operator: req.headers["x-operator"] || "system",
        });
        if (materialUsages) {
            await materialUsageRepo.delete({ workOrderId: saved.id });
            for (const mu of materialUsages) {
                const usage = materialUsageRepo.create({
                    ...mu,
                    workOrderId: saved.id,
                    totalAmount: mu.quantity * mu.unitPrice,
                });
                await materialUsageRepo.save(usage);
            }
            const totalAmount = materialUsages.reduce((sum, mu) => sum + mu.quantity * mu.unitPrice, 0);
            await workOrderRepo.update(saved.id, {
                materialTotalAmount: totalAmount,
            });
        }
        await dirtyRecordService.validateWorkOrder(saved);
        res.json({ success: true, data: saved, operationId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/:id/history", async (req, res) => {
    try {
        const history = await auditService.getSnapshotHistory("work_order", req.params.id);
        res.json({ success: true, data: history });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
