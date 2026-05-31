import { Router, type Request, type Response } from 'express'
import { getDb } from '../database/init.js'
import type { BillException } from '../../shared/types.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { type, severity, resolved, bill_id } = req.query

    const conditions: string[] = []
    const params: unknown[] = []

    if (type) {
      conditions.push('be.type = ?')
      params.push(type)
    }
    if (severity) {
      conditions.push('be.severity = ?')
      params.push(severity)
    }
    if (resolved !== undefined) {
      conditions.push('be.resolved = ?')
      params.push(resolved === 'true' || resolved === '1' ? 1 : 0)
    }
    if (bill_id) {
      conditions.push('be.bill_id = ?')
      params.push(bill_id)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const exceptions = db.prepare(
      `SELECT be.*, b.user_no, b.billing_month FROM bill_exception be
       JOIN bill b ON be.bill_id = b.id
       ${where} ORDER BY be.created_at DESC`
    ).all(...params) as Array<BillException & { user_no: string; billing_month: string }>

    res.json({ success: true, data: exceptions })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.put('/:id/resolve', (req: Request, res: Response): void => {
  try {
    const { resolution, resolvedBy } = req.body
    if (!resolution || !resolvedBy) {
      res.status(400).json({ success: false, error: '处理结果和处理人不能为空' })
      return
    }

    const db = getDb()
    const now = new Date().toISOString()

    const result = db.prepare(
      'UPDATE bill_exception SET resolved = 1, resolution = ? WHERE id = ?'
    ).run(resolution, req.params.id)

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: '异常记录不存在' })
      return
    }

    const exception = db.prepare('SELECT * FROM bill_exception WHERE id = ?').get(req.params.id) as BillException

    const unresolvedCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM bill_exception WHERE bill_id = ? AND resolved = 0'
    ).get(exception.bill_id) as { cnt: number }

    if (unresolvedCount.cnt === 0) {
      db.prepare('UPDATE bill SET status = ?, updated_at = ? WHERE id = ?').run('pending', now, exception.bill_id)
    }

    res.json({ success: true, data: exception })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
