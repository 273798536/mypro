"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_source_1 = require("../data-source");
const ValveInventory_1 = require("../entities/ValveInventory");
const DirtyRecordService_1 = require("../services/DirtyRecordService");
const AuditService_1 = require("../services/AuditService");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const inventoryRepo = data_source_1.AppDataSource.getRepository(ValveInventory_1.ValveInventory);
const dirtyRecordService = new DirtyRecordService_1.DirtyRecordService();
const auditService = new AuditService_1.AuditService();
router.get("/", async (req, res) => {
    try {
        const { page = 1, pageSize = 20, materialCode, workOrderNo, operation } = req.query;
        const where = {};
        if (materialCode)
            where.materialCode = materialCode;
        if (workOrderNo)
            where.workOrderNo = workOrderNo;
        if (operation)
            where.operation = operation;
        const [data, total] = await inventoryRepo.findAndCount({
            where,
            order: { operationTime: "DESC" },
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
        const inventory = await inventoryRepo.findOne({
            where: { id: req.params.id },
        });
        if (!inventory) {
            return res
                .status(404)
                .json({ success: false, message: "库存记录不存在" });
        }
        res.json({ success: true, data: inventory });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const inventory = inventoryRepo.create(req.body);
        inventory.rawData = req.body;
        const lastRecord = await inventoryRepo.findOne({
            where: { materialCode: inventory.materialCode },
            order: { operationTime: "DESC" },
        });
        const lastBalance = lastRecord?.balanceAfter || 0;
        if (inventory.operation === "in") {
            inventory.balanceAfter = lastBalance + inventory.quantity;
        }
        else if (inventory.operation === "out") {
            inventory.balanceAfter = lastBalance - inventory.quantity;
        }
        else {
            inventory.balanceAfter = inventory.quantity;
        }
        const saved = await inventoryRepo.save(inventory);
        await auditService.createSnapshot("after_create", "inventory", saved.id, saved, undefined, {
            operationId,
            operationName: "create_inventory",
            operator: req.headers["x-operator"] || "system",
        });
        const dirtyRecords = await dirtyRecordService.validateInventory(saved);
        if (dirtyRecords.length > 0) {
            await inventoryRepo.update(saved.id, {
                isDirty: true,
                dirtyReasons: dirtyRecords.map((d) => d.dirtyType),
            });
        }
        res.json({
            success: true,
            data: saved,
            dirtyRecords: dirtyRecords.length,
            operationId,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/batch", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const { records, isBackfill } = req.body;
        const results = [];
        for (const record of records) {
            const inventory = inventoryRepo.create(record);
            inventory.rawData = record;
            if (isBackfill) {
                inventory.isBackfilled = true;
                inventory.backfillTime = new Date();
            }
            const lastRecord = await inventoryRepo.findOne({
                where: { materialCode: inventory.materialCode },
                order: { operationTime: "DESC" },
            });
            const lastBalance = lastRecord?.balanceAfter || 0;
            if (inventory.operation === "in") {
                inventory.balanceAfter = lastBalance + inventory.quantity;
            }
            else if (inventory.operation === "out") {
                inventory.balanceAfter = lastBalance - inventory.quantity;
            }
            else {
                inventory.balanceAfter = inventory.quantity;
            }
            const saved = await inventoryRepo.save(inventory);
            await dirtyRecordService.validateInventory(saved);
            results.push(saved);
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
        const inventory = await inventoryRepo.findOne({
            where: { id: req.params.id },
        });
        if (!inventory) {
            return res
                .status(404)
                .json({ success: false, message: "库存记录不存在" });
        }
        const previousData = { ...inventory };
        await auditService.createSnapshot("before_update", "inventory", inventory.id, previousData, undefined, {
            operationId,
            operationName: "update_inventory",
            operator: req.headers["x-operator"] || "system",
        });
        inventoryRepo.merge(inventory, req.body);
        inventory.rawData = { ...inventory.rawData, ...req.body };
        const saved = await inventoryRepo.save(inventory);
        await auditService.createSnapshot("after_update", "inventory", saved.id, saved, previousData, {
            operationId,
            operationName: "update_inventory",
            operator: req.headers["x-operator"] || "system",
        });
        await dirtyRecordService.validateInventory(saved);
        res.json({ success: true, data: saved, operationId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/material/:materialCode/balance", async (req, res) => {
    try {
        const lastRecord = await inventoryRepo.findOne({
            where: { materialCode: req.params.materialCode },
            order: { operationTime: "DESC" },
        });
        res.json({
            success: true,
            data: {
                materialCode: req.params.materialCode,
                balance: lastRecord?.balanceAfter || 0,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
