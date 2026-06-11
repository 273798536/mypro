import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../database.js'

const router = Router()

const VALID_STATUSES = ['pending', 'platform_replied', 'confirmed']

function mapAppeal(a: any, workTitle: string): any {
  return {
    id: a.id,
    workId: a.workId,
    workTitle,
    status: a.status,
    platformReply: a.platformReply || null,
    result: a.result || null,
    explanation: a.explanation,
    date: a.updatedAt,
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const appeals = db.prepare(`
      SELECT a.*, w.title as workTitle
      FROM appeals a
      LEFT JOIN works w ON a.workId = w.id
      ORDER BY a.createdAt DESC
    `).all() as any[]

    const data = appeals.map(a => mapAppeal(a, a.workTitle))

    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { workId, correctionId, explanation } = req.body

    if (!workId || !correctionId || !explanation) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }

    const work = db.prepare('SELECT * FROM works WHERE id = ?').get(workId) as any
    if (!work) {
      res.status(404).json({ success: false, error: '作品不存在' })
      return
    }

    const correction = db.prepare('SELECT id FROM corrections WHERE id = ?').get(correctionId)
    if (!correction) {
      res.status(404).json({ success: false, error: '纠正记录不存在' })
      return
    }

    const now = new Date().toISOString()
    const id = uuidv4()

    db.prepare(`
      INSERT INTO appeals (id, workId, correctionId, explanation, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, workId, correctionId, explanation, 'pending', now, now)

    const appeal = db.prepare('SELECT * FROM appeals WHERE id = ?').get(id) as any

    res.status(201).json({ success: true, data: mapAppeal(appeal, work.title) })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { status, platformReply, result } = req.body

    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ success: false, error: '无效的申诉状态' })
      return
    }

    const appeal = db.prepare('SELECT * FROM appeals WHERE id = ?').get(req.params.id) as any
    if (!appeal) {
      res.status(404).json({ success: false, error: '申诉不存在' })
      return
    }

    const statusOrder = ['pending', 'platform_replied', 'confirmed']
    const currentIndex = statusOrder.indexOf(appeal.status)
    const newIndex = statusOrder.indexOf(status)

    if (newIndex < currentIndex) {
      res.status(400).json({ success: false, error: '申诉状态不可回退' })
      return
    }

    if (newIndex > currentIndex + 1) {
      res.status(400).json({ success: false, error: `申诉状态只能从 ${appeal.status} 变更为 ${statusOrder[currentIndex + 1]}` })
      return
    }

    const now = new Date().toISOString()
    const updates: string[] = ['status = ?', 'updatedAt = ?']
    const params: any[] = [status, now]

    if (platformReply !== undefined) {
      updates.push('platformReply = ?')
      params.push(String(platformReply))
    }
    if (result !== undefined) {
      updates.push('result = ?')
      params.push(String(result))
    }

    params.push(req.params.id)
    db.prepare(`UPDATE appeals SET ${updates.join(', ')} WHERE id = ?`).run(...params as any)

    const updated = db.prepare('SELECT a.*, w.title as workTitle FROM appeals a LEFT JOIN works w ON a.workId = w.id WHERE a.id = ?').get(req.params.id) as any

    res.json({ success: true, data: mapAppeal(updated, updated.workTitle) })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
