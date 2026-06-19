import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  try {
    const { previous, current } = req.query

    if (!previous || !current) {
      res.status(400).json({ error: 'Both previous and current version query parameters are required' })
      return
    }

    const prevVersion = String(previous)
    const currVersion = String(current)

    const metricNames = ['准确率', '召回率', 'F1分数', '响应时间']

    const metricDiffs = metricNames.map(name => {
      const prevRows = db.prepare(
        `SELECT mv.value FROM metric_values mv JOIN evaluation_results e ON mv.evaluation_id = e.id WHERE e.version = ? AND mv.name = ?`
      ).all(prevVersion, name) as any[]
      const currRows = db.prepare(
        `SELECT mv.value FROM metric_values mv JOIN evaluation_results e ON mv.evaluation_id = e.id WHERE e.version = ? AND mv.name = ?`
      ).all(currVersion, name) as any[]

      const prevMean = prevRows.length > 0 ? prevRows.reduce((s, r) => s + r.value, 0) / prevRows.length : 0
      const currMean = currRows.length > 0 ? currRows.reduce((s, r) => s + r.value, 0) / currRows.length : 0
      const change = currMean - prevMean
      const changePercent = prevMean !== 0 ? (change / prevMean) * 100 : 0

      return {
        name,
        previous: Math.round(prevMean * 1000) / 1000,
        current: Math.round(currMean * 1000) / 1000,
        change: Math.round(change * 1000) / 1000,
        changePercent: Math.round(changePercent * 100) / 100,
      }
    })

    const prevSamples = db.prepare(
      'SELECT DISTINCT sample_id FROM evaluation_results WHERE version = ?'
    ).all(prevVersion).map((r: any) => r.sample_id)
    const currSamples = db.prepare(
      'SELECT DISTINCT sample_id FROM evaluation_results WHERE version = ?'
    ).all(currVersion).map((r: any) => r.sample_id)

    const prevSet = new Set(prevSamples)
    const currSet = new Set(currSamples)

    const added = currSamples.filter(s => !prevSet.has(s))
    const removed = prevSamples.filter(s => !currSet.has(s))
    const common = prevSamples.filter(s => currSet.has(s))

    const changed: any[] = []
    for (const sampleId of common) {
      const prevEvals = db.prepare(
        'SELECT e.id FROM evaluation_results e WHERE e.sample_id = ? AND e.version = ?'
      ).all(sampleId, prevVersion) as any[]
      const currEvals = db.prepare(
        'SELECT e.id FROM evaluation_results e WHERE e.sample_id = ? AND e.version = ?'
      ).all(sampleId, currVersion) as any[]

      for (const metricName of metricNames) {
        const prevMetric = db.prepare(
          'SELECT mv.value FROM metric_values mv WHERE mv.evaluation_id = ? AND mv.name = ?'
        ).get(prevEvals[0].id, metricName) as any
        const currMetric = db.prepare(
          'SELECT mv.value FROM metric_values mv WHERE mv.evaluation_id = ? AND mv.name = ?'
        ).get(currEvals[0].id, metricName) as any

        if (prevMetric && currMetric && prevMetric.value !== currMetric.value) {
          changed.push({
            sampleId,
            metricName,
            previousValue: prevMetric.value,
            currentValue: currMetric.value,
          })
        }
      }
    }

    const thresholdChanges = metricNames.map(name => {
      const prevThreshold = db.prepare(
        'SELECT threshold FROM threshold_configs WHERE metric_name = ? AND version = ?'
      ).get(name, prevVersion) as any
      const currThreshold = db.prepare(
        'SELECT threshold FROM threshold_configs WHERE metric_name = ? AND version = ?'
      ).get(name, currVersion) as any

      const p = prevThreshold ? prevThreshold.threshold : 0
      const c = currThreshold ? currThreshold.threshold : 0
      const driftMagnitude = c - p

      return {
        metricName: name,
        previousThreshold: p,
        currentThreshold: c,
        driftDirection: driftMagnitude > 0 ? 'up' : driftMagnitude < 0 ? 'down' : 'none',
        driftMagnitude: Math.round(driftMagnitude * 1000) / 1000,
      }
    })

    const prevCorrections = db.prepare(
      `SELECT hc.* FROM human_corrections hc JOIN evaluation_results e ON hc.evaluation_id = e.id WHERE e.version = ?`
    ).all(prevVersion) as any[]
    const currCorrections = db.prepare(
      `SELECT hc.* FROM human_corrections hc JOIN evaluation_results e ON hc.evaluation_id = e.id WHERE e.version = ?`
    ).all(currVersion) as any[]

    const prevCorrIds = new Set(prevCorrections.map(c => c.id))
    const currCorrIds = new Set(currCorrections.map(c => c.id))

    const addedCorrections = currCorrections.filter(c => !prevCorrIds.has(c.id)).map(c => ({
      id: c.id,
      evaluationId: c.evaluation_id,
      metricName: c.metric_name,
      originalValue: c.original_value,
      correctedValue: c.corrected_value,
      correctedBy: c.corrected_by,
      correctedAt: c.corrected_at,
      reason: c.reason,
      source: c.source,
    }))
    const removedCorrections = prevCorrections.filter(c => !currCorrIds.has(c.id)).map(c => ({
      id: c.id,
      evaluationId: c.evaluation_id,
      metricName: c.metric_name,
      originalValue: c.original_value,
      correctedValue: c.corrected_value,
      correctedBy: c.corrected_by,
      correctedAt: c.corrected_at,
      reason: c.reason,
      source: c.source,
    }))

    res.json({
      previousVersion: prevVersion,
      currentVersion: currVersion,
      metricDiffs,
      sampleChanges: { added, removed, changed },
      thresholdChanges,
      correctionDiffs: {
        added: addedCorrections,
        removed: removedCorrections,
        modified: [],
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
