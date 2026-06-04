import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router({ mergeParams: true })

router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId } = req.params
    const { status, type, batchId } = req.query

    let sql = 'SELECT * FROM defect WHERE workshopId = ?'
    const params: any[] = [workshopId]

    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }
    if (batchId) {
      sql += ' AND importBatchId = ?'
      params.push(batchId)
    }
    sql += ' ORDER BY createdAt DESC'

    const defects = db.prepare(sql).all(...params)
    res.json({ success: true, data: defects })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId, id } = req.params

    const defect = db.prepare('SELECT * FROM defect WHERE id = ? AND workshopId = ?').get(id, workshopId) as any
    if (!defect) {
      res.status(404).json({ success: false, error: '缺陷不存在' })
      return
    }

    const opinions = db.prepare(
      'SELECT * FROM handling_opinion WHERE defectId = ? ORDER BY createdAt ASC'
    ).all(id)

    const statusLogs = db.prepare(
      'SELECT * FROM status_log WHERE defectId = ? ORDER BY createdAt ASC'
    ).all(id)

    res.json({ success: true, data: { ...defect, opinions, statusLogs } })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId } = req.params
    const { type, colorRuleId, posX, posY, width, height, description, source } = req.body

    if (!type || posX === undefined || posY === undefined || width === undefined || height === undefined) {
      res.status(400).json({ success: false, error: '缺少必要字段：type, posX, posY, width, height' })
      return
    }

    const workshop = db.prepare('SELECT id FROM workshop WHERE id = ?').get(workshopId)
    if (!workshop) {
      res.status(404).json({ success: false, error: '车间不存在' })
      return
    }

    const id = uuidv4()
    db.prepare(`
      INSERT INTO defect (id, workshopId, colorRuleId, type, status, posX, posY, width, height, description, source)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
    `).run(
      id, workshopId, colorRuleId || null, type,
      posX, posY, width, height, description || '',
      source || 'manual'
    )

    const defect = db.prepare('SELECT * FROM defect WHERE id = ?').get(id)
    res.status(201).json({ success: true, data: defect })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId, id } = req.params

    const existing = db.prepare('SELECT * FROM defect WHERE id = ? AND workshopId = ?').get(id, workshopId) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '缺陷不存在' })
      return
    }

    const { type, colorRuleId, posX, posY, width, height, description, status } = req.body
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')

    db.prepare(`
      UPDATE defect SET
        type = ?, colorRuleId = ?, posX = ?, posY = ?, width = ?, height = ?,
        description = ?, status = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      type ?? existing.type,
      colorRuleId !== undefined ? colorRuleId : existing.colorRuleId,
      posX ?? existing.posX,
      posY ?? existing.posY,
      width ?? existing.width,
      height ?? existing.height,
      description ?? existing.description,
      status ?? existing.status,
      now,
      id
    )

    const defect = db.prepare('SELECT * FROM defect WHERE id = ?').get(id)
    res.json({ success: true, data: defect })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/:id/transition', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId, id } = req.params
    const { toStatus, operator } = req.body

    if (!toStatus) {
      res.status(400).json({ success: false, error: '缺少 toStatus 字段' })
      return
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'resolved']
    if (!validStatuses.includes(toStatus)) {
      res.status(400).json({ success: false, error: `无效状态值，允许: ${validStatuses.join(', ')}` })
      return
    }

    const existing = db.prepare('SELECT * FROM defect WHERE id = ? AND workshopId = ?').get(id, workshopId) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '缺陷不存在' })
      return
    }

    const fromStatus = existing.status
    if (fromStatus === toStatus) {
      res.status(400).json({ success: false, error: '状态未变更' })
      return
    }

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
    const logId = uuidv4()

    const transaction = db.transaction(() => {
      db.prepare('UPDATE defect SET status = ?, updatedAt = ? WHERE id = ?').run(toStatus, now, id)
      db.prepare(
        'INSERT INTO status_log (id, defectId, fromStatus, toStatus, operator, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(logId, id, fromStatus, toStatus, operator || '', now)
    })
    transaction()

    const defect = db.prepare('SELECT * FROM defect WHERE id = ?').get(id)
    const log = db.prepare('SELECT * FROM status_log WHERE id = ?').get(logId)
    res.json({ success: true, data: { defect, statusLog: log } })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/:id/opinions', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId, id } = req.params
    const { content, author } = req.body

    if (!content) {
      res.status(400).json({ success: false, error: '意见内容不能为空' })
      return
    }

    const existing = db.prepare('SELECT * FROM defect WHERE id = ? AND workshopId = ?').get(id, workshopId)
    if (!existing) {
      res.status(404).json({ success: false, error: '缺陷不存在' })
      return
    }

    const opinionId = uuidv4()
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
    db.prepare(
      'INSERT INTO handling_opinion (id, defectId, content, author, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).run(opinionId, id, content, author || '', now)

    const opinion = db.prepare('SELECT * FROM handling_opinion WHERE id = ?').get(opinionId)
    res.status(201).json({ success: true, data: opinion })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/batch-status', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId } = req.params
    const { defectIds, toStatus, operator } = req.body

    if (!Array.isArray(defectIds) || defectIds.length === 0) {
      res.status(400).json({ success: false, error: 'defectIds 必须为非空数组' })
      return
    }
    if (!toStatus) {
      res.status(400).json({ success: false, error: '缺少 toStatus 字段' })
      return
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'resolved']
    if (!validStatuses.includes(toStatus)) {
      res.status(400).json({ success: false, error: `无效状态值，允许: ${validStatuses.join(', ')}` })
      return
    }

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
    const updateDefect = db.prepare('UPDATE defect SET status = ?, updatedAt = ? WHERE id = ? AND workshopId = ?')
    const insertLog = db.prepare(
      'INSERT INTO status_log (id, defectId, fromStatus, toStatus, operator, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const getDefect = db.prepare('SELECT * FROM defect WHERE id = ? AND workshopId = ?')

    const transaction = db.transaction(() => {
      const results: any[] = []
      for (const defectId of defectIds) {
        const existing = getDefect.get(defectId, workshopId) as any
        if (!existing || existing.status === toStatus) continue
        updateDefect.run(toStatus, now, defectId, workshopId)
        insertLog.run(uuidv4(), defectId, existing.status, toStatus, operator || '', now)
        results.push(defectId)
      }
      return results
    })

    const updated = transaction()
    res.json({ success: true, data: { updatedIds: updated, count: updated.length } })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
