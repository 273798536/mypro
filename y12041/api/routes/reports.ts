import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

function fromSqlBool(val: number | null): boolean | null {
  if (val === null || val === undefined) return null
  return val === 1
}

const router = Router()

function buildFullReport(db: any, levelId: string) {
  const judgments = (db.prepare('SELECT * FROM judgments WHERE levelId = ? ORDER BY createdAt DESC').all(levelId) as any[]).map(j => {
    const report = db.prepare('SELECT * FROM remix_reports WHERE id = ?').get(j.reportId) as any
    let reportWithSources = null
    if (report) {
      const rptSourceLinks = db.prepare('SELECT sourceId FROM report_source_links WHERE reportId = ?').all(report.id) as any[]
      reportWithSources = {
        ...report,
        hasOverlap: fromSqlBool(report.hasOverlap),
        overlapMerged: fromSqlBool(report.overlapMerged),
        violatesNightThreshold: fromSqlBool(report.violatesNightThreshold),
        sourceIds: rptSourceLinks.map(l => l.sourceId)
      }
    }

    const jEmotionLinks = db.prepare('SELECT emotionId FROM judgment_emotion_links WHERE judgmentId = ?').all(j.id) as any[]
    const emotions = jEmotionLinks.map(link => {
      const emotion = db.prepare('SELECT * FROM resident_emotions WHERE id = ?').get(link.emotionId) as any
      if (!emotion) return null
      const emoSourceLinks = db.prepare('SELECT sourceId FROM emotion_source_links WHERE emotionId = ?').all(emotion.id) as any[]
      return {
        ...emotion,
        delayed: fromSqlBool(emotion.delayed),
        sourceIds: emoSourceLinks.map(l => l.sourceId)
      }
    }).filter(Boolean)

    const allSourceIds = new Set<string>()
    if (reportWithSources) {
      reportWithSources.sourceIds.forEach((id: string) => allSourceIds.add(id))
    }
    emotions.forEach((e: any) => {
      e.sourceIds.forEach((id: string) => allSourceIds.add(id))
    })

    const sources = Array.from(allSourceIds).map(sid => {
      return db.prepare('SELECT * FROM sound_sources WHERE id = ?').get(sid)
    }).filter(Boolean)

    return {
      judgment: {
        ...j,
        dbStackingCorrect: fromSqlBool(j.dbStackingCorrect),
        overlapNotMerged: fromSqlBool(j.overlapNotMerged),
        nightThresholdOk: fromSqlBool(j.nightThresholdOk),
      },
      report: reportWithSources,
      emotions,
      sources
    }
  })

  return judgments
}

router.get('/:levelId', async (req: Request, res: Response): Promise<void> => {
  const db = getDb()
  const level = db.prepare('SELECT id FROM levels WHERE id = ?').get(req.params.levelId)

  if (!level) {
    res.status(404).json({ success: false, error: 'Level not found' })
    return
  }

  const data = buildFullReport(db, req.params.levelId)
  res.json({ success: true, data })
})

router.get('/:levelId/export', async (req: Request, res: Response): Promise<void> => {
  const db = getDb()
  const level = db.prepare('SELECT id FROM levels WHERE id = ?').get(req.params.levelId)

  if (!level) {
    res.status(404).json({ success: false, error: 'Level not found' })
    return
  }

  const data = buildFullReport(db, req.params.levelId)
  const jsonStr = JSON.stringify({ success: true, data }, null, 2)

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.levelId}.json"`)
  res.send(jsonStr)
})

export default router
