import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

router.get('/batches/:id/report', (req: Request, res: Response) => {
  try {
    const batch = db.prepare('SELECT * FROM batch WHERE id = ?').get(req.params.id)
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' })
      return
    }

    const materials = db.prepare('SELECT * FROM material WHERE batch_id = ?').all(req.params.id)
    const anomalies = db.prepare('SELECT * FROM anomaly WHERE batch_id = ?').all(req.params.id)
    const calculation = db.prepare('SELECT * FROM lift_drag_result WHERE batch_id = ?').get(req.params.id)

    const zeroCorrectionSpecs = anomalies
      .filter((a: Record<string, unknown>) => a.zero_correction_spec)
      .map((a: Record<string, unknown>) => ({
        anomaly_id: a.id,
        type: a.type,
        zero_correction_spec: a.zero_correction_spec,
        status: a.status
      }))

    res.json({
      success: true,
      data: {
        batch,
        materials,
        calculation: calculation || null,
        anomalies,
        zero_correction_specs: zeroCorrectionSpecs
      }
    })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get report preview' })
  }
})

router.post('/batches/:id/report/export', (req: Request, res: Response) => {
  try {
    const batch = db.prepare('SELECT * FROM batch WHERE id = ?').get(req.params.id)
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' })
      return
    }

    const { include_zero_correction, include_anomaly_record } = req.body

    const id = uuidv4()
    db.prepare(
      'INSERT INTO report (id, batch_id, include_zero_correction, include_anomaly_record) VALUES (?, ?, ?, ?)'
    ).run(
      id,
      req.params.id,
      include_zero_correction !== undefined ? (include_zero_correction ? 1 : 0) : 1,
      include_anomaly_record !== undefined ? (include_anomaly_record ? 1 : 0) : 1
    )

    const report = db.prepare('SELECT * FROM report WHERE id = ?').get(id)
    res.status(201).json({ success: true, data: report })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to export report' })
  }
})

export default router
