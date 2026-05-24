import { Router, Request, Response } from "express";
import { ExportService } from "../services/ExportService";

const router = Router();
const exportService = new ExportService();

router.post("/workorders", async (req: Request, res: Response) => {
  try {
    const { workOrderNos } = req.body;
    const filepath = await exportService.exportWorkOrders(workOrderNos);
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

router.post("/inventory", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.body;
    const filepath = await exportService.exportInventory(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
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
