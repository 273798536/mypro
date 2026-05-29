const express = require("express");
const commissionSvc = require("../services/commission");
const { getDb } = require("../db");

const router = express.Router();

router.post("/samples", (req, res) => {
  try {
    const db = getDb();

    const leader1 = db.prepare("SELECT * FROM leaders WHERE leader_code = 'L001'").get();
    const leader2 = db.prepare("SELECT * FROM leaders WHERE leader_code = 'L002'").get();
    const leader3 = db.prepare("SELECT * FROM leaders WHERE leader_code = 'L003'").get();

    const results = [];

    if (leader1) {
      results.push(commissionSvc.createSheet(leader1.id, "2026-05-01", "2026-05-31"));
    }
    if (leader2) {
      results.push(commissionSvc.createSheet(leader2.id, "2026-05-01", "2026-05-31"));
    }
    if (leader3) {
      results.push(commissionSvc.createSheet(leader3.id, "2026-05-01", "2026-05-31"));
    }

    res.json({ success: true, data: results });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/import", (req, res) => {
  try {
    const result = commissionSvc.importMaterials(req.body);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/calculate", (req, res) => {
  try {
    const { leaderId, periodStart, periodEnd } = req.body;
    if (!leaderId || !periodStart || !periodEnd) {
      return res.status(400).json({ success: false, error: "缺少 leaderId, periodStart, periodEnd" });
    }
    const result = commissionSvc.createSheet(leaderId, periodStart, periodEnd);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/", (req, res) => {
  try {
    const { leaderId, status, periodStart, periodEnd } = req.query;
    const data = commissionSvc.listSheets({
      leaderId: leaderId ? Number(leaderId) : undefined,
      status,
      periodStart,
      periodEnd,
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/export", (req, res) => {
  try {
    const { leaderId, periodStart, periodEnd, format } = req.query;
    const data = commissionSvc.exportSheets({
      leaderId: leaderId ? Number(leaderId) : undefined,
      periodStart,
      periodEnd,
    });

    if (format === "csv") {
      const lines = ["佣金单号,团长编码,团长姓名,社区,期间开始,期间结束,订单佣金,售后扣减,补贴调整,佣金合计,状态,下一步核验人"];
      for (const s of data) {
        lines.push([
          s.sheet_no, s.leader_code, s.leader_name, s.community,
          s.period_start, s.period_end,
          s.order_commission, s.after_sale_deduct, s.subsidy_adjust,
          s.total_amount, s.status, s.next_verifier || ""
        ].join(","));
      }
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=commission_export.csv");
      return res.send("\uFEFF" + lines.join("\n"));
    }

    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const data = commissionSvc.getSheetDetail(Number(req.params.id));
    res.json({ success: true, data });
  } catch (e) {
    res.status(404).json({ success: false, error: e.message });
  }
});

router.patch("/:id/status", (req, res) => {
  try {
    const { status, operator, remark } = req.body;
    if (!status) return res.status(400).json({ success: false, error: "缺少 status" });
    const data = commissionSvc.updateSheetStatus(Number(req.params.id), status, operator, remark);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.post("/:id/subsidy", (req, res) => {
  try {
    const { ruleName, amount, operator } = req.body;
    if (!ruleName || amount === undefined) {
      return res.status(400).json({ success: false, error: "缺少 ruleName, amount" });
    }
    const data = commissionSvc.supplementSubsidy(Number(req.params.id), ruleName, amount, operator);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

module.exports = router;
