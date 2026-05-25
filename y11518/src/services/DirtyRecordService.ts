import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import {
  DirtyRecord,
  DirtyType,
  DirtyStatus,
  RecordType,
} from "../entities/DirtyRecord";
import { WorkOrder } from "../entities/WorkOrder";
import { ValveInventory } from "../entities/ValveInventory";
import { MaterialUsage } from "../entities/MaterialUsage";
import { AuditService } from "./AuditService";
import { ReconciliationService } from "./ReconciliationService";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";

export class DirtyRecordService {
  private dirtyRepo: Repository<DirtyRecord>;
  private workOrderRepo: Repository<WorkOrder>;
  private inventoryRepo: Repository<ValveInventory>;
  private materialUsageRepo: Repository<MaterialUsage>;
  private auditService: AuditService;
  private reconciliationService: ReconciliationService;

  constructor() {
    this.dirtyRepo = AppDataSource.getRepository(DirtyRecord);
    this.workOrderRepo = AppDataSource.getRepository(WorkOrder);
    this.inventoryRepo = AppDataSource.getRepository(ValveInventory);
    this.materialUsageRepo = AppDataSource.getRepository(MaterialUsage);
    this.auditService = new AuditService();
    this.reconciliationService = new ReconciliationService();
  }

  async validateWorkOrder(workOrder: WorkOrder): Promise<DirtyRecord[]> {
    const dirtyRecords: DirtyRecord[] = [];
    const errors: Array<{
      field: string;
      expected?: any;
      actual?: any;
      message: string;
    }> = [];

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
      const dirty = new DirtyRecord();
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
      const reportDay = moment(workOrder.reportTime).format("YYYY-MM-DD");
      const completeDay = moment(workOrder.completeTime).format("YYYY-MM-DD");
      if (reportDay !== completeDay) {
        const dirty = new DirtyRecord();
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

  async validateInventory(
    inventory: ValveInventory
  ): Promise<DirtyRecord[]> {
    const dirtyRecords: DirtyRecord[] = [];

    if (!inventory.materialCode || !inventory.materialName) {
      const errors: Array<{
        field: string;
        expected?: any;
        actual?: any;
        message: string;
      }> = [];
      if (!inventory.materialCode) {
        errors.push({ field: "materialCode", message: "缺少物料编码" });
      }
      if (!inventory.materialName) {
        errors.push({ field: "materialName", message: "缺少物料名称" });
      }
      const dirty = new DirtyRecord();
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
      const dirty = new DirtyRecord();
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
      const dirty = new DirtyRecord();
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

  async validateMaterialUsage(usage: MaterialUsage): Promise<DirtyRecord[]> {
    const dirtyRecords: DirtyRecord[] = [];

    if (!usage.materialCode || !usage.quantity || !usage.unitPrice) {
      const errors: Array<{
        field: string;
        expected?: any;
        actual?: any;
        message: string;
      }> = [];
      if (!usage.materialCode) {
        errors.push({ field: "materialCode", message: "缺少物料编码" });
      }
      if (!usage.quantity) {
        errors.push({ field: "quantity", message: "缺少数量" });
      }
      if (!usage.unitPrice) {
        errors.push({ field: "unitPrice", message: "缺少单价" });
      }
      const dirty = new DirtyRecord();
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
      const dirty = new DirtyRecord();
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

  async resolveDirtyRecord(
    id: string,
    resolvedBy: string,
    resolutionNote: string,
    correctedData?: Record<string, any>
  ): Promise<DirtyRecord | null> {
    const dirty = await this.dirtyRepo.findOne({ where: { id } });
    if (!dirty) return null;

    const previousData = { ...dirty };

    dirty.status = "resolved";
    dirty.resolvedBy = resolvedBy;
    dirty.resolutionNote = resolutionNote;
    dirty.resolvedAt = new Date();
    if (correctedData) {
      dirty.correctedData = correctedData;
    }

    const result = await this.dirtyRepo.save(dirty);

    await this.auditService.createSnapshot(
      "after_update",
      "dirty_record",
      result.id,
      result,
      previousData,
      {
        operationName: "resolve_dirty_record",
        operator: resolvedBy,
        remark: resolutionNote,
      }
    );

    await this.applyCorrection(dirty);

    try {
      await this.reReconcileAfterCorrection(dirty, resolvedBy);
    } catch (e: any) {
      console.log("修正后重新对账失败:", e.message);
    }

    return result;
  }

  private async reReconcileAfterCorrection(
    dirty: DirtyRecord,
    operator: string
  ): Promise<void> {
    const operationId = uuidv4();
    let workOrderNo: string | null = null;

    switch (dirty.recordType) {
      case "work_order":
        const wo = await this.workOrderRepo.findOne({
          where: { id: dirty.recordId },
        });
        if (wo) workOrderNo = wo.orderNo;
        break;
      case "inventory":
        const inv = await this.inventoryRepo.findOne({
          where: { id: dirty.recordId },
        });
        if (inv && inv.workOrderNo) workOrderNo = inv.workOrderNo;
        break;
      case "material_usage":
        const usage = await this.materialUsageRepo.findOne({
          where: { id: dirty.recordId },
          relations: ["workOrder"],
        });
        if (usage && usage.workOrder) workOrderNo = usage.workOrder.orderNo;
        break;
    }

    if (workOrderNo) {
      await this.auditService.createSnapshot(
        "before_rereconcile",
        "reconciliation",
        workOrderNo,
        { workOrderNo, dirtyRecordId: dirty.id },
        undefined,
        {
          operationId,
          operationName: "auto_rereconcile_after_correction",
          operator,
          remark: `异常记录${dirty.id}修正后自动重新对账`,
        }
      );

      await this.reconciliationService.reconcileWorkOrder(
        workOrderNo,
        operator,
        operationId
      );

      await this.auditService.createSnapshot(
        "after_rereconcile",
        "reconciliation",
        workOrderNo,
        { workOrderNo, dirtyRecordId: dirty.id, reReconciled: true },
        undefined,
        {
          operationId,
          operationName: "auto_rereconcile_after_correction",
          operator,
          remark: `异常记录${dirty.id}修正后自动重新对账完成`,
        }
      );
    }
  }

  private async applyCorrection(dirty: DirtyRecord): Promise<void> {
    if (!dirty.correctedData) return;

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

  async getDirtyRecords(
    status?: DirtyStatus,
    dirtyType?: DirtyType,
    recordType?: RecordType
  ): Promise<DirtyRecord[]> {
    const where: any = {};
    if (status) where.status = status;
    if (dirtyType) where.dirtyType = dirtyType;
    if (recordType) where.recordType = recordType;

    return await this.dirtyRepo.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  async getDirtyRecordStats(): Promise<{
    total: number;
    pending: number;
    resolved: number;
    byType: Record<DirtyType, number>;
  }> {
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
      } as Record<DirtyType, number>,
    };

    for (const d of all) {
      if (stats.byType[d.dirtyType] !== undefined) {
        stats.byType[d.dirtyType]++;
      }
    }

    return stats;
  }
}
