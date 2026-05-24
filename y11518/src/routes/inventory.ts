import { Router, Request, Response } from "express";
import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { ValveInventory } from "../entities/ValveInventory";
import { DirtyRecordService } from "../services/DirtyRecordService";
import { AuditService } from "../services/AuditService";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const inventoryRepo: Repository<ValveInventory> = AppDataSource.getRepository(ValveInventory);
const dirtyRecordService = new DirtyRecordService();
const auditService = new AuditService();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, materialCode, workOrderNo, operation } = req.query;
    const where: any = {};
    if (materialCode) where.materialCode = materialCode;
    if (workOrderNo) where.workOrderNo = workOrderNo;
    if (operation) where.operation = operation;

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const operationId = uuidv4();
  try {
    const inventory = inventoryRepo.create(req.body) as any;
    inventory.rawData = req.body;

    const lastRecord = await inventoryRepo.findOne({
      where: { materialCode: inventory.materialCode },
      order: { operationTime: "DESC" },
    });

    const lastBalance = lastRecord?.balanceAfter || 0;
    if (inventory.operation === "in") {
      inventory.balanceAfter = lastBalance + inventory.quantity;
    } else if (inventory.operation === "out") {
      inventory.balanceAfter = lastBalance - inventory.quantity;
    } else {
      inventory.balanceAfter = inventory.quantity;
    }

    const saved = await inventoryRepo.save(inventory);

    await auditService.createSnapshot(
      "after_create",
      "inventory",
      saved.id,
      saved,
      undefined,
      {
        operationId,
        operationName: "create_inventory",
        operator: req.headers["x-operator"] as string || "system",
      }
    );

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/batch", async (req: Request, res: Response) => {
  const operationId = uuidv4();
  try {
    const { records, isBackfill } = req.body;
    const results: any[] = [];

    for (const record of records) {
      const inventory = inventoryRepo.create(record) as any;
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
      } else if (inventory.operation === "out") {
        inventory.balanceAfter = lastBalance - inventory.quantity;
      } else {
        inventory.balanceAfter = inventory.quantity;
      }

      const saved = await inventoryRepo.save(inventory);
      await dirtyRecordService.validateInventory(saved as any);
      results.push(saved);
    }

    res.json({
      success: true,
      data: results,
      count: results.length,
      operationId,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const operationId = uuidv4();
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

    await auditService.createSnapshot(
      "before_update",
      "inventory",
      inventory.id,
      previousData,
      undefined,
      {
        operationId,
        operationName: "update_inventory",
        operator: req.headers["x-operator"] as string || "system",
      }
    );

    inventoryRepo.merge(inventory as any, req.body);
    (inventory as any).rawData = { ...(inventory as any).rawData, ...req.body };
    const saved = await inventoryRepo.save(inventory as any);

    await auditService.createSnapshot(
      "after_update",
      "inventory",
      saved.id,
      saved,
      previousData,
      {
        operationId,
        operationName: "update_inventory",
        operator: req.headers["x-operator"] as string || "system",
      }
    );

    await dirtyRecordService.validateInventory(saved as any);

    res.json({ success: true, data: saved, operationId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/material/:materialCode/balance", async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
