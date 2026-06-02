import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

const RHO = 1.225
const V = 60
const S = 1.0
const Q = 0.5 * RHO * V * V * S

router.post('/batches/:id/calculate', (req: Request, res: Response) => {
  try {
    const batch = db.prepare('SELECT * FROM batch WHERE id = ?').get(req.params.id)
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' })
      return
    }

    const materials = db.prepare('SELECT * FROM material WHERE batch_id = ?').all(req.params.id) as Record<string, unknown>[]

    const angleMaterial = materials.find((m) => m.type === 'angle_of_attack')
    const forceMaterial = materials.find((m) => m.type === 'force_sensor')

    if (!angleMaterial || !forceMaterial) {
      res.status(400).json({ success: false, error: 'Both angle_of_attack and force_sensor materials are required' })
      return
    }

    const angleData = JSON.parse(angleMaterial.data as string)
    const forceData = JSON.parse(forceMaterial.data as string)

    const angles: number[] = angleData.angles || []
    const liftForce: number[] = forceData.liftForce || []
    const dragForce: number[] = forceData.dragForce || []
    const zeroOffset: number = forceData.zeroOffset || 0

    if (angles.length !== liftForce.length || angles.length !== dragForce.length) {
      res.status(400).json({ success: false, error: 'Data length mismatch between angles and forces' })
      return
    }

    const resolvedAnomalies = db.prepare(
      "SELECT * FROM anomaly WHERE batch_id = ? AND status = 'resolved' AND zero_correction_spec IS NOT NULL"
    ).all(req.params.id) as Record<string, unknown>[]

    let additionalCorrection = 0
    const correctionNotes: string[] = []

    if (zeroOffset > 0) {
      correctionNotes.push(`Applied zeroOffset correction: ${zeroOffset}N`)
    }

    for (const anomaly of resolvedAnomalies) {
      const spec = parseFloat(anomaly.zero_correction_spec as string)
      if (!isNaN(spec)) {
        additionalCorrection += spec
        correctionNotes.push(`Applied zeroCorrectionSpec from anomaly ${anomaly.id}: ${spec}N`)
      }
    }

    const totalCorrection = zeroOffset + additionalCorrection
    const zeroCorrectionApplied = totalCorrection > 0 ? 1 : 0

    const points = angles.map((alpha, i) => ({
      alpha,
      Cl: parseFloat(((liftForce[i] - totalCorrection) / Q).toFixed(4)),
      Cd: parseFloat(((dragForce[i] - totalCorrection) / Q).toFixed(4))
    }))

    const calculationNote = correctionNotes.length > 0
      ? correctionNotes.join('; ')
      : 'No corrections applied'

    const existing = db.prepare('SELECT * FROM lift_drag_result WHERE batch_id = ?').get(req.params.id)

    if (existing) {
      db.prepare(
        `UPDATE lift_drag_result SET points = ?, zero_correction_applied = ?, zero_correction_value = ?, calculation_note = ?, calculated_at = datetime('now') WHERE batch_id = ?`
      ).run(JSON.stringify(points), zeroCorrectionApplied, totalCorrection, calculationNote, req.params.id)
    } else {
      db.prepare(
        `INSERT INTO lift_drag_result (id, batch_id, points, zero_correction_applied, zero_correction_value, calculation_note) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), req.params.id, JSON.stringify(points), zeroCorrectionApplied, totalCorrection, calculationNote)
    }

    const result = db.prepare('SELECT * FROM lift_drag_result WHERE batch_id = ?').get(req.params.id)
    res.json({ success: true, data: result })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to calculate lift/drag' })
  }
})

router.get('/batches/:id/calculate', (req: Request, res: Response) => {
  try {
    const batch = db.prepare('SELECT * FROM batch WHERE id = ?').get(req.params.id)
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' })
      return
    }

    const result = db.prepare('SELECT * FROM lift_drag_result WHERE batch_id = ?').get(req.params.id)
    if (!result) {
      res.status(404).json({ success: false, error: 'Calculation result not found' })
      return
    }

    res.json({ success: true, data: result })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get calculation result' })
  }
})

export default router
