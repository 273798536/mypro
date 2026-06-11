import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'cryo_ledger.db')

let db: Database.Database | null = null

const TABLE_SQL = [
  `CREATE TABLE IF NOT EXISTS reagent_batches (
    id TEXT PRIMARY KEY,
    batch_number TEXT NOT NULL UNIQUE,
    reagent_name TEXT NOT NULL,
    supplier TEXT NOT NULL DEFAULT '',
    expiry_date TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS cryo_records (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('freeze', 'thaw')),
    cell_line TEXT NOT NULL,
    passage_number INTEGER NOT NULL,
    operator TEXT NOT NULL,
    date TEXT NOT NULL,
    freezing_medium TEXT NOT NULL DEFAULT '',
    reagent_batch_id TEXT NOT NULL,
    storage_location TEXT NOT NULL DEFAULT '',
    viability_rate REAL,
    conclusion TEXT NOT NULL CHECK(conclusion IN ('success', 'failed', 'pending')),
    status TEXT NOT NULL CHECK(status IN ('usable', 'review_needed', 'reviewed_ok', 'reviewed_failed')),
    parent_record_id TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (reagent_batch_id) REFERENCES reagent_batches(id),
    FOREIGN KEY (parent_record_id) REFERENCES cryo_records(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS micro_photos (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    photo_type TEXT NOT NULL CHECK(photo_type IN ('pre_freeze', 'post_thaw', 'observation')),
    uploaded_at TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES cryo_records(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS anomaly_reviews (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    anomaly_type TEXT NOT NULL CHECK(anomaly_type IN ('missing_photo', 'annotation_conflict', 'viability_anomaly', 'label_unclear')),
    description TEXT NOT NULL,
    actionable_hint TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending', 'approved', 'rejected')),
    reviewer TEXT,
    review_comment TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES cryo_records(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS anomaly_source_links (
    id TEXT PRIMARY KEY,
    anomaly_id TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    FOREIGN KEY (anomaly_id) REFERENCES anomaly_reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (source_record_id) REFERENCES cryo_records(id) ON DELETE CASCADE
  )`,
]

const INDEX_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_cryo_records_type ON cryo_records(type)',
  'CREATE INDEX IF NOT EXISTS idx_cryo_records_cell_line ON cryo_records(cell_line)',
  'CREATE INDEX IF NOT EXISTS idx_cryo_records_date ON cryo_records(date)',
  'CREATE INDEX IF NOT EXISTS idx_cryo_records_status ON cryo_records(status)',
  'CREATE INDEX IF NOT EXISTS idx_cryo_records_parent ON cryo_records(parent_record_id)',
  'CREATE INDEX IF NOT EXISTS idx_cryo_records_reagent ON cryo_records(reagent_batch_id)',
  'CREATE INDEX IF NOT EXISTS idx_micro_photos_record ON micro_photos(record_id)',
  'CREATE INDEX IF NOT EXISTS idx_anomaly_reviews_record ON anomaly_reviews(record_id)',
  'CREATE INDEX IF NOT EXISTS idx_anomaly_reviews_status ON anomaly_reviews(review_status)',
  'CREATE INDEX IF NOT EXISTS idx_anomaly_source_links_anomaly ON anomaly_source_links(anomaly_id)',
]

function seed(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM reagent_batches').get() as { cnt: number }
  if (count.cnt > 0) return

  const now = new Date().toISOString()

  const batch1 = uuid(), batch2 = uuid(), batch3 = uuid()
  const insertBatch = db.prepare(
    'INSERT INTO reagent_batches (id, batch_number, reagent_name, supplier, expiry_date, notes) VALUES (?,?,?,?,?,?)'
  )
  insertBatch.run(batch1, 'DMSO-2024-001', 'DMSO冻存液', 'Sigma-Aldrich', '2025-06-30', '标准冻存保护剂')
  insertBatch.run(batch2, 'FBS-2024-015', '胎牛血清', 'Gibco', '2025-03-15', '澳洲进口')
  insertBatch.run(batch3, 'TRY-2024-008', '胰酶消化液', 'ThermoFisher', '2025-09-20', '0.25%胰酶-EDTA')

  const rec1 = uuid(), rec2 = uuid(), rec3 = uuid(), rec4 = uuid(), rec5 = uuid(), rec6 = uuid()
  const insertRec = db.prepare(
    `INSERT INTO cryo_records (id, type, cell_line, passage_number, operator, date, freezing_medium, reagent_batch_id, storage_location, viability_rate, conclusion, status, parent_record_id, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  )
  insertRec.run(rec1, 'freeze', 'HEK293T', 5, '张三', '2024-10-01', '90%FBS+10%DMSO', batch1, 'A区-液氮罐1-架3-盒2', null, 'pending', 'usable', null, '首次冻存HEK293T', now, now)
  insertRec.run(rec2, 'freeze', 'HEK293T', 8, '李四', '2024-11-15', '90%FBS+10%DMSO', batch1, 'A区-液氮罐1-架3-盒2', null, 'pending', 'usable', rec1, 'HEK293T第二次冻存', now, now)
  insertRec.run(rec3, 'thaw', 'HEK293T', 5, '张三', '2024-12-01', '90%FBS+10%DMSO', batch1, '', 92.5, 'success', 'usable', rec1, '复苏成功，细胞状态良好', now, now)
  insertRec.run(rec4, 'freeze', 'CHO-K1', 3, '王五', '2024-10-20', '90%FBS+10%DMSO', batch2, 'B区-液氮罐2-架1-盒5', null, 'pending', 'usable', null, '首次冻存CHO-K1', now, now)
  insertRec.run(rec5, 'thaw', 'CHO-K1', 3, '王五', '2024-12-10', '90%FBS+10%DMSO', batch2, '', 35.0, 'failed', 'review_needed', rec4, '复苏失败，存活率极低', now, now)
  insertRec.run(rec6, 'freeze', 'HeLa', 12, '赵六', '2025-01-05', '90%FBS+10%DMSO', batch3, 'C区-液氮罐3-架2-盒1', null, 'pending', 'usable', null, 'HeLa冻存', now, now)

  const insertPhoto = db.prepare(
    'INSERT INTO micro_photos (id, record_id, file_path, label, photo_type, uploaded_at) VALUES (?,?,?,?,?,?)'
  )
  insertPhoto.run(uuid(), rec1, 'uploads/pre_freeze_hek293t_p5.jpg', 'HEK293T P5代 冻存前', 'pre_freeze', now)
  insertPhoto.run(uuid(), rec3, 'uploads/post_thaw_hek293t_p5.jpg', 'HEK293T P5代 复苏后', 'post_thaw', now)
  insertPhoto.run(uuid(), rec4, 'uploads/pre_freeze_cho_p3.jpg', 'CHO-K1 P3代 冻存前', 'pre_freeze', now)
  insertPhoto.run(uuid(), rec5, 'uploads/post_thaw_cho_p3.jpg', '', 'post_thaw', now)

  const anom1 = uuid(), anom2 = uuid(), anom3 = uuid()
  const insertAnomaly = db.prepare(
    `INSERT INTO anomaly_reviews (id, record_id, anomaly_type, description, actionable_hint, review_status, reviewer, review_comment, reviewed_at, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  )
  insertAnomaly.run(anom1, rec5, 'viability_anomaly', 'CHO-K1复苏存活率仅35%，低于50%阈值', '复苏存活率异常偏低(35%)，请检查冻存流程及试剂批号FBS-2024-015是否过期', 'pending', null, null, null, now)
  insertAnomaly.run(anom2, rec5, 'label_unclear', 'CHO-K1复苏后显微照片标签为空', '照片标签为空，请补充标注细胞系名称、代次及拍照时间', 'pending', null, null, null, now)
  insertAnomaly.run(anom3, rec2, 'missing_photo', 'HEK293T第二次冻存缺少冻存前显微照片', '缺少冻存前显微照片，请上传冻存前（P8代）照片', 'pending', null, null, null, now)

  const insertLink = db.prepare(
    'INSERT INTO anomaly_source_links (id, anomaly_id, source_record_id) VALUES (?,?,?)'
  )
  insertLink.run(uuid(), anom1, rec5)
  insertLink.run(uuid(), anom1, rec4)
  insertLink.run(uuid(), anom2, rec5)
  insertLink.run(uuid(), anom3, rec2)
}

export function getDb(): Database.Database {
  if (db) return db

  mkdirSync(DATA_DIR, { recursive: true })

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  for (const sql of TABLE_SQL) db.exec(sql)
  for (const sql of INDEX_SQL) db.exec(sql)

  seed(db)
  return db
}
