import { Router, Request, Response } from "express";
import { ReconciliationService } from "../services/ReconciliationService";
import { ExportService } from "../services/ExportService";

const router = Router();
const reconciliationService = new ReconciliationService();
const exportService = new ExportService();

router.post("/workorder/:workOrderNo", async (req: Request, res: Response) => {
  try {
    const result = await reconciliationService.reconcileWorkOrder(
      req.params.workOrderNo,
      (req.headers["x-operator"] as string) || "system"
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const { workOrderNo } = req.query;
    const data = await reconciliationService.getReconciliationHistory(
      workOrderNo as string
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const data = await reconciliationService.getReconciliationDetail(
      req.params.id
    );
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "对账记录不存在" });
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/stats/summary", async (req: Request, res: Response) => {
  try {
    const stats = await reconciliationService.getReconciliationStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/export", async (req: Request, res: Response) => {
  try {
    const { workOrderNo } = req.body;
    const filepath = await exportService.exportReconciliation(workOrderNo);
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
