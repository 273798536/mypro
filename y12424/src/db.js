const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "settlement.db");

let _db;

function getDb() {
  if (!_db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    migrate(_db);
  }
  return _db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contracts (
      id            TEXT PRIMARY KEY,
      landlord_name TEXT NOT NULL,
      commission_rate REAL NOT NULL DEFAULT 0.10,
      bank_account  TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id            TEXT PRIMARY KEY,
      contract_id   TEXT NOT NULL REFERENCES contracts(id),
      check_in      TEXT NOT NULL,
      check_out     TEXT NOT NULL,
      gross_amount  REAL NOT NULL,
      deposit       REAL NOT NULL DEFAULT 0,
      cleaning_fee  REAL NOT NULL DEFAULT 0,
      subsidy       REAL NOT NULL DEFAULT 0,
      source        TEXT NOT NULL DEFAULT 'order_flow',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id            TEXT PRIMARY KEY,
      contract_id   TEXT NOT NULL REFERENCES contracts(id),
      period_start  TEXT NOT NULL,
      period_end    TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'draft'
                      CHECK(status IN ('draft','pending_review','reviewed','settled')),
      total_gross   REAL NOT NULL DEFAULT 0,
      total_deduction REAL NOT NULL DEFAULT 0,
      total_net     REAL NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at   TEXT,
      settled_at    TEXT
    );

    CREATE TABLE IF NOT EXISTS settlement_lines (
      id              TEXT PRIMARY KEY,
      settlement_id   TEXT NOT NULL REFERENCES settlements(id),
      order_id        TEXT NOT NULL REFERENCES orders(id),
      gross_amount    REAL NOT NULL,
      commission      REAL NOT NULL,
      cleaning_fee    REAL NOT NULL,
      deposit_held    REAL NOT NULL DEFAULT 0,
      subsidy_recovery REAL NOT NULL DEFAULT 0,
      cross_night_refund REAL NOT NULL DEFAULT 0,
      net_amount      REAL NOT NULL,
      flags           TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id              TEXT PRIMARY KEY,
      settlement_id   TEXT NOT NULL REFERENCES settlements(id),
      line_id         TEXT NOT NULL REFERENCES settlement_lines(id),
      order_id        TEXT NOT NULL REFERENCES orders(id),
      dispute_type    TEXT NOT NULL
                        CHECK(dispute_type IN ('deposit','subsidy_recovery','cross_night_refund','other')),
      amount          REAL NOT NULL,
      reason          TEXT NOT NULL,
      affected_lines  TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'open'
                        CHECK(status IN ('open','resolved','rejected')),
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at     TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_orders_contract ON orders(contract_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_contract ON settlements(contract_id);
    CREATE INDEX IF NOT EXISTS idx_lines_settlement ON settlement_lines(settlement_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_settlement ON disputes(settlement_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_line ON disputes(line_id);
  `);
}

module.exports = { getDb };
