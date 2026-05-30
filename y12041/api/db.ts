import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DB_PATH = join(__dirname, '..', 'data', 'soundscape.db')

let db: Database.Database | null = null

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS levels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
      nightThresholdDb REAL NOT NULL DEFAULT 45.0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sound_sources (
      id TEXT PRIMARY KEY,
      levelId TEXT NOT NULL REFERENCES levels(id),
      name TEXT NOT NULL,
      dbLevel REAL NOT NULL,
      timeSlot TEXT NOT NULL CHECK(timeSlot IN ('day','night')),
      frequencyBand TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resident_emotions (
      id TEXT PRIMARY KEY,
      levelId TEXT NOT NULL REFERENCES levels(id),
      type TEXT NOT NULL CHECK(type IN ('annoyed','anxious','calm','sleepless')),
      intensity REAL NOT NULL,
      delayed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS emotion_source_links (
      emotionId TEXT NOT NULL REFERENCES resident_emotions(id),
      sourceId TEXT NOT NULL REFERENCES sound_sources(id),
      PRIMARY KEY (emotionId, sourceId)
    );

    CREATE TABLE IF NOT EXISTS remix_reports (
      id TEXT PRIMARY KEY,
      levelId TEXT NOT NULL REFERENCES levels(id),
      combinedDb REAL NOT NULL,
      hasOverlap INTEGER NOT NULL DEFAULT 0,
      overlapMerged INTEGER NOT NULL DEFAULT 0,
      violatesNightThreshold INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS report_source_links (
      reportId TEXT NOT NULL REFERENCES remix_reports(id),
      sourceId TEXT NOT NULL REFERENCES sound_sources(id),
      PRIMARY KEY (reportId, sourceId)
    );

    CREATE TABLE IF NOT EXISTS judgments (
      id TEXT PRIMARY KEY,
      levelId TEXT NOT NULL REFERENCES levels(id),
      reportId TEXT NOT NULL REFERENCES remix_reports(id),
      dbStackingCorrect INTEGER,
      overlapNotMerged INTEGER,
      nightThresholdOk INTEGER,
      emotionModifier REAL NOT NULL DEFAULT 1.0,
      score REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS judgment_emotion_links (
      judgmentId TEXT NOT NULL REFERENCES judgments(id),
      emotionId TEXT NOT NULL REFERENCES resident_emotions(id),
      PRIMARY KEY (judgmentId, emotionId)
    );
  `)
}

function seedDirtySample(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM levels').get() as { cnt: number }
  if (count.cnt > 0) return

  const insertLevel = db.prepare('INSERT INTO levels (id, name, difficulty, nightThresholdDb) VALUES (?, ?, ?, ?)')
  const insertSource = db.prepare('INSERT INTO sound_sources (id, levelId, name, dbLevel, timeSlot, frequencyBand) VALUES (?, ?, ?, ?, ?, ?)')
  const insertEmotion = db.prepare('INSERT INTO resident_emotions (id, levelId, type, intensity, delayed) VALUES (?, ?, ?, ?, ?)')
  const insertEmotionLink = db.prepare('INSERT INTO emotion_source_links (emotionId, sourceId) VALUES (?, ?)')
  const insertReport = db.prepare('INSERT INTO remix_reports (id, levelId, combinedDb, hasOverlap, overlapMerged, violatesNightThreshold) VALUES (?, ?, ?, ?, ?, ?)')
  const insertReportLink = db.prepare('INSERT INTO report_source_links (reportId, sourceId) VALUES (?, ?)')

  const levelId = 'dirty-sample-001'
  const srcTraffic = 'ds-src-001'
  const srcConstruction = 'ds-src-002'
  const srcSquaredance = 'ds-src-003'
  const emoAnnoyed = 'ds-emo-001'
  const emoSleepless = 'ds-emo-002'
  const report1 = 'ds-rpt-001'
  const report2 = 'ds-rpt-002'

  const tx = db.transaction(() => {
    insertLevel.run(levelId, '分贝叠加错样例', 'easy', 45.0)

    insertSource.run(srcTraffic, levelId, '交通噪声', 72, 'night', 'low')
    insertSource.run(srcConstruction, levelId, '施工噪声', 85, 'day', 'mid')
    insertSource.run(srcSquaredance, levelId, '广场舞', 78, 'night', 'mid')

    insertEmotion.run(emoAnnoyed, levelId, 'annoyed', 0.8, 0)
    insertEmotionLink.run(emoAnnoyed, srcTraffic)
    insertEmotionLink.run(emoAnnoyed, srcConstruction)

    insertEmotion.run(emoSleepless, levelId, 'sleepless', 0.9, 1)
    insertEmotionLink.run(emoSleepless, srcTraffic)
    insertEmotionLink.run(emoSleepless, srcSquaredance)

    insertReport.run(report1, levelId, 157, 0, 0, 0)
    insertReportLink.run(report1, srcTraffic)
    insertReportLink.run(report1, srcConstruction)

    insertReport.run(report2, levelId, 80.3, 1, 1, 1)
    insertReportLink.run(report2, srcTraffic)
    insertReportLink.run(report2, srcSquaredance)
  })

  tx()
}

export function getDb(): Database.Database {
  if (db) return db

  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)
  seedDirtySample(db)

  return db
}
