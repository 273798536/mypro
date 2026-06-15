import { Router, type Request, type Response } from "express";
import * as gateService from "../services/gateService.js";
import * as tideService from "../services/tideService.js";

const router = Router();

router.get("/:id/strategy/:type", (req: Request, res: Response): void => {
  try {
    const { id, type } = req.params;
    if (type !== "correct" && type !== "wrong") {
      res.status(400).json({ success: false, error: "策略类型无效，仅支持 correct 或 wrong" });
      return;
    }
    const strategy = gateService.getGateStrategy(id, type);
    if (!strategy) {
      res.status(404).json({ success: false, error: "场景不存在或无对应策略" });
      return;
    }
    res.json(strategy);
  } catch (_error) {
    res.status(500).json({ success: false, error: "获取闸门策略失败" });
  }
});

router.post("/:id/gate-override", (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { time, openingPercent, reason } = req.body;
    if (!time || openingPercent === undefined) {
      res.status(400).json({ success: false, error: "缺少必要参数：time 和 openingPercent" });
      return;
    }
    if (typeof openingPercent !== "number" || openingPercent < 0 || openingPercent > 100) {
      res.status(400).json({ success: false, error: "openingPercent 须为 0-100 之间的数值" });
      return;
    }
    const result = gateService.applyOverride(id, time, openingPercent, reason);
    if (!result) {
      res.status(404).json({ success: false, error: "场景不存在" });
      return;
    }
    res.json({
      success: result.success,
      ...(result.warning && { warning: result.warning }),
      impact: result.impact,
      ...(result.alert && { alert: result.alert }),
    });
  } catch (_error) {
    res.status(500).json({ success: false, error: "闸门覆写操作失败" });
  }
});

router.get("/:id/protection-records", (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const result = tideService.getProtectionRecords(id);
    if (!result) {
      res.status(404).json({ success: false, error: "场景不存在" });
      return;
    }
    res.json(result);
  } catch (_error) {
    res.status(500).json({ success: false, error: "获取保护记录失败" });
  }
});

export default router;
