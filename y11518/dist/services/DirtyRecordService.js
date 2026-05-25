"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirtyRecordService = void 0;
const data_source_1 = require("../data-source");
const DirtyRecord_1 = require("../entities/DirtyRecord");
const WorkOrder_1 = require("../entities/WorkOrder");
const ValveInventory_1 = require("../entities/ValveInventory");
const MaterialUsage_1 = require("../entities/MaterialUsage");
const AuditService_1 = require("./AuditService");
const ReconciliationService_1 = require("./ReconciliationService");
const moment_1 = __importDefault(require("moment"));
const uuid_1 = require("uuid");
class DirtyRecordService {
    constructor() {
        this.dirtyRepo = data_source_1.AppDataSource.getRepository(DirtyRecord_1.DirtyRecord);
        this.workOrderRepo = data_source_1.AppDataSource.getRepository(WorkOrder_1.WorkOrder);
        this.inventoryRepo = data_source_1.AppDataSource.getRepository(ValveInventory_1.ValveInventory);
        this.materialUsageRepo = data_source_1.AppDataSource.getRepository(MaterialUsage_1.MaterialUsage);
        this.auditService = new AuditService_1.AuditService();
        this.reconciliationService = new ReconciliationService_1.ReconciliationService();
    }
    async validateWorkOrder(workOrder) {
        const dirtyRecords = [];
        const errors = [];
        if (!workOrder.orderNo) {
            errors.push({ field: "orderNo", actual: workOrder.orderNo, message: "缺少工单编号" });
        }
        if (!workOrder.siteName) {
            errors.push({ field: "siteName", actual: workOrder.siteName, message: "缺少站点名称" });
        }
        if (!workOrder.reportTime) {
            errors.push({ field: "reportTime", actual: workOrder.reportTime, message: "缺少报修时间" });
        }
        if (!workOrder.reporter) {
            errors.push({ field: "reporter", actual: workOrder.reporter, message: "缺少报修人" });
        }
        if (errors.length > 0) {
            const dirty = new DirtyRecord_1.DirtyRecord();
            dirty.recordType = "work_order";
            dirty.recordId = workOrder.id;
            dirty.dirtyType = "missing_field";
            dirty.description = `工单${workOrder.orderNo}缺少必填字段`;
            dirty.fieldErrors = errors;
            dirty.originalData = { ...workOrder };
            dirty.status = "pending";
            dirtyRecords.push(await this.dirtyRepo.save(dirty));
        }
        if (workOrder.completeTime && workOrder.reportTime) {
            const reportDay = (0, moment_1.default)(workOrder.reportTime).format("YYYY-MM-DD");
            const completeDay = (0, moment_1.default)(workOrder.completeTime).format("YYYY-MM-DD");
            if (reportDay !== completeDay) {
                const dirty = new DirtyRecord_1.DirtyRecord();
                dirty.recordType = "work_order";
                dirty.recordId = workOrder.id;
                dirty.dirtyType = "cross_day";
                dirty.description = `工单${workOrder.orderNo}跨日处理: ${reportDay} -> ${completeDay}`;
                dirty.fieldErrors = [
                    {
                        field: "completeTime",
                        expected: reportDay,
                        actual: completeDay,
                        message: "报修和完成不在同一天",
                    },
                ];
                dirty.originalData = {
                    reportTime: workOrder.reportTime,
                    completeTime: workOrder.completeTime,
                };
                dirty.status = "pending";
                dirtyRecords.push(await this.dirtyRepo.save(dirty));
            }
        }
        return dirtyRecords;
    }
    async validateInventory(inventory) {
        const dirtyRecords = [];
        if (!inventory.materialCode || !inventory.materialName) {
            const errors = [];
            if (!inventory.materialCode) {
                errors.push({ field: "materialCode", message: "缺少物料编码" });
            }
            if (!inventory.materialName) {
                errors.push({ field: "materialName", message: "缺少物料名称" });
            }
            const dirty = new DirtyRecord_1.DirtyRecord();
            dirty.recordType = "inventory";
            dirty.recordId = inventory.id;
            dirty.dirtyType = "missing_field";
            dirty.description = "库存记录缺少必填字段";
            dirty.fieldErrors = errors;
            dirty.originalData = { ...inventory };
            dirty.status = "pending";
            dirtyRecords.push(await this.dirtyRepo.save(dirty));
        }
        if (inventory.balanceAfter < 0) {
            const dirty = new DirtyRecord_1.DirtyRecord();
            dirty.recordType = "inventory";
            dirty.recordId = inventory.id;
            dirty.dirtyType = "quantity_conflict";
            dirty.description = `库存${inventory.materialName}出现负库存: ${inventory.balanceAfter}`;
            dirty.fieldErrors = [
                {
                    field: "balanceAfter",
                    expected: ">= 0",
                    actual: inventory.balanceAfter,
                    message: "库存结余为负数",
                },
            ];
            dirty.originalData = { ...inventory };
            dirty.status = "pending";
            dirtyRecords.push(await this.dirtyRepo.save(dirty));
        }
        const sameCodeRecords = await this.inventoryRepo.find({
            where: { materialCode: inventory.materialCode },
        });
        const nameSet = new Set(sameCodeRecords.map((r) => r.materialName.trim()));
        if (nameSet.size > 1) {
            const dirty = new DirtyRecord_1.DirtyRecord();
            dirty.recordType = "inventory";
            dirty.recordId = inventory.id;
            dirty.dirtyType = "name_changed";
            dirty.description = `物料${inventory.materialCode}存在多个名称: ${Array.from(nameSet).join(", ")}`;
            dirty.fieldErrors = [
                {
                    field: "materialName",
                    expected: "名称一致",
                    actual: Array.from(nameSet),
                    message: "同一编码物料名称不一致",
                },
            ];
            dirty.originalData = {
                materialCode: inventory.materialCode,
                names: Array.from(nameSet),
            };
            dirty.status = "pending";
            dirty.relatedRecords = sameCodeRecords.map((r) => ({
                recordType: "inventory",
                recordId: r.id,
                relation: "same_material_code",
            }));
            dirtyRecords.push(await this.dirtyRepo.save(dirty));
        }
        return dirtyRecords;
    }
    async validateMaterialUsage(usage) {
        const dirtyRecords = [];
        if (!usage.materialCode || !usage.quantity || !usage.unitPrice) {
            const errors = [];
            if (!usage.materialCode) {
                errors.push({ field: "materialCode", message: "缺少物料编码" });
            }
            if (!usage.quantity) {
                errors.push({ field: "quantity", message: "缺少数量" });
            }
            if (!usage.unitPrice) {
                errors.push({ field: "unitPrice", message: "缺少单价" });
            }
            const dirty = new DirtyRecord_1.DirtyRecord();
            dirty.recordType = "material_usage";
            dirty.recordId = usage.id;
            dirty.dirtyType = "missing_field";
            dirty.description = "材料使用记录缺少必填字段";
            dirty.fieldErrors = errors;
            dirty.originalData = { ...usage };
            dirty.status = "pending";
            dirtyRecords.push(await this.dirtyRepo.save(dirty));
        }
        const calculated = usage.quantity * usage.unitPrice;
        if (Math.abs(calculated - usage.totalAmount) > 0.01) {
            const dirty = new DirtyRecord_1.DirtyRecord();
            dirty.recordType = "material_usage";
            dirty.recordId = usage.id;
            dirty.dirtyType = "amount_conflict";
            dirty.description = `金额计算不一致: 计算值${calculated} ≠ 记录值${usage.totalAmount}`;
            dirty.fieldErrors = [
                {
                    field: "totalAmount",
                    expected: calculated,
                    actual: usage.totalAmount,
                    message: "数量×单价与总金额不一致",
                },
            ];
            dirty.originalData = { ...usage };
            dirty.status = "pending";
            dirtyRecords.push(await this.dirtyRepo.save(dirty));
        }
        return dirtyRecords;
    }
    async resolveDirtyRecord(id, resolvedBy, resolutionNote, correctedData) {
        const dirty = await this.dirtyRepo.findOne({ where: { id } });
        if (!dirty)
            return null;
        const previousData = { ...dirty };
        dirty.status = "resolved";
        dirty.resolvedBy = resolvedBy;
        dirty.resolutionNote = resolutionNote;
        dirty.resolvedAt = new Date();
        if (correctedData) {
            dirty.correctedData = correctedData;
        }
        const result = await this.dirtyRepo.save(dirty);
        await this.auditService.createSnapshot("after_update", "dirty_record", result.id, result, previousData, {
            operationName: "resolve_dirty_record",
            operator: resolvedBy,
            remark: resolutionNote,
        });
        await this.applyCorrection(dirty);
        try {
            await this.reReconcileAfterCorrection(dirty, resolvedBy);
        }
        catch (e) {
            console.log("修正后重新对账失败:", e.message);
        }
        return result;
    }
    async reReconcileAfterCorrection(dirty, operator) {
        const operationId = (0, uuid_1.v4)();
        let workOrderNo = null;
        switch (dirty.recordType) {
            case "work_order":
                const wo = await this.workOrderRepo.findOne({
                    where: { id: dirty.recordId },
                });
                if (wo)
                    workOrderNo = wo.orderNo;
                break;
            case "inventory":
                const inv = await this.inventoryRepo.findOne({
                    where: { id: dirty.recordId },
                });
                if (inv && inv.workOrderNo)
                    workOrderNo = inv.workOrderNo;
                break;
            case "material_usage":
                const usage = await this.materialUsageRepo.findOne({
                    where: { id: dirty.recordId },
                    relations: ["workOrder"],
                });
                if (usage && usage.workOrder)
                    workOrderNo = usage.workOrder.orderNo;
                break;
        }
        if (workOrderNo) {
            await this.auditService.createSnapshot("before_rereconcile", "reconciliation", workOrderNo, { workOrderNo, dirtyRecordId: dirty.id }, undefined, {
                operationId,
                operationName: "auto_rereconcile_after_correction",
                operator,
                remark: `异常记录${dirty.id}修正后自动重新对账`,
            });
            await this.reconciliationService.reconcileWorkOrder(workOrderNo, operator, operationId);
            await this.auditService.createSnapshot("after_rereconcile", "reconciliation", workOrderNo, { workOrderNo, dirtyRecordId: dirty.id, reReconciled: true }, undefined, {
                operationId,
                operationName: "auto_rereconcile_after_correction",
                operator,
                remark: `异常记录${dirty.id}修正后自动重新对账完成`,
            });
        }
    }
    async applyCorrection(dirty) {
        if (!dirty.correctedData)
            return;
        switch (dirty.recordType) {
            case "work_order":
                const wo = await this.workOrderRepo.findOne({
                    where: { id: dirty.recordId },
                });
                if (wo) {
                    Object.assign(wo, dirty.correctedData);
                    await this.workOrderRepo.save(wo);
                }
                break;
            case "inventory":
                const inv = await this.inventoryRepo.findOne({
                    where: { id: dirty.recordId },
                });
                if (inv) {
                    Object.assign(inv, dirty.correctedData);
                    await this.inventoryRepo.save(inv);
                }
                break;
            case "material_usage":
                const usage = await this.materialUsageRepo.findOne({
                    where: { id: dirty.recordId },
                });
                if (usage) {
                    Object.assign(usage, dirty.correctedData);
                    await this.materialUsageRepo.save(usage);
                }
                break;
        }
    }
    async getDirtyRecords(status, dirtyType, recordType) {
        const where = {};
        if (status)
            where.status = status;
        if (dirtyType)
            where.dirtyType = dirtyType;
        if (recordType)
            where.recordType = recordType;
        return await this.dirtyRepo.find({
            where,
            order: { createdAt: "DESC" },
        });
    }
    async getDirtyRecordStats() {
        const all = await this.dirtyRepo.find();
        const stats = {
            total: all.length,
            pending: all.filter((d) => d.status === "pending").length,
            resolved: all.filter((d) => d.status === "resolved").length,
            byType: {
                missing_field: 0,
                cross_day: 0,
                name_changed: 0,
                amount_conflict: 0,
                quantity_conflict: 0,
                other: 0,
            },
        };
        for (const d of all) {
            if (stats.byType[d.dirtyType] !== undefined) {
                stats.byType[d.dirtyType]++;
            }
        }
        return stats;
    }
}
exports.DirtyRecordService = DirtyRecordService;
