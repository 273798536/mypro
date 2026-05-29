import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

interface ReportRow {
  id: string
  enterpriseId: string
  enterpriseName: string
  batchId: string
  batchName: string
  totalLocked: number
  totalReleased: number
  pendingRelease: number
  delayedRelease: number
  overdueCount: number
  generatedAt: string
}

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

router.post('/generate', (req: Request, res: Response): void => {
  const { enterpriseId, batchId } = req.body
  if (!enterpriseId && !batchId) {
    res.status(400).json({ success: false, error: '请指定企业ID或批次ID' })
    return
  }

  const db = getDb()

  let enterpriseCondition = ''
  let batchCondition = ''
  const params: unknown[] = []

  if (enterpriseId) {
    enterpriseCondition = ' AND m.enterprise_id = ?'
    params.push(enterpriseId)
  }
  if (batchId) {
    batchCondition = ' AND m.batch_id = ?'
    params.push(batchId)
  }

  const stats = db.prepare(`
    SELECT
      m.enterprise_id,
      e.name as enterprise_name,
      m.batch_id,
      b.name as batch_name,
      SUM(m.amount) as total_locked,
      SUM(CASE WHEN m.status = 'released' THEN m.amount ELSE 0 END) as total_released,
      SUM(CASE WHEN m.status = 'pending_release' THEN m.amount ELSE 0 END) as pending_release,
      SUM(CASE WHEN m.status = 'delayed_release' THEN m.amount ELSE 0 END) as delayed_release
    FROM margin_record m
    LEFT JOIN enterprise e ON m.enterprise_id = e.id
    LEFT JOIN batch b ON m.batch_id = b.id
    WHERE 1=1 ${enterpriseCondition} ${batchCondition}
    GROUP BY m.enterprise_id, m.batch_id
  `).all(...params) as Record<string, unknown>[]

  const reportRows: ReportRow[] = []

  const tx = db.transaction(() => {
    for (const stat of stats) {
      const overdueCount = db.prepare(`
        SELECT COUNT(*) as cnt FROM "order"
        WHERE enterprise_id = ? AND batch_id = ?
          AND (status = 'overdue'
               OR (compliance_deadline < datetime('now')
                   AND status IN ('dealt', 'complying')
                   AND compliance_time IS NULL))
      `).get(stat.enterprise_id as string, stat.batch_id as string) as { cnt: number }

      const row: ReportRow = {
        id: uuidv4(),
        enterpriseId: stat.enterprise_id as string,
        enterpriseName: stat.enterprise_name as string,
        batchId: stat.batch_id as string,
        batchName: stat.batch_name as string,
        totalLocked: (stat.total_locked as number) || 0,
        totalReleased: (stat.total_released as number) || 0,
        pendingRelease: (stat.pending_release as number) || 0,
        delayedRelease: (stat.delayed_release as number) || 0,
        overdueCount: overdueCount.cnt,
        generatedAt: new Date().toISOString(),
      }
      reportRows.push(row)

      writeAudit(db, {
        entityType: 'margin',
        entityId: row.id,
        action: 'create',
        operator: 'admin',
        source: 'system',
        sourceFile: null,
        sourceLine: null,
        beforeValue: null,
        afterValue: { ...row },
      })
    }
  })

  try {
    tx()
    res.status(201).json({ success: true, data: reportRows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '生成报告失败'
    res.status(500).json({ success: false, error: message })
  }
})

router.get('/', (_req: Request, res: Response): void => {
  const db = getDb()

  const reports = db.prepare(`
    SELECT al.id, al.after_value, al.timestamp as generated_at
    FROM audit_log al
    WHERE al.entity_type = 'margin' AND al.action = 'create' AND al.source = 'system'
      AND al.after_value IS NOT NULL
    ORDER BY al.timestamp DESC
  `).all()

  const parsed = reports.map((r: Record<string, unknown>) => {
    try {
      const data = JSON.parse(r.after_value as string)
      return { ...data, id: r.id, generatedAt: r.generated_at || data.generatedAt }
    } catch {
      return null
    }
  }).filter(Boolean)

  res.json({ success: true, data: parsed })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const log = db.prepare(`
    SELECT * FROM audit_log
    WHERE id = ? AND entity_type = 'margin' AND action = 'create' AND source = 'system'
  `).get(req.params.id) as Record<string, unknown> | undefined

  if (!log) {
    res.status(404).json({ success: false, error: '报告不存在' })
    return
  }

  let reportData = null
  try {
    reportData = JSON.parse(log.after_value as string)
  } catch {
    reportData = null
  }

  if (!reportData) {
    res.status(404).json({ success: false, error: '报告数据解析失败' })
    return
  }

  const enterpriseId = reportData.enterpriseId as string
  const batchId = reportData.batchId as string

  const records = db.prepare(`
    SELECT m.*, e.name as enterprise_name, b.name as batch_name, o.id as order_id
    FROM margin_record m
    LEFT JOIN enterprise e ON m.enterprise_id = e.id
    LEFT JOIN batch b ON m.batch_id = b.id
    LEFT JOIN "order" o ON o.margin_record_id = m.id
    WHERE m.enterprise_id = ? AND m.batch_id = ?
    ORDER BY m.lock_time DESC
  `).all(enterpriseId, batchId)

  res.json({
    success: true,
    data: {
      report: { ...reportData, id: log.id, generatedAt: log.timestamp },
      records,
    },
  })
})

router.get('/:id/trace/:rowId', (req: Request, res: Response): void => {
  const db = getDb()
  const { id, rowId } = req.params

  const log = db.prepare(`
    SELECT * FROM audit_log WHERE id = ? AND entity_type = 'margin' AND action = 'create' AND source = 'system'
  `).get(id) as Record<string, unknown> | undefined

  if (!log) {
    res.status(404).json({ success: false, error: '报告不存在' })
    return
  }

  let reportData: Record<string, unknown> | null = null
  try {
    reportData = JSON.parse(log.after_value as string)
  } catch {
    // ignore
  }

  if (!reportData) {
    res.status(404).json({ success: false, error: '报告数据解析失败' })
    return
  }

  const enterpriseId = reportData.enterpriseId as string
  const batchId = reportData.batchId as string

  const margins = db.prepare(`
    SELECT m.*, e.name as enterprise_name, b.name as batch_name
    FROM margin_record m
    LEFT JOIN enterprise e ON m.enterprise_id = e.id
    LEFT JOIN batch b ON m.batch_id = b.id
    WHERE m.enterprise_id = ? AND m.batch_id = ?
    ORDER BY m.lock_time DESC
  `).all(enterpriseId, batchId)

  const auditTrail = db.prepare(`
    SELECT * FROM audit_log
    WHERE entity_type = 'margin' AND entity_id IN (SELECT id FROM margin_record WHERE enterprise_id = ? AND batch_id = ?)
    ORDER BY timestamp DESC
  `).all(enterpriseId, batchId)

  res.json({
    success: true,
    data: {
      reportId: id,
      rowId,
      margins,
      auditTrail,
    },
  })
})

export default router
