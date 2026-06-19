import { Router } from 'express'
import db from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', (req, res) => {
  try {
    const { evaluationId } = req.query

    if (!evaluationId || typeof evaluationId !== 'string') {
      res.status(400).json({ error: 'evaluationId query parameter is required' })
      return
    }

    const corrections = db.prepare(
      'SELECT * FROM human_corrections WHERE evaluation_id = ? ORDER BY corrected_at DESC'
    ).all(evaluationId) as any[]

    res.json(corrections.map(c => ({
      id: c.id,
      evaluationId: c.evaluation_id,
      metricName: c.metric_name,
      originalValue: c.original_value,
      correctedValue: c.corrected_value,
      correctedBy: c.corrected_by,
      correctedAt: c.corrected_at,
      reason: c.reason,
      source: c.source,
    })))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', (req, res) => {
  try {
    const { evaluationId, metricName, originalValue, correctedValue, correctedBy, reason, source } = req.body

    if (!evaluationId || !metricName || originalValue === undefined || correctedValue === undefined || !correctedBy || !source) {
      res.status(400).json({ error: 'Missing required fields: evaluationId, metricName, originalValue, correctedValue, correctedBy, source' })
      return
    }

    const evaluation = db.prepare('SELECT * FROM evaluation_results WHERE id = ?').get(evaluationId) as any
    if (!evaluation) {
      res.status(404).json({ error: 'Evaluation not found' })
      return
    }

    const id = randomUUID()
    const correctedAt = new Date().toISOString()

    const insertCorrection = db.prepare(
      'INSERT INTO human_corrections (id, evaluation_id, metric_name, original_value, corrected_value, corrected_by, corrected_at, reason, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const updateEval = db.prepare(
      'UPDATE evaluation_results SET has_human_correction = 1 WHERE id = ?'
    )

    const transaction = db.transaction(() => {
      insertCorrection.run(id, evaluationId, metricName, originalValue, correctedValue, correctedBy, correctedAt, reason || null, source)
      updateEval.run(evaluationId)
    })

    transaction()

    res.status(201).json({
      id,
      evaluationId,
      metricName,
      originalValue,
      correctedValue,
      correctedBy,
      correctedAt,
      reason: reason || null,
      source,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
