import { Router, Request, Response } from "express";
import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { WorkOrder } from "../entities/WorkOrder";
import { MaterialUsage } from "../entities/MaterialUsage";
import { DirtyRecordService } from "../services/DirtyRecordService";
import { AuditService } from "../services/AuditService";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const workOrderRepo: Repository<WorkOrder> = AppDataSource.getRepository(WorkOrder);
const materialUsageRepo: Repository<MaterialUsage> = AppDataSource.getRepository(MaterialUsage);
const dirtyRecordService = new DirtyRecordService();
const auditService = new AuditService();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, siteName } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (siteName) where.siteName = siteName;

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/no/:orderNo", async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const operationId = uuidv4();
  try {
    const { materialUsages, ...orderData } = req.body;

    const workOrder = workOrderRepo.create(orderData) as any as WorkOrder;
    workOrder.rawData = req.body;

    const saved = await workOrderRepo.save(workOrder) as WorkOrder;

    await auditService.createSnapshot(
      "after_create",
      "work_order",
      saved.id,
      saved,
      undefined,
      {
        operationId,
        operationName: "create_work_order",
        operator: req.headers["x-operator"] as string || "system",
      }
    );

    if (materialUsages && materialUsages.length > 0) {
      for (const mu of materialUsages) {
        const usage = materialUsageRepo.create({
          ...mu,
          workOrderId: saved.id,
          totalAmount: mu.quantity * mu.unitPrice,
        }) as any;
        const savedUsage = await materialUsageRepo.save(usage);
        await dirtyRecordService.validateMaterialUsage(savedUsage);
      }

      const totalAmount = materialUsages.reduce(
        (sum: number, mu: any) => sum + mu.quantity * mu.unitPrice,
        0
      );
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const operationId = uuidv4();
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

    await auditService.createSnapshot(
      "before_update",
      "work_order",
      workOrder.id,
      previousData,
      undefined,
      {
        operationId,
        operationName: "update_work_order",
        operator: req.headers["x-operator"] as string || "system",
      }
    );

    const { materialUsages, ...updateData } = req.body;
    workOrderRepo.merge(workOrder as any, updateData);
    (workOrder as any).rawData = { ...(workOrder as any).rawData, ...updateData };

    const saved = await workOrderRepo.save(workOrder as any);

    await auditService.createSnapshot(
      "after_update",
      "work_order",
      saved.id,
      saved,
      previousData,
      {
        operationId,
        operationName: "update_work_order",
        operator: req.headers["x-operator"] as string || "system",
      }
    );

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

      const totalAmount = materialUsages.reduce(
        (sum: number, mu: any) => sum + mu.quantity * mu.unitPrice,
        0
      );
      await workOrderRepo.update(saved.id, {
        materialTotalAmount: totalAmount,
      });
    }

    await dirtyRecordService.validateWorkOrder(saved);

    res.json({ success: true, data: saved, operationId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id/history", async (req: Request, res: Response) => {
  try {
    const history = await auditService.getSnapshotHistory(
      "work_order",
      req.params.id
    );
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
