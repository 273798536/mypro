import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const VALID_STATUSES = new Set(['normal', 'auth_expired', 'name_mismatch'])

function normalizeStatus(input: {
  existingStatus: string
  existingAuthExpired: number
  status?: string
  authExpired?: unknown
  authNote?: unknown
}): {
  finalStatus: string
  finalAuthExpired: number
  finalAuthNote: string
  changes: string[]
  warnings: string[]
} {
  const changes: string[] = []
  const warnings: string[] = []

  let finalStatus = input.status ?? input.existingStatus
  let finalAuthExpiredNum: number = input.existingAuthExpired
  let finalAuthNote: string = ''

  if (input.authExpired !== undefined) {
    finalAuthExpiredNum = input.authExpired ? 1 : 0
  }
  if (typeof input.authNote === 'string') {
    finalAuthNote = input.authNote
  }

  const effectiveAuthExpired = finalAuthExpiredNum === 1 || finalAuthNote.trim().length > 0

  if (effectiveAuthExpired) {
    if (finalAuthExpiredNum !== 1) {
      finalAuthExpiredNum = 1
      changes.push('因填写了授权备注，auth_expired 强制置为 1')
    }
    if (finalStatus !== 'auth_expired') {
      warnings.push(`状态已从"${labelOf(finalStatus)}"强制归一为"授权到期"（因授权到期相关字段已填）`)
      changes.push(`status 从 ${finalStatus} → auth_expired`)
      finalStatus = 'auth_expired'
    }
  } else {
    if (finalAuthNote.trim().length > 0 && finalAuthExpiredNum === 0) {
      // shouldn't hit after the above block, but keep as safety
      finalAuthNote = ''
      changes.push('已关闭授权到期，auth_note 被清空以避免残留')
    }
    if (finalStatus === 'auth_expired' && input.authExpired === false) {
      warnings.push('你手动关闭了授权到期，状态已回退为"正常"。若为名称不一致请再调整。')
      finalStatus = 'normal'
      changes.push('status 从 auth_expired → normal（因主动关闭授权到期）')
    }
  }

  return {
    finalStatus,
    finalAuthExpired: finalAuthExpiredNum,
    finalAuthNote,
    changes,
    warnings,
  }
}

function labelOf(s: string): string {
  switch (s) {
    case 'normal':
      return '正常'
    case 'auth_expired':
      return '授权到期'
    case 'name_mismatch':
      return '名称不一致'
    default:
      return s
  }
}

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const db = getDb()
  const conflicts = db.prepare('SELECT * FROM conflicts ORDER BY created_at DESC').all()
  res.json({ success: true, data: conflicts })
})

router.get('/summary', (_req: Request, res: Response): void => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT status, COUNT(*) as count FROM conflicts GROUP BY status
  `).all() as { status: string; count: number }[]

  const summary = {
    normal: 0,
    auth_expired: 0,
    name_mismatch: 0,
    total: 0,
  }

  for (const row of rows) {
    if (row.status === 'normal') summary.normal = row.count
    else if (row.status === 'auth_expired') summary.auth_expired = row.count
    else if (row.status === 'name_mismatch') summary.name_mismatch = row.count
    summary.total += row.count
  }

  res.json({ success: true, data: summary })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const conflict = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(req.params.id) as
    | Record<string, unknown>
    | undefined

  if (!conflict) {
    res.status(404).json({ success: false, error: 'Conflict not found' })
    return
  }

  const tracks = db.prepare('SELECT * FROM tracks WHERE conflict_id = ?').all(req.params.id)
  const noteHistory = db.prepare('SELECT * FROM note_history WHERE conflict_id = ? ORDER BY created_at ASC').all(req.params.id)

  res.json({
    success: true,
    data: {
      ...conflict,
      tracks,
      noteHistory,
    },
  })
})

router.patch('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const { id } = req.params
  const { note, authExpired, authNote, status, operatorRole } = req.body

  const existing = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(id) as
    | { id: string; note: string; auth_expired: number; auth_note: string; status: string; created_at: string }
    | undefined

  if (!existing) {
    res.status(404).json({ success: false, error: '冲突记录不存在，请刷新后重试' })
    return
  }

  if (status !== undefined && typeof status !== 'string') {
    res.status(400).json({
      success: false,
      error: '参数类型错误：status 必须是字符串',
      field: 'status',
    })
    return
  }
  if (status !== undefined && !VALID_STATUSES.has(status)) {
    res.status(400).json({
      success: false,
      error: `状态值不合法：${status}，应为 normal / auth_expired / name_mismatch`,
      field: 'status',
    })
    return
  }
  if (note !== undefined && typeof note !== 'string') {
    res.status(400).json({
      success: false,
      error: '参数类型错误：note 必须是字符串',
      field: 'note',
    })
    return
  }
  if (note !== undefined && note.length > 4000) {
    res.status(400).json({
      success: false,
      error: '备注内容过长（>4000 字）',
      field: 'note',
    })
    return
  }
  if (authExpired !== undefined && typeof authExpired !== 'boolean') {
    res.status(400).json({
      success: false,
      error: '参数类型错误：authExpired 必须是布尔值',
      field: 'authExpired',
    })
    return
  }
  if (authNote !== undefined && typeof authNote !== 'string') {
    res.status(400).json({
      success: false,
      error: '参数类型错误：authNote 必须是字符串',
      field: 'authNote',
    })
    return
  }

  const norm = normalizeStatus({
    existingStatus: existing.status,
    existingAuthExpired: existing.auth_expired,
    status,
    authExpired,
    authNote,
  })

  const updates: string[] = []
  const values: unknown[] = []
  const actualChanges: string[] = []

  const finalNote = note !== undefined ? note : existing.note
  const finalAuthNote = norm.finalAuthNote
  const finalAuthExpired = norm.finalAuthExpired
  const finalStatus = norm.finalStatus

  if (finalNote !== existing.note) {
    updates.push('note = ?')
    values.push(finalNote)
    actualChanges.push('备注已更新')
  }
  if (finalAuthExpired !== existing.auth_expired) {
    updates.push('auth_expired = ?')
    values.push(finalAuthExpired)
    actualChanges.push(
      finalAuthExpired === 1 ? '已标记为授权到期' : '已取消授权到期标记',
    )
  }
  if (finalAuthNote !== existing.auth_note) {
    updates.push('auth_note = ?')
    values.push(finalAuthNote)
    actualChanges.push(
      finalAuthNote ? '已更新授权备注' : '已清空授权备注',
    )
  }
  if (finalStatus !== existing.status) {
    updates.push('status = ?')
    values.push(finalStatus)
    actualChanges.push(
      `状态：${labelOf(existing.status)} → ${labelOf(finalStatus)}`,
    )
  }

  for (const c of norm.changes) actualChanges.push(`[系统归一] ${c}`)

  if (updates.length === 0) {
    const readBack = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(id)
    res.json({
      success: true,
      data: readBack,
      normalized: false,
      warnings: norm.warnings.length > 0 ? norm.warnings : undefined,
      info: '未检测到实际字段变更，数据未写入',
    })
    return
  }

  updates.push("updated_at = datetime('now')")
  values.push(id)

  const opRole =
    typeof operatorRole === 'string' &&
    ['manager', 'coordinator', 'teacher'].includes(operatorRole)
      ? operatorRole
      : 'manager'

  try {
    const transaction = db.transaction(() => {
      db.prepare(`UPDATE conflicts SET ${updates.join(', ')} WHERE id = ?`).run(
        ...values,
      )

      if (finalNote !== existing.note) {
        const isSupplementary =
          Date.now() > new Date(existing.created_at).getTime() + 86400000 ? 1 : 0
        db.prepare(`
          INSERT INTO note_history (id, conflict_id, content, is_supplementary, operator_role, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run(crypto.randomUUID(), id, finalNote, isSupplementary, opRole)
      }

      if (norm.changes.length > 0) {
        const systemNote =
          '【系统归一】' + norm.changes.join('；') +
          (norm.warnings.length ? ' ⚠️ ' + norm.warnings.join('；') : '')
        db.prepare(`
          INSERT INTO note_history (id, conflict_id, content, is_supplementary, operator_role, created_at)
          VALUES (?, ?, ?, 1, 'manager', datetime('now'))
        `).run(crypto.randomUUID(), id, systemNote)
      } else if (actualChanges.length > 1 && finalNote === existing.note) {
        const shortNote =
          '【字段变更】' + actualChanges.join('；')
        db.prepare(`
          INSERT INTO note_history (id, conflict_id, content, is_supplementary, operator_role, created_at)
          VALUES (?, ?, ?, 0, ?, datetime('now'))
        `).run(crypto.randomUUID(), id, shortNote, opRole)
      }
    })

    transaction()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({
      success: false,
      error: `数据库写入失败：${msg}。请重试或联系运维。`,
    })
    return
  }

  const updated = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined

  if (
    updated &&
    ((updated as { auth_expired: number }).auth_expired === 1) !==
      (finalAuthExpired === 1)
  ) {
    res.status(500).json({
      success: false,
      error: '回读校验失败：数据库持久化结果与归一结果不一致，请立即停止操作并排查。',
    })
    return
  }

  const successMsg = ['数据已保存，接口/页面/导出清单已同步。']
  if (actualChanges.length > 0) successMsg.push(`变更：${actualChanges.join('；')}`)

  res.json({
    success: true,
    data: updated,
    normalized: norm.changes.length > 0 || status !== finalStatus || norm.warnings.length > 0,
    warnings: norm.warnings.length > 0 ? norm.warnings : undefined,
    info: successMsg.join(' '),
  })
})

export default router
