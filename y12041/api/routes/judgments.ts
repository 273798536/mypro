import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

function calcEmotionModifier(db: any, emotionIds: string[]): number {
  if (emotionIds.length === 0) return 1.0

  const placeholders = emotionIds.map(() => '?').join(',')
  const emotions = db.prepare(`SELECT type, intensity FROM resident_emotions WHERE id IN (${placeholders})`).all(...emotionIds) as any[]

  let hasAnnoyedOrSleepless = false
  let hasCalm = false

  for (const e of emotions) {
    if ((e.type === 'annoyed' || e.type === 'sleepless') && e.intensity > 0.5) {
      hasAnnoyedOrSleepless = true
    }
    if (e.type === 'calm' && e.intensity > 0.5) {
      hasCalm = true
    }
  }

  if (hasAnnoyedOrSleepless) return 0.8
  if (hasCalm) return 1.2
  return 1.0
}

function calcLogDbSum(dbLevels: number[]): number {
  if (dbLevels.length === 0) return 0
  const linearSum = dbLevels.reduce((sum, db) => sum + Math.pow(10, db / 10), 0)
  const dbTotal = 10 * Math.log10(linearSum)
  return Math.round(dbTotal * 10) / 10
}

function calcRawScore(
  report: { combinedDb: number; overlapMerged: number; violatesNightThreshold: number; sourceIds: string[] },
  sources: { id: string; dbLevel: number }[],
  userDbStackingCorrect: number | null,
  userOverlapNotMerged: number | null,
  userNightThresholdOk: number | null,
  tolerance: number = 2.0
): { score: number; correctDbStacking: boolean; correctOverlap: boolean; correctNight: boolean } {
  let score = 0
  let correctDbStacking = false
  let correctOverlap = false
  let correctNight = false

  const reportSourceIds = new Set(report.sourceIds)
  const reportDbLevels = sources.filter(s => reportSourceIds.has(s.id)).map(s => s.dbLevel)
  const expectedCombinedDb = calcLogDbSum(reportDbLevels)
  const actualDbCorrect = Math.abs(report.combinedDb - expectedCombinedDb) <= tolerance

  if (userDbStackingCorrect !== null && userDbStackingCorrect !== undefined) {
    correctDbStacking = (userDbStackingCorrect === 1) === actualDbCorrect
    if (correctDbStacking) score += 10
  }

  const actualOverlapNotMerged = report.overlapMerged === 0
  if (userOverlapNotMerged !== null && userOverlapNotMerged !== undefined) {
    correctOverlap = (userOverlapNotMerged === 1) === actualOverlapNotMerged
    if (correctOverlap) score += 10
  }

  const actualNightThresholdOk = report.violatesNightThreshold === 0
  if (userNightThresholdOk !== null && userNightThresholdOk !== undefined) {
    correctNight = (userNightThresholdOk === 1) === actualNightThresholdOk
    if (correctNight) score += 10
  }

  return { score, correctDbStacking, correctOverlap, correctNight }
}

function toSqlBool(val: boolean | null | undefined): number | null {
  if (val === null || val === undefined) return null
  return val ? 1 : 0
}

function fromSqlBool(val: number | null): boolean | null {
  if (val === null || val === undefined) return null
  return val === 1
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { levelId, reportId, dbStackingCorrect, overlapNotMerged, nightThresholdOk } = req.body

  if (!levelId || !reportId) {
    res.status(400).json({ success: false, error: 'levelId and reportId are required' })
    return
  }

  const db = getDb()

  const level = db.prepare('SELECT id FROM levels WHERE id = ?').get(levelId)
  if (!level) {
    res.status(404).json({ success: false, error: 'Level not found' })
    return
  }

  const report = db.prepare('SELECT * FROM remix_reports WHERE id = ?').get(reportId)
  if (!report) {
    res.status(404).json({ success: false, error: 'Report not found' })
    return
  }

  const reportSourceLinks = db.prepare('SELECT sourceId FROM report_source_links WHERE reportId = ?').all(reportId) as any[]
  const sourceIds = reportSourceLinks.map(l => l.sourceId)
  report.sourceIds = sourceIds

  const sources = db.prepare('SELECT id, dbLevel FROM sound_sources WHERE levelId = ?').all(levelId) as any[]

  const { score: rawScore } = calcRawScore(
    report,
    sources,
    toSqlBool(dbStackingCorrect),
    toSqlBool(overlapNotMerged),
    toSqlBool(nightThresholdOk)
  )

  const emotionLinks = db.prepare(
    `SELECT DISTINCT emotionId FROM emotion_source_links WHERE sourceId IN (${sourceIds.map(() => '?').join(',')})`
  ).all(...sourceIds) as any[]
  const emotionIds = emotionLinks.map(l => l.emotionId)

  const emotionModifier = calcEmotionModifier(db, emotionIds)
  const finalScore = rawScore * emotionModifier

  const judgmentId = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')

  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO judgments (id, levelId, reportId, dbStackingCorrect, overlapNotMerged, nightThresholdOk, emotionModifier, score, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(judgmentId, levelId, reportId,
      toSqlBool(dbStackingCorrect),
      toSqlBool(overlapNotMerged),
      toSqlBool(nightThresholdOk),
      emotionModifier, finalScore, now, now
    )

    for (const emoId of emotionIds) {
      db.prepare('INSERT INTO judgment_emotion_links (judgmentId, emotionId) VALUES (?, ?)').run(judgmentId, emoId)
    }
  })

  tx()

  const judgment = db.prepare('SELECT * FROM judgments WHERE id = ?').get(judgmentId)
  judgment.dbStackingCorrect = fromSqlBool(judgment.dbStackingCorrect)
  judgment.overlapNotMerged = fromSqlBool(judgment.overlapNotMerged)
  judgment.nightThresholdOk = fromSqlBool(judgment.nightThresholdOk)
  res.status(201).json({ success: true, data: judgment })
})

router.get('/:levelId', async (req: Request, res: Response): Promise<void> => {
  const db = getDb()
  const judgments = (db.prepare('SELECT * FROM judgments WHERE levelId = ? ORDER BY createdAt DESC').all(req.params.levelId) as any[]).map(j => {
    const links = db.prepare('SELECT emotionId FROM judgment_emotion_links WHERE judgmentId = ?').all(j.id) as any[]
    return {
      ...j,
      dbStackingCorrect: fromSqlBool(j.dbStackingCorrect),
      overlapNotMerged: fromSqlBool(j.overlapNotMerged),
      nightThresholdOk: fromSqlBool(j.nightThresholdOk),
      emotionIds: links.map(l => l.emotionId)
    }
  })

  res.json({ success: true, data: judgments })
})

router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const { emotionIds } = req.body

  if (!Array.isArray(emotionIds)) {
    res.status(400).json({ success: false, error: 'emotionIds must be an array' })
    return
  }

  const db = getDb()
  const judgment = db.prepare('SELECT * FROM judgments WHERE id = ?').get(req.params.id) as any | undefined

  if (!judgment) {
    res.status(404).json({ success: false, error: 'Judgment not found' })
    return
  }

  const emotionModifier = calcEmotionModifier(db, emotionIds)

  const report = db.prepare('SELECT * FROM remix_reports WHERE id = ?').get(judgment.reportId) as any
  const reportSourceLinks = db.prepare('SELECT sourceId FROM report_source_links WHERE reportId = ?').all(judgment.reportId) as any[]
  report.sourceIds = reportSourceLinks.map(l => l.sourceId)

  const sources = db.prepare('SELECT id, dbLevel FROM sound_sources WHERE levelId = ?').all(judgment.levelId) as any[]

  const { score: rawScore } = calcRawScore(
    report,
    sources,
    judgment.dbStackingCorrect,
    judgment.overlapNotMerged,
    judgment.nightThresholdOk
  )
  const finalScore = rawScore * emotionModifier
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM judgment_emotion_links WHERE judgmentId = ?').run(judgment.id)
    for (const emoId of emotionIds) {
      db.prepare('INSERT INTO judgment_emotion_links (judgmentId, emotionId) VALUES (?, ?)').run(judgment.id, emoId)
    }
    db.prepare(
      'UPDATE judgments SET emotionModifier = ?, score = ?, updatedAt = ? WHERE id = ?'
    ).run(emotionModifier, finalScore, now, judgment.id)
  })

  tx()

  const updated = db.prepare('SELECT * FROM judgments WHERE id = ?').get(req.params.id)
  updated.dbStackingCorrect = fromSqlBool(updated.dbStackingCorrect)
  updated.overlapNotMerged = fromSqlBool(updated.overlapNotMerged)
  updated.nightThresholdOk = fromSqlBool(updated.nightThresholdOk)
  res.json({ success: true, data: updated })
})

export default router
