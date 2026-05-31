const express = require("express");
const { stringify } = require("csv-stringify/sync");
const {
  createSettlement,
  getSettlement,
  listSettlements,
  advanceStatus,
  addDispute,
  resolveDispute,
  exportSettlement,
} = require("../services/settlement");

const router = express.Router();

router.post("/", (req, res) => {
  try {
    const { contract_id, period_start, period_end } = req.body;
    if (!contract_id || !period_start || !period_end) {
      return res.status(400).json({ error: "contract_id, period_start, period_end 必填" });
    }
    const s = createSettlement(contract_id, period_start, period_end);
    res.status(201).json(s);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/", (req, res) => {
  const filters = {};
  if (req.query.contract_id) filters.contract_id = req.query.contract_id;
  if (req.query.status) filters.status = req.query.status;
  const list = listSettlements(filters);
  res.json(list);
});

router.get("/:id", (req, res) => {
  const s = getSettlement(req.params.id);
  if (!s) return res.status(404).json({ error: "结算单不存在" });
  res.json(s);
});

router.post("/:id/advance", (req, res) => {
  try {
    const { action } = req.body;
    if (!action) return res.status(400).json({ error: "action 必填 (submit | review | settle)" });
    const s = advanceStatus(req.params.id, action);
    res.json(s);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/disputes", (req, res) => {
  try {
    const { line_id, order_id, dispute_type, amount, reason, affected_lines } = req.body;
    if (!line_id || !order_id || !dispute_type || amount === undefined) {
      return res.status(400).json({ error: "line_id, order_id, dispute_type, amount 必填" });
    }
    const d = addDispute(req.params.id, line_id, order_id, dispute_type, amount, reason, affected_lines);
    res.status(201).json(d);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/:id/disputes/:disputeId", (req, res) => {
  try {
    const { resolution } = req.body;
    if (!resolution || !["resolved", "rejected"].includes(resolution)) {
      return res.status(400).json({ error: "resolution 必填，值为 resolved 或 rejected" });
    }
    const d = resolveDispute(req.params.disputeId, resolution);
    res.json(d);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:id/export", (req, res) => {
  try {
    const rows = exportSettlement(req.params.id);
    const csv = stringify(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="settlement_${req.params.id}.csv"`);
    res.send("\uFEFF" + csv);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
