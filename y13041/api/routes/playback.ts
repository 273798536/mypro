import { Router, type Request, type Response } from 'express'
import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { getDb } from '../db/index.js'

const router = Router()

function toCamelCase<T extends Record<string, unknown>>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = obj[key]
  }
  return result as T
}

function mapRowsToCamel<T extends Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => toCamelCase<T>(row))
}

function nowIso(): string {
  return new Date().toISOString()
}

type FieldChange = {
  field: string
  oldValue: unknown
  newValue: unknown
}

type PlaybackBasic = {
  id: string
  enterpriseName: string
  batchNo: string
  runCount: number
  status: string
  conclusion: string
  conclusionReason: string | null
  lastOperator: string | null
  lastUpdatedAt: string
  createdAt: string
}

type ApprovalEmail = {
  id: string
  playbackId: string
  sentAt: string
  approverName: string
  approverNameOriginal: string | null
  subject: string
  content: string
  isAnomaly: boolean
  anomalyNote: string | null
}

type NormalPaymentRecord = {
  id: string
  playbackId: string
  enterpriseName: string
  paymentMonth: string
  amount: number
  paidAt: string
}

type Note = {
  id: string
  playbackId: string
  content: string
  operatorName: string
  createdAt: string
}

type HistoryRecord = {
  id: string
  playbackId: string
  actionType: string
  operatorName: string
  createdAt: string
  fieldChanges: FieldChange[] | null
}

type MarkdownReport = {
  id: string
  playbackId: string
  content: string
  generatedAt: string
  generatedBy: string
  version: number
}

type PlaybackDetail = PlaybackBasic & {
  emails: ApprovalEmail[]
  normalRecords: NormalPaymentRecord[]
  notes: Note[]
  history: HistoryRecord[]
  reports: MarkdownReport[]
}

function parseHistoryRecordRow(row: Record<string, unknown>): HistoryRecord {
  const hr = toCamelCase<HistoryRecord>(row)
  if (row.field_changes_json && typeof row.field_changes_json === 'string') {
    try {
      hr.fieldChanges = JSON.parse(row.field_changes_json) as FieldChange[]
    } catch {
      hr.fieldChanges = null
    }
  } else {
    hr.fieldChanges = null
  }
  return hr
}

function parseApprovalEmailRow(row: Record<string, unknown>): ApprovalEmail {
  const email = toCamelCase<ApprovalEmail>(row)
  email.isAnomaly = !!row.is_anomaly
  return email
}

function getPlaybackDetailById(db: Database.Database, id: string): PlaybackDetail | null {
  const playbackRow = db
    .prepare(
      `SELECT id, enterprise_name, batch_no, run_count, status, conclusion, conclusion_reason, last_operator, last_updated_at, created_at
       FROM playback WHERE id = @id`,
    )
    .get({ id }) as Record<string, unknown> | undefined

  if (!playbackRow) {
    return null
  }

  const emailRows = db
    .prepare(
      `SELECT id, playback_id, sent_at, approver_name, approver_name_original, subject, content, is_anomaly, anomaly_note
       FROM approval_email WHERE playback_id = @playbackId ORDER BY sent_at ASC`,
    )
    .all({ playbackId: id }) as Record<string, unknown>[]

  const paymentRows = db
    .prepare(
      `SELECT id, playback_id, enterprise_name, payment_month, amount, paid_at
       FROM normal_payment_record WHERE playback_id = @playbackId ORDER BY payment_month DESC`,
    )
    .all({ playbackId: id }) as Record<string, unknown>[]

  const noteRows = db
    .prepare(
      `SELECT id, playback_id, content, operator_name, created_at
       FROM note WHERE playback_id = @playbackId ORDER BY created_at DESC`,
    )
    .all({ playbackId: id }) as Record<string, unknown>[]

  const historyRows = db
    .prepare(
      `SELECT id, playback_id, action_type, operator_name, created_at, field_changes_json
       FROM history_record WHERE playback_id = @playbackId ORDER BY created_at DESC`,
    )
    .all({ playbackId: id }) as Record<string, unknown>[]

  const reportRows = db
    .prepare(
      `SELECT id, playback_id, content, generated_at, generated_by, version
       FROM markdown_report WHERE playback_id = @playbackId ORDER BY version DESC`,
    )
    .all({ playbackId: id }) as Record<string, unknown>[]

  const playbackBasic = toCamelCase<PlaybackBasic>(playbackRow)
  const approvalEmails = emailRows.map(parseApprovalEmailRow)
  const normalPaymentRecords = mapRowsToCamel<NormalPaymentRecord>(paymentRows)
  const notes = mapRowsToCamel<Note>(noteRows)
  const historyRecords = historyRows.map(parseHistoryRecordRow)
  const markdownReports = mapRowsToCamel<MarkdownReport>(reportRows)

  return {
    ...playbackBasic,
    emails: approvalEmails,
    normalRecords: normalPaymentRecords,
    notes,
    history: historyRecords,
    reports: markdownReports,
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const status = (req.query.status as string) || ''
    const keyword = (req.query.keyword as string) || ''
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string, 10) || 10))
    const offset = (page - 1) * pageSize

    const conditions: string[] = []
    const params: Record<string, unknown> = {}

    if (status) {
      conditions.push('status = @status')
      params.status = status
    }
    if (keyword) {
      conditions.push('(enterprise_name LIKE @keyword OR batch_no LIKE @keyword)')
      params.keyword = `%${keyword}%`
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRow = db
      .prepare(`SELECT COUNT(*) AS count FROM playback ${whereClause}`)
      .get(params) as { count: number }
    const total = countRow.count

    const rows = db
      .prepare(
        `SELECT id, enterprise_name, batch_no, run_count, status, conclusion, conclusion_reason, last_operator, last_updated_at, created_at
         FROM playback ${whereClause}
         ORDER BY created_at DESC
         LIMIT @pageSize OFFSET @offset`,
      )
      .all({ ...params, pageSize, offset }) as Record<string, unknown>[]

    const list = mapRowsToCamel<PlaybackBasic>(rows)

    res.json({
      success: true,
      data: { list, total, page, pageSize },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Server internal error',
    })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params

    const detail = getPlaybackDetailById(db, id)
    if (!detail) {
      res.status(404).json({ success: false, error: 'Playback not found' })
      return
    }

    res.json({ success: true, data: detail })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Server internal error',
    })
  }
})

router.put('/:id/rejudge', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params
    const { conclusion, reason, operatorName } = req.body as {
      conclusion: string
      reason: string
      operatorName: string
    }

    if (!conclusion || !operatorName) {
      res.status(400).json({ success: false, error: 'Missing required fields' })
      return
    }

    const existing = db
      .prepare('SELECT status, conclusion, conclusion_reason FROM playback WHERE id = @id')
      .get({ id }) as { status: string; conclusion: string; conclusion_reason: string | null } | undefined

    if (!existing) {
      res.status(404).json({ success: false, error: 'Playback not found' })
      return
    }

    const now = nowIso()
    const fieldChanges: FieldChange[] = []

    if (existing.status !== 'rejudged') {
      fieldChanges.push({ field: 'status', oldValue: existing.status, newValue: 'rejudged' })
    }
    if (existing.conclusion !== conclusion) {
      fieldChanges.push({ field: 'conclusion', oldValue: existing.conclusion, newValue: conclusion })
    }
    if (existing.conclusion_reason !== reason) {
      fieldChanges.push({ field: 'conclusion_reason', oldValue: existing.conclusion_reason, newValue: reason })
    }

    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE playback
         SET status = 'rejudged', conclusion = @conclusion, conclusion_reason = @reason,
             last_operator = @operatorName, last_updated_at = @now
         WHERE id = @id`,
      ).run({ conclusion, reason, operatorName, now, id })

      const historyId = randomUUID()
      db.prepare(
        `INSERT INTO history_record (id, playback_id, action_type, operator_name, created_at, field_changes_json)
         VALUES (@id, @playbackId, 'rejudge', @operatorName, @now, @fieldChangesJson)`,
      ).run({
        id: historyId,
        playbackId: id,
        operatorName,
        now,
        fieldChangesJson: JSON.stringify(fieldChanges),
      })
    })

    tx()

    const detail = getPlaybackDetailById(db, id)
    res.json({ success: true, data: detail })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Server internal error',
    })
  }
})

router.post('/:id/notes', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params
    const { content, operatorName } = req.body as { content: string; operatorName: string }

    if (!content || !operatorName) {
      res.status(400).json({ success: false, error: 'Missing required fields' })
      return
    }

    const existing = db.prepare('SELECT id FROM playback WHERE id = @id').get({ id }) as { id: string } | undefined
    if (!existing) {
      res.status(404).json({ success: false, error: 'Playback not found' })
      return
    }

    const now = nowIso()
    const noteId = randomUUID()
    const historyId = randomUUID()

    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO note (id, playback_id, content, operator_name, created_at)
         VALUES (@id, @playbackId, @content, @operatorName, @now)`,
      ).run({ id: noteId, playbackId: id, content, operatorName, now })

      const fieldChanges: FieldChange[] = [{ field: 'note', oldValue: null, newValue: content }]
      db.prepare(
        `INSERT INTO history_record (id, playback_id, action_type, operator_name, created_at, field_changes_json)
         VALUES (@id, @playbackId, 'add_note', @operatorName, @now, @fieldChangesJson)`,
      ).run({
        id: historyId,
        playbackId: id,
        operatorName,
        now,
        fieldChangesJson: JSON.stringify(fieldChanges),
      })
    })

    tx()

    const note: Note = {
      id: noteId,
      playbackId: id,
      content,
      operatorName,
      createdAt: now,
    }

    res.json({ success: true, data: note })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Server internal error',
    })
  }
})

router.get('/:id/history', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params

    const existing = db.prepare('SELECT id FROM playback WHERE id = @id').get({ id }) as { id: string } | undefined
    if (!existing) {
      res.status(404).json({ success: false, error: 'Playback not found' })
      return
    }

    const historyRows = db
      .prepare(
        `SELECT id, playback_id, action_type, operator_name, created_at, field_changes_json
         FROM history_record WHERE playback_id = @playbackId ORDER BY created_at DESC`,
      )
      .all({ playbackId: id }) as Record<string, unknown>[]

    const historyRecords = historyRows.map(parseHistoryRecordRow)

    res.json({ success: true, data: historyRecords })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Server internal error',
    })
  }
})

function buildMarkdownReport(detail: PlaybackDetail, operatorName: string, version: number): string {
  const lines: string[] = []

  lines.push(`# 企业年金缴费异常回放报告`)
  lines.push('')
  lines.push(`> 生成时间：${new Date().toLocaleString('zh-CN')}`)
  lines.push(`> 生成人：${operatorName}`)
  lines.push(`> 版本：v${version}`)
  lines.push('')

  lines.push('## 一、企业信息')
  lines.push('')
  lines.push(`| 字段 | 值 |`)
  lines.push(`| --- | --- |`)
  lines.push(`| 企业名称 | ${detail.enterpriseName} |`)
  lines.push(`| 批次号 | ${detail.batchNo} |`)
  lines.push(`| 跑批次数 | ${detail.runCount} |`)
  lines.push(`| 当前状态 | ${detail.status} |`)
  lines.push(`| 最终结论 | ${detail.conclusion} |`)
  if (detail.conclusionReason) {
    lines.push(`| 结论说明 | ${detail.conclusionReason} |`)
  }
  lines.push(`| 最后操作人 | ${detail.lastOperator || '-'} |`)
  lines.push(`| 最后更新时间 | ${detail.lastUpdatedAt} |`)
  lines.push(`| 创建时间 | ${detail.createdAt} |`)
  lines.push('')

  lines.push('## 二、审批邮件时间线')
  lines.push('')
  if (detail.emails.length === 0) {
    lines.push('_暂无审批邮件记录_')
  } else {
    detail.emails.forEach((email, idx) => {
      lines.push(`### ${idx + 1}. ${email.subject}`)
      lines.push('')
      lines.push(`- **发送时间**：${email.sentAt}`)
      lines.push(`- **审批人**：${email.approverName}${email.approverNameOriginal ? `（备案：${email.approverNameOriginal}）` : ''}`)
      lines.push(`- **是否异常**：${email.isAnomaly ? '⚠️ 是' : '否'}`)
      if (email.isAnomaly && email.anomalyNote) {
        lines.push(`- **异常说明**：${email.anomalyNote}`)
      }
      lines.push('')
      lines.push('**邮件正文：**')
      lines.push('')
      lines.push('```')
      lines.push(email.content)
      lines.push('```')
      lines.push('')
    })
  }

  lines.push('## 三、正常缴费记录')
  lines.push('')
  if (detail.normalRecords.length === 0) {
    lines.push('_暂无正常缴费记录_')
  } else {
    lines.push(`| 月份 | 金额 | 缴费时间 |`)
    lines.push(`| --- | --- | --- |`)
    detail.normalRecords.forEach((rec) => {
      lines.push(`| ${rec.paymentMonth} | ¥${rec.amount.toLocaleString()} | ${rec.paidAt} |`)
    })
  }
  lines.push('')

  lines.push('## 四、手工备注')
  lines.push('')
  if (detail.notes.length === 0) {
    lines.push('_暂无手工备注_')
  } else {
    detail.notes.forEach((note, idx) => {
      lines.push(`### 备注 ${idx + 1}`)
      lines.push('')
      lines.push(`- **操作人**：${note.operatorName}`)
      lines.push(`- **时间**：${note.createdAt}`)
      lines.push('')
      lines.push(note.content)
      lines.push('')
    })
  }

  lines.push('## 五、变更历史')
  lines.push('')
  if (detail.history.length === 0) {
    lines.push('_暂无变更历史_')
  } else {
    detail.history.forEach((hr, idx) => {
      lines.push(`### ${idx + 1}. ${hr.actionType}`)
      lines.push('')
      lines.push(`- **操作人**：${hr.operatorName}`)
      lines.push(`- **时间**：${hr.createdAt}`)
      if (hr.fieldChanges && hr.fieldChanges.length > 0) {
        lines.push('')
        lines.push(`| 字段 | 旧值 | 新值 |`)
        lines.push(`| --- | --- | --- |`)
        hr.fieldChanges.forEach((fc) => {
          lines.push(`| ${fc.field} | ${fc.oldValue ?? '-'} | ${fc.newValue ?? '-'} |`)
        })
      }
      lines.push('')
    })
  }

  lines.push('## 六、最终结论')
  lines.push('')
  lines.push(`**结论：${detail.conclusion}**`)
  lines.push('')
  if (detail.conclusionReason) {
    lines.push(detail.conclusionReason)
    lines.push('')
  }

  return lines.join('\n')
}

router.post('/:id/reports', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params
    const { operatorName } = req.body as { operatorName: string }

    if (!operatorName) {
      res.status(400).json({ success: false, error: 'Missing required field: operatorName' })
      return
    }

    const detail = getPlaybackDetailById(db, id)
    if (!detail) {
      res.status(404).json({ success: false, error: 'Playback not found' })
      return
    }

    const version = detail.reports.length + 1
    const content = buildMarkdownReport(detail, operatorName, version)
    const now = nowIso()
    const reportId = randomUUID()
    const historyId = randomUUID()

    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO markdown_report (id, playback_id, content, generated_at, generated_by, version)
         VALUES (@id, @playbackId, @content, @generatedAt, @generatedBy, @version)`,
      ).run({
        id: reportId,
        playbackId: id,
        content,
        generatedAt: now,
        generatedBy: operatorName,
        version,
      })

      const fieldChanges: FieldChange[] = [
        { field: 'markdown_report', oldValue: null, newValue: `version ${version}` },
      ]
      db.prepare(
        `INSERT INTO history_record (id, playback_id, action_type, operator_name, created_at, field_changes_json)
         VALUES (@id, @playbackId, 'generate_report', @operatorName, @now, @fieldChangesJson)`,
      ).run({
        id: historyId,
        playbackId: id,
        operatorName,
        now,
        fieldChangesJson: JSON.stringify(fieldChanges),
      })
    })

    tx()

    const report: MarkdownReport = {
      id: reportId,
      playbackId: id,
      content,
      generatedAt: now,
      generatedBy: operatorName,
      version,
    }

    res.json({ success: true, data: report })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Server internal error',
    })
  }
})

router.get('/:id/reports/:reportId', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id, reportId } = req.params

    const report = db
      .prepare(
        `SELECT id, playback_id, content, generated_at, generated_by, version
         FROM markdown_report WHERE id = @reportId AND playback_id = @playbackId`,
      )
      .get({ reportId, playbackId: id }) as Record<string, unknown> | undefined

    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' })
      return
    }

    const playbackRow = db
      .prepare('SELECT enterprise_name, batch_no FROM playback WHERE id = @id')
      .get({ id }) as { enterprise_name: string; batch_no: string } | undefined

    const version = report.version as number
    const safeName = playbackRow
      ? `${playbackRow.enterprise_name}_${playbackRow.batch_no}_v${version}.md`
      : `report_${reportId}_v${version}.md`
    const filename = encodeURIComponent(safeName)

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(report.content as string)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Server internal error',
    })
  }
})

router.put('/:id/confirm', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params
    const { operatorName } = req.body as { operatorName: string }

    if (!operatorName) {
      res.status(400).json({ success: false, error: 'Missing required field: operatorName' })
      return
    }

    const existing = db
      .prepare('SELECT status FROM playback WHERE id = @id')
      .get({ id }) as { status: string } | undefined

    if (!existing) {
      res.status(404).json({ success: false, error: 'Playback not found' })
      return
    }

    const now = nowIso()
    const fieldChanges: FieldChange[] = []

    if (existing.status !== 'confirmed') {
      fieldChanges.push({ field: 'status', oldValue: existing.status, newValue: 'confirmed' })
    }

    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE playback
         SET status = 'confirmed', last_operator = @operatorName, last_updated_at = @now
         WHERE id = @id`,
      ).run({ operatorName, now, id })

      const historyId = randomUUID()
      db.prepare(
        `INSERT INTO history_record (id, playback_id, action_type, operator_name, created_at, field_changes_json)
         VALUES (@id, @playbackId, 'confirm', @operatorName, @now, @fieldChangesJson)`,
      ).run({
        id: historyId,
        playbackId: id,
        operatorName,
        now,
        fieldChangesJson: JSON.stringify(fieldChanges),
      })
    })

    tx()

    const detail = getPlaybackDetailById(db, id)
    res.json({ success: true, data: detail })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Server internal error',
    })
  }
})

export default router
