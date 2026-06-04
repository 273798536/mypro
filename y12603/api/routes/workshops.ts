import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const db = getDb()
    const workshops = db.prepare(`
      SELECT w.*, COUNT(d.id) as defectCount
      FROM workshop w
      LEFT JOIN defect d ON d.workshopId = w.id
      GROUP BY w.id
      ORDER BY w.createdAt DESC
    `).all()
    res.json({ success: true, data: workshops })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const workshop = db.prepare('SELECT * FROM workshop WHERE id = ?').get(req.params.id) as any
    if (!workshop) {
      res.status(404).json({ success: false, error: '车间不存在' })
      return
    }
    const stats = db.prepare(`
      SELECT
        COUNT(*) as totalDefects,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedCount,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedCount,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolvedCount,
        SUM(CASE WHEN isOfflineAsset = 1 THEN 1 ELSE 0 END) as offlineAssetCount,
        SUM(CASE WHEN coordinateOffset = 1 THEN 1 ELSE 0 END) as coordinateOffsetCount
      FROM defect WHERE workshopId = ?
    `).get(req.params.id) as any
    res.json({ success: true, data: { ...workshop, stats } })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { name, floorPlanPath } = req.body
    if (!name) {
      res.status(400).json({ success: false, error: '车间名称不能为空' })
      return
    }
    const id = uuidv4()
    db.prepare('INSERT INTO workshop (id, name, floorPlanPath) VALUES (?, ?, ?)').run(
      id, name, floorPlanPath || null
    )
    const workshop = db.prepare('SELECT * FROM workshop WHERE id = ?').get(id)
    res.status(201).json({ success: true, data: workshop })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM workshop WHERE id = ?').get(req.params.id)
    if (!existing) {
      res.status(404).json({ success: false, error: '车间不存在' })
      return
    }
    const { name, floorPlanPath } = req.body
    db.prepare('UPDATE workshop SET name = ?, floorPlanPath = ? WHERE id = ?').run(
      name ?? (existing as any).name,
      floorPlanPath !== undefined ? floorPlanPath : (existing as any).floorPlanPath,
      req.params.id
    )
    const workshop = db.prepare('SELECT * FROM workshop WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: workshop })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM workshop WHERE id = ?').get(req.params.id)
    if (!existing) {
      res.status(404).json({ success: false, error: '车间不存在' })
      return
    }
    const transaction = db.transaction(() => {
      const defectIds = db.prepare('SELECT id FROM defect WHERE workshopId = ?').all(req.params.id) as { id: string }[]
      for (const { id } of defectIds) {
        db.prepare('DELETE FROM handling_opinion WHERE defectId = ?').run(id)
        db.prepare('DELETE FROM status_log WHERE defectId = ?').run(id)
      }
      db.prepare('DELETE FROM defect WHERE workshopId = ?').run(req.params.id)
      db.prepare('DELETE FROM color_rule WHERE workshopId = ?').run(req.params.id)
      db.prepare('DELETE FROM import_batch WHERE workshopId = ?').run(req.params.id)
      db.prepare('DELETE FROM workshop WHERE id = ?').run(req.params.id)
    })
    transaction()
    res.json({ success: true, data: null })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
