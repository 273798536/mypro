import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

function detectAnomalies(materialId: string, batchId: string, type: string, data: Record<string, unknown>) {
  const anomalyTypes: string[] = []

  if (type === 'force_sensor') {
    const zeroOffset = data.zeroOffset as number
    const sampleRate = data.sampleRate as number

    if (zeroOffset > 0.5) {
      anomalyTypes.push('zero_drift')
      const existing = db.prepare(
        "SELECT id FROM anomaly WHERE material_id = ? AND type = 'zero_drift'"
      ).get(materialId)
      if (!existing) {
        db.prepare(
          'INSERT INTO anomaly (id, batch_id, material_id, type, trigger_source, stuck_step, next_action) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(uuidv4(), batchId, materialId, 'zero_drift', 'auto_detection', 'material_upload', 'Apply zero correction or recalibrate sensor')
      }
    }

    if (sampleRate < 100) {
      anomalyTypes.push('speed_missing')
      const existing = db.prepare(
        "SELECT id FROM anomaly WHERE material_id = ? AND type = 'speed_missing'"
      ).get(materialId)
      if (!existing) {
        db.prepare(
          'INSERT INTO anomaly (id, batch_id, material_id, type, trigger_source, stuck_step, next_action) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(uuidv4(), batchId, materialId, 'speed_missing', 'auto_detection', 'material_upload', 'Increase sample rate or use alternative sensor data')
      }
    }
  }

  if (type === 'angle_of_attack') {
    const angles = data.angles as number[]
    if (angles && angles.some((a) => a > 25 || a < -10)) {
      anomalyTypes.push('angle_exceed')
      const existing = db.prepare(
        "SELECT id FROM anomaly WHERE material_id = ? AND type = 'angle_exceed'"
      ).get(materialId)
      if (!existing) {
        db.prepare(
          'INSERT INTO anomaly (id, batch_id, material_id, type, trigger_source, stuck_step, next_action) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(uuidv4(), batchId, materialId, 'angle_exceed', 'auto_detection', 'material_upload', 'Review angle of attack data, remove out-of-range points')
      }
    }
  }

  const anomalyFlag = anomalyTypes.length > 0 ? 1 : 0
  const anomalyType = anomalyTypes.length > 0 ? anomalyTypes.join(',') : null

  db.prepare(
    'UPDATE material SET anomaly_flag = ?, anomaly_type = ? WHERE id = ?'
  ).run(anomalyFlag, anomalyType, materialId)
}

router.post('/batches/:id/materials', (req: Request, res: Response) => {
  try {
    const batch = db.prepare('SELECT * FROM batch WHERE id = ?').get(req.params.id)
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' })
      return
    }

    const { type, name, data } = req.body

    if (!type || !name || !data) {
      res.status(400).json({ success: false, error: 'type, name, and data are required' })
      return
    }

    const validTypes = ['angle_of_attack', 'force_sensor', 'curve_report']
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, error: 'Invalid material type' })
      return
    }

    const id = uuidv4()
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data)

    db.prepare(
      'INSERT INTO material (id, batch_id, type, name, data) VALUES (?, ?, ?, ?, ?)'
    ).run(id, req.params.id, type, name, dataStr)

    const parsedData = JSON.parse(dataStr)
    detectAnomalies(id, req.params.id, type, parsedData)

    const material = db.prepare('SELECT * FROM material WHERE id = ?').get(id)
    res.status(201).json({ success: true, data: material })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to add material' })
  }
})

router.get('/batches/:id/materials', (req: Request, res: Response) => {
  try {
    const batch = db.prepare('SELECT * FROM batch WHERE id = ?').get(req.params.id)
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' })
      return
    }

    const materials = db.prepare('SELECT * FROM material WHERE batch_id = ?').all(req.params.id)
    res.json({ success: true, data: materials })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to list materials' })
  }
})

router.delete('/materials/:id', (req: Request, res: Response) => {
  try {
    const material = db.prepare('SELECT * FROM material WHERE id = ?').get(req.params.id)
    if (!material) {
      res.status(404).json({ success: false, error: 'Material not found' })
      return
    }

    db.prepare('DELETE FROM material WHERE id = ?').run(req.params.id)
    res.json({ success: true, data: { id: req.params.id } })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete material' })
  }
})

router.patch('/materials/:id', (req: Request, res: Response) => {
  try {
    const material = db.prepare('SELECT * FROM material WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!material) {
      res.status(404).json({ success: false, error: 'Material not found' })
      return
    }

    const { name, data } = req.body
    const updates: string[] = []
    const params: unknown[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      params.push(name)
    }
    if (data !== undefined) {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data)
      updates.push('data = ?')
      params.push(dataStr)
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' })
      return
    }

    params.push(req.params.id)
    db.prepare(`UPDATE material SET ${updates.join(', ')} WHERE id = ?`).run(...params)

    if (data !== undefined) {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data)
      const parsedData = JSON.parse(dataStr)
      detectAnomalies(req.params.id, material.batch_id as string, material.type as string, parsedData)
    }

    const updated = db.prepare('SELECT * FROM material WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: updated })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update material' })
  }
})

export default router
