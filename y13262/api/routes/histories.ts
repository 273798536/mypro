import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import type { ConfirmationLog, NoteHistory, GetHistoriesQuery, GetHistoriesResponse } from '../../shared/types.js'

const router = Router()

const parseSnapshot = (val: unknown): Record<string, unknown> => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as Record<string, unknown>
    } catch {
      return { value: val }
    }
  }
  if (val && typeof val === 'object') {
    return val as Record<string, unknown>
  }
  return {}
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const { complaint_id, merge_group_id, action, date_from, date_to } = req.query as unknown as GetHistoriesQuery

    const logs: ConfirmationLog[] = []

    let confirmationSql = 'SELECT * FROM confirmation_logs WHERE 1=1'
    const confirmationParams: unknown[] = []

    if (merge_group_id) {
      confirmationSql += ' AND merge_group_id = ?'
      confirmationParams.push(merge_group_id)
    }
    if (action) {
      confirmationSql += ' AND action = ?'
      confirmationParams.push(action)
    }
    if (date_from) {
      confirmationSql += ' AND operated_at >= ?'
      confirmationParams.push(date_from)
    }
    if (date_to) {
      confirmationSql += ' AND operated_at <= ?'
      confirmationParams.push(date_to)
    }

    const confirmationRows = db.prepare(confirmationSql).all(...confirmationParams) as Array<Record<string, unknown>>

    for (const row of confirmationRows) {
      logs.push({
        id: String(row.id),
        merge_group_id: row.merge_group_id as string | null,
        complaint_id: (row.complaint_id as string | null) ?? null,
        action: row.action as ConfirmationLog['action'],
        before_snapshot: parseSnapshot(row.before_snapshot),
        after_snapshot: parseSnapshot(row.after_snapshot),
        operator: String(row.operator),
        operated_at: String(row.operated_at),
      })
    }

    if (!action || action === 'edit_note') {
      let noteSql = 'SELECT * FROM note_histories WHERE 1=1'
      const noteParams: unknown[] = []

      if (complaint_id) {
        noteSql += ' AND complaint_id = ?'
        noteParams.push(complaint_id)
      }
      if (date_from) {
        noteSql += ' AND changed_at >= ?'
        noteParams.push(date_from)
      }
      if (date_to) {
        noteSql += ' AND changed_at <= ?'
        noteParams.push(date_to)
      }

      const noteHistories = db.prepare(noteSql).all(...noteParams) as NoteHistory[]

      for (const nh of noteHistories) {
        const c = db.prepare('SELECT merge_group_id FROM complaints WHERE id = ?').get(nh.complaint_id) as { merge_group_id: string | null } | undefined
        logs.push({
          id: nh.id,
          merge_group_id: c?.merge_group_id ?? null,
          complaint_id: nh.complaint_id,
          action: 'edit_note',
          before_snapshot: { [nh.field]: nh.old_value },
          after_snapshot: { [nh.field]: nh.new_value },
          operator: nh.changed_by,
          operated_at: nh.changed_at,
        })
      }
    }

    logs.sort((a, b) => b.operated_at.localeCompare(a.operated_at))

    const response: GetHistoriesResponse = { logs, total: logs.length }
    res.json(response)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list histories' })
  }
})

export default router
