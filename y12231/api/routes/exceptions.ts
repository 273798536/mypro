import { Router, type Request, type Response } from 'express'
import db from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { type, severity, status, relatedMemberId, page = '1', pageSize = '20' } = req.query
  const offset = (Number(page) - 1) * Number(pageSize)

  let where = 'WHERE 1=1'
  const params: any[] = []

  if (type) { where += ' AND e.type = ?'; params.push(type) }
  if (severity) { where += ' AND e.severity = ?'; params.push(severity) }
  if (status) { where += ' AND e.status = ?'; params.push(status) }
  if (relatedMemberId) { where += ' AND e.related_member_id = ?'; params.push(relatedMemberId) }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM exception_items e ${where}`).get(...params) as any
  const exceptions = db.prepare(
    `SELECT e.*, m.name as member_name, p.name as pet_name FROM exception_items e LEFT JOIN member_accounts m ON e.related_member_id = m.id LEFT JOIN pet_profiles p ON e.related_pet_id = p.id ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(pageSize), offset)

  res.json({
    success: true,
    data: { list: exceptions, total: total.cnt, page: Number(page), pageSize: Number(pageSize) },
  })
})

router.put('/:id', (req: Request, res: Response): void => {
  const exceptionId = req.params.id
  const { status, resolvedBy = '管理员', resolution } = req.body

  if (!['confirmed', 'rejected', 'resolved'].includes(status)) {
    res.status(400).json({ success: false, error: '状态只能为confirmed/rejected/resolved' })
    return
  }

  const exception = db.prepare(`SELECT * FROM exception_items WHERE id = ?`).get(exceptionId) as any
  if (!exception) {
    res.status(404).json({ success: false, error: '异常项不存在' })
    return
  }

  if (exception.status !== 'pending' && exception.status !== 'confirmed') {
    res.status(400).json({ success: false, error: '当前状态不可变更' })
    return
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  db.prepare(
    `UPDATE exception_items SET status = ?, resolved_by = ?, resolved_at = ?, resolution = ? WHERE id = ?`
  ).run(status, resolvedBy, now, resolution || null, exceptionId)

  const logId = uuidv4()
  db.prepare(
    `INSERT INTO operation_logs (id, operator, action, target_type, target_id, old_value, new_value, note, created_at) VALUES (?, ?, 'handle_exception', 'exception', ?, ?, ?, ?, ?)`
  ).run(logId, resolvedBy, exceptionId, exception.status, status, resolution || `处理异常：${exception.description}`, now)

  const updated = db.prepare(`SELECT * FROM exception_items WHERE id = ?`).get(exceptionId)
  res.json({ success: true, data: updated })
})

export default router
