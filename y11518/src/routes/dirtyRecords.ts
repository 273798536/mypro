import { Router, Request, Response } from "express";
import { DirtyRecordService } from "../services/DirtyRecordService";
import { ExportService } from "../services/ExportService";

const router = Router();
const dirtyRecordService = new DirtyRecordService();
const exportService = new ExportService();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, dirtyType, recordType } = req.query;
    const data = await dirtyRecordService.getDirtyRecords(
      status as any,
      dirtyType as any,
      recordType as any
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await dirtyRecordService.getDirtyRecordStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { resolvedBy, resolutionNote, correctedData } = req.body;
    const result = await dirtyRecordService.resolveDirtyRecord(
      req.params.id,
      resolvedBy || (req.headers["x-operator"] as string) || "system",
      resolutionNote,
      correctedData
    );
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "异常记录不存在" });
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/replay", async (req: Request, res: Response) => {
  try {
    const { dirtyType, recordType } = req.body;
    const pendingRecords = await dirtyRecordService.getDirtyRecords(
      "pending",
      dirtyType as any,
      recordType as any
    );

    const results: any[] = [];
    for (const record of pendingRecords) {
      results.push({
        id: record.id,
        recordType: record.recordType,
        dirtyType: record.dirtyType,
        description: record.description,
        canAutoResolve:
          record.dirtyType === "amount_conflict" || record.dirtyType === "missing_field",
      });
    }

    res.json({
      success: true,
      data: {
        total: pendingRecords.length,
        records: results,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/export", async (req: Request, res: Response) => {
  try {
    const filepath = await exportService.exportDirtyRecords();
    res.json({
      success: true,
      data: {
        filepath,
        filename: filepath.split("/").pop(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
