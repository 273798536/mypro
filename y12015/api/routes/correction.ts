import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import {
  calculateAllocation,
  compareVersions,
  getLatestVersion,
} from '../services/allocationService.js'

const router = Router()

interface RawEntry {
  id: string
  card_no: string
  scenic_spot_id: string
  scenic_spot_name: string
  entry_time: string
  swipe_serial_no: string
  is_deduplicated: number
  deduplicated_at: string | null
}

router.put('/entry/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { action, data } = req.body as { action: 'update' | 'delete'; data?: Record<string, unknown> }

    const oldVersion = getLatestVersion() ?? 'v0'

    const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as RawEntry | undefined
    if (!entry) {
      res.status(404).json({ success: false, error: '入园记录不存在' })
      return
    }

    const insertHistory = db.prepare(
      `INSERT INTO correction_history (id, entry_id, action, old_data, new_data, old_version, new_version, corrected_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const transaction = db.transaction(() => {
      if (action === 'delete') {
        const oldData = JSON.stringify({
          card_no: entry.card_no,
          scenic_spot_id: entry.scenic_spot_id,
          scenic_spot_name: entry.scenic_spot_name,
          entry_time: entry.entry_time,
          swipe_serial_no: entry.swipe_serial_no,
        })
        db.prepare('DELETE FROM entries WHERE id = ?').run(id)

        const calcResult = calculateAllocation()
        insertHistory.run(uuidv4(), id, 'delete', oldData, null, oldVersion, calcResult.version, 'system')
        res.json({ success: true, newAllocationVersion: calcResult.version })
      } else if (action === 'update' && data) {
        const oldData = JSON.stringify({
          card_no: entry.card_no,
          scenic_spot_id: entry.scenic_spot_id,
          scenic_spot_name: entry.scenic_spot_name,
          entry_time: entry.entry_time,
          swipe_serial_no: entry.swipe_serial_no,
        })

        const updates: string[] = []
        const values: unknown[] = []

        if (data.entryTime !== undefined) { updates.push('entry_time = ?'); values.push(data.entryTime) }
        if (data.scenicSpotId !== undefined) { updates.push('scenic_spot_id = ?'); values.push(data.scenicSpotId) }
        if (data.scenicSpotName !== undefined) { updates.push('scenic_spot_name = ?'); values.push(data.scenicSpotName) }

        if (updates.length > 0) {
          values.push(id)
          db.prepare(`UPDATE entries SET ${updates.join(', ')} WHERE id = ?`).run(...values)
        }

        const calcResult = calculateAllocation()
        const newData = JSON.stringify(data)
        insertHistory.run(uuidv4(), id, 'update', oldData, newData, oldVersion, calcResult.version, 'system')
        res.json({ success: true, newAllocationVersion: calcResult.version })
      } else {
        res.status(400).json({ success: false, error: '无效的操作' })
      }
    })

    transaction()
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

router.post('/entry', (req: Request, res: Response) => {
  try {
    const body = req.body as {
      cardNo: string
      scenicSpotId: string
      scenicSpotName: string
      entryTime: string
      swipeSerialNo: string
    }

    const oldVersion = getLatestVersion() ?? 'v0'

    const insertHistory = db.prepare(
      `INSERT INTO correction_history (id, entry_id, action, old_data, new_data, old_version, new_version, corrected_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const transaction = db.transaction(() => {
      const entryId = uuidv4()
      const serialNo = body.swipeSerialNo || uuidv4()

      db.prepare(
        'INSERT INTO entries (id, card_no, scenic_spot_id, scenic_spot_name, entry_time, swipe_serial_no, is_deduplicated) VALUES (?, ?, ?, ?, ?, ?, 0)'
      ).run(entryId, body.cardNo, body.scenicSpotId, body.scenicSpotName, body.entryTime, serialNo)

      const calcResult = calculateAllocation()

      const newData = JSON.stringify(body)
      insertHistory.run(uuidv4(), entryId, 'add', null, newData, oldVersion, calcResult.version, 'system')

      res.json({ success: true, newAllocationVersion: calcResult.version })
    })

    transaction()
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

router.get('/compare', (req: Request, res: Response) => {
  try {
    const oldVersion = req.query.oldVersion as string
    const newVersion = req.query.newVersion as string

    if (!oldVersion || !newVersion) {
      res.status(400).json({ success: false, error: '请提供旧版本和新版本' })
      return
    }

    const comparison = compareVersions(oldVersion, newVersion)
    res.json(comparison)
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

router.get('/entries', (_req: Request, res: Response) => {
  try {
    const entries = db.prepare('SELECT * FROM entries ORDER BY entry_time DESC').all() as RawEntry[]
    res.json(entries.map(e => ({
      id: e.id,
      cardNo: e.card_no,
      scenicSpotId: e.scenic_spot_id,
      scenicSpotName: e.scenic_spot_name,
      entryTime: e.entry_time,
      swipeSerialNo: e.swipe_serial_no,
      isDeduplicated: e.is_deduplicated === 1,
      deduplicatedAt: e.deduplicated_at,
    })))
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

router.get('/history', (_req: Request, res: Response) => {
  try {
    const history = db.prepare(
      'SELECT * FROM correction_history ORDER BY corrected_at DESC'
    ).all() as Array<{
      id: string
      entry_id: string
      action: string
      old_data: string | null
      new_data: string | null
      old_version: string
      new_version: string
      corrected_by: string
      corrected_at: string
    }>

    res.json(history.map(h => ({
      id: h.id,
      entryId: h.entry_id,
      action: h.action,
      oldData: h.old_data ? JSON.parse(h.old_data) : null,
      newData: h.new_data ? JSON.parse(h.new_data) : null,
      oldVersion: h.old_version,
      newVersion: h.new_version,
      correctedBy: h.corrected_by,
      correctedAt: h.corrected_at,
    })))
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

export default router
