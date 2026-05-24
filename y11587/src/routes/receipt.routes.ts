import { Router, Request, Response } from "express";
import { ExternalReceiptService } from "../services/external-receipt.service";
import { ReceiptType } from "../entities/ExternalReceipt";
import { CompensationType } from "../entities/CompensationRecord";
import { AppDataSource } from "../data-source";
import { ExternalReceipt } from "../entities/ExternalReceipt";
import { CompensationRecord } from "../entities/CompensationRecord";

const router = Router();
const externalReceiptService = new ExternalReceiptService();
const receiptRepo = AppDataSource.getRepository(ExternalReceipt);
const compensationRepo = AppDataSource.getRepository(CompensationRecord);

router.post("/submit", async (req: Request, res: Response) => {
  try {
    const { receiptType, payload, contractId, paymentNodeId, sourceSystem, sourceRefNo, signature } =
      req.body;
    const receipt = await externalReceiptService.submitReceipt(
      receiptType as ReceiptType,
      payload,
      {
        contractId,
        paymentNodeId,
        sourceSystem: sourceSystem || "external",
        sourceRefNo,
        signature,
        submittedBy: req.headers["x-operator"] as string,
      }
    );
    res.json({ success: true, data: receipt });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, receiptType, contractId, page = 1, limit = 20 } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (receiptType) where.receiptType = receiptType;
    if (contractId) where.contractId = contractId;

    const [items, total] = await receiptRepo.findAndCount({
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

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const receipt = await receiptRepo.findOneBy({ id: req.params.id });
    if (!receipt) {
      return res.status(404).json({ success: false, error: "回执不存在" });
    }
    res.json({ success: true, data: receipt });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/:id/verify", async (req: Request, res: Response) => {
  try {
    const receipt = await externalReceiptService.verifyReceipt(
      req.params.id,
      req.headers["x-operator"] as string || "system"
    );
    res.json({ success: true, data: receipt });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/:id/close", async (req: Request, res: Response) => {
  try {
    const receipt = await externalReceiptService.closeReceipt(
      req.params.id,
      req.headers["x-operator"] as string || "system"
    );
    res.json({ success: true, data: receipt });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/compensation", async (req: Request, res: Response) => {
  try {
    const { compensationType, amount, contractId, paymentNodeId, retryQueueId, externalReceiptId, reason, currency } =
      req.body;
    const compensation = await externalReceiptService.createCompensation(
      compensationType as CompensationType,
      amount,
      {
        contractId,
        paymentNodeId,
        retryQueueId,
        externalReceiptId,
        reason,
        createdBy: req.headers["x-operator"] as string || "system",
        currency,
      }
    );
    res.json({ success: true, data: compensation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/compensation", async (req: Request, res: Response) => {
  try {
    const { status, contractId, page = 1, limit = 20 } = req.query;
    const where: any = { isDeleted: false };
    if (status) where.status = status;
    if (contractId) where.contractId = contractId;

    const [items, total] = await compensationRepo.findAndCount({
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

router.get("/compensation/:id", async (req: Request, res: Response) => {
  try {
    const compensation = await compensationRepo.findOneBy({
      id: req.params.id,
      isDeleted: false,
    });
    if (!compensation) {
      return res.status(404).json({ success: false, error: "补偿记录不存在" });
    }
    res.json({ success: true, data: compensation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/compensation/:id/approve", async (req: Request, res: Response) => {
  try {
    const { remark } = req.body;
    const compensation = await externalReceiptService.approveCompensation(
      req.params.id,
      req.headers["x-operator"] as string || "system",
      remark
    );
    res.json({ success: true, data: compensation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/compensation/:id/process", async (req: Request, res: Response) => {
  try {
    const compensation = await externalReceiptService.processCompensation(
      req.params.id,
      req.headers["x-operator"] as string || "system"
    );
    res.json({ success: true, data: compensation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/compensation/:id/complete", async (req: Request, res: Response) => {
  try {
    const { accountingRef } = req.body;
    const compensation = await externalReceiptService.completeCompensation(
      req.params.id,
      accountingRef,
      req.headers["x-operator"] as string || "system"
    );
    res.json({ success: true, data: compensation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
