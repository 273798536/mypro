import { Router, Request, Response } from "express";
import { RetryQueueService } from "../services/retry-queue.service";
import { QueueItemType } from "../entities/RetryQueue";
import { In } from "typeorm";
import { AppDataSource } from "../data-source";
import { RetryQueue } from "../entities/RetryQueue";
import { RetryLog } from "../entities/RetryLog";
import { DeadLetter } from "../entities/DeadLetter";

const router = Router();
const retryQueueService = new RetryQueueService();
const retryQueueRepo = AppDataSource.getRepository(RetryQueue);
const retryLogRepo = AppDataSource.getRepository(RetryLog);
const deadLetterRepo = AppDataSource.getRepository(DeadLetter);

router.post("/enqueue", async (req: Request, res: Response) => {
  try {
    const { itemType, payload, contractId, paymentNodeId, maxRetries, retryInterval, source } =
      req.body;
    const item = await retryQueueService.enqueue(itemType as QueueItemType, payload, {
      contractId,
      paymentNodeId,
      maxRetries,
      retryInterval,
      source,
      createdBy: req.headers["x-operator"] as string,
    });
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, itemType, contractId, page = 1, limit = 20 } = req.query;
    const where: any = { isDeleted: false };
    if (status) where.status = status;
    if (itemType) where.itemType = itemType;
    if (contractId) where.contractId = contractId;

    const [items, total] = await retryQueueRepo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({
      success: true,
      data: {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await retryQueueService.getQueueStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const item = await retryQueueRepo.findOneBy({ id: req.params.id, isDeleted: false });
    if (!item) {
      return res.status(404).json({ success: false, error: "任务不存在" });
    }
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/:id/logs", async (req: Request, res: Response) => {
  try {
    const logs = await retryLogRepo.find({
      where: { retryQueueId: req.params.id },
      order: { createdAt: "ASC" },
    });
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/:id/manual-intervention", async (req: Request, res: Response) => {
  try {
    const { handler, remark } = req.body;
    const item = await retryQueueService.manualIntervention(
      req.params.id,
      handler || req.headers["x-operator"] || "unknown",
      remark
    );
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { resolution, isSuccess } = req.body;
    const item = await retryQueueService.manualResolve(
      req.params.id,
      req.headers["x-operator"] as string || "unknown",
      resolution,
      isSuccess !== false
    );
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/:id/retry", async (req: Request, res: Response) => {
  try {
    const item = await retryQueueRepo.findOneBy({ id: req.params.id });
    if (!item) {
      return res.status(404).json({ success: false, error: "任务不存在" });
    }
    item.status = "PENDING";
    item.retryCount = 0;
    item.nextRetryAt = null;
    item.lastError = null;
    await retryQueueRepo.save(item);
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/dead-letter", async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await deadLetterRepo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({
      success: true,
      data: {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/dead-letter/:id/resurrect", async (req: Request, res: Response) => {
  try {
    const { newMaxRetries } = req.body;
    const item = await retryQueueService.resurrectDeadLetter(
      req.params.id,
      req.headers["x-operator"] as string || "unknown",
      newMaxRetries
    );
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/dead-letter/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { resolution, remark } = req.body;
    const deadLetter = await deadLetterRepo.findOneBy({ id: req.params.id });
    if (!deadLetter) {
      return res.status(404).json({ success: false, error: "死信记录不存在" });
    }
    deadLetter.status = "RESOLVED";
    deadLetter.resolvedBy = req.headers["x-operator"] as string || "unknown";
    deadLetter.resolvedAt = new Date().toISOString();
    deadLetter.resolveRemark = remark;
    deadLetter.resolution = resolution;
    await deadLetterRepo.save(deadLetter);
    res.json({ success: true, data: deadLetter });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
