import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

function fromSqlBool(val: number | null): boolean | null {
  if (val === null || val === undefined) return null
  return val === 1
}

function toSqlBool(val: boolean | null | undefined): number | null {
  if (val === null || val === undefined) return null
  return val ? 1 : 0
}

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const db = getDb()
  const levels = db.prepare('SELECT * FROM levels ORDER BY createdAt DESC').all() as any[]

  const result = levels.map(level => {
    const sourceCount = (db.prepare('SELECT COUNT(*) as cnt FROM sound_sources WHERE levelId = ?').get(level.id) as any).cnt
    const emotionCount = (db.prepare('SELECT COUNT(*) as cnt FROM resident_emotions WHERE levelId = ?').get(level.id) as any).cnt
    const reportCount = (db.prepare('SELECT COUNT(*) as cnt FROM remix_reports WHERE levelId = ?').get(level.id) as any).cnt
    return { ...level, sourceCount, emotionCount, reportCount }
  })

  res.json({ success: true, data: result })
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDb()
  const level = db.prepare('SELECT * FROM levels WHERE id = ?').get(req.params.id) as any | undefined

  if (!level) {
    res.status(404).json({ success: false, error: 'Level not found' })
    return
  }

  const sources = db.prepare('SELECT * FROM sound_sources WHERE levelId = ?').all(level.id)

  const emotions = (db.prepare('SELECT * FROM resident_emotions WHERE levelId = ?').all(level.id) as any[]).map(e => {
    const links = db.prepare('SELECT sourceId FROM emotion_source_links WHERE emotionId = ?').all(e.id) as any[]
    return { ...e, delayed: fromSqlBool(e.delayed), sourceIds: links.map(l => l.sourceId) }
  })

  const reports = (db.prepare('SELECT * FROM remix_reports WHERE levelId = ?').all(level.id) as any[]).map(r => {
    const links = db.prepare('SELECT sourceId FROM report_source_links WHERE reportId = ?').all(r.id) as any[]
    return {
      ...r,
      hasOverlap: fromSqlBool(r.hasOverlap),
      overlapMerged: fromSqlBool(r.overlapMerged),
      violatesNightThreshold: fromSqlBool(r.violatesNightThreshold),
      sourceIds: links.map(l => l.sourceId)
    }
  })

  res.json({ success: true, data: { ...level, sources, emotions, reports } })
})

router.post('/import', async (req: Request, res: Response): Promise<void> => {
  const { name, difficulty, nightThresholdDb, sources, emotions, reports } = req.body

  if (!name || !difficulty) {
    res.status(400).json({ success: false, error: 'name and difficulty are required' })
    return
  }

  const db = getDb()
  const levelId = uuidv4()

  const insertLevel = db.prepare('INSERT INTO levels (id, name, difficulty, nightThresholdDb) VALUES (?, ?, ?, ?)')
  const insertSource = db.prepare('INSERT INTO sound_sources (id, levelId, name, dbLevel, timeSlot, frequencyBand) VALUES (?, ?, ?, ?, ?, ?)')
  const insertEmotion = db.prepare('INSERT INTO resident_emotions (id, levelId, type, intensity, delayed) VALUES (?, ?, ?, ?, ?)')
  const insertEmotionLink = db.prepare('INSERT INTO emotion_source_links (emotionId, sourceId) VALUES (?, ?)')
  const insertReport = db.prepare('INSERT INTO remix_reports (id, levelId, combinedDb, hasOverlap, overlapMerged, violatesNightThreshold) VALUES (?, ?, ?, ?, ?, ?)')
  const insertReportLink = db.prepare('INSERT INTO report_source_links (reportId, sourceId) VALUES (?, ?)')

  const sourceIdMap = new Map<string, string>()
  const emotionIdMap = new Map<string, string>()

  const tx = db.transaction(() => {
    insertLevel.run(levelId, name, difficulty, nightThresholdDb ?? 45.0)

    if (Array.isArray(sources)) {
      for (const src of sources) {
        const srcId = uuidv4()
        if (src.ref) sourceIdMap.set(src.ref, srcId)
        insertSource.run(srcId, levelId, src.name, src.dbLevel, src.timeSlot, src.frequencyBand)
      }
    }

    if (Array.isArray(emotions)) {
      for (const emo of emotions) {
        const emoId = uuidv4()
        if (emo.ref) emotionIdMap.set(emo.ref, emoId)
        insertEmotion.run(emoId, levelId, emo.type, emo.intensity, toSqlBool(emo.delayed))

        if (Array.isArray(emo.sourceRefs)) {
          for (const ref of emo.sourceRefs) {
            const resolvedId = sourceIdMap.get(ref) || ref
            insertEmotionLink.run(emoId, resolvedId)
          }
        }
        if (Array.isArray(emo.sourceIds)) {
          for (const sid of emo.sourceIds) {
            insertEmotionLink.run(emoId, sid)
          }
        }
      }
    }

    if (Array.isArray(reports)) {
      for (const rpt of reports) {
        const rptId = uuidv4()
        insertReport.run(rptId, levelId, rpt.combinedDb, toSqlBool(rpt.hasOverlap), toSqlBool(rpt.overlapMerged), toSqlBool(rpt.violatesNightThreshold))

        if (Array.isArray(rpt.sourceRefs)) {
          for (const ref of rpt.sourceRefs) {
            const resolvedId = sourceIdMap.get(ref) || ref
            insertReportLink.run(rptId, resolvedId)
          }
        }
        if (Array.isArray(rpt.sourceIds)) {
          for (const sid of rpt.sourceIds) {
            insertReportLink.run(rptId, sid)
          }
        }
      }
    }
  })

  tx()

  const level = db.prepare('SELECT * FROM levels WHERE id = ?').get(levelId)
  res.status(201).json({ success: true, data: level })
})

export default router
