const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "..", "data", "commission.db");

let _db = null;

function getDb() {
  if (!_db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function migrate() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS leaders (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      leader_code   TEXT    NOT NULL UNIQUE,
      name          TEXT    NOT NULL,
      community     TEXT    NOT NULL,
      commission_rate REAL   NOT NULL DEFAULT 0.10,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no      TEXT    NOT NULL UNIQUE,
      leader_id     INTEGER NOT NULL,
      product_name  TEXT    NOT NULL,
      quantity      INTEGER NOT NULL DEFAULT 1,
      unit_price    REAL    NOT NULL,
      total_amount  REAL    NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'normal',
      reassigned_from TEXT,
      reassigned_reason TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (leader_id) REFERENCES leaders(id)
    );

    CREATE TABLE IF NOT EXISTS after_sales (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      after_sale_no TEXT    NOT NULL UNIQUE,
      order_id      INTEGER NOT NULL,
      leader_id     INTEGER NOT NULL,
      type          TEXT    NOT NULL,
      amount        REAL    NOT NULL DEFAULT 0,
      cross_group   INTEGER NOT NULL DEFAULT 0,
      next_verifier TEXT,
      status        TEXT    NOT NULL DEFAULT 'pending',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (leader_id) REFERENCES leaders(id)
    );

    CREATE TABLE IF NOT EXISTS commission_sheets (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      sheet_no      TEXT    NOT NULL UNIQUE,
      leader_id     INTEGER NOT NULL,
      period_start  TEXT    NOT NULL,
      period_end    TEXT    NOT NULL,
      order_commission  REAL NOT NULL DEFAULT 0,
      after_sale_deduct REAL NOT NULL DEFAULT 0,
      subsidy_adjust    REAL NOT NULL DEFAULT 0,
      total_amount      REAL NOT NULL DEFAULT 0,
      status        TEXT    NOT NULL DEFAULT 'draft',
      next_verifier TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (leader_id) REFERENCES leaders(id)
    );

    CREATE TABLE IF NOT EXISTS commission_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      sheet_id      INTEGER NOT NULL,
      source_type   TEXT    NOT NULL,
      source_id     INTEGER NOT NULL,
      category      TEXT    NOT NULL,
      amount        REAL    NOT NULL DEFAULT 0,
      remark        TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sheet_id) REFERENCES commission_sheets(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      sheet_id      INTEGER NOT NULL,
      field_name    TEXT    NOT NULL,
      old_value     TEXT,
      new_value     TEXT,
      operator      TEXT    NOT NULL DEFAULT 'system',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sheet_id) REFERENCES commission_sheets(id)
    );

    CREATE TABLE IF NOT EXISTS subsidy_rules (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_name     TEXT    NOT NULL,
      leader_id     INTEGER,
      rate          REAL    NOT NULL DEFAULT 0,
      min_amount    REAL    NOT NULL DEFAULT 0,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seed() {
  const db = getDb();

  const leaderCount = db.prepare("SELECT COUNT(*) AS cnt FROM leaders").get().cnt;
  if (leaderCount > 0) return;

  const insertLeader = db.prepare(
    "INSERT INTO leaders (leader_code, name, community, commission_rate) VALUES (?, ?, ?, ?)"
  );
  insertLeader.run("L001", "张阿姨", "阳光花园", 0.10);
  insertLeader.run("L002", "李师傅", "翠湖小区", 0.12);
  insertLeader.run("L003", "王大姐", "锦绣家园", 0.08);

  const insertOrder = db.prepare(
    "INSERT INTO orders (order_no, leader_id, product_name, quantity, unit_price, total_amount, status, reassigned_from, reassigned_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insertOrder.run("ORD-20260501-001", 1, "有机蔬菜套餐", 10, 58, 580, "normal", null, null);
  insertOrder.run("ORD-20260501-002", 1, "土鸡蛋30枚", 20, 45, 900, "normal", null, null);
  insertOrder.run("ORD-20260502-001", 2, "东北大米10kg", 15, 89, 1335, "normal", null, null);
  insertOrder.run("ORD-20260502-002", 2, "进口牛排套餐", 5, 168, 840, "reassigned", "L003", "缺货改配-原团长王大姐处无货");
  insertOrder.run("ORD-20260503-001", 3, "新鲜水果礼盒", 8, 128, 1024, "normal", null, null);
  insertOrder.run("ORD-20260503-002", 3, "有机蔬菜套餐", 12, 58, 696, "normal", null, null);

  const insertAfterSale = db.prepare(
    "INSERT INTO after_sales (after_sale_no, order_id, leader_id, type, amount, cross_group, next_verifier, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insertAfterSale.run("AS-20260505-001", 1, 1, "refund", 116, 0, null, "confirmed");
  insertAfterSale.run("AS-20260506-001", 4, 2, "partial_refund", 336, 1, "运营主管-赵经理", "pending");
  insertAfterSale.run("AS-20260507-001", 5, 3, "return", 1024, 0, null, "confirmed");
}

module.exports = { getDb, closeDb, migrate, seed };
