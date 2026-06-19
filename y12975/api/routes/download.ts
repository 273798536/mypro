import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
}

router.get('/', (req: Request, res: Response) => {
  const { format = 'json', status, confidence, sourceType, driftType } = req.query
  let sql = `
    SELECT d.*, s.raw_value as snapshot_raw, s.parsed_enum as snapshot_parsed, s.null_flag, s.duplicate_flag, s.mixed_note_flag
    FROM drift_records d
    LEFT JOIN snapshots s ON d.snapshot_id = s.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (status) {
    sql += ' AND d.status = ?'
    params.push(status)
  }
  if (confidence) {
    sql += ' AND d.confidence = ?'
    params.push(confidence)
  }
  if (sourceType) {
    sql += ' AND d.source_type = ?'
    params.push(sourceType)
  }
  if (driftType) {
    sql += ' AND d.drift_type = ?'
    params.push(driftType)
  }

  sql += ' ORDER BY d.created_at DESC'
  const rows = db.prepare(sql).all(...params)

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="drift_records.csv"')
    res.send('\ufeff' + toCSV(rows as Record<string, unknown>[]))
    return
  }

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', 'attachment; filename="drift_records.json"')
  res.json({ ok: true, data: rows })
})

export default router
