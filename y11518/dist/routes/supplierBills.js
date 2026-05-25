"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const typeorm_1 = require("typeorm");
const data_source_1 = require("../data-source");
const SupplierBill_1 = require("../entities/SupplierBill");
const BillItem_1 = require("../entities/BillItem");
const WorkOrder_1 = require("../entities/WorkOrder");
const AuditService_1 = require("../services/AuditService");
const ReconciliationService_1 = require("../services/ReconciliationService");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const supplierBillRepo = data_source_1.AppDataSource.getRepository(SupplierBill_1.SupplierBill);
const billItemRepo = data_source_1.AppDataSource.getRepository(BillItem_1.BillItem);
const workOrderRepo = data_source_1.AppDataSource.getRepository(WorkOrder_1.WorkOrder);
const auditService = new AuditService_1.AuditService();
const reconciliationService = new ReconciliationService_1.ReconciliationService();
router.get("/", async (req, res) => {
    try {
        const { page = 1, pageSize = 20, workOrderNo, supplierName, status } = req.query;
        const where = {};
        if (supplierName)
            where.supplierName = supplierName;
        if (status)
            where.status = status;
        let billIds;
        if (workOrderNo) {
            const items = await billItemRepo.find({
                where: { workOrderNo: workOrderNo },
            });
            billIds = [...new Set(items.map((i) => i.billId))];
            if (billIds.length === 0) {
                return res.json({
                    success: true,
                    data: { list: [], total: 0, page: Number(page), pageSize: Number(pageSize) },
                });
            }
            where.id = (0, typeorm_1.In)(billIds);
        }
        const [data, total] = await supplierBillRepo.findAndCount({
            where,
            order: { billDate: "DESC" },
            relations: ["items"],
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
        const bill = await supplierBillRepo.findOne({
            where: { id: req.params.id },
            relations: ["items"],
        });
        if (!bill) {
            return res
                .status(404)
                .json({ success: false, message: "供应商账单不存在" });
        }
        res.json({ success: true, data: bill });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/workorder/:workOrderNo", async (req, res) => {
    try {
        const items = await billItemRepo.find({
            where: { workOrderNo: req.params.workOrderNo },
        });
        const billIds = [...new Set(items.map((i) => i.billId))];
        if (billIds.length === 0) {
            return res.json({ success: true, data: [] });
        }
        const bills = await supplierBillRepo.find({
            where: { id: (0, typeorm_1.In)(billIds) },
            order: { billDate: "ASC" },
            relations: ["items"],
        });
        res.json({ success: true, data: bills });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const { workOrderNo, items, ...billData } = req.body;
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
        const bill = supplierBillRepo.create({
            ...billData,
            billDate: billData.billDate || new Date(),
            status: billData.status || "draft",
        });
        bill.rawData = req.body;
        const savedBill = await supplierBillRepo.save(bill);
        if (items && items.length > 0) {
            const savedItems = [];
            for (const item of items) {
                const billItem = billItemRepo.create({
                    ...item,
                    billId: savedBill.id,
                    workOrderNo: workOrderNo || item.workOrderNo || null,
                });
                billItem.rawData = item;
                const savedItem = await billItemRepo.save(billItem);
                savedItems.push(savedItem);
            }
            savedBill.items = savedItems;
        }
        await auditService.createSnapshot("after_create", "supplier_bill", savedBill.id, savedBill, undefined, {
            operationId,
            operationName: "create_supplier_bill",
            operator: req.headers["x-operator"] || "system",
        });
        if (workOrderNo && req.headers["x-auto-reconcile"] === "true") {
            try {
                await reconciliationService.reconcileWorkOrder(workOrderNo, req.headers["x-operator"] || "system", operationId);
            }
            catch (e) {
                console.log("自动对账失败:", e.message);
            }
        }
        res.json({ success: true, data: savedBill, operationId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/append", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const { workOrderNo, bills } = req.body;
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
        for (const billData of bills) {
            const { items, ...billFields } = billData;
            const bill = supplierBillRepo.create({
                ...billFields,
                billDate: billFields.billDate || new Date(),
                status: billFields.status || "draft",
            });
            bill.rawData = billData;
            const savedBill = await supplierBillRepo.save(bill);
            if (items && items.length > 0) {
                const savedItems = [];
                for (const item of items) {
                    const billItem = billItemRepo.create({
                        ...item,
                        billId: savedBill.id,
                        workOrderNo: workOrderNo,
                    });
                    billItem.rawData = item;
                    const savedItem = await billItemRepo.save(billItem);
                    savedItems.push(savedItem);
                }
                savedBill.items = savedItems;
            }
            results.push(savedBill);
            await auditService.createSnapshot("after_create", "supplier_bill", savedBill.id, savedBill, undefined, {
                operationId,
                operationName: "append_supplier_bill",
                operator: req.headers["x-operator"] || "system",
            });
        }
        if (req.headers["x-auto-reconcile"] === "true") {
            try {
                await reconciliationService.reconcileWorkOrder(workOrderNo, req.headers["x-operator"] || "system", operationId);
            }
            catch (e) {
                console.log("自动对账失败:", e.message);
            }
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
        const bill = await supplierBillRepo.findOne({
            where: { id: req.params.id },
            relations: ["items"],
        });
        if (!bill) {
            return res
                .status(404)
                .json({ success: false, message: "供应商账单不存在" });
        }
        const previousData = JSON.parse(JSON.stringify(bill));
        const { items, ...updateData } = req.body;
        await auditService.createSnapshot("before_update", "supplier_bill", bill.id, previousData, undefined, {
            operationId,
            operationName: "update_supplier_bill",
            operator: req.headers["x-operator"] || "system",
        });
        supplierBillRepo.merge(bill, updateData);
        bill.rawData = { ...bill.rawData, ...updateData };
        const savedBill = await supplierBillRepo.save(bill);
        if (items && items.length > 0) {
            for (const item of items) {
                if (item.id) {
                    const existingItem = await billItemRepo.findOne({
                        where: { id: item.id },
                    });
                    if (existingItem) {
                        billItemRepo.merge(existingItem, item);
                        existingItem.rawData = {
                            ...existingItem.rawData,
                            ...item,
                        };
                        await billItemRepo.save(existingItem);
                    }
                }
                else {
                    const billItem = billItemRepo.create({
                        ...item,
                        billId: savedBill.id,
                    });
                    billItem.rawData = item;
                    await billItemRepo.save(billItem);
                }
            }
        }
        const updatedBill = await supplierBillRepo.findOne({
            where: { id: savedBill.id },
            relations: ["items"],
        });
        await auditService.createSnapshot("after_update", "supplier_bill", updatedBill.id, updatedBill, previousData, {
            operationId,
            operationName: "update_supplier_bill",
            operator: req.headers["x-operator"] || "system",
        });
        const relatedItems = await billItemRepo.find({
            where: { billId: savedBill.id },
        });
        const firstWorkOrderNo = relatedItems.find((i) => i.workOrderNo)?.workOrderNo;
        if (firstWorkOrderNo && req.headers["x-auto-reconcile"] === "true") {
            try {
                await reconciliationService.reconcileWorkOrder(firstWorkOrderNo, req.headers["x-operator"] || "system", operationId);
            }
            catch (e) {
                console.log("自动对账失败:", e.message);
            }
        }
        res.json({ success: true, data: updatedBill, operationId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/:id/reconcile", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const items = await billItemRepo.find({
            where: { billId: req.params.id },
        });
        if (items.length === 0) {
            return res
                .status(400)
                .json({ success: false, message: "该账单没有明细项" });
        }
        const firstWorkOrderNo = items.find((i) => i.workOrderNo)?.workOrderNo;
        if (!firstWorkOrderNo) {
            return res
                .status(400)
                .json({ success: false, message: "该账单未关联工单，无法对账" });
        }
        const result = await reconciliationService.reconcileWorkOrder(firstWorkOrderNo, req.headers["x-operator"] || "system", operationId);
        res.json({ success: true, data: result, operationId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.delete("/:id", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const bill = await supplierBillRepo.findOne({
            where: { id: req.params.id },
            relations: ["items"],
        });
        if (!bill) {
            return res
                .status(404)
                .json({ success: false, message: "供应商账单不存在" });
        }
        await auditService.createSnapshot("before_delete", "supplier_bill", bill.id, bill, undefined, {
            operationId,
            operationName: "delete_supplier_bill",
            operator: req.headers["x-operator"] || "system",
        });
        if (bill.items) {
            for (const item of bill.items) {
                await billItemRepo.remove(item);
            }
        }
        await supplierBillRepo.remove(bill);
        await auditService.createSnapshot("after_delete", "supplier_bill", bill.id, { deleted: true, id: bill.id }, bill, {
            operationId,
            operationName: "delete_supplier_bill",
            operator: req.headers["x-operator"] || "system",
        });
        res.json({ success: true, operationId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
