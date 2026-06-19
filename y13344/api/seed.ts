import db from './db.js'
import { randomUUID } from 'crypto'

const METRIC_NAMES = ['准确率', '召回率', 'F1分数', '响应时间']

const THRESHOLDS: Record<string, Record<string, number>> = {
  'v1.0': { '准确率': 0.80, '召回率': 0.75, 'F1分数': 0.77, '响应时间': 300 },
  'v1.1': { '准确率': 0.82, '召回率': 0.78, 'F1分数': 0.79, '响应时间': 280 },
  'v2.0': { '准确率': 0.85, '召回率': 0.80, 'F1分数': 0.82, '响应时间': 250 },
}

function rand(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 1000) / 1000
}

function generateMetricValues(evaluationId: string, version: string) {
  const thresholds = THRESHOLDS[version]
  return METRIC_NAMES.map(name => {
    const threshold = thresholds[name]
    let value: number
    if (name === '响应时间') {
      value = rand(120, 350)
    } else {
      value = rand(0.75, 0.95)
    }
    const driftRatio = Math.round(((value - threshold) / threshold) * 1000) / 1000
    const isDrifted = name === '响应时间'
      ? (value > threshold ? 1 : 0)
      : (value < threshold ? 1 : 0)
    return {
      id: randomUUID(),
      evaluation_id: evaluationId,
      name,
      value,
      threshold,
      drift_ratio: driftRatio,
      is_drifted: isDrifted,
    }
  })
}

export function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as c FROM version_snapshots').get() as { c: number }
  if (count.c > 0) return

  const insertSnapshot = db.prepare(
    'INSERT INTO version_snapshots (id, version, created_at, description) VALUES (?, ?, ?, ?)'
  )
  const insertEval = db.prepare(
    'INSERT INTO evaluation_results (id, sample_id, version, evaluated_at, has_human_correction, has_threshold_drift, raw_api_response, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const insertMetric = db.prepare(
    'INSERT INTO metric_values (id, evaluation_id, name, value, threshold, drift_ratio, is_drifted) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const insertCorrection = db.prepare(
    'INSERT INTO human_corrections (id, evaluation_id, metric_name, original_value, corrected_value, corrected_by, corrected_at, reason, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const insertThreshold = db.prepare(
    'INSERT INTO threshold_configs (id, metric_name, threshold, version, updated_at) VALUES (?, ?, ?, ?, ?)'
  )

  const transaction = db.transaction(() => {
    const versions = [
      { id: randomUUID(), version: 'v1.0', created_at: '2025-06-01T10:00:00Z', description: '初始版本，基线评测' },
      { id: randomUUID(), version: 'v1.1', created_at: '2025-06-10T10:00:00Z', description: '模型微调，阈值调整' },
      { id: randomUUID(), version: 'v2.0', created_at: '2025-06-20T10:00:00Z', description: '大版本升级，新模型架构' },
    ]
    for (const v of versions) {
      insertSnapshot.run(v.id, v.version, v.created_at, v.description)
    }

    const sampleIds = Array.from({ length: 15 }, (_, i) => `sample-${String(i + 1).padStart(3, '0')}`)

    const evalDateBase = {
      'v1.0': '2025-06-02',
      'v1.1': '2025-06-11',
      'v2.0': '2025-06-21',
    }

    const correctionCandidates: string[] = []
    const driftCandidates: string[] = []

    const evaluations: {
      id: string
      sample_id: string
      version: string
      evaluated_at: string
      has_human_correction: number
      has_threshold_drift: number
      metrics: ReturnType<typeof generateMetricValues>
    }[] = []

    for (const version of ['v1.0', 'v1.1', 'v2.0']) {
      const versionSamples = version === 'v1.0'
        ? sampleIds.slice(0, 10)
        : version === 'v1.1'
          ? sampleIds.slice(3, 13)
          : sampleIds.slice(0, 12)

      for (let i = 0; i < versionSamples.length; i++) {
        const evalId = randomUUID()
        const day = String(Math.min(i + 1, 28)).padStart(2, '0')
        const evaluatedAt = `${evalDateBase[version]}T${String(8 + (i % 10)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00Z`
        const hasHumanCorrection = (i % 5 === 0) ? 1 : 0
        const hasThresholdDrift = (i % 4 === 0) ? 1 : 0
        const metrics = generateMetricValues(evalId, version)
        const source = hasHumanCorrection ? '人工复核' : '自动评测'

        if (hasHumanCorrection) correctionCandidates.push(evalId)
        if (hasThresholdDrift) driftCandidates.push(evalId)

        const rawResponse = JSON.stringify({
          sampleId: versionSamples[i],
          version,
          metrics: metrics.map(m => ({ name: m.name, value: m.value, threshold: m.threshold })),
          evaluatedAt,
        })

        evaluations.push({
          id: evalId,
          sample_id: versionSamples[i],
          version,
          evaluated_at: evaluatedAt,
          has_human_correction: hasHumanCorrection,
          has_threshold_drift: hasThresholdDrift,
          metrics,
        })

        insertEval.run(evalId, versionSamples[i], version, evaluatedAt, hasHumanCorrection, hasThresholdDrift, rawResponse, source)

        for (const m of metrics) {
          insertMetric.run(m.id, m.evaluation_id, m.name, m.value, m.threshold, m.drift_ratio, m.is_drifted)
        }
      }
    }

    for (const evalId of correctionCandidates) {
      const evaluation = evaluations.find(e => e.id === evalId)!
      const driftedMetrics = evaluation.metrics.filter(m => m.is_drifted === 1)
      const metricToCorrect = driftedMetrics.length > 0 ? driftedMetrics[0] : evaluation.metrics[0]
      const correctedBy = Math.random() > 0.5 ? '张老师' : '李老师'
      const correctedValue = metricToCorrect.name === '响应时间'
        ? Math.max(100, metricToCorrect.value - rand(30, 80))
        : Math.min(1.0, metricToCorrect.value + rand(0.02, 0.08))
      const reason = metricToCorrect.name === '响应时间'
        ? '人工确认响应时间在可接受范围内'
        : '人工复核后修正评测结果'
      insertCorrection.run(
        randomUUID(),
        evalId,
        metricToCorrect.name,
        metricToCorrect.value,
        correctedValue,
        correctedBy,
        evaluation.evaluated_at,
        reason,
        '人工复核'
      )
    }

    for (const [version, thresholds] of Object.entries(THRESHOLDS)) {
      for (const [metricName, threshold] of Object.entries(thresholds)) {
        const snap = versions.find(v => v.version === version)!
        insertThreshold.run(randomUUID(), metricName, threshold, version, snap.created_at)
      }
    }
  })

  transaction()
}
