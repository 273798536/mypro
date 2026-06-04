import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'workshop.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = initDb()
  }
  return db
}

function initDb(): Database.Database {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const database = new Database(DB_PATH)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')

  createTables(database)
  seedData(database)

  return database
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workshop (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      floorPlanPath TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS color_rule (
      id TEXT PRIMARY KEY,
      workshopId TEXT NOT NULL REFERENCES workshop(id),
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      UNIQUE(workshopId, name)
    );

    CREATE TABLE IF NOT EXISTS import_batch (
      id TEXT PRIMARY KEY,
      workshopId TEXT NOT NULL REFERENCES workshop(id),
      totalCount INTEGER NOT NULL DEFAULT 0,
      importedCount INTEGER NOT NULL DEFAULT 0,
      duplicateCount INTEGER NOT NULL DEFAULT 0,
      anomalies TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS defect (
      id TEXT PRIMARY KEY,
      workshopId TEXT NOT NULL REFERENCES workshop(id),
      colorRuleId TEXT REFERENCES color_rule(id),
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','resolved')),
      posX REAL NOT NULL,
      posY REAL NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','import')),
      importBatchId TEXT REFERENCES import_batch(id),
      isOfflineAsset INTEGER NOT NULL DEFAULT 0,
      coordinateOffset INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS status_log (
      id TEXT PRIMARY KEY,
      defectId TEXT NOT NULL REFERENCES defect(id),
      fromStatus TEXT NOT NULL,
      toStatus TEXT NOT NULL,
      operator TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS handling_opinion (
      id TEXT PRIMARY KEY,
      defectId TEXT NOT NULL REFERENCES defect(id),
      content TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_defect_workshop ON defect(workshopId);
    CREATE INDEX IF NOT EXISTS idx_defect_status ON defect(status);
    CREATE INDEX IF NOT EXISTS idx_defect_batch ON defect(importBatchId);
    CREATE INDEX IF NOT EXISTS idx_defect_type ON defect(type);
    CREATE INDEX IF NOT EXISTS idx_status_log_defect ON status_log(defectId);
    CREATE INDEX IF NOT EXISTS idx_opinion_defect ON handling_opinion(defectId);
  `)
}

function seedData(db: Database.Database): void {
  const workshopCount = db.prepare('SELECT COUNT(*) as cnt FROM workshop').get() as { cnt: number }
  if (workshopCount.cnt > 0) return

  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')

  const insertWorkshop = db.prepare(
    'INSERT INTO workshop (id, name, floorPlanPath, createdAt) VALUES (?, ?, ?, ?)'
  )
  const insertColorRule = db.prepare(
    'INSERT INTO color_rule (id, workshopId, name, color, description) VALUES (?, ?, ?, ?, ?)'
  )
  const insertDefect = db.prepare(
    `INSERT INTO defect (id, workshopId, colorRuleId, type, status, posX, posY, width, height, description, source, importBatchId, isOfflineAsset, coordinateOffset, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertBatch = db.prepare(
    `INSERT INTO import_batch (id, workshopId, totalCount, importedCount, duplicateCount, anomalies, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  const insertStatusLog = db.prepare(
    'INSERT INTO status_log (id, defectId, fromStatus, toStatus, operator, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const insertOpinion = db.prepare(
    'INSERT INTO handling_opinion (id, defectId, content, author, createdAt) VALUES (?, ?, ?, ?, ?)'
  )

  const transaction = db.transaction(() => {
    const workshopId = uuidv4()
    insertWorkshop.run(workshopId, '演示车间-A', null, now)

    const ruleScratch = uuidv4()
    const ruleDeform = uuidv4()
    const ruleRust = uuidv4()

    insertColorRule.run(ruleScratch, workshopId, '划伤', '#E53935', '表面划伤缺陷标记')
    insertColorRule.run(ruleDeform, workshopId, '变形', '#E87722', '结构变形缺陷标记')
    insertColorRule.run(ruleRust, workshopId, '锈蚀', '#F9A825', '锈蚀缺陷标记')

    const batchId = uuidv4()
    insertBatch.run(batchId, workshopId, 3, 2, 1, '[]', now)

    const defect1 = uuidv4()
    insertDefect.run(
      defect1, workshopId, ruleScratch, '划伤', 'pending',
      120, 80, 60, 40, 'A区管道表面划伤', 'manual', null, 0, 0,
      now, now
    )

    const defect2 = uuidv4()
    insertDefect.run(
      defect2, workshopId, ruleDeform, '变形', 'pending',
      300, 200, 80, 50, 'B区支撑结构轻微变形', 'manual', null, 0, 0,
      now, now
    )

    const defect3 = uuidv4()
    insertDefect.run(
      defect3, workshopId, ruleRust, '锈蚀', 'approved',
      500, 150, 70, 60, 'C区设备底座锈蚀', 'import', batchId, 0, 0,
      now, now
    )
    insertStatusLog.run(uuidv4(), defect3, 'pending', 'approved', '巡检员张三', now)
    insertOpinion.run(uuidv4(), defect3, '确认锈蚀，需安排除锈处理', '巡检员张三', now)

    const defect4 = uuidv4()
    insertDefect.run(
      defect4, workshopId, ruleScratch, '划伤', 'rejected',
      200, 400, 50, 30, 'D区离线素材划伤记录（素材已缺失）', 'import', batchId, 1, 0,
      now, now
    )
    insertStatusLog.run(uuidv4(), defect4, 'pending', 'rejected', '巡检员李四', now)
    insertOpinion.run(uuidv4(), defect4, '离线素材已缺失，无法确认，驳回', '巡检员李四', now)

    const defect5 = uuidv4()
    insertDefect.run(
      defect5, workshopId, ruleDeform, '变形', 'resolved',
      450, 350, 90, 55, 'E区坐标偏移的变形缺陷', 'import', batchId, 0, 1,
      now, now
    )
    insertStatusLog.run(uuidv4(), defect5, 'pending', 'approved', '巡检员张三', now)
    insertStatusLog.run(uuidv4(), defect5, 'approved', 'resolved', '巡检员李四', now)
    insertOpinion.run(uuidv4(), defect5, '已安排维修处理，变形已修复', '巡检员李四', now)
  })

  transaction()
}
