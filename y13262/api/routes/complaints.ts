import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import type { Complaint, Photo, NoteHistory, MergeRecord, GetComplaintsQuery, GetComplaintsResponse, GetComplaintResponse } from '../../shared/types.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { status, location, keyword, date_from, date_to } = req.query as unknown as GetComplaintsQuery

    let sql = `
      SELECT c.*, COUNT(p.id) as photo_count
      FROM complaints c
      LEFT JOIN photos p ON p.complaint_id = c.id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (status) {
      sql += ' AND c.status = ?'
      params.push(status)
    }
    if (location) {
      sql += ' AND c.location_normalized LIKE ?'
      params.push(`%${location}%`)
    }
    if (keyword) {
      sql += ' AND (c.original_text LIKE ? OR c.location_raw LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    if (date_from) {
      sql += ' AND c.reported_at >= ?'
      params.push(date_from)
    }
    if (date_to) {
      sql += ' AND c.reported_at <= ?'
      params.push(date_to)
    }

    sql += ' GROUP BY c.id ORDER BY c.created_at DESC'

    const complaints = db.prepare(sql).all(...params) as (Complaint & { photo_count: number })[]
    const total = complaints.length

    const response: GetComplaintsResponse = { complaints, total }
    res.json(response)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list complaints' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as Complaint | undefined
    if (!complaint) {
      res.status(404).json({ success: false, error: 'Complaint not found' })
      return
    }

    const photos = db.prepare('SELECT * FROM photos WHERE complaint_id = ?').all(id) as Photo[]

    let merge_group: Complaint[] | null = null
    let merge_record: MergeRecord | null = null

    if (complaint.merge_group_id) {
      merge_group = db.prepare('SELECT * FROM complaints WHERE merge_group_id = ? AND id != ?').all(complaint.merge_group_id, id) as Complaint[]

      const mr = db.prepare('SELECT * FROM merge_records WHERE group_id = ?').get(complaint.merge_group_id) as MergeRecord | undefined
      if (mr) {
        const mrcRows = db.prepare('SELECT complaint_id, original_location FROM merge_record_complaints WHERE merge_record_id = ?').all(mr.id) as Array<{ complaint_id: string; original_location: string }>
        merge_record = {
          ...mr,
          complaint_ids: mrcRows.map(r => r.complaint_id),
          original_locations: mrcRows.map(r => ({ complaint_id: r.complaint_id, location_raw: r.original_location })),
        }
      }
    }

    const history = db.prepare('SELECT * FROM note_histories WHERE complaint_id = ? ORDER BY changed_at DESC').all(id) as NoteHistory[]

    const response: GetComplaintResponse = {
      complaint,
      photos,
      merge_group,
      merge_record,
      history,
    }
    res.json(response)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get complaint' })
  }
})

router.patch('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { note, changed_by } = req.body as { note?: string; changed_by?: string }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as Complaint | undefined
    if (!complaint) {
      res.status(404).json({ success: false, error: 'Complaint not found' })
      return
    }

    if (note === undefined) {
      res.status(400).json({ success: false, error: 'note field is required' })
      return
    }

    const operator = changed_by || 'system'
    const oldNote = complaint.note
    const now = new Date().toISOString()

    const transaction = db.transaction(() => {
      db.prepare("UPDATE complaints SET note = ?, updated_at = datetime('now') WHERE id = ?").run(note, id)

      db.prepare('INSERT INTO note_histories (id, complaint_id, field, old_value, new_value, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        uuidv4(), id, 'note', oldNote, note, operator, now
      )

      if (complaint.merge_group_id) {
        const beforeSnapshot = JSON.stringify({ note: oldNote })
        const afterSnapshot = JSON.stringify({ note })
        db.prepare('INSERT INTO confirmation_logs (id, merge_group_id, action, before_snapshot, after_snapshot, operator, operated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          uuidv4(), complaint.merge_group_id, 'edit_note', beforeSnapshot, afterSnapshot, operator, now
        )
      }
    })

    transaction()

    const updated = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as Complaint
    res.json({ success: true as const, complaint: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update complaint' })
  }
})

export default router
