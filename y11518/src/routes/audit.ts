import { Router, Request, Response } from "express";
import { AuditService } from "../services/AuditService";

const router = Router();
const auditService = new AuditService();

router.get("/snapshots", async (req: Request, res: Response) => {
  try {
    const { targetType, targetId, operationId } = req.query;

    let snapshots;
    if (operationId) {
      snapshots = await auditService.getSnapshotsByOperation(
        operationId as string
      );
    } else if (targetType && targetId) {
      snapshots = await auditService.getSnapshotsByTarget(
        targetType as any,
        targetId as string
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "需要提供 operationId 或 targetType + targetId",
      });
    }

    res.json({ success: true, data: snapshots });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/history/:targetType/:targetId", async (req: Request, res: Response) => {
  try {
    const history = await auditService.getSnapshotHistory(
      req.params.targetType as any,
      req.params.targetId
    );
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/diff", async (req: Request, res: Response) => {
  try {
    const { obj1, obj2 } = req.body;
    const result = auditService.compareObjects(obj1, obj2);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
