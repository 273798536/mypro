import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import type { Complaint, MergeRecord, CreateMergeBody } from '../../shared/types.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  try {
    const { complaint_ids, merged_location, merge_basis } = req.body as CreateMergeBody

    if (!complaint_ids || !Array.isArray(complaint_ids) || complaint_ids.length < 2) {
      res.status(400).json({ success: false, error: 'At least 2 complaint_ids required' })
      return
    }
    if (!merged_location || !merge_basis) {
      res.status(400).json({ success: false, error: 'merged_location and merge_basis are required' })
      return
    }

    const complaints = db.prepare(`SELECT * FROM complaints WHERE id IN (${complaint_ids.map(() => '?').join(',')})`).all(...complaint_ids) as Complaint[]

    if (complaints.length !== complaint_ids.length) {
      res.status(400).json({ success: false, error: 'Some complaint_ids not found' })
      return
    }

    for (const c of complaints) {
      if (c.status !== 'pending') {
        res.status(400).json({ success: false, error: `Complaint ${c.id} is not in pending status` })
        return
      }
    }

    const mergeRecordId = uuidv4()
    const groupId = uuidv4()
    const now = new Date().toISOString()

    const transaction = db.transaction(() => {
      db.prepare('INSERT INTO merge_records (id, group_id, merged_location, merge_basis, created_at) VALUES (?, ?, ?, ?, ?)').run(
        mergeRecordId, groupId, merged_location, merge_basis, now
      )

      for (const c of complaints) {
        db.prepare('INSERT INTO merge_record_complaints (merge_record_id, complaint_id, original_location) VALUES (?, ?, ?)').run(
          mergeRecordId, c.id, c.location_raw
        )
        db.prepare("UPDATE complaints SET status = 'merged', merge_group_id = ?, updated_at = datetime('now') WHERE id = ?").run(groupId, c.id)
      }

      const beforeSnapshot = JSON.stringify({ complaint_ids, statuses: complaints.map(c => c.status) })
      const afterSnapshot = JSON.stringify({ complaint_ids, statuses: complaints.map(() => 'merged') })
      db.prepare('INSERT INTO confirmation_logs (id, merge_group_id, action, before_snapshot, after_snapshot, operator, operated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        uuidv4(), groupId, 'merge', beforeSnapshot, afterSnapshot, 'system', now
      )
    })

    transaction()

    const merge_record = db.prepare('SELECT * FROM merge_records WHERE id = ?').get(mergeRecordId) as MergeRecord
    const mrcRows = db.prepare('SELECT complaint_id, original_location FROM merge_record_complaints WHERE merge_record_id = ?').all(mergeRecordId) as Array<{ complaint_id: string; original_location: string }>
    const fullMergeRecord: MergeRecord = {
      ...merge_record,
      complaint_ids: mrcRows.map(r => r.complaint_id),
      original_locations: mrcRows.map(r => ({ complaint_id: r.complaint_id, location_raw: r.original_location })),
    }

    const updatedComplaints = db.prepare(`SELECT * FROM complaints WHERE id IN (${complaint_ids.map(() => '?').join(',')})`).all(...complaint_ids) as Complaint[]

    res.json({ success: true as const, merge_record: fullMergeRecord, complaints: updatedComplaints })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create merge' })
  }
})

router.post('/:id/confirm', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { confirmed_by } = req.body as { confirmed_by?: string }

    const mergeRecord = db.prepare('SELECT * FROM merge_records WHERE id = ?').get(id) as MergeRecord | undefined
    if (!mergeRecord) {
      res.status(404).json({ success: false, error: 'Merge record not found' })
      return
    }

    if (mergeRecord.confirmed_by) {
      res.status(400).json({ success: false, error: 'Merge already confirmed' })
      return
    }

    const operator = confirmed_by || 'system'
    const now = new Date().toISOString()

    const transaction = db.transaction(() => {
      db.prepare("UPDATE merge_records SET confirmed_by = ?, confirmed_at = ? WHERE id = ?").run(operator, now, id)

      db.prepare("UPDATE complaints SET status = 'confirmed', updated_at = datetime('now') WHERE merge_group_id = ?").run(mergeRecord.group_id)

      const beforeSnapshot = JSON.stringify({ confirmed_by: null, confirmed_at: null, statuses: 'merged' })
      const afterSnapshot = JSON.stringify({ confirmed_by: operator, confirmed_at: now, statuses: 'confirmed' })
      db.prepare('INSERT INTO confirmation_logs (id, merge_group_id, action, before_snapshot, after_snapshot, operator, operated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        uuidv4(), mergeRecord.group_id, 'confirm', beforeSnapshot, afterSnapshot, operator, now
      )
    })

    transaction()

    const updatedMergeRecord = db.prepare('SELECT * FROM merge_records WHERE id = ?').get(id) as MergeRecord
    const mrcRows = db.prepare('SELECT complaint_id, original_location FROM merge_record_complaints WHERE merge_record_id = ?').all(id) as Array<{ complaint_id: string; original_location: string }>
    const fullMergeRecord: MergeRecord = {
      ...updatedMergeRecord,
      complaint_ids: mrcRows.map(r => r.complaint_id),
      original_locations: mrcRows.map(r => ({ complaint_id: r.complaint_id, location_raw: r.original_location })),
    }

    const updatedComplaints = db.prepare('SELECT * FROM complaints WHERE merge_group_id = ?').all(mergeRecord.group_id) as Complaint[]

    res.json({ success: true as const, merge_record: fullMergeRecord, complaints: updatedComplaints })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to confirm merge' })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params

    const mergeRecord = db.prepare('SELECT * FROM merge_records WHERE id = ?').get(id) as MergeRecord | undefined
    if (!mergeRecord) {
      res.status(404).json({ success: false, error: 'Merge record not found' })
      return
    }

    const complaints = db.prepare('SELECT * FROM complaints WHERE merge_group_id = ?').all(mergeRecord.group_id) as Complaint[]
    const now = new Date().toISOString()

    const transaction = db.transaction(() => {
      const beforeSnapshot = JSON.stringify({
        complaint_ids: complaints.map(c => c.id),
        statuses: complaints.map(c => c.status),
        merge_group_id: mergeRecord.group_id,
      })
      const afterSnapshot = JSON.stringify({
        complaint_ids: complaints.map(c => c.id),
        statuses: complaints.map(() => 'pending'),
        merge_group_id: null,
      })

      db.prepare('INSERT INTO confirmation_logs (id, merge_group_id, action, before_snapshot, after_snapshot, operator, operated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        uuidv4(), mergeRecord.group_id, 'unmerge', beforeSnapshot, afterSnapshot, 'system', now
      )

      db.prepare("UPDATE complaints SET status = 'pending', merge_group_id = NULL, updated_at = datetime('now') WHERE merge_group_id = ?").run(mergeRecord.group_id)

      db.prepare('DELETE FROM merge_record_complaints WHERE merge_record_id = ?').run(id)
      db.prepare('DELETE FROM merge_records WHERE id = ?').run(id)
    })

    transaction()

    const updatedComplaints = db.prepare(`SELECT * FROM complaints WHERE id IN (${complaints.map(() => '?').join(',')})`).all(...complaints.map(c => c.id)) as Complaint[]

    res.json({ success: true as const, complaints: updatedComplaints })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to unmerge' })
  }
})

export default router
