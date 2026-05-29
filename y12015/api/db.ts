import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.resolve(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'allocation.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      card_no TEXT UNIQUE NOT NULL,
      holder_name TEXT NOT NULL,
      purchase_amount REAL NOT NULL,
      valid_from TEXT NOT NULL,
      valid_to TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      card_no TEXT NOT NULL,
      scenic_spot_id TEXT NOT NULL,
      scenic_spot_name TEXT NOT NULL,
      entry_time TEXT NOT NULL,
      swipe_serial_no TEXT NOT NULL,
      is_deduplicated INTEGER DEFAULT 0,
      deduplicated_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (card_no) REFERENCES accounts(card_no)
    );

    CREATE INDEX IF NOT EXISTS idx_entries_card_no ON entries(card_no);
    CREATE INDEX IF NOT EXISTS idx_entries_scenic_spot ON entries(scenic_spot_id);
    CREATE INDEX IF NOT EXISTS idx_entries_dedup ON entries(is_deduplicated);

    CREATE TABLE IF NOT EXISTS subsidies (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      activity_name TEXT NOT NULL,
      scenic_spot_id TEXT NOT NULL,
      scenic_spot_name TEXT NOT NULL,
      subsidy_amount REAL NOT NULL,
      valid_from TEXT NOT NULL,
      valid_to TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_subsidies_spot ON subsidies(scenic_spot_id);
    CREATE INDEX IF NOT EXISTS idx_subsidies_activity ON subsidies(activity_id);
    CREATE INDEX IF NOT EXISTS idx_subsidies_version ON subsidies(version);

    CREATE TABLE IF NOT EXISTS allocation_results (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      card_no TEXT NOT NULL,
      scenic_spot_id TEXT NOT NULL,
      scenic_spot_name TEXT NOT NULL,
      entry_count INTEGER NOT NULL,
      base_allocation REAL NOT NULL,
      subsidy_amount REAL NOT NULL,
      refund_adjustment REAL NOT NULL,
      total_allocation REAL NOT NULL,
      calculated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (card_no) REFERENCES accounts(card_no)
    );

    CREATE INDEX IF NOT EXISTS idx_allocation_version ON allocation_results(version);
    CREATE INDEX IF NOT EXISTS idx_allocation_card ON allocation_results(card_no);
    CREATE INDEX IF NOT EXISTS idx_allocation_spot ON allocation_results(scenic_spot_id);

    CREATE TABLE IF NOT EXISTS correction_history (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('update', 'delete', 'add')),
      old_data TEXT,
      new_data TEXT,
      old_version TEXT NOT NULL,
      new_version TEXT NOT NULL,
      corrected_by TEXT NOT NULL DEFAULT 'system',
      corrected_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_correction_entry ON correction_history(entry_id);
    CREATE INDEX IF NOT EXISTS idx_correction_version ON correction_history(new_version);

    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      card_no TEXT NOT NULL,
      scenic_spot_id TEXT NOT NULL,
      scenic_spot_name TEXT NOT NULL,
      refund_amount REAL NOT NULL,
      refund_time TEXT NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (card_no) REFERENCES accounts(card_no)
    );

    CREATE INDEX IF NOT EXISTS idx_refunds_card ON refunds(card_no);
    CREATE INDEX IF NOT EXISTS idx_refunds_spot ON refunds(scenic_spot_id);
  `)
}

export function seedDemoData(): void {
  const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number }
  if (accountCount.count > 0) return

  const insertAccount = db.prepare(
    'INSERT INTO accounts (id, card_no, holder_name, purchase_amount, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const insertEntry = db.prepare(
    'INSERT INTO entries (id, card_no, scenic_spot_id, scenic_spot_name, entry_time, swipe_serial_no, is_deduplicated) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const insertSubsidy = db.prepare(
    'INSERT INTO subsidies (id, activity_id, activity_name, scenic_spot_id, scenic_spot_name, subsidy_amount, valid_from, valid_to, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const insertRefund = db.prepare(
    'INSERT INTO refunds (id, card_no, scenic_spot_id, scenic_spot_name, refund_amount, refund_time, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )

  const accounts = [
    { cardNo: 'NK2026001', name: '张三', amount: 1200, from: '2026-01-01', to: '2026-12-31' },
    { cardNo: 'NK2026002', name: '李四', amount: 1200, from: '2026-01-01', to: '2026-12-31' },
    { cardNo: 'NK2026003', name: '王五', amount: 980, from: '2026-03-01', to: '2027-02-28' },
    { cardNo: 'NK2026004', name: '赵六', amount: 1500, from: '2026-01-01', to: '2026-12-31' },
    { cardNo: 'NK2026005', name: '钱七', amount: 1200, from: '2026-02-01', to: '2027-01-31' },
  ]

  const spots = [
    { id: 'HS001', name: '黄山' },
    { id: 'JZG001', name: '九寨沟' },
    { id: 'ZJJ001', name: '张家界' },
    { id: 'XH001', name: '西湖' },
  ]

  const transaction = db.transaction(() => {
    for (const a of accounts) {
      insertAccount.run(uuidv4(), a.cardNo, a.name, a.amount, a.from, a.to)
    }

    const entryData: Array<{ cardNo: string; spotId: string; spotName: string; time: string; serial: string; dedup: number }> = []

    entryData.push({ cardNo: 'NK2026001', spotId: 'HS001', spotName: '黄山', time: '2026-03-15 09:00:00', serial: 'SW001', dedup: 0 })
    entryData.push({ cardNo: 'NK2026001', spotId: 'HS001', spotName: '黄山', time: '2026-03-15 09:05:00', serial: 'SW002', dedup: 1 })
    entryData.push({ cardNo: 'NK2026001', spotId: 'JZG001', spotName: '九寨沟', time: '2026-04-10 10:30:00', serial: 'SW003', dedup: 0 })
    entryData.push({ cardNo: 'NK2026001', spotId: 'ZJJ001', spotName: '张家界', time: '2026-05-20 14:00:00', serial: 'SW004', dedup: 0 })

    entryData.push({ cardNo: 'NK2026002', spotId: 'HS001', spotName: '黄山', time: '2026-03-16 08:30:00', serial: 'SW005', dedup: 0 })
    entryData.push({ cardNo: 'NK2026002', spotId: 'XH001', spotName: '西湖', time: '2026-04-05 09:00:00', serial: 'SW006', dedup: 0 })
    entryData.push({ cardNo: 'NK2026002', spotId: 'XH001', spotName: '西湖', time: '2026-04-05 09:10:00', serial: 'SW007', dedup: 1 })
    entryData.push({ cardNo: 'NK2026002', spotId: 'JZG001', spotName: '九寨沟', time: '2026-06-01 11:00:00', serial: 'SW008', dedup: 0 })
    entryData.push({ cardNo: 'NK2026002', spotId: 'ZJJ001', spotName: '张家界', time: '2026-07-15 15:00:00', serial: 'SW009', dedup: 0 })

    entryData.push({ cardNo: 'NK2026003', spotId: 'HS001', spotName: '黄山', time: '2026-05-01 07:30:00', serial: 'SW010', dedup: 0 })
    entryData.push({ cardNo: 'NK2026003', spotId: 'JZG001', spotName: '九寨沟', time: '2026-05-02 10:00:00', serial: 'SW011', dedup: 0 })

    entryData.push({ cardNo: 'NK2026004', spotId: 'ZJJ001', spotName: '张家界', time: '2026-03-20 13:00:00', serial: 'SW012', dedup: 0 })
    entryData.push({ cardNo: 'NK2026004', spotId: 'HS001', spotName: '黄山', time: '2026-04-15 09:00:00', serial: 'SW013', dedup: 0 })
    entryData.push({ cardNo: 'NK2026004', spotId: 'XH001', spotName: '西湖', time: '2026-05-10 10:00:00', serial: 'SW014', dedup: 0 })
    entryData.push({ cardNo: 'NK2026004', spotId: 'JZG001', spotName: '九寨沟', time: '2026-06-20 11:30:00', serial: 'SW015', dedup: 0 })
    entryData.push({ cardNo: 'NK2026004', spotId: 'ZJJ001', spotName: '张家界', time: '2026-07-25 14:00:00', serial: 'SW016', dedup: 0 })

    entryData.push({ cardNo: 'NK2026005', spotId: 'XH001', spotName: '西湖', time: '2026-03-10 08:00:00', serial: 'SW017', dedup: 0 })
    entryData.push({ cardNo: 'NK2026005', spotId: 'HS001', spotName: '黄山', time: '2026-04-20 09:30:00', serial: 'SW018', dedup: 0 })
    entryData.push({ cardNo: 'NK2026005', spotId: 'XH001', spotName: '西湖', time: '2026-05-15 10:30:00', serial: 'SW019', dedup: 0 })

    for (const e of entryData) {
      insertEntry.run(
        uuidv4(), e.cardNo, e.spotId, e.spotName, e.time, e.serial, e.dedup
      )
    }

    const subsidies = [
      { actId: 'ACT001', actName: '春季旅游补贴', spotId: 'HS001', spotName: '黄山', amount: 50, from: '2026-03-01', to: '2026-05-31', ver: 1 },
      { actId: 'ACT002', actName: '暑期清凉补贴', spotId: 'JZG001', spotName: '九寨沟', amount: 80, from: '2026-06-01', to: '2026-08-31', ver: 1 },
      { actId: 'ACT003', actName: '淡季促销补贴', spotId: 'ZJJ001', spotName: '张家界', amount: 30, from: '2026-01-01', to: '2026-12-31', ver: 1 },
    ]

    for (const s of subsidies) {
      insertSubsidy.run(uuidv4(), s.actId, s.actName, s.spotId, s.spotName, s.amount, s.from, s.to, s.ver)
    }

    insertRefund.run(uuidv4(), 'NK2026002', 'XH001', '西湖', 100, '2026-06-01 10:00:00', '游客投诉退款')
    insertRefund.run(uuidv4(), 'NK2026004', 'JZG001', '九寨沟', 150, '2026-07-01 14:00:00', '天气原因退款')
  })

  transaction()
}

export default db
