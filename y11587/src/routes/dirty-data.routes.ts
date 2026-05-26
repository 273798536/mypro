import { Router, Request, Response } from "express";
import { DirtyDataService } from "../services/dirty-data.service";
import { DirtyType, DirtyStatus } from "../entities/DirtyRecord";

const router = Router();
const dirtyDataService = new DirtyDataService();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { dirtyType, status, sourceTable } = req.query;
    const filters: any = {};
    if (dirtyType) filters.dirtyType = dirtyType as DirtyType;
    if (status) filters.status = status as DirtyStatus;
    if (sourceTable) filters.sourceTable = sourceTable as string;

    const records = await dirtyDataService.getDirtyRecords(filters);
    res.json({ success: true, data: records });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await dirtyDataService.getDirtyStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/:id/review", async (req: Request, res: Response) => {
  try {
    const { remark, status, correctedData } = req.body;
    const record = await dirtyDataService.reviewDirtyRecord(
      req.params.id,
      req.headers["x-operator"] as string || "system",
      remark,
      status || "PENDING_REVIEW",
      correctedData
    );
    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { correctedData, resolution } = req.body;
    const record = await dirtyDataService.resolveDirtyRecord(
      req.params.id,
      req.headers["x-operator"] as string || "system",
      correctedData,
      resolution
    );
    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/validate/contract", async (req: Request, res: Response) => {
  try {
    const result = dirtyDataService.validateContractData(req.body);
    if (!result.isValid && result.issues.length > 0) {
      for (const issue of result.issues) {
        await dirtyDataService.recordDirtyData(
          issue.sourceTable,
          issue.sourceRecordId ?? null,
          JSON.parse(issue.originalData),
          issue.dirtyType as DirtyType,
          issue.fieldIssues ? JSON.parse(issue.fieldIssues) : undefined,
          issue.conflictDetails ? JSON.parse(issue.conflictDetails) : undefined
        );
      }
    }
    res.json({
      success: true,
      data: {
        isValid: result.isValid,
        issuesFound: result.issues.length,
        issues: result.issues.map((i) => ({
          type: i.dirtyType,
          fields: i.fieldIssues,
          details: i.conflictDetails,
        })),
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/validate/payment-node", async (req: Request, res: Response) => {
  try {
    const result = dirtyDataService.validatePaymentNodeData(req.body);
    if (!result.isValid && result.issues.length > 0) {
      for (const issue of result.issues) {
        await dirtyDataService.recordDirtyData(
          issue.sourceTable,
          issue.sourceRecordId ?? null,
          JSON.parse(issue.originalData),
          issue.dirtyType as DirtyType,
          issue.fieldIssues ? JSON.parse(issue.fieldIssues) : undefined,
          issue.conflictDetails ? JSON.parse(issue.conflictDetails) : undefined
        );
      }
    }
    res.json({
      success: true,
      data: {
        isValid: result.isValid,
        issuesFound: result.issues.length,
        issues: result.issues.map((i) => ({
          type: i.dirtyType,
          fields: i.fieldIssues,
          details: i.conflictDetails,
        })),
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
