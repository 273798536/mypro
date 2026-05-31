const express = require("express");
const { getDb } = require("../db");
const crypto = require("crypto");

const router = express.Router();

router.post("/", (req, res) => {
  const db = getDb();
  const { id, landlord_name, commission_rate, bank_account } = req.body;
  if (!id || !landlord_name || commission_rate === undefined) {
    return res.status(400).json({ error: "id, landlord_name, commission_rate 必填" });
  }
  try {
    db.prepare(
      `INSERT INTO contracts (id, landlord_name, commission_rate, bank_account)
       VALUES (?, ?, ?, ?)`
    ).run(id, landlord_name, commission_rate, bank_account || null);
    const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(id);
    res.status(201).json(contract);
  } catch (e) {
    if (e.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "合同已存在: " + id });
    }
    res.status(500).json({ error: e.message });
  }
});

router.get("/", (req, res) => {
  const db = getDb();
  const contracts = db.prepare("SELECT * FROM contracts ORDER BY created_at DESC").all();
  res.json(contracts);
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(req.params.id);
  if (!contract) return res.status(404).json({ error: "合同不存在" });
  res.json(contract);
});

module.exports = router;
