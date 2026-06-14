import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const db = getDb()

  const normalRecords = db.prepare(
    "SELECT * FROM conflicts WHERE status != 'auth_expired' ORDER BY created_at ASC"
  ).all() as {
    id: string
    title: string
    status: string
    note: string
    auth_note: string
    created_at: string
    updated_at: string
  }[]

  const authExpiredRecords = db.prepare(
    "SELECT * FROM conflicts WHERE status = 'auth_expired' ORDER BY created_at ASC"
  ).all() as typeof normalRecords

  const escapeCsv = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const headers = ['ID', '标题', '状态', '备注', '授权备注', '创建时间', '更新时间']
  const statusMap: Record<string, string> = {
    normal: '正常',
    auth_expired: '授权到期',
    name_mismatch: '名称不匹配',
  }

  const rows: string[] = []
  rows.push(headers.map(escapeCsv).join(','))

  for (const r of normalRecords) {
    rows.push([
      escapeCsv(r.id),
      escapeCsv(r.title),
      escapeCsv(statusMap[r.status] || r.status),
      escapeCsv(r.note),
      escapeCsv(r.auth_note),
      escapeCsv(r.created_at),
      escapeCsv(r.updated_at),
    ].join(','))
  }

  rows.push('')
  rows.push('授权到期记录')
  rows.push(headers.map(escapeCsv).join(','))

  for (const r of authExpiredRecords) {
    rows.push([
      escapeCsv(r.id),
      escapeCsv(r.title),
      escapeCsv(statusMap[r.status] || r.status),
      escapeCsv(r.note),
      escapeCsv(r.auth_note),
      escapeCsv(r.created_at),
      escapeCsv(r.updated_at),
    ].join(','))
  }

  const csv = '\uFEFF' + rows.join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename=conflicts_export.csv')
  res.send(csv)
})

export default router
