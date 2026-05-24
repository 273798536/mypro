import { Router, Request, Response } from "express";
import { ReportService } from "../services/report.service";
import * as path from "path";

const router = Router();
const reportService = new ReportService();

router.get("/business", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await reportService.generateBusinessReport({
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/business/export", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await reportService.generateBusinessReport({
      startDate: startDate as string,
      endDate: endDate as string,
    });

    const exportDir = path.join(process.cwd(), "exports");
    const filePath = await reportService.exportToCSV(report, exportDir);

    res.download(filePath, (err) => {
      if (err) {
        res.status(500).json({ success: false, error: "下载失败" });
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/dead-letter/export", async (req: Request, res: Response) => {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    const filePath = await reportService.exportDeadLetterToCSV(exportDir);

    res.download(filePath, (err) => {
      if (err) {
        res.status(500).json({ success: false, error: "下载失败" });
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/dirty-records/export", async (req: Request, res: Response) => {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    const filePath = await reportService.exportDirtyRecordsToCSV(exportDir);

    res.download(filePath, (err) => {
      if (err) {
        res.status(500).json({ success: false, error: "下载失败" });
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
