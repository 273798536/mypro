import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, 'data')
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
const REPORTS_DIR = path.join(DATA_DIR, 'reports')
const DB_PATH = path.join(DATA_DIR, 'royalty.db')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true })

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS works (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      authors TEXT NOT NULL,
      isrc TEXT,
      status TEXT NOT NULL DEFAULT 'normal',
      anomalyTypes TEXT DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage_records (
      id TEXT PRIMARY KEY,
      workId TEXT NOT NULL,
      platform TEXT NOT NULL,
      usageCount INTEGER NOT NULL,
      period TEXT NOT NULL,
      unitPrice REAL NOT NULL,
      amount REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (workId) REFERENCES works(id)
    );

    CREATE TABLE IF NOT EXISTS proportion_versions (
      id TEXT PRIMARY KEY,
      workId TEXT NOT NULL,
      version INTEGER NOT NULL,
      proportions TEXT NOT NULL,
      effectiveDate TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (workId) REFERENCES works(id)
    );

    CREATE TABLE IF NOT EXISTS corrections (
      id TEXT PRIMARY KEY,
      workId TEXT NOT NULL,
      type TEXT NOT NULL,
      beforeValue TEXT NOT NULL,
      afterValue TEXT NOT NULL,
      explanation TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (workId) REFERENCES works(id)
    );

    CREATE TABLE IF NOT EXISTS appeals (
      id TEXT PRIMARY KEY,
      workId TEXT NOT NULL,
      correctionId TEXT NOT NULL,
      explanation TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (workId) REFERENCES works(id),
      FOREIGN KEY (correctionId) REFERENCES corrections(id)
    );

    CREATE TABLE IF NOT EXISTS import_records (
      id TEXT PRIMARY KEY,
      fileName TEXT NOT NULL,
      fileType TEXT NOT NULL,
      recordCount INTEGER NOT NULL DEFAULT 0,
      issues TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      data TEXT DEFAULT '[]',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      fileName TEXT NOT NULL,
      filePath TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `)

  const pragma = db.prepare("PRAGMA table_info(appeals)").all() as any[]
  const appealCols = new Set(pragma.map((c: any) => c.name))
  if (!appealCols.has('platformReply')) {
    db.exec("ALTER TABLE appeals ADD COLUMN platformReply TEXT")
  }
  if (!appealCols.has('result')) {
    db.exec("ALTER TABLE appeals ADD COLUMN result TEXT")
  }
}

const now = () => new Date().toISOString()

const SEED_WORKS = [
  { id: uuidv4(), title: '夜曲', authors: '周杰伦/方文山', isrc: 'CN-A01-05-001', status: 'anomaly', anomalyTypes: JSON.stringify(['under_report']) },
  { id: uuidv4(), title: '青花瓷', authors: '周杰伦/方文山', isrc: 'CN-A01-07-012', status: 'normal', anomalyTypes: JSON.stringify([]) },
  { id: uuidv4(), title: '光年之外', authors: '邓紫棋', isrc: 'CN-B02-16-003', status: 'anomaly', anomalyTypes: JSON.stringify(['proportion_change']) },
  { id: uuidv4(), title: '晴天', authors: '周杰伦', isrc: 'CN-A01-03-007', status: 'normal', anomalyTypes: JSON.stringify([]) },
  { id: uuidv4(), title: '起风了', authors: '买辣椒也用券', isrc: 'CN-C03-17-045', status: 'anomaly', anomalyTypes: JSON.stringify(['duplicate_use']) },
  { id: uuidv4(), title: '孤勇者', authors: '陈奕迅/钱雷', isrc: 'CN-D04-21-008', status: 'normal', anomalyTypes: JSON.stringify([]) },
  { id: uuidv4(), title: '漠河舞厅', authors: '柳爽', isrc: 'CN-E05-20-019', status: 'anomaly', anomalyTypes: JSON.stringify(['under_report', 'proportion_change']) },
  { id: uuidv4(), title: '稻香', authors: '周杰伦', isrc: 'CN-A01-08-002', status: 'normal', anomalyTypes: JSON.stringify([]) },
]

function buildSeedUsageRecords() {
  const records: any[] = []
  const platforms = ['short_video', 'ktv', 'live']
  const unitPrices: Record<string, number> = { short_video: 0.01, ktv: 0.5, live: 0.03 }
  const periods = ['2026-01', '2026-02', '2026-03', '2026-04']

  for (const work of SEED_WORKS) {
    for (const platform of platforms) {
      for (const period of periods) {
        const usageCount = Math.floor(Math.random() * 90000) + 10000
        records.push({
          id: uuidv4(),
          workId: work.id,
          platform,
          usageCount,
          period,
          unitPrice: unitPrices[platform],
          amount: Math.round(usageCount * unitPrices[platform] * 100) / 100,
          createdAt: now(),
        })
      }
    }
  }
  return records
}

function buildSeedProportionVersions() {
  const versions: any[] = []
  const roles = ['composer', 'lyricist', 'arranger', 'publisher', 'performer']

  for (const work of SEED_WORKS) {
    const authorList = work.authors.split('/')
    const proportions: Record<string, number> = {}
    let remaining = 1.0

    for (let i = 0; i < roles.length; i++) {
      const share = i < roles.length - 1 ? Math.round((remaining / (roles.length - i)) * 100) / 100 : Math.round(remaining * 100) / 100
      proportions[roles[i]] = share
      remaining = Math.round((remaining - share) * 100) / 100
    }

    versions.push({
      id: uuidv4(),
      workId: work.id,
      version: 1,
      proportions: JSON.stringify(proportions),
      effectiveDate: '2026-01-01',
      createdAt: now(),
    })

    if (work.status === 'anomaly' && work.anomalyTypes.includes('proportion_change')) {
      const newProportions = { ...proportions }
      newProportions.composer = Math.round((newProportions.composer + 0.1) * 100) / 100
      newProportions.lyricist = Math.round((newProportions.lyricist - 0.1) * 100) / 100
      versions.push({
        id: uuidv4(),
        workId: work.id,
        version: 2,
        proportions: JSON.stringify(newProportions),
        effectiveDate: '2026-03-01',
        createdAt: now(),
      })
    }
  }
  return versions
}

function buildSeedCorrections(works: any[]) {
  const corrections: any[] = []
  const anomalyWorks = works.filter(w => w.status === 'anomaly')

  for (const work of anomalyWorks) {
    const types = JSON.parse(work.anomalyTypes)
    for (const type of types) {
      if (type === 'under_report') {
        corrections.push({
          id: uuidv4(),
          workId: work.id,
          type: 'under_report',
          beforeValue: '52300',
          afterValue: '89200',
          explanation: `${work.title}在短视频平台使用量被低估，实际播放量远高于报告数据`,
          createdAt: now(),
        })
      }
      if (type === 'proportion_change') {
        corrections.push({
          id: uuidv4(),
          workId: work.id,
          type: 'proportion_change',
          beforeValue: JSON.stringify({ composer: 0.3, lyricist: 0.25 }),
          afterValue: JSON.stringify({ composer: 0.4, lyricist: 0.15 }),
          explanation: `${work.title}词曲作者分成比例经核实需调整`,
          createdAt: now(),
        })
      }
      if (type === 'duplicate_use') {
        corrections.push({
          id: uuidv4(),
          workId: work.id,
          type: 'duplicate_use',
          beforeValue: '2条重复记录',
          afterValue: '去重后1条',
          explanation: `${work.title}在KTV平台存在重复使用记录，需去重处理`,
          createdAt: now(),
        })
      }
    }
  }
  return corrections
}

function buildSeedAppeals(corrections: any[]) {
  const appeals: any[] = []
  const statuses = ['pending', 'platform_replied', 'confirmed']
  const platformReplies = [null, '平台已核查原始使用日志，确认数据存在差异', '平台已确认修正并补付差额']
  const results = [null, null, '已补付 ¥3,200.00']

  for (let i = 0; i < corrections.length; i++) {
    const idx = i % 3
    appeals.push({
      id: uuidv4(),
      workId: corrections[i].workId,
      correctionId: corrections[i].id,
      explanation: `对"${corrections[i].type}"类纠正提出申诉，请平台重新核实`,
      status: statuses[idx],
      platformReply: platformReplies[idx],
      result: results[idx],
      createdAt: now(),
      updatedAt: now(),
    })
  }
  return appeals
}

export function seedData() {
  const count = (db.prepare('SELECT COUNT(*) as count FROM works').get() as any).count
  if (count > 0) return

  const insertWork = db.prepare(`
    INSERT INTO works (id, title, authors, isrc, status, anomalyTypes, createdAt, updatedAt)
    VALUES (@id, @title, @authors, @isrc, @status, @anomalyTypes, @createdAt, @updatedAt)
  `)

  const insertUsage = db.prepare(`
    INSERT INTO usage_records (id, workId, platform, usageCount, period, unitPrice, amount, createdAt)
    VALUES (@id, @workId, @platform, @usageCount, @period, @unitPrice, @amount, @createdAt)
  `)

  const insertProportion = db.prepare(`
    INSERT INTO proportion_versions (id, workId, version, proportions, effectiveDate, createdAt)
    VALUES (@id, @workId, @version, @proportions, @effectiveDate, @createdAt)
  `)

  const insertCorrection = db.prepare(`
    INSERT INTO corrections (id, workId, type, beforeValue, afterValue, explanation, createdAt)
    VALUES (@id, @workId, @type, @beforeValue, @afterValue, @explanation, @createdAt)
  `)

  const insertAppeal = db.prepare(`
    INSERT INTO appeals (id, workId, correctionId, explanation, status, platformReply, result, createdAt, updatedAt)
    VALUES (@id, @workId, @correctionId, @explanation, @status, @platformReply, @result, @createdAt, @updatedAt)
  `)

  const transaction = db.transaction(() => {
    const ts = now()
    for (const work of SEED_WORKS) {
      insertWork.run({ ...work, createdAt: ts, updatedAt: ts })
    }

    const usageRecords = buildSeedUsageRecords()
    for (const record of usageRecords) {
      insertUsage.run(record)
    }

    const proportionVersions = buildSeedProportionVersions()
    for (const pv of proportionVersions) {
      insertProportion.run(pv)
    }

    const corrections = buildSeedCorrections(SEED_WORKS)
    for (const c of corrections) {
      insertCorrection.run(c)
    }

    const appeals = buildSeedAppeals(corrections)
    for (const a of appeals) {
      insertAppeal.run(a)
    }
  })

  transaction()
  console.log('Seed data inserted successfully')
}

export function initDatabase() {
  runMigrations()
  seedData()
}

export { db, DATA_DIR, UPLOADS_DIR, REPORTS_DIR }
export default db
