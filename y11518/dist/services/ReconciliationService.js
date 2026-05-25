"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const data_source_1 = require("../data-source");
const Reconciliation_1 = require("../entities/Reconciliation");
const WorkOrder_1 = require("../entities/WorkOrder");
const ValveInventory_1 = require("../entities/ValveInventory");
const MaterialUsage_1 = require("../entities/MaterialUsage");
const SupplierBill_1 = require("../entities/SupplierBill");
const BillItem_1 = require("../entities/BillItem");
const AuditService_1 = require("./AuditService");
const uuid_1 = require("uuid");
class ReconciliationService {
    constructor() {
        this.reconcileRepo = data_source_1.AppDataSource.getRepository(Reconciliation_1.Reconciliation);
        this.workOrderRepo = data_source_1.AppDataSource.getRepository(WorkOrder_1.WorkOrder);
        this.inventoryRepo = data_source_1.AppDataSource.getRepository(ValveInventory_1.ValveInventory);
        this.materialUsageRepo = data_source_1.AppDataSource.getRepository(MaterialUsage_1.MaterialUsage);
        this.billRepo = data_source_1.AppDataSource.getRepository(SupplierBill_1.SupplierBill);
        this.billItemRepo = data_source_1.AppDataSource.getRepository(BillItem_1.BillItem);
        this.auditService = new AuditService_1.AuditService();
    }
    async reconcileWorkOrder(workOrderNo, operator, operationId) {
        const opId = operationId || (0, uuid_1.v4)();
        const workOrder = await this.workOrderRepo.findOne({
            where: { orderNo: workOrderNo },
            relations: ["materialUsages"],
        });
        if (!workOrder) {
            throw new Error(`工单${workOrderNo}不存在`);
        }
        await this.auditService.createSnapshot("before_reconcile", "work_order", workOrder.id, workOrder, undefined, {
            operationId: opId,
            operationName: "reconcile_work_order",
            operator,
        });
        const materialUsages = await this.materialUsageRepo.find({
            where: { workOrderId: workOrder.id },
        });
        const inventoryRecords = await this.inventoryRepo.find({
            where: { workOrderNo, operation: "out" },
        });
        const billItems = await this.billItemRepo.find({
            where: { workOrderNo },
        });
        const workOrderSummary = this.buildWorkOrderSummary(workOrder, materialUsages);
        const inventorySummary = this.buildInventorySummary(inventoryRecords);
        const billSummary = this.buildBillSummary(billItems);
        const matchResult = this.calculateMatchResult(workOrderSummary, inventorySummary, billSummary);
        const details = matchResult.details;
        const hasBillItems = billSummary.items.length > 0;
        let status = "matched";
        const allThreeWayMatched = details.every((d) => {
            if (d.status !== "matched")
                return false;
            if (hasBillItems) {
                return (d.workOrderQty === d.inventoryQty &&
                    d.workOrderQty === d.billQty &&
                    Math.abs(d.workOrderAmount - d.inventoryAmount) < 0.01 &&
                    Math.abs(d.workOrderAmount - d.billAmount) < 0.01);
            }
            return (d.workOrderQty === d.inventoryQty &&
                Math.abs(d.workOrderAmount - d.inventoryAmount) < 0.01);
        });
        const anyMatched = details.some((d) => d.status === "matched");
        if (allThreeWayMatched) {
            status = "matched";
        }
        else if (anyMatched) {
            status = "partial_match";
        }
        else {
            status = "mismatch";
        }
        const reconciliation = new Reconciliation_1.Reconciliation();
        reconciliation.batchNo = `RC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        reconciliation.workOrderNo = workOrderNo;
        reconciliation.reconcileTime = new Date();
        reconciliation.workOrderSummary = workOrderSummary;
        reconciliation.inventorySummary = inventorySummary;
        reconciliation.billSummary = billSummary;
        reconciliation.matchResult = matchResult;
        reconciliation.status = status;
        reconciliation.reconciledBy = operator;
        const result = await this.reconcileRepo.save(reconciliation);
        await this.auditService.createSnapshot("after_reconcile", "work_order", workOrder.id, result, workOrder, {
            operationId: opId,
            operationName: "reconcile_work_order",
            operator,
            remark: `对账完成，状态: ${status}`,
        });
        return result;
    }
    buildWorkOrderSummary(workOrder, materialUsages) {
        const materials = materialUsages.map((m) => ({
            materialCode: m.materialCode,
            materialName: m.materialName,
            quantity: m.quantity,
            unitPrice: Number(m.unitPrice),
            totalAmount: Number(m.totalAmount),
        }));
        return {
            orderNo: workOrder.orderNo,
            materialCount: materials.length,
            totalAmount: materials.reduce((sum, m) => sum + m.totalAmount, 0),
            materials,
        };
    }
    buildInventorySummary(inventoryRecords) {
        const items = inventoryRecords.map((i) => ({
            materialCode: i.materialCode,
            materialName: i.materialName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            totalAmount: i.quantity * Number(i.unitPrice),
            isBackfilled: i.isBackfilled,
        }));
        return {
            totalOut: items.reduce((sum, i) => sum + i.quantity, 0),
            totalAmount: items.reduce((sum, i) => sum + i.totalAmount, 0),
            items,
        };
    }
    buildBillSummary(billItems) {
        const items = billItems.map((b) => ({
            billNo: b.billId,
            materialCode: b.materialCode,
            materialName: b.materialName,
            quantity: b.quantity,
            unitPrice: Number(b.unitPrice),
            totalAmount: Number(b.totalAmount),
        }));
        return {
            billCount: new Set(items.map((i) => i.billNo)).size,
            totalAmount: items.reduce((sum, i) => sum + i.totalAmount, 0),
            items,
        };
    }
    calculateMatchResult(workOrderSummary, inventorySummary, billSummary) {
        const allMaterialCodes = new Set();
        workOrderSummary.materials.forEach((m) => allMaterialCodes.add(m.materialCode));
        inventorySummary.items.forEach((i) => allMaterialCodes.add(i.materialCode));
        billSummary.items.forEach((i) => allMaterialCodes.add(i.materialCode));
        const details = [];
        let totalQtyDiff = 0;
        let totalAmountDiff = 0;
        const hasBillItems = billSummary.items.length > 0;
        let threeWayQtyMatched = true;
        let threeWayAmountMatched = true;
        for (const code of allMaterialCodes) {
            const woMat = workOrderSummary.materials.find((m) => m.materialCode === code);
            const invMat = inventorySummary.items.find((i) => i.materialCode === code);
            const billMat = billSummary.items.find((i) => i.materialCode === code);
            const workOrderQty = woMat?.quantity || 0;
            const inventoryQty = invMat?.quantity || 0;
            const billQty = billMat?.quantity || 0;
            const qtyDiff = workOrderQty - inventoryQty;
            const workOrderAmount = woMat?.totalAmount || 0;
            const inventoryAmount = invMat?.totalAmount || 0;
            const billAmount = billMat?.totalAmount || 0;
            const amountDiff = workOrderAmount - inventoryAmount;
            totalQtyDiff += qtyDiff;
            totalAmountDiff += amountDiff;
            let status = "matched";
            if (!woMat) {
                status = "missing_in_workorder";
            }
            else if (!invMat) {
                status = "missing_in_inventory";
            }
            else if (hasBillItems && !billMat) {
                status = "missing_in_bill";
            }
            else if (workOrderQty !== inventoryQty ||
                (hasBillItems && workOrderQty !== billQty) ||
                Math.abs(workOrderAmount - inventoryAmount) > 0.01 ||
                (hasBillItems && Math.abs(workOrderAmount - billAmount) > 0.01)) {
                status = "mismatch";
            }
            if (hasBillItems) {
                if (workOrderQty !== inventoryQty ||
                    workOrderQty !== billQty) {
                    threeWayQtyMatched = false;
                }
                if (Math.abs(workOrderAmount - inventoryAmount) > 0.01 ||
                    Math.abs(workOrderAmount - billAmount) > 0.01) {
                    threeWayAmountMatched = false;
                }
            }
            else {
                if (workOrderQty !== inventoryQty) {
                    threeWayQtyMatched = false;
                }
                if (Math.abs(workOrderAmount - inventoryAmount) > 0.01) {
                    threeWayAmountMatched = false;
                }
            }
            details.push({
                materialCode: code,
                materialName: woMat?.materialName ||
                    invMat?.materialName ||
                    billMat?.materialName ||
                    "未知",
                workOrderQty,
                inventoryQty,
                billQty,
                qtyDiff,
                workOrderAmount,
                inventoryAmount,
                billAmount,
                amountDiff,
                status,
            });
        }
        return {
            quantityMatched: threeWayQtyMatched,
            amountMatched: threeWayAmountMatched,
            quantityDiff: totalQtyDiff,
            amountDiff: totalAmountDiff,
            details,
        };
    }
    async getReconciliationHistory(workOrderNo) {
        const where = {};
        if (workOrderNo) {
            where.workOrderNo = workOrderNo;
        }
        return await this.reconcileRepo.find({
            where,
            order: { reconcileTime: "DESC" },
        });
    }
    async getReconciliationDetail(id) {
        return await this.reconcileRepo.findOne({ where: { id } });
    }
    async getReconciliationStats() {
        const all = await this.reconcileRepo.find();
        return {
            total: all.length,
            matched: all.filter((r) => r.status === "matched").length,
            mismatch: all.filter((r) => r.status === "mismatch").length,
            partialMatch: all.filter((r) => r.status === "partial_match").length,
            totalAmountDiff: all.reduce((sum, r) => sum + r.matchResult.amountDiff, 0),
            totalQuantityDiff: all.reduce((sum, r) => sum + r.matchResult.quantityDiff, 0),
        };
    }
}
exports.ReconciliationService = ReconciliationService;
