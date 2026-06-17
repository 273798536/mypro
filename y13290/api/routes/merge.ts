import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { runMerge } from '../services/merge.js'

const router = Router()

router.post('/run', (_req: Request, res: Response): void => {
  try {
    const groups = runMerge(db)
    res.json({ success: true, data: groups })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.get('/groups', (_req: Request, res: Response): void => {
  try {
    const groups = db.prepare('SELECT * FROM merge_groups ORDER BY id').all() as Array<{
      id: number
      merged_name: string
      merged_latitude: number
      merged_longitude: number
      remark: string
      created_at: string
      updated_at: string
    }>

    const getEntries = db.prepare('SELECT * FROM entries WHERE group_id = ? ORDER BY id')

    const data = groups.map((group) => ({
      ...group,
      entries: getEntries.all(group.id),
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.patch('/groups/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const body = req.body as {
      merged_name?: string
      merged_latitude?: number
      merged_longitude?: number
      remark?: string
    }

    const existing = db.prepare('SELECT * FROM merge_groups WHERE id = ?').get(id)
    if (!existing) {
      res.status(404).json({ success: false, error: 'Group not found' })
      return
    }

    const fields: string[] = []
    const values: unknown[] = []

    if (body.merged_name !== undefined) { fields.push('merged_name = ?'); values.push(body.merged_name) }
    if (body.merged_latitude !== undefined) { fields.push('merged_latitude = ?'); values.push(body.merged_latitude) }
    if (body.merged_longitude !== undefined) { fields.push('merged_longitude = ?'); values.push(body.merged_longitude) }
    if (body.remark !== undefined) { fields.push('remark = ?'); values.push(body.remark) }

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' })
      return
    }

    fields.push("updated_at = datetime('now')")
    values.push(id)

    db.prepare(`UPDATE merge_groups SET ${fields.join(', ')} WHERE id = ?`).run(...values)

    const updated = db.prepare('SELECT * FROM merge_groups WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.post('/ungroup', (req: Request, res: Response): void => {
  try {
    const { entryId } = req.body as { entryId: number }

    if (entryId === undefined) {
      res.status(400).json({ success: false, error: 'entryId is required' })
      return
    }

    const existing = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId)
    if (!existing) {
      res.status(404).json({ success: false, error: 'Entry not found' })
      return
    }

    db.prepare('UPDATE entries SET group_id = NULL WHERE id = ?').run(entryId)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.post('/group', (req: Request, res: Response): void => {
  try {
    const { entryId, groupId } = req.body as { entryId: number; groupId: number }

    if (entryId === undefined || groupId === undefined) {
      res.status(400).json({ success: false, error: 'entryId and groupId are required' })
      return
    }

    const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId)
    if (!entry) {
      res.status(404).json({ success: false, error: 'Entry not found' })
      return
    }

    const group = db.prepare('SELECT * FROM merge_groups WHERE id = ?').get(groupId)
    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' })
      return
    }

    db.prepare('UPDATE entries SET group_id = ? WHERE id = ?').run(groupId, entryId)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

export default router
