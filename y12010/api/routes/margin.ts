import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

function writeAudit(
  db: ReturnType<typeof getDb>,
  params: {
    entityType: string
    entityId: string
    action: string
    operator: string
    source: string
    sourceFile: string | null
    sourceLine: number | null
    beforeValue: Record<string, unknown> | null
    afterValue: Record<string, unknown> | null
  }
) {
  const stmt = db.prepare(
    `INSERT INTO audit_log (id, entity_type, entity_id, action, operator, source, source_file, source_line, before_value, after_value, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  )
  stmt.run(
    uuidv4(),
    params.entityType,
    params.entityId,
    params.action,
    params.operator,
    params.source,
    params.sourceFile,
    params.sourceLine,
    params.beforeValue ? JSON.stringify(params.beforeValue) : null,
    params.afterValue ? JSON.stringify(params.afterValue) : null
  )
}

router.post('/lock', (req: Request, res: Response): void => {
  const { enterpriseId, batchId, amount, remark } = req.body
  if (!enterpriseId || !batchId || !amount) {
    res.status(400).json({ success: false, error: '缺少必填字段: enterpriseId, batchId, amount' })
    return
  }

  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()

  const before = null
  const after = {
    id,
    enterprise_id: enterpriseId,
    batch_id: batchId,
    amount,
    status: 'locked',
    source: 'manual',
    remark: remark || null,
  }

  const stmt = db.prepare(
    `INSERT INTO margin_record (id, enterprise_id, batch_id, amount, status, lock_time, release_time, release_rule_id, source, source_file, source_line, remark, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'locked', ?, null, null, 'manual', null, null, ?, datetime('now'), datetime('now'))`
  )

  const tx = db.transaction(() => {
    stmt.run(id, enterpriseId, batchId, amount, now, remark || null)
    writeAudit(db, {
      entityType: 'margin',
      entityId: id,
      action: 'lock',
      operator: 'admin',
      source: 'manual',
      sourceFile: null,
      sourceLine: null,
      beforeValue: before,
      afterValue: after,
    })
  })

  try {
    tx()
    res.status(201).json({ success: true, data: { id, ...after, lockTime: now } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '锁定保证金失败'
    res.status(500).json({ success: false, error: message })
  }
})

router.post('/release', (req: Request, res: Response): void => {
  const { recordId, releaseType, amount, remark } = req.body
  if (!recordId || !releaseType) {
    res.status(400).json({ success: false, error: '缺少必填字段: recordId, releaseType' })
    return
  }

  if (!['deal', 'cancel', 'compliance'].includes(releaseType)) {
    res.status(400).json({ success: false, error: '无效的释放类型，支持: deal, cancel, compliance' })
    return
  }

  const db = getDb()
  const record = db.prepare('SELECT * FROM margin_record WHERE id = ?').get(recordId) as Record<string, unknown> | undefined

  if (!record) {
    res.status(404).json({ success: false, error: '保证金记录不存在' })
    return
  }

  const before = { ...record }

  const rule = db.prepare("SELECT * FROM release_rule WHERE type = ?").get(releaseType) as Record<string, unknown> | undefined

  let newStatus: string
  let releaseTime: string | null = null
  const now = new Date().toISOString()

  if (releaseType === 'cancel' && rule) {
    const delayDays = (rule.delay_days as number) || 0
    if (delayDays > 0) {
      newStatus = 'delayed_release'
    } else {
      newStatus = 'released'
      releaseTime = now
    }
  } else {
    newStatus = 'released'
    releaseTime = now
  }

  const after = {
    ...before,
    status: newStatus,
    release_time: releaseTime,
    release_rule_id: rule ? (rule.id as string) : null,
    remark: remark || (record.remark as string),
  }

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE margin_record SET status = ?, release_time = ?, release_rule_id = ?, remark = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(newStatus, releaseTime, rule ? (rule.id as string) : null, remark || (record.remark as string), recordId)

    writeAudit(db, {
      entityType: 'margin',
      entityId: recordId,
      action: 'release',
      operator: 'admin',
      source: 'manual',
      sourceFile: null,
      sourceLine: null,
      beforeValue: before,
      afterValue: after,
    })
  })

  try {
    tx()
    res.json({ success: true, data: after })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '释放保证金失败'
    res.status(500).json({ success: false, error: message })
  }
})

router.get('/list', (req: Request, res: Response): void => {
  const db = getDb()
  const { enterpriseId, batchId, status } = req.query

  let sql = `
    SELECT m.*, e.name as enterprise_name, b.name as batch_name
    FROM margin_record m
    LEFT JOIN enterprise e ON m.enterprise_id = e.id
    LEFT JOIN batch b ON m.batch_id = b.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (enterpriseId) {
    sql += ' AND m.enterprise_id = ?'
    params.push(enterpriseId)
  }
  if (batchId) {
    sql += ' AND m.batch_id = ?'
    params.push(batchId)
  }
  if (status) {
    sql += ' AND m.status = ?'
    params.push(status)
  }

  sql += ' ORDER BY m.lock_time DESC'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const row = db.prepare(`
    SELECT m.*, e.name as enterprise_name, b.name as batch_name, r.name as release_rule_name
    FROM margin_record m
    LEFT JOIN enterprise e ON m.enterprise_id = e.id
    LEFT JOIN batch b ON m.batch_id = b.id
    LEFT JOIN release_rule r ON m.release_rule_id = r.id
    WHERE m.id = ?
  `).get(req.params.id)

  if (!row) {
    res.status(404).json({ success: false, error: '保证金记录不存在' })
    return
  }
  res.json({ success: true, data: row })
})

router.get('/enterprise/:id/cross-batch', (req: Request, res: Response): void => {
  const db = getDb()
  const enterpriseId = req.params.id

  const enterprise = db.prepare('SELECT * FROM enterprise WHERE id = ?').get(enterpriseId)
  if (!enterprise) {
    res.status(404).json({ success: false, error: '企业不存在' })
    return
  }

  const margins = db.prepare(`
    SELECT m.*, b.name as batch_name, b.status as batch_status
    FROM margin_record m
    LEFT JOIN batch b ON m.batch_id = b.id
    WHERE m.enterprise_id = ?
    ORDER BY b.start_date DESC, m.lock_time DESC
  `).all(enterpriseId)

  const summary = db.prepare(`
    SELECT
      b.id as batch_id,
      b.name as batch_name,
      COUNT(m.id) as record_count,
      SUM(CASE WHEN m.status = 'locked' THEN m.amount ELSE 0 END) as locked_amount,
      SUM(CASE WHEN m.status = 'pending_release' THEN m.amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN m.status = 'released' THEN m.amount ELSE 0 END) as released_amount,
      SUM(CASE WHEN m.status = 'delayed_release' THEN m.amount ELSE 0 END) as delayed_amount,
      SUM(m.amount) as total_amount
    FROM batch b
    LEFT JOIN margin_record m ON m.batch_id = b.id AND m.enterprise_id = ?
    GROUP BY b.id, b.name
    ORDER BY b.start_date DESC
  `).all(enterpriseId)

  res.json({
    success: true,
    data: {
      enterprise,
      margins,
      summary,
    },
  })
})

export default router
