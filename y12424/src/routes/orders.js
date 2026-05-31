const express = require("express");
const { getDb } = require("../db");
const crypto = require("crypto");

const router = express.Router();

router.post("/", (req, res) => {
  const db = getDb();
  const { id, contract_id, check_in, check_out, gross_amount, deposit, cleaning_fee, subsidy } = req.body;
  if (!id || !contract_id || !check_in || !check_out || gross_amount === undefined) {
    return res.status(400).json({ error: "id, contract_id, check_in, check_out, gross_amount 必填" });
  }
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contract_id);
  if (!contract) return res.status(400).json({ error: "合同不存在: " + contract_id });

  try {
    db.prepare(
      `INSERT INTO orders (id, contract_id, check_in, check_out, gross_amount, deposit, cleaning_fee, subsidy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, contract_id, check_in, check_out, gross_amount, deposit || 0, cleaning_fee || 0, subsidy || 0);
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
    res.status(201).json(order);
  } catch (e) {
    if (e.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "订单已存在: " + id });
    }
    if (e.message.includes("FOREIGN")) {
      return res.status(400).json({ error: "外键约束失败，检查 contract_id" });
    }
    res.status(500).json({ error: e.message });
  }
});

router.post("/batch", (req, res) => {
  const db = getDb();
  const { orders } = req.body;
  if (!Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ error: "orders 数组必填" });
  }
  const insert = db.prepare(
    `INSERT INTO orders (id, contract_id, check_in, check_out, gross_amount, deposit, cleaning_fee, subsidy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction((items) => {
    const results = [];
    const errors = [];
    for (const o of items) {
      try {
        insert.run(
          o.id || crypto.randomUUID(),
          o.contract_id, o.check_in, o.check_out, o.gross_amount,
          o.deposit || 0, o.cleaning_fee || 0, o.subsidy || 0
        );
        results.push(o.id || "auto");
      } catch (e) {
        errors.push({ id: o.id, error: e.message });
      }
    }
    return { inserted: results.length, errors };
  });
  try {
    const result = tx(orders);
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/", (req, res) => {
  const db = getDb();
  let sql = "SELECT * FROM orders WHERE 1=1";
  const params = [];
  if (req.query.contract_id) {
    sql += " AND contract_id = ?";
    params.push(req.query.contract_id);
  }
  sql += " ORDER BY check_in DESC";
  const orders = db.prepare(sql).all(...params);
  res.json(orders);
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "订单不存在" });
  res.json(order);
});

module.exports = router;
