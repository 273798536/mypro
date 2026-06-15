import { Router, type Request, type Response } from "express";
import * as calcEngine from "../services/calcEngine.js";

const router = Router();

router.post("/", (req: Request, res: Response): void => {
  try {
    const { scenarioId, strategy, customGates, timezone } = req.body;
    if (!scenarioId || !strategy) {
      res.status(400).json({ success: false, error: "缺少必要参数：scenarioId 和 strategy" });
      return;
    }
    if (strategy !== "correct" && strategy !== "wrong" && strategy !== "custom") {
      res.status(400).json({ success: false, error: "strategy 仅支持 correct、wrong 或 custom" });
      return;
    }
    const result = calcEngine.calculate(
      scenarioId,
      strategy as "correct" | "wrong" | "custom",
      customGates,
      timezone
    );
    if (!result) {
      res.status(404).json({ success: false, error: "场景不存在" });
      return;
    }
    res.json(result);
  } catch (_error) {
    res.status(500).json({ success: false, error: "发电量计算失败" });
  }
});

export default router;
