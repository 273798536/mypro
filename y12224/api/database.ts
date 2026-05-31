import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'deposit.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS residents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('男', '女')),
      birth_date TEXT NOT NULL,
      id_card TEXT NOT NULL UNIQUE,
      nursing_level TEXT NOT NULL CHECK(nursing_level IN ('自理', '半护理', '全护理', '特护')),
      bed_id TEXT,
      admit_date TEXT NOT NULL,
      emergency_contact TEXT NOT NULL,
      emergency_phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '在住' CHECK(status IN ('在住', '退住')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id TEXT PRIMARY KEY,
      resident_id TEXT NOT NULL REFERENCES residents(id),
      total_amount REAL NOT NULL DEFAULT 0,
      current_balance REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT '待收' CHECK(status IN ('待收', '已收', '部分退', '已退')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deposit_transactions (
      id TEXT PRIMARY KEY,
      deposit_id TEXT NOT NULL REFERENCES deposits(id),
      type TEXT NOT NULL CHECK(type IN ('收取', '退还', '补差收取', '补差退还', '费用抵扣')),
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      trigger_source TEXT NOT NULL,
      trigger_event_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS beds (
      id TEXT PRIMARY KEY,
      room_number TEXT NOT NULL,
      bed_number TEXT NOT NULL,
      floor INTEGER NOT NULL,
      room_type TEXT NOT NULL CHECK(room_type IN ('单人间', '双人间', '三人间', '特护间')),
      status TEXT NOT NULL DEFAULT '空' CHECK(status IN ('空', '已住', '待转出', '待转入')),
      resident_id TEXT,
      daily_rate REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('转房补差', '短住退押', '护理变更')),
      resident_id TEXT NOT NULL REFERENCES residents(id),
      status TEXT NOT NULL DEFAULT '申请' CHECK(status IN ('申请', '试算', '待确认', '已完成')),
      trigger_source TEXT NOT NULL,
      current_step TEXT NOT NULL,
      next_step TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      fee_calculation_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      resident_id TEXT NOT NULL REFERENCES residents(id),
      type TEXT NOT NULL CHECK(type IN ('转房补差', '短住退押', '护理变更')),
      deposit_snapshot_json TEXT NOT NULL DEFAULT '{}',
      fee_calculation_json TEXT NOT NULL DEFAULT '{}',
      generated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fee_rates (
      id TEXT PRIMARY KEY,
      room_type TEXT NOT NULL,
      nursing_level TEXT NOT NULL,
      daily_rate REAL NOT NULL,
      deposit_amount REAL NOT NULL
    );
  `);

  const count = database.prepare('SELECT COUNT(*) as cnt FROM fee_rates').get() as { cnt: number };
  if (count.cnt === 0) {
    seedData(database);
  }
}

function seedData(db: Database.Database): void {
  const insertFeeRate = db.prepare(
    'INSERT INTO fee_rates (id, room_type, nursing_level, daily_rate, deposit_amount) VALUES (?, ?, ?, ?, ?)'
  );
  const feeRates = [
    ['fr1', '单人间', '自理', 180, 10000],
    ['fr2', '单人间', '半护理', 220, 12000],
    ['fr3', '单人间', '全护理', 280, 15000],
    ['fr4', '单人间', '特护', 350, 20000],
    ['fr5', '双人间', '自理', 120, 6000],
    ['fr6', '双人间', '半护理', 150, 8000],
    ['fr7', '双人间', '全护理', 200, 10000],
    ['fr8', '双人间', '特护', 260, 14000],
    ['fr9', '三人间', '自理', 90, 4000],
    ['fr10', '三人间', '半护理', 120, 5000],
    ['fr11', '三人间', '全护理', 160, 7000],
    ['fr12', '三人间', '特护', 210, 10000],
    ['fr13', '特护间', '全护理', 320, 18000],
    ['fr14', '特护间', '特护', 420, 25000],
  ];
  const insertFeeRates = db.transaction((rates: any[][]) => {
    for (const r of rates) insertFeeRate.run(...r);
  });
  insertFeeRates(feeRates);

  const insertBed = db.prepare(
    'INSERT INTO beds (id, room_number, bed_number, floor, room_type, status, daily_rate) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const beds = [
    ['b1', '101', 'A', 1, '单人间', '空', 180],
    ['b2', '101', 'B', 1, '单人间', '空', 180],
    ['b3', '102', 'A', 1, '双人间', '空', 120],
    ['b4', '102', 'B', 1, '双人间', '空', 120],
    ['b5', '103', 'A', 1, '双人间', '空', 120],
    ['b6', '103', 'B', 1, '双人间', '空', 120],
    ['b7', '201', 'A', 2, '三人间', '空', 90],
    ['b8', '201', 'B', 2, '三人间', '空', 90],
    ['b9', '201', 'C', 2, '三人间', '空', 90],
    ['b10', '202', 'A', 2, '三人间', '空', 90],
    ['b11', '202', 'B', 2, '三人间', '空', 90],
    ['b12', '202', 'C', 2, '三人间', '空', 90],
    ['b13', '301', 'A', 3, '特护间', '空', 320],
    ['b14', '301', 'B', 3, '特护间', '空', 320],
    ['b15', '302', 'A', 3, '单人间', '空', 220],
    ['b16', '302', 'B', 3, '单人间', '空', 220],
  ];
  const insertBeds = db.transaction((data: any[][]) => {
    for (const b of data) insertBed.run(...b);
  });
  insertBeds(beds);

  const insertResident = db.prepare(
    `INSERT INTO residents (id, name, gender, birth_date, id_card, nursing_level, bed_id, admit_date, emergency_contact, emergency_phone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const residents = [
    ['r1', '张秀兰', '女', '1945-03-12', '310101194503120028', '半护理', 'b3', '2025-09-15', '张伟', '13800001111', '在住'],
    ['r2', '李德明', '男', '1940-07-22', '310101194007220015', '自理', 'b5', '2025-11-01', '李芳', '13900002222', '在住'],
    ['r3', '王桂芬', '女', '1938-11-05', '310101193811050043', '全护理', 'b1', '2025-06-20', '王建国', '13700003333', '在住'],
    ['r4', '赵福生', '男', '1942-01-18', '310101194201180017', '特护', 'b13', '2025-04-10', '赵敏', '13600004444', '在住'],
  ];
  const insertResidents = db.transaction((data: any[][]) => {
    for (const r of data) insertResident.run(...r);
  });
  insertResidents(residents);

  const insertDeposit = db.prepare(
    'INSERT INTO deposits (id, resident_id, total_amount, current_balance, status) VALUES (?, ?, ?, ?, ?)'
  );
  const deposits = [
    ['d1', 'r1', 8000, 8000, '已收'],
    ['d2', 'r2', 6000, 6000, '已收'],
    ['d3', 'r3', 15000, 15000, '已收'],
    ['d4', 'r4', 25000, 25000, '已收'],
  ];
  const insertDeposits = db.transaction((data: any[][]) => {
    for (const d of data) insertDeposit.run(...d);
  });
  insertDeposits(deposits);

  const insertTransaction = db.prepare(
    'INSERT INTO deposit_transactions (id, deposit_id, type, amount, reason, trigger_source) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const transactions = [
    ['dt1', 'd1', '收取', 8000, '入住押金', '入住档案 r1'],
    ['dt2', 'd2', '收取', 6000, '入住押金', '入住档案 r2'],
    ['dt3', 'd3', '收取', 15000, '入住押金', '入住档案 r3'],
    ['dt4', 'd4', '收取', 25000, '入住押金', '入住档案 r4'],
  ];
  const insertTransactions = db.transaction((data: any[][]) => {
    for (const t of data) insertTransaction.run(...t);
  });
  insertTransactions(transactions);

  const updateBed = db.prepare(
    'UPDATE beds SET status = ?, resident_id = ?, daily_rate = ? WHERE id = ?'
  );
  const bedUpdates: any[][] = [
    ['已住', 'r1', 150, 'b3'],
    ['已住', 'r2', 120, 'b5'],
    ['已住', 'r3', 280, 'b1'],
    ['已住', 'r4', 420, 'b13'],
  ];
  const updateBeds = db.transaction((data: any[][]) => {
    for (const b of data) updateBed.run(...b);
  });
  updateBeds(bedUpdates);
}
