"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const data_source_1 = require("../data-source");
const WorkOrder_1 = require("../entities/WorkOrder");
const ValveInventory_1 = require("../entities/ValveInventory");
const Reconciliation_1 = require("../entities/Reconciliation");
const DirtyRecord_1 = require("../entities/DirtyRecord");
const AuditService_1 = require("./AuditService");
const uuid_1 = require("uuid");
const XLSX = __importStar(require("xlsx"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ExportService {
    constructor() {
        this.auditService = new AuditService_1.AuditService();
    }
    ensureExportDir() {
        const exportDir = path.join(process.cwd(), "exports");
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }
        return exportDir;
    }
    async exportWorkOrders(workOrderNos, operator = "system") {
        const operationId = (0, uuid_1.v4)();
        await this.auditService.createSnapshot("before_export", "system", "export_workorders", {
            exportType: "workorders",
            workOrderNos: workOrderNos || [],
            timestamp: new Date().toISOString(),
        }, undefined, {
            operationId,
            operationName: "export_workorders",
            operator,
            remark: "开始导出工单数据",
        });
        const where = {};
        if (workOrderNos && workOrderNos.length > 0) {
            where.orderNo = workOrderNos;
        }
        const workOrders = await data_source_1.AppDataSource.getRepository(WorkOrder_1.WorkOrder).find({
            where,
            relations: ["materialUsages"],
        });
        const rows = workOrders.map((wo) => ({
            工单编号: wo.orderNo,
            站点名称: wo.siteName,
            报修人: wo.reporter,
            报修时间: wo.reportTime?.toISOString().slice(0, 19).replace("T", " "),
            状态: this.getStatusText(wo.status),
            抢修队: wo.repairTeam,
            队长: wo.teamLeader,
            人工费: wo.laborCost || 0,
            材料费: wo.materialTotalAmount,
            材料数量: wo.materialUsages?.length || 0,
            是否异常: wo.isDirty ? "是" : "否",
            异常原因: wo.dirtyReasons?.join(", ") || "",
            创建时间: wo.createdAt?.toISOString().slice(0, 19).replace("T", " "),
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "工单列表");
        const materialRows = workOrders.flatMap((wo) => (wo.materialUsages || []).map((mu) => ({
            工单编号: wo.orderNo,
            物料编码: mu.materialCode,
            物料名称: mu.materialName,
            规格: mu.specification || "",
            单位: mu.unit || "",
            数量: mu.quantity,
            单价: mu.unitPrice,
            总价: mu.totalAmount,
            是否异常: mu.isDirty ? "是" : "否",
        })));
        if (materialRows.length > 0) {
            const ws2 = XLSX.utils.json_to_sheet(materialRows);
            XLSX.utils.book_append_sheet(wb, ws2, "材料明细");
        }
        const exportDir = this.ensureExportDir();
        const filename = `工单导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
        const filepath = path.join(exportDir, filename);
        XLSX.writeFile(wb, filepath);
        await this.auditService.createSnapshot("after_export", "system", "export_workorders", {
            exportType: "workorders",
            filename,
            filepath,
            recordCount: workOrders.length,
            materialCount: materialRows.length,
        }, {
            exportType: "workorders",
            workOrderNos: workOrderNos || [],
            timestamp: new Date().toISOString(),
        }, {
            operationId,
            operationName: "export_workorders",
            operator,
            remark: `导出工单完成，共${workOrders.length}条记录`,
        });
        return filepath;
    }
    async exportInventory(startDate, endDate, operator = "system") {
        const operationId = (0, uuid_1.v4)();
        await this.auditService.createSnapshot("before_export", "system", "export_inventory", {
            exportType: "inventory",
            startDate: startDate?.toISOString() || null,
            endDate: endDate?.toISOString() || null,
            timestamp: new Date().toISOString(),
        }, undefined, {
            operationId,
            operationName: "export_inventory",
            operator,
            remark: "开始导出库存数据",
        });
        const where = {};
        if (startDate || endDate) {
            where.operationTime = {};
            if (startDate)
                where.operationTime.$gte = startDate;
            if (endDate)
                where.operationTime.$lte = endDate;
        }
        const inventories = await data_source_1.AppDataSource.getRepository(ValveInventory_1.ValveInventory).find({
            where,
            order: { operationTime: "DESC" },
        });
        const rows = inventories.map((inv) => ({
            物料编码: inv.materialCode,
            物料名称: inv.materialName,
            规格: inv.specification || "",
            单位: inv.unit || "",
            单价: inv.unitPrice,
            操作类型: inv.operation === "in" ? "入库" : inv.operation === "out" ? "出库" : "调整",
            数量: inv.quantity,
            操作后结余: inv.balanceAfter,
            操作时间: inv.operationTime?.toISOString().slice(0, 19).replace("T", " "),
            关联工单: inv.workOrderNo || "",
            仓库: inv.warehouse || "",
            操作员: inv.operator || "",
            是否补录: inv.isBackfilled ? "是" : "否",
            补录时间: inv.backfillTime?.toISOString().slice(0, 19).replace("T", " ") || "",
            是否异常: inv.isDirty ? "是" : "否",
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "库存记录");
        const exportDir = this.ensureExportDir();
        const filename = `库存导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
        const filepath = path.join(exportDir, filename);
        XLSX.writeFile(wb, filepath);
        await this.auditService.createSnapshot("after_export", "system", "export_inventory", {
            exportType: "inventory",
            filename,
            filepath,
            recordCount: inventories.length,
        }, {
            exportType: "inventory",
            startDate: startDate?.toISOString() || null,
            endDate: endDate?.toISOString() || null,
            timestamp: new Date().toISOString(),
        }, {
            operationId,
            operationName: "export_inventory",
            operator,
            remark: `导出库存完成，共${inventories.length}条记录`,
        });
        return filepath;
    }
    async exportReconciliation(workOrderNo, operator = "system") {
        const operationId = (0, uuid_1.v4)();
        await this.auditService.createSnapshot("before_export", "system", "export_reconciliation", {
            exportType: "reconciliation",
            workOrderNo: workOrderNo || null,
            timestamp: new Date().toISOString(),
        }, undefined, {
            operationId,
            operationName: "export_reconciliation",
            operator,
            remark: "开始导出对账数据",
        });
        const where = {};
        if (workOrderNo) {
            where.workOrderNo = workOrderNo;
        }
        const reconciliations = await data_source_1.AppDataSource.getRepository(Reconciliation_1.Reconciliation).find({
            where,
            order: { reconcileTime: "DESC" },
        });
        const rows = reconciliations.map((r) => ({
            批次号: r.batchNo,
            工单编号: r.workOrderNo,
            对账时间: r.reconcileTime?.toISOString().slice(0, 19).replace("T", " "),
            对账状态: this.getReconcileStatusText(r.status),
            工单材料数: r.workOrderSummary.materialCount,
            工单总金额: r.workOrderSummary.totalAmount,
            库存出库数: r.inventorySummary.totalOut,
            库存总金额: r.inventorySummary.totalAmount,
            账单数量: r.billSummary.billCount,
            账单总金额: r.billSummary.totalAmount,
            数量差异: r.matchResult.quantityDiff,
            金额差异: r.matchResult.amountDiff,
            对账人: r.reconciledBy || "",
        }));
        const detailRows = reconciliations.flatMap((r) => r.matchResult.details.map((d) => ({
            批次号: r.batchNo,
            工单编号: r.workOrderNo,
            物料编码: d.materialCode,
            物料名称: d.materialName,
            工单数量: d.workOrderQty,
            库存数量: d.inventoryQty,
            账单数量: d.billQty,
            数量差异: d.qtyDiff,
            工单金额: d.workOrderAmount,
            库存金额: d.inventoryAmount,
            账单金额: d.billAmount,
            金额差异: d.amountDiff,
            状态: this.getMatchStatusText(d.status),
        })));
        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws1, "对账汇总");
        const ws2 = XLSX.utils.json_to_sheet(detailRows);
        XLSX.utils.book_append_sheet(wb, ws2, "对账明细");
        const exportDir = this.ensureExportDir();
        const filename = `对账报表_${new Date().toISOString().slice(0, 10)}.xlsx`;
        const filepath = path.join(exportDir, filename);
        XLSX.writeFile(wb, filepath);
        await this.auditService.createSnapshot("after_export", "system", "export_reconciliation", {
            exportType: "reconciliation",
            filename,
            filepath,
            recordCount: reconciliations.length,
            detailCount: detailRows.length,
        }, {
            exportType: "reconciliation",
            workOrderNo: workOrderNo || null,
            timestamp: new Date().toISOString(),
        }, {
            operationId,
            operationName: "export_reconciliation",
            operator,
            remark: `导出对账完成，共${reconciliations.length}条记录`,
        });
        return filepath;
    }
    async exportDirtyRecords(operator = "system") {
        const operationId = (0, uuid_1.v4)();
        await this.auditService.createSnapshot("before_export", "system", "export_dirty_records", {
            exportType: "dirty_records",
            timestamp: new Date().toISOString(),
        }, undefined, {
            operationId,
            operationName: "export_dirty_records",
            operator,
            remark: "开始导出异常记录",
        });
        const dirtyRecords = await data_source_1.AppDataSource.getRepository(DirtyRecord_1.DirtyRecord).find({
            order: { createdAt: "DESC" },
        });
        const rows = dirtyRecords.map((dr) => ({
            ID: dr.id,
            记录类型: this.getRecordTypeText(dr.recordType),
            记录ID: dr.recordId,
            异常类型: this.getDirtyTypeText(dr.dirtyType),
            描述: dr.description,
            状态: dr.status === "pending" ? "待处理" : dr.status === "resolved" ? "已解决" : "已忽略",
            处理人: dr.resolvedBy || "",
            处理时间: dr.resolvedAt?.toISOString().slice(0, 19).replace("T", " ") || "",
            处理意见: dr.resolutionNote || "",
            创建时间: dr.createdAt?.toISOString().slice(0, 19).replace("T", " "),
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "异常记录");
        const exportDir = this.ensureExportDir();
        const filename = `异常记录_${new Date().toISOString().slice(0, 10)}.xlsx`;
        const filepath = path.join(exportDir, filename);
        XLSX.writeFile(wb, filepath);
        await this.auditService.createSnapshot("after_export", "system", "export_dirty_records", {
            exportType: "dirty_records",
            filename,
            filepath,
            recordCount: dirtyRecords.length,
        }, {
            exportType: "dirty_records",
            timestamp: new Date().toISOString(),
        }, {
            operationId,
            operationName: "export_dirty_records",
            operator,
            remark: `导出异常记录完成，共${dirtyRecords.length}条记录`,
        });
        return filepath;
    }
    getStatusText(status) {
        const map = {
            created: "已创建",
            dispatched: "已派单",
            in_progress: "处理中",
            completed: "已完成",
            approved: "已审批",
        };
        return map[status] || status;
    }
    getReconcileStatusText(status) {
        const map = {
            pending: "待对账",
            matched: "已匹配",
            mismatch: "不匹配",
            partial_match: "部分匹配",
        };
        return map[status] || status;
    }
    getMatchStatusText(status) {
        const map = {
            matched: "匹配",
            mismatch: "不匹配",
            missing_in_workorder: "工单缺失",
            missing_in_inventory: "库存缺失",
            missing_in_bill: "账单缺失",
        };
        return map[status] || status;
    }
    getRecordTypeText(type) {
        const map = {
            work_order: "工单",
            inventory: "库存",
            material_usage: "材料使用",
            site_photo: "现场照片",
            approval_email: "审批邮件",
            supplier_bill: "供应商账单",
            bill_item: "账单明细",
        };
        return map[type] || type;
    }
    getDirtyTypeText(type) {
        const map = {
            missing_field: "缺失字段",
            cross_day: "跨日处理",
            name_changed: "名称变更",
            amount_conflict: "金额冲突",
            quantity_conflict: "数量冲突",
            other: "其他",
        };
        return map[type] || type;
    }
}
exports.ExportService = ExportService;
