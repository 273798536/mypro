import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/stored_value.db');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function initDatabase() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      address TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS member_cards (
      id TEXT PRIMARY KEY,
      card_no TEXT UNIQUE NOT NULL,
      user_name TEXT NOT NULL,
      phone TEXT,
      principal_balance REAL DEFAULT 0,
      bonus_balance REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bonus_rules (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      name TEXT NOT NULL,
      tiers TEXT NOT NULL,
      priority TEXT DEFAULT 'bonus_first',
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      is_active INTEGER DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recharge_records (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      rule_id TEXT,
      principal_amount REAL NOT NULL,
      bonus_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      operator TEXT NOT NULL,
      source TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES member_cards(id),
      FOREIGN KEY (rule_id) REFERENCES bonus_rules(id)
    );

    CREATE TABLE IF NOT EXISTS balance_ledger (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      principal_amount REAL DEFAULT 0,
      bonus_amount REAL DEFAULT 0,
      balance_after REAL NOT NULL,
      principal_after REAL NOT NULL,
      bonus_after REAL NOT NULL,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      operator TEXT NOT NULL,
      remark TEXT,
      is_exception INTEGER DEFAULT 0,
      exception_type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES member_cards(id)
    );

    CREATE TABLE IF NOT EXISTS consumptions (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      store_name TEXT NOT NULL,
      amount REAL NOT NULL,
      principal_used REAL NOT NULL,
      bonus_used REAL NOT NULL,
      is_cross_store INTEGER DEFAULT 0,
      is_reversed INTEGER DEFAULT 0,
      reversed_at TEXT,
      reverse_reason TEXT,
      operator TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES member_cards(id),
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS refund_requests (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      principal_balance REAL NOT NULL,
      bonus_balance REAL NOT NULL,
      refund_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      applicant TEXT NOT NULL,
      approver TEXT,
      approved_at TEXT,
      reject_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES member_cards(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      operator TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS balance_snapshots (
      id TEXT PRIMARY KEY,
      snapshot_date TEXT NOT NULL,
      card_id TEXT NOT NULL,
      principal_balance REAL NOT NULL,
      bonus_balance REAL NOT NULL,
      total_balance REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(snapshot_date, card_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'store_operator',
      display_name TEXT NOT NULL,
      store_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ledger_card_id ON balance_ledger(card_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON balance_ledger(created_at);
    CREATE INDEX IF NOT EXISTS idx_consumption_card_id ON consumptions(card_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
  `);

  const storeCount = db.prepare('SELECT COUNT(*) as count FROM stores').get() as { count: number };
  if (storeCount.count === 0) {
    const insertStore = db.prepare(`
      INSERT INTO stores (id, name, code, address, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);
    insertStore.run('store_001', '总店', 'STORE001', '北京市朝阳区建国路88号');
    insertStore.run('store_002', '朝阳分店', 'STORE002', '北京市朝阳区望京西路');
    insertStore.run('store_003', '海淀分店', 'STORE003', '北京市海淀区中关村大街');
  }

  const ruleCount = db.prepare('SELECT COUNT(*) as count FROM bonus_rules').get() as { count: number };
  if (ruleCount.count === 0) {
    const insertRule = db.prepare(`
      INSERT INTO bonus_rules (id, version, name, tiers, priority, effective_from, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);
    const tiers = JSON.stringify([
      { minAmount: 100, bonusRate: 0.1, maxBonus: 50 },
      { minAmount: 500, bonusRate: 0.15, maxBonus: 100 },
      { minAmount: 1000, bonusRate: 0.2, maxBonus: 300 }
    ]);
    insertRule.run(
      'rule_001',
      1,
      '标准赠送规则',
      tiers,
      'bonus_first',
      new Date().toISOString().split('T')[0],
      'system'
    );
  }

  const cardCount = db.prepare('SELECT COUNT(*) as count FROM member_cards').get() as { count: number };
  if (cardCount.count === 0) {
    const insertCard = db.prepare(`
      INSERT INTO member_cards (id, card_no, user_name, phone, principal_balance, bonus_balance, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `);
    insertCard.run('card_001', '88880001', '张三', '13800138001', 1500, 200);
    insertCard.run('card_002', '88880002', '李四', '13800138002', 800, 120);
    insertCard.run('card_003', '88880003', '王五', '13800138003', 500, 50);
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, username, password_hash, role, display_name, store_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    insertUser.run('user_001', 'admin', hashPassword('admin123'), 'finance_admin', '系统管理员', null);
    insertUser.run('user_002', 'zongdian', hashPassword('store123'), 'store_operator', '总店操作员', 'store_001');
    insertUser.run('user_003', 'chaoyang', hashPassword('store123'), 'store_operator', '朝阳操作员', 'store_002');
  }

  db.close();
  console.log('Database initialized successfully');
}

export function getDatabase() {
  return new Database(dbPath);
}
