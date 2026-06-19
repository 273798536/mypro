import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  try {
    const {
      version,
      dateFrom,
      dateTo,
      metricType,
      hasHumanCorrection,
      hasThresholdDrift,
      page = '1',
      pageSize = '10',
    } = req.query

    const conditions: string[] = []
    const params: any[] = []

    if (version) {
      conditions.push('e.version = ?')
      params.push(version)
    }
    if (dateFrom) {
      conditions.push('e.evaluated_at >= ?')
      params.push(dateFrom)
    }
    if (dateTo) {
      conditions.push('e.evaluated_at <= ?')
      params.push(dateTo)
    }
    if (hasHumanCorrection !== undefined && hasHumanCorrection !== '') {
      conditions.push('e.has_human_correction = ?')
      params.push(Number(hasHumanCorrection))
    }
    if (hasThresholdDrift !== undefined && hasThresholdDrift !== '') {
      conditions.push('e.has_threshold_drift = ?')
      params.push(Number(hasThresholdDrift))
    }
    if (metricType) {
      conditions.push('EXISTS (SELECT 1 FROM metric_values mv WHERE mv.evaluation_id = e.id AND mv.name = ?)')
      params.push(metricType)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM evaluation_results e ${whereClause}`).get(...params) as { total: number }
    const total = totalRow.total

    const p = Math.max(1, Number(page))
    const ps = Math.max(1, Math.min(100, Number(pageSize)))
    const offset = (p - 1) * ps

    const evaluations = db.prepare(
      `SELECT e.* FROM evaluation_results e ${whereClause} ORDER BY e.evaluated_at DESC LIMIT ? OFFSET ?`
    ).all(...params, ps, offset) as any[]

    const items = evaluations.map(ev => {
      const metrics = db.prepare('SELECT * FROM metric_values WHERE evaluation_id = ?').all(ev.id) as any[]
      return {
        id: ev.id,
        sampleId: ev.sample_id,
        version: ev.version,
        evaluatedAt: ev.evaluated_at,
        hasHumanCorrection: ev.has_human_correction === 1,
        hasThresholdDrift: ev.has_threshold_drift === 1,
        rawApiResponse: ev.raw_api_response,
        source: ev.source,
        metrics: metrics.map(m => ({
          id: m.id,
          evaluationId: m.evaluation_id,
          name: m.name,
          value: m.value,
          threshold: m.threshold,
          driftRatio: m.drift_ratio,
          isDrifted: m.is_drifted === 1,
        })),
      }
    })

    const extraCond = conditions.length > 0 ? 'AND' : 'WHERE'

    const evaluatedCount = total
    const humanCorrectionCount = (db.prepare(
      `SELECT COUNT(*) as c FROM evaluation_results e ${whereClause} ${extraCond} e.has_human_correction = 1`
    ).get(...params) as any).c
    const thresholdDriftCount = (db.prepare(
      `SELECT COUNT(*) as c FROM evaluation_results e ${whereClause} ${extraCond} e.has_threshold_drift = 1`
    ).get(...params) as any).c

    const uniqueSamples = (db.prepare(
      `SELECT COUNT(DISTINCT e.sample_id) as c FROM evaluation_results e ${whereClause}`
    ).get(...params) as any).c

    const metricNames = metricType
      ? [metricType as string]
      : ['准确率', '召回率', 'F1分数', '响应时间']

    const metricSummaries = metricNames.map(name => {
      const metricWhere = conditions.length > 0
        ? `AND ${conditions.join(' AND ')}`
        : ''
      const rows = db.prepare(
        `SELECT mv.value FROM metric_values mv JOIN evaluation_results e ON mv.evaluation_id = e.id WHERE mv.name = ? ${metricWhere}`
      ).all(name, ...params) as any[]

      if (rows.length === 0) {
        return { name, mean: 0, median: 0, min: 0, max: 0 }
      }

      const values = rows.map(r => r.value).sort((a, b) => a - b)
      const sum = values.reduce((s, v) => s + v, 0)
      const mean = sum / values.length
      const median = values.length % 2 === 0
        ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
        : values[Math.floor(values.length / 2)]

      return {
        name,
        mean: Math.round(mean * 1000) / 1000,
        median: Math.round(median * 1000) / 1000,
        min: values[0],
        max: values[values.length - 1],
      }
    })

    res.json({
      total,
      statistics: {
        totalSamples: uniqueSamples,
        evaluatedCount,
        humanCorrectionCount,
        thresholdDriftCount,
        metricSummaries,
      },
      items,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params
    const evaluation = db.prepare('SELECT * FROM evaluation_results WHERE id = ?').get(id) as any

    if (!evaluation) {
      res.status(404).json({ error: 'Evaluation not found' })
      return
    }

    const metrics = db.prepare('SELECT * FROM metric_values WHERE evaluation_id = ?').all(id) as any[]
    const corrections = db.prepare('SELECT * FROM human_corrections WHERE evaluation_id = ?').all(id) as any[]

    res.json({
      id: evaluation.id,
      sampleId: evaluation.sample_id,
      version: evaluation.version,
      evaluatedAt: evaluation.evaluated_at,
      hasHumanCorrection: evaluation.has_human_correction === 1,
      hasThresholdDrift: evaluation.has_threshold_drift === 1,
      rawApiResponse: evaluation.raw_api_response,
      source: evaluation.source,
      metrics: metrics.map(m => ({
        id: m.id,
        evaluationId: m.evaluation_id,
        name: m.name,
        value: m.value,
        threshold: m.threshold,
        driftRatio: m.drift_ratio,
        isDrifted: m.is_drifted === 1,
      })),
      corrections: corrections.map(c => ({
        id: c.id,
        evaluationId: c.evaluation_id,
        metricName: c.metric_name,
        originalValue: c.original_value,
        correctedValue: c.corrected_value,
        correctedBy: c.corrected_by,
        correctedAt: c.corrected_at,
        reason: c.reason,
        source: c.source,
      })),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:sampleId/chain', (req, res) => {
  try {
    const { sampleId } = req.params
    const evaluations = db.prepare(
      'SELECT * FROM evaluation_results WHERE sample_id = ? ORDER BY evaluated_at ASC'
    ).all(sampleId) as any[]

    const chain = evaluations.map(ev => {
      const metrics = db.prepare('SELECT * FROM metric_values WHERE evaluation_id = ?').all(ev.id) as any[]
      return {
        id: ev.id,
        sampleId: ev.sample_id,
        version: ev.version,
        evaluatedAt: ev.evaluated_at,
        hasHumanCorrection: ev.has_human_correction === 1,
        hasThresholdDrift: ev.has_threshold_drift === 1,
        rawApiResponse: ev.raw_api_response,
        source: ev.source,
        metrics: metrics.map(m => ({
          id: m.id,
          evaluationId: m.evaluation_id,
          name: m.name,
          value: m.value,
          threshold: m.threshold,
          driftRatio: m.drift_ratio,
          isDrifted: m.is_drifted === 1,
        })),
      }
    })

    res.json(chain)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
