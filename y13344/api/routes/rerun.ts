import { Router } from 'express'
import db from '../db.js'
import { randomUUID } from 'crypto'

const router = Router()

router.post('/rerun', (req, res) => {
  try {
    const { version, sampleIds } = req.body

    if (!version) {
      res.status(400).json({ error: 'version is required' })
      return
    }

    const rerunId = randomUUID()

    res.json({
      rerunId,
      status: 'completed',
      version,
      sampleIds: sampleIds || [],
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/rerun/:rerunId', (req, res) => {
  try {
    const { rerunId } = req.params

    res.json({
      rerunId,
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/export', (req, res) => {
  try {
    const body = req.body
    const format = body.format || 'json'
    const filter = body.filter || {}
    const { version, dateFrom, dateTo, metricType, hasHumanCorrection, hasThresholdDrift } = filter

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
    if (metricType) {
      conditions.push('EXISTS (SELECT 1 FROM metric_values mv WHERE mv.evaluation_id = e.id AND mv.name = ?)')
      params.push(metricType)
    }
    if (hasHumanCorrection !== undefined && hasHumanCorrection !== '') {
      conditions.push('e.has_human_correction = ?')
      params.push(Number(hasHumanCorrection))
    }
    if (hasThresholdDrift !== undefined && hasThresholdDrift !== '') {
      conditions.push('e.has_threshold_drift = ?')
      params.push(Number(hasThresholdDrift))
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const evaluations = db.prepare(
      `SELECT e.* FROM evaluation_results e ${whereClause} ORDER BY e.evaluated_at DESC`
    ).all(...params) as any[]

    const items = evaluations.map(ev => {
      const metrics = db.prepare('SELECT * FROM metric_values WHERE evaluation_id = ?').all(ev.id) as any[]
      return {
        id: ev.id,
        sampleId: ev.sample_id,
        version: ev.version,
        evaluatedAt: ev.evaluated_at,
        hasHumanCorrection: ev.has_human_correction === 1,
        hasThresholdDrift: ev.has_threshold_drift === 1,
        source: ev.source,
        metrics: metrics.map(m => ({
          name: m.name,
          value: m.value,
          threshold: m.threshold,
          driftRatio: m.drift_ratio,
          isDrifted: m.is_drifted === 1,
        })),
      }
    })

    if (format === 'csv') {
      const header = 'id,sampleId,version,evaluatedAt,source,metricName,value,threshold,driftRatio,isDrifted'
      const rows = items.flatMap(item =>
        item.metrics.map((m: any) =>
          `${item.id},${item.sampleId},${item.version},${item.evaluatedAt},${item.source},${m.name},${m.value},${m.threshold},${m.driftRatio},${m.isDrifted}`
        )
      )
      const csv = [header, ...rows].join('\n')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=evaluations.csv')
      res.send(csv)
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename=evaluations.json')
      res.json(items)
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/versions', (req, res) => {
  try {
    const versions = db.prepare(
      'SELECT * FROM version_snapshots ORDER BY created_at ASC'
    ).all() as any[]

    res.json(versions.map(v => ({
      id: v.id,
      version: v.version,
      createdAt: v.created_at,
      description: v.description,
    })))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
