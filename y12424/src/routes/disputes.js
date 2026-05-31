const express = require("express");
const { getDb } = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const db = getDb();
  let sql = "SELECT * FROM disputes WHERE 1=1";
  const params = [];
  if (req.query.settlement_id) {
    sql += " AND settlement_id = ?";
    params.push(req.query.settlement_id);
  }
  if (req.query.status) {
    sql += " AND status = ?";
    params.push(req.query.status);
  }
  if (req.query.dispute_type) {
    sql += " AND dispute_type = ?";
    params.push(req.query.dispute_type);
  }
  sql += " ORDER BY created_at DESC";
  const disputes = db.prepare(sql).all(...params);
  res.json(disputes);
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const dispute = db.prepare("SELECT * FROM disputes WHERE id = ?").get(req.params.id);
  if (!dispute) return res.status(404).json({ error: "争议记录不存在" });
  res.json(dispute);
});

module.exports = router;
