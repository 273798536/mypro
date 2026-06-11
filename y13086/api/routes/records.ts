import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const {
      floor,
      cabinetNo,
      anomalyType,
      status,
      view,
      startDate,
      endDate,
      page = '1',
      pageSize = '10',
    } = req.query

    const conditions: string[] = []
    const params: Record<string, string> = {}

    if (floor) {
      conditions.push('floor = @floor')
      params.floor = floor as string
    }
    if (cabinetNo) {
      conditions.push('cabinetNo LIKE @cabinetNo')
      params.cabinetNo = `%${cabinetNo}%`
    }
    if (anomalyType) {
      conditions.push('anomalyType = @anomalyType')
      params.anomalyType = anomalyType as string
    }
    if (status) {
      conditions.push('status = @status')
      params.status = status as string
    }
    if (view === 'anomaly') {
      conditions.push("anomalyType != 'normal'")
    } else if (view === 'dirty') {
      conditions.push('hasDirtyData = 1')
    } else if (view === 'rejudged') {
      conditions.push("status = 'rejudged'")
    } else if (view === 'pending') {
      conditions.push("status = 'pending'")
    }
    if (startDate) {
      conditions.push('createdAt >= @startDate')
      params.startDate = startDate as string
    }
    if (endDate) {
      conditions.push('createdAt <= @endDate')
      params.endDate = endDate as string
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM records ${whereClause}`).get(params) as { total: number }
    const total = countRow.total

    const p = Math.max(1, parseInt(page as string, 10))
    const ps = Math.max(1, Math.min(100, parseInt(pageSize as string, 10)))
    const offset = (p - 1) * ps

    const records = db.prepare(
      `SELECT * FROM records ${whereClause} ORDER BY createdAt DESC LIMIT @limit OFFSET @offset`
    ).all({ ...params, limit: ps, offset })

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: p,
          pageSize: ps,
          total,
          totalPages: Math.ceil(total / ps),
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch records' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!record) {
      res.status(404).json({ success: false, error: 'Record not found' })
      return
    }

    const photos = db.prepare('SELECT * FROM photos WHERE recordId = ?').all(req.params.id)
    const annotations = db.prepare('SELECT * FROM annotations WHERE recordId = ?').all(req.params.id)
    const history = db.prepare('SELECT * FROM history_entries WHERE recordId = ? ORDER BY timestamp ASC').all(req.params.id)

    res.json({
      success: true,
      data: {
        record,
        photos,
        annotations,
        history,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch record detail' })
  }
})

router.put('/:id/judgment', (req: Request, res: Response): void => {
  try {
    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!record) {
      res.status(404).json({ success: false, error: 'Record not found' })
      return
    }

    const { judgment, reason, operatorName, operatorRole } = req.body
    if (!judgment || !operatorName) {
      res.status(400).json({ success: false, error: 'judgment and operatorName are required' })
      return
    }

    const oldJudgment = record.judgment as string
    const oldStatus = record.status as string
    const oldOriginalJudgment = record.originalJudgment as string

    const transaction = db.transaction(() => {
      db.prepare(
        `UPDATE records SET judgment = @judgment, originalJudgment = @originalJudgment, status = 'rejudged', updatedAt = datetime('now') WHERE id = @id`
      ).run({
        judgment,
        originalJudgment: oldOriginalJudgment || oldJudgment,
        id: req.params.id,
      })

      db.prepare(
        `INSERT INTO history_entries (id, recordId, action, oldValue, newValue, reason, operatorName, operatorRole, timestamp)
         VALUES (@id, @recordId, @action, @oldValue, @newValue, @reason, @operatorName, @operatorRole, datetime('now'))`
      ).run({
        id: uuidv4(),
        recordId: req.params.id,
        action: 'rejudge',
        oldValue: oldJudgment,
        newValue: judgment,
        reason: reason || '',
        operatorName,
        operatorRole: operatorRole || '',
      })
    })

    transaction()

    const updated = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update judgment' })
  }
})

export default router
