import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import {
  Reconciliation,
  ReconcileStatus,
} from "../entities/Reconciliation";
import { WorkOrder } from "../entities/WorkOrder";
import { ValveInventory } from "../entities/ValveInventory";
import { MaterialUsage } from "../entities/MaterialUsage";
import { SupplierBill } from "../entities/SupplierBill";
import { BillItem } from "../entities/BillItem";
import { AuditService } from "./AuditService";
import { v4 as uuidv4 } from "uuid";

export class ReconciliationService {
  private reconcileRepo: Repository<Reconciliation>;
  private workOrderRepo: Repository<WorkOrder>;
  private inventoryRepo: Repository<ValveInventory>;
  private materialUsageRepo: Repository<MaterialUsage>;
  private billRepo: Repository<SupplierBill>;
  private billItemRepo: Repository<BillItem>;
  private auditService: AuditService;

  constructor() {
    this.reconcileRepo = AppDataSource.getRepository(Reconciliation);
    this.workOrderRepo = AppDataSource.getRepository(WorkOrder);
    this.inventoryRepo = AppDataSource.getRepository(ValveInventory);
    this.materialUsageRepo = AppDataSource.getRepository(MaterialUsage);
    this.billRepo = AppDataSource.getRepository(SupplierBill);
    this.billItemRepo = AppDataSource.getRepository(BillItem);
    this.auditService = new AuditService();
  }

  async reconcileWorkOrder(
    workOrderNo: string,
    operator: string
  ): Promise<Reconciliation> {
    const operationId = uuidv4();

    const workOrder = await this.workOrderRepo.findOne({
      where: { orderNo: workOrderNo },
      relations: ["materialUsages"],
    });

    if (!workOrder) {
      throw new Error(`工单${workOrderNo}不存在`);
    }

    await this.auditService.createSnapshot(
      "before_reconcile",
      "work_order",
      workOrder.id,
      workOrder,
      undefined,
      {
        operationId,
        operationName: "reconcile_work_order",
        operator,
      }
    );

    const materialUsages = await this.materialUsageRepo.find({
      where: { workOrderId: workOrder.id },
    });

    const inventoryRecords = await this.inventoryRepo.find({
      where: { workOrderNo, operation: "out" },
    });

    const billItems = await this.billItemRepo.find({
      where: { workOrderNo },
    });

    const workOrderSummary = this.buildWorkOrderSummary(
      workOrder,
      materialUsages
    );
    const inventorySummary = this.buildInventorySummary(inventoryRecords);
    const billSummary = this.buildBillSummary(billItems);

    const matchResult = this.calculateMatchResult(
      workOrderSummary,
      inventorySummary,
      billSummary
    );

    let status: ReconcileStatus = "matched";
    if (!matchResult.quantityMatched || !matchResult.amountMatched) {
      const allMatched = matchResult.details.every((d) => d.status === "matched");
      if (allMatched) {
        status = "matched";
      } else if (matchResult.details.some((d) => d.status === "matched")) {
        status = "partial_match";
      } else {
        status = "mismatch";
      }
    }

    const reconciliation = new Reconciliation();
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

    await this.auditService.createSnapshot(
      "after_reconcile",
      "work_order",
      workOrder.id,
      result,
      workOrder,
      {
        operationId,
        operationName: "reconcile_work_order",
        operator,
        remark: `对账完成，状态: ${status}`,
      }
    );

    return result;
  }

  private buildWorkOrderSummary(
    workOrder: WorkOrder,
    materialUsages: MaterialUsage[]
  ) {
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

  private buildInventorySummary(inventoryRecords: ValveInventory[]) {
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

  private buildBillSummary(billItems: BillItem[]) {
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

  private calculateMatchResult(
    workOrderSummary: any,
    inventorySummary: any,
    billSummary: any
  ) {
    const allMaterialCodes = new Set<string>();
    workOrderSummary.materials.forEach((m: any) =>
      allMaterialCodes.add(m.materialCode)
    );
    inventorySummary.items.forEach((i: any) =>
      allMaterialCodes.add(i.materialCode)
    );
    billSummary.items.forEach((i: any) =>
      allMaterialCodes.add(i.materialCode)
    );

    const details: any[] = [];
    let totalQtyDiff = 0;
    let totalAmountDiff = 0;

    for (const code of allMaterialCodes) {
      const woMat = workOrderSummary.materials.find(
        (m: any) => m.materialCode === code
      );
      const invMat = inventorySummary.items.find(
        (i: any) => i.materialCode === code
      );
      const billMat = billSummary.items.find(
        (i: any) => i.materialCode === code
      );

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

      let status: any = "matched";
      if (!woMat) {
        status = "missing_in_workorder";
      } else if (!invMat) {
        status = "missing_in_inventory";
      } else if (!billMat) {
        status = "missing_in_bill";
      } else if (
        workOrderQty !== inventoryQty ||
        workOrderQty !== billQty ||
        Math.abs(workOrderAmount - inventoryAmount) > 0.01
      ) {
        status = "mismatch";
      }

      details.push({
        materialCode: code,
        materialName:
          woMat?.materialName ||
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
      quantityMatched: totalQtyDiff === 0,
      amountMatched: Math.abs(totalAmountDiff) < 0.01,
      quantityDiff: totalQtyDiff,
      amountDiff: totalAmountDiff,
      details,
    };
  }

  async getReconciliationHistory(
    workOrderNo?: string
  ): Promise<Reconciliation[]> {
    const where: any = {};
    if (workOrderNo) {
      where.workOrderNo = workOrderNo;
    }
    return await this.reconcileRepo.find({
      where,
      order: { reconcileTime: "DESC" },
    });
  }

  async getReconciliationDetail(id: string): Promise<Reconciliation | null> {
    return await this.reconcileRepo.findOne({ where: { id } });
  }

  async getReconciliationStats(): Promise<{
    total: number;
    matched: number;
    mismatch: number;
    partialMatch: number;
    totalAmountDiff: number;
    totalQuantityDiff: number;
  }> {
    const all = await this.reconcileRepo.find();
    return {
      total: all.length,
      matched: all.filter((r) => r.status === "matched").length,
      mismatch: all.filter((r) => r.status === "mismatch").length,
      partialMatch: all.filter((r) => r.status === "partial_match").length,
      totalAmountDiff: all.reduce((sum, r) => sum + r.matchResult.amountDiff, 0),
      totalQuantityDiff: all.reduce(
        (sum, r) => sum + r.matchResult.quantityDiff,
        0
      ),
    };
  }
}
