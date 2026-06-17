import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

function csvField(value: string | number): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

router.get('/csv', (_req: Request, res: Response): void => {
  try {
    const groups = db.prepare('SELECT * FROM merge_groups ORDER BY id').all() as Array<{
      id: number
      merged_name: string
      merged_latitude: number
      merged_longitude: number
      remark: string
    }>

    const getEntries = db.prepare('SELECT * FROM entries WHERE group_id = ? ORDER BY id')

    const header = '组号,归并名称,归并纬度,归并经度,备注,原始名称,原始纬度,原始经度,原始意见,来源'
    const rows: string[] = []

    for (const group of groups) {
      const entries = getEntries.all(group.id) as Array<{
        name: string
        latitude: number
        longitude: number
        opinion: string
        source: string
      }>

      if (entries.length === 0) {
        rows.push([group.id, group.merged_name, group.merged_latitude, group.merged_longitude, group.remark, '', '', '', '', ''].map(csvField).join(','))
      } else {
        for (const entry of entries) {
          rows.push(
            [group.id, group.merged_name, group.merged_latitude, group.merged_longitude, group.remark, entry.name, entry.latitude, entry.longitude, entry.opinion, entry.source]
              .map(csvField)
              .join(',')
          )
        }
      }
    }

    const csv = '\uFEFF' + header + '\n' + rows.join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=merge_export.csv')
    res.send(csv)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

export default router
