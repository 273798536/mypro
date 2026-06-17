import { Router, type Request, type Response } from "express";
import * as tideService from "../services/tideService.js";

const router = Router();

router.get("/", (_req: Request, res: Response): void => {
  try {
    const list = tideService.listScenarios();
    res.json({ scenarios: list });
  } catch (_error) {
    res.status(500).json({ success: false, error: "获取场景列表失败" });
  }
});

router.get("/:id/tides", (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const result = tideService.getTideData(
      id,
      (req.query.timezone as string) || undefined
    );
    if (!result) {
      res.status(404).json({ success: false, error: "场景不存在" });
      return;
    }
    res.json({
      scenarioId: id,
      timezone: result.timezone,
      timezoneOffset: result.timezoneOffset,
      shiftHours: result.shiftHours,
      ...(result.timezoneWarning && { timezoneWarning: result.timezoneWarning }),
      data: result.data,
    });
  } catch (_error) {
    res.status(500).json({ success: false, error: "获取潮汐数据失败" });
  }
});

export default router;
