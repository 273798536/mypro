import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router({ mergeParams: true })

router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId } = req.params

    const rules = db.prepare(`
      SELECT cr.*, COUNT(d.id) as defectCount
      FROM color_rule cr
      LEFT JOIN defect d ON d.colorRuleId = cr.id
      WHERE cr.workshopId = ?
      GROUP BY cr.id
      ORDER BY cr.name
    `).all(workshopId)

    res.json({ success: true, data: rules })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId } = req.params
    const { name, color, description } = req.body

    if (!name || !color) {
      res.status(400).json({ success: false, error: '缺少必要字段：name, color' })
      return
    }

    const workshop = db.prepare('SELECT id FROM workshop WHERE id = ?').get(workshopId)
    if (!workshop) {
      res.status(404).json({ success: false, error: '车间不存在' })
      return
    }

    const existing = db.prepare(
      'SELECT id FROM color_rule WHERE workshopId = ? AND name = ?'
    ).get(workshopId, name)
    if (existing) {
      res.status(409).json({ success: false, error: '该车间已存在同名颜色规则' })
      return
    }

    const id = uuidv4()
    db.prepare(
      'INSERT INTO color_rule (id, workshopId, name, color, description) VALUES (?, ?, ?, ?, ?)'
    ).run(id, workshopId, name, color, description || '')

    const rule = db.prepare('SELECT * FROM color_rule WHERE id = ?').get(id)
    res.status(201).json({ success: true, data: rule })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId, id } = req.params
    const { name, color, description } = req.body

    const existing = db.prepare(
      'SELECT * FROM color_rule WHERE id = ? AND workshopId = ?'
    ).get(id, workshopId) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '颜色规则不存在' })
      return
    }

    if (name && name !== existing.name) {
      const duplicate = db.prepare(
        'SELECT id FROM color_rule WHERE workshopId = ? AND name = ? AND id != ?'
      ).get(workshopId, name, id)
      if (duplicate) {
        res.status(409).json({ success: false, error: '该车间已存在同名颜色规则' })
        return
      }
    }

    db.prepare(
      'UPDATE color_rule SET name = ?, color = ?, description = ? WHERE id = ?'
    ).run(
      name ?? existing.name,
      color ?? existing.color,
      description !== undefined ? description : existing.description,
      id
    )

    const rule = db.prepare('SELECT * FROM color_rule WHERE id = ?').get(id)
    res.json({ success: true, data: rule })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId, id } = req.params

    const existing = db.prepare(
      'SELECT * FROM color_rule WHERE id = ? AND workshopId = ?'
    ).get(id, workshopId)
    if (!existing) {
      res.status(404).json({ success: false, error: '颜色规则不存在' })
      return
    }

    const defectsUsing = db.prepare(
      'SELECT COUNT(*) as cnt FROM defect WHERE colorRuleId = ?'
    ).get(id) as { cnt: number }
    if (defectsUsing.cnt > 0) {
      db.prepare('UPDATE defect SET colorRuleId = NULL WHERE colorRuleId = ?').run(id)
    }

    db.prepare('DELETE FROM color_rule WHERE id = ?').run(id)
    res.json({ success: true, data: null })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
