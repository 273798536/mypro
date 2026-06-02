import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../database.js'

const router = Router()

const ANOMALY_TYPE_MAP: Record<string, string> = {
  under_report: '漏报',
  proportion_change: '比例变更',
  duplicate_use: '重复使用',
}

const ANOMALY_TYPE_REVERSE_MAP: Record<string, string> = {
  '漏报': 'under_report',
  '比例变更': 'proportion_change',
  '重复使用': 'duplicate_use',
}

function mapCorrection(c: any, workTitle: string): any {
  return {
    id: c.id,
    workId: c.workId,
    workTitle,
    type: ANOMALY_TYPE_MAP[c.type] || c.type,
    before: c.beforeValue,
    after: c.afterValue,
    explanation: c.explanation,
    operator: '系统',
    date: c.createdAt,
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const corrections = db.prepare(`
      SELECT c.*, w.title as workTitle
      FROM corrections c
      LEFT JOIN works w ON c.workId = w.id
      ORDER BY c.createdAt DESC
    `).all() as any[]

    const data = corrections.map(c => mapCorrection(c, c.workTitle))

    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { workId, type, before, after, explanation } = req.body

    if (!workId || !type || !before || !after || !explanation) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }

    const dbType = ANOMALY_TYPE_REVERSE_MAP[type] || type
    const validTypes = ['under_report', 'proportion_change', 'duplicate_use']
    if (!validTypes.includes(dbType)) {
      res.status(400).json({ success: false, error: '无效的纠正类型' })
      return
    }

    const work = db.prepare('SELECT * FROM works WHERE id = ?').get(workId) as any
    if (!work) {
      res.status(404).json({ success: false, error: '作品不存在' })
      return
    }

    const now = new Date().toISOString()
    const id = uuidv4()

    db.prepare(`
      INSERT INTO corrections (id, workId, type, beforeValue, afterValue, explanation, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, workId, dbType, String(before), String(after), explanation, now)

    const currentAnomalyTypes: string[] = JSON.parse(work.anomalyTypes)
    if (!currentAnomalyTypes.includes(dbType)) {
      currentAnomalyTypes.push(dbType)
    }

    const newStatus = currentAnomalyTypes.length > 0 ? 'anomaly' : 'normal'
    db.prepare(`
      UPDATE works SET anomalyTypes = ?, status = ?, updatedAt = ? WHERE id = ?
    `).run(JSON.stringify(currentAnomalyTypes), newStatus, now, workId)

    const correction = db.prepare('SELECT * FROM corrections WHERE id = ?').get(id) as any

    res.status(201).json({ success: true, data: mapCorrection(correction, work.title) })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
