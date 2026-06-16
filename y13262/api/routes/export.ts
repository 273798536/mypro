import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import type { Complaint, ExportBody } from '../../shared/types.js'

const router = Router()

interface ExportRow extends Complaint {
  merge_merged_location: string | null
  merge_merge_basis: string | null
  merge_confirmed_by: string | null
}

router.post('/', (req: Request, res: Response): void => {
  try {
    const { status, date_from, date_to, location, keyword, format } = req.body as ExportBody & { keyword?: string }

    if (!format || !['csv', 'json'].includes(format)) {
      res.status(400).json({ success: false, error: 'format must be csv or json' })
      return
    }

    let sql = `
      SELECT c.*,
        mr.merged_location as merge_merged_location,
        mr.merge_basis as merge_merge_basis,
        mr.confirmed_by as merge_confirmed_by
      FROM complaints c
      LEFT JOIN merge_records mr ON c.merge_group_id = mr.group_id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (status) {
      sql += ' AND c.status = ?'
      params.push(status)
    }
    if (date_from) {
      sql += ' AND c.reported_at >= ?'
      params.push(date_from)
    }
    if (date_to) {
      sql += ' AND c.reported_at <= ?'
      params.push(date_to)
    }
    if (location) {
      sql += ' AND c.location_normalized LIKE ?'
      params.push(`%${location}%`)
    }
    if (keyword) {
      sql += ' AND (c.original_text LIKE ? OR c.location_raw LIKE ? OR c.note LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }

    sql += ' ORDER BY c.reported_at DESC'

    const rows = db.prepare(sql).all(...params) as ExportRow[]

    if (format === 'json') {
      const jsonData = JSON.stringify(rows, null, 2)
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename=complaints_export.json')
      res.send(jsonData)
      return
    }

    if (format === 'csv') {
      const headers = [
        'id', 'original_text', 'location_raw', 'location_normalized',
        'status', 'source', 'reported_at', 'note', 'merge_group_id',
        'created_at', 'updated_at', 'merge_merged_location',
        'merge_merge_basis', 'merge_confirmed_by',
      ]

      const escapeCsv = (val: unknown): string => {
        const str = val === null || val === undefined ? '' : String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      const csvLines: string[] = [headers.join(',')]

      for (const row of rows) {
        const values = headers.map(h => escapeCsv((row as unknown as Record<string, unknown>)[h]))
        csvLines.push(values.join(','))
      }

      const csvData = csvLines.join('\n')
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename=complaints_export.csv')
      res.send('\uFEFF' + csvData)
      return
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to export data' })
  }
})

export default router
