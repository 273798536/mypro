import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import db from '../db.js'

const router = Router()

function jsonParse(val: string | null | undefined): any {
  if (!val) return null
  try { return JSON.parse(val) } catch { return val }
}

router.get('/', (req: Request, res: Response): void => {
  const { studentName, dateFrom, dateTo, status, page = '1', pageSize = '10' } = req.query

  let sql = 'SELECT * FROM practice_records WHERE 1=1'
  const params: any[] = []

  if (studentName) {
    sql += ' AND student_name LIKE ?'
    params.push(`%${studentName}%`)
  }
  if (dateFrom) {
    sql += ' AND practice_date >= ?'
    params.push(dateFrom)
  }
  if (dateTo) {
    sql += ' AND practice_date <= ?'
    params.push(dateTo)
  }
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM (${sql})`).get(...params) as { total: number }
  const total = countRow.total

  const p = Math.max(1, Number(page))
  const ps = Math.max(1, Math.min(100, Number(pageSize)))
  const offset = (p - 1) * ps

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(ps, offset)

  const records = db.prepare(sql).all(...params) as any[]

  res.json({ success: true, data: { records, total, page: p, pageSize: ps } })
})

router.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params

  const record = db.prepare('SELECT * FROM practice_records WHERE id = ?').get(id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '练习记录不存在' })
    return
  }

  const rhythm = db.prepare('SELECT * FROM rhythm_detections WHERE practice_id = ?').get(id) as any
  const tier = db.prepare('SELECT * FROM speed_tiers WHERE practice_id = ?').get(id) as any
  const beat = db.prepare('SELECT * FROM beat_markers WHERE practice_id = ?').get(id) as any
  const conflicts = db.prepare('SELECT * FROM conflicts WHERE practice_id = ? ORDER BY created_at').all(id) as any[]
  const corrections = db.prepare('SELECT * FROM corrections WHERE practice_id = ? ORDER BY created_at').all(id) as any[]
  const evidenceMappings = db.prepare('SELECT * FROM evidence_mappings WHERE practice_id = ? ORDER BY audio_start_time').all(id) as any[]
  const report = db.prepare('SELECT * FROM practice_reports WHERE practice_id = ?').get(id) as any

  if (rhythm) rhythm.raw_data = jsonParse(rhythm.raw_data)
  if (tier) tier.tiers = jsonParse(tier.tiers)
  if (beat) beat.markers = jsonParse(beat.markers)
  for (const c of conflicts) {
    c.involved_evidence = jsonParse(c.involved_evidence)
    c.event_order = jsonParse(c.event_order)
  }
  if (report) report.evidence_correspondence = jsonParse(report.evidence_correspondence)

  res.json({
    success: true,
    data: {
      ...record,
      rhythm_detection: rhythm || null,
      speed_tier: tier || null,
      beat_markers: beat || null,
      conflicts,
      corrections,
      evidence_mappings: evidenceMappings,
      report: report || null,
    },
  })
})

router.put('/:id/rhythm', (req: Request, res: Response): void => {
  const { id } = req.params
  const { detected_bpm, confidence_score, detection_method, raw_data } = req.body

  const record = db.prepare('SELECT * FROM practice_records WHERE id = ?').get(id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '练习记录不存在' })
    return
  }

  const existing = db.prepare('SELECT * FROM rhythm_detections WHERE practice_id = ?').get(id) as any

  const tx = db.transaction(() => {
    if (existing) {
      const oldVal = JSON.stringify({ detected_bpm: existing.detected_bpm, confidence_score: existing.confidence_score })
      const newVal = JSON.stringify({ detected_bpm, confidence_score })

      db.prepare(`UPDATE rhythm_detections SET detected_bpm = ?, confidence_score = ?, detection_method = ?, raw_data = ? WHERE practice_id = ?`)
        .run(detected_bpm, confidence_score, detection_method || existing.detection_method, JSON.stringify(raw_data), id)

      db.prepare(`INSERT INTO corrections (id, practice_id, field, old_value, new_value, reason, operator) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(crypto.randomUUID(), id, 'rhythm_detection', oldVal, newVal, '更新节奏检测结果', 'system')

      db.prepare(`UPDATE practice_records SET updated_at = datetime('now'), status = 'corrected' WHERE id = ?`).run(id)
    } else {
      db.prepare(`INSERT INTO rhythm_detections (id, practice_id, detected_bpm, confidence_score, detection_method, raw_data) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(crypto.randomUUID(), id, detected_bpm, confidence_score, detection_method, JSON.stringify(raw_data))

      db.prepare(`UPDATE practice_records SET updated_at = datetime('now') WHERE id = ?`).run(id)
    }
  })

  tx()
  res.json({ success: true, data: { detected_bpm, confidence_score } })
})

router.put('/:id/speed-tier', (req: Request, res: Response): void => {
  const { id } = req.params
  const { tiers, methodology } = req.body

  const record = db.prepare('SELECT * FROM practice_records WHERE id = ?').get(id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '练习记录不存在' })
    return
  }

  const existing = db.prepare('SELECT * FROM speed_tiers WHERE practice_id = ?').get(id) as any

  const tx = db.transaction(() => {
    if (existing) {
      const oldVal = existing.tiers
      const newVal = JSON.stringify(tiers)

      db.prepare(`UPDATE speed_tiers SET tiers = ?, methodology = ? WHERE practice_id = ?`)
        .run(JSON.stringify(tiers), methodology || existing.methodology, id)

      db.prepare(`INSERT INTO corrections (id, practice_id, field, old_value, new_value, reason, operator) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(crypto.randomUUID(), id, 'speed_tier', oldVal, newVal, '更新速度阶梯', 'system')

      db.prepare(`UPDATE practice_records SET updated_at = datetime('now'), status = 'corrected' WHERE id = ?`).run(id)
    } else {
      db.prepare(`INSERT INTO speed_tiers (id, practice_id, tiers, methodology) VALUES (?, ?, ?, ?)`)
        .run(crypto.randomUUID(), id, JSON.stringify(tiers), methodology)

      db.prepare(`UPDATE practice_records SET updated_at = datetime('now') WHERE id = ?`).run(id)
    }
  })

  tx()
  res.json({ success: true, data: { tiers, methodology } })
})

router.put('/:id/beat-markers', (req: Request, res: Response): void => {
  const { id } = req.params
  const { markers } = req.body

  const record = db.prepare('SELECT * FROM practice_records WHERE id = ?').get(id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '练习记录不存在' })
    return
  }

  const existing = db.prepare('SELECT * FROM beat_markers WHERE practice_id = ?').get(id) as any

  const tx = db.transaction(() => {
    if (existing) {
      const oldVal = existing.markers
      const newVal = JSON.stringify(markers)

      db.prepare(`UPDATE beat_markers SET markers = ? WHERE practice_id = ?`)
        .run(JSON.stringify(markers), id)

      db.prepare(`INSERT INTO corrections (id, practice_id, field, old_value, new_value, reason, operator) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(crypto.randomUUID(), id, 'beat_markers', oldVal, newVal, '更新节拍标记', 'system')

      db.prepare(`UPDATE practice_records SET updated_at = datetime('now'), status = 'corrected' WHERE id = ?`).run(id)
    } else {
      db.prepare(`INSERT INTO beat_markers (id, practice_id, markers) VALUES (?, ?, ?)`)
        .run(crypto.randomUUID(), id, JSON.stringify(markers))

      db.prepare(`UPDATE practice_records SET updated_at = datetime('now') WHERE id = ?`).run(id)
    }
  })

  tx()
  res.json({ success: true, data: { markers } })
})

router.get('/:id/conflicts', (req: Request, res: Response): void => {
  const { id } = req.params

  const record = db.prepare('SELECT id FROM practice_records WHERE id = ?').get(id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '练习记录不存在' })
    return
  }

  const conflicts = db.prepare('SELECT * FROM conflicts WHERE practice_id = ? ORDER BY created_at').all(id) as any[]

  for (const c of conflicts) {
    c.involved_evidence = jsonParse(c.involved_evidence)
    c.event_order = jsonParse(c.event_order)
  }

  res.json({ success: true, data: conflicts })
})

router.post('/:id/conflicts/:conflictId/flag', (req: Request, res: Response): void => {
  const { id, conflictId } = req.params

  const conflict = db.prepare('SELECT * FROM conflicts WHERE id = ? AND practice_id = ?').get(conflictId, id) as any
  if (!conflict) {
    res.status(404).json({ success: false, error: '冲突不存在' })
    return
  }

  db.prepare(`UPDATE conflicts SET status = 'flagged' WHERE id = ?`).run(conflictId)

  res.json({ success: true, data: { id: conflictId, status: 'flagged' } })
})

router.post('/:id/conflicts/:conflictId/resolve', (req: Request, res: Response): void => {
  const { id, conflictId } = req.params
  const { resolvedBy } = req.body

  const conflict = db.prepare('SELECT * FROM conflicts WHERE id = ? AND practice_id = ?').get(conflictId, id) as any
  if (!conflict) {
    res.status(404).json({ success: false, error: '冲突不存在' })
    return
  }

  db.prepare(`UPDATE conflicts SET status = 'resolved', resolved_by = ?, resolved_at = datetime('now') WHERE id = ?`)
    .run(resolvedBy || 'system', conflictId)

  res.json({ success: true, data: { id: conflictId, status: 'resolved', resolvedBy: resolvedBy || 'system' } })
})

router.get('/:id/corrections', (req: Request, res: Response): void => {
  const { id } = req.params

  const record = db.prepare('SELECT id FROM practice_records WHERE id = ?').get(id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '练习记录不存在' })
    return
  }

  const corrections = db.prepare('SELECT * FROM corrections WHERE practice_id = ? ORDER BY created_at').all(id) as any[]

  res.json({ success: true, data: corrections })
})

router.post('/:id/corrections', (req: Request, res: Response): void => {
  const { id } = req.params
  const { field, oldValue, newValue, reason, operator } = req.body

  const record = db.prepare('SELECT id FROM practice_records WHERE id = ?').get(id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '练习记录不存在' })
    return
  }

  const correctionId = crypto.randomUUID()

  db.prepare(`INSERT INTO corrections (id, practice_id, field, old_value, new_value, reason, operator) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(correctionId, id, field, String(oldValue), String(newValue), reason, operator)

  db.prepare(`UPDATE practice_records SET updated_at = datetime('now'), status = 'corrected' WHERE id = ?`).run(id)

  res.json({ success: true, data: { id: correctionId, field, oldValue, newValue, reason, operator } })
})

router.get('/:id/evidence-mapping', (req: Request, res: Response): void => {
  const { id } = req.params

  const record = db.prepare('SELECT id FROM practice_records WHERE id = ?').get(id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '练习记录不存在' })
    return
  }

  const mappings = db.prepare('SELECT * FROM evidence_mappings WHERE practice_id = ? ORDER BY audio_start_time').all(id) as any[]

  res.json({ success: true, data: mappings })
})

router.get('/:id/report', (req: Request, res: Response): void => {
  const { id } = req.params

  const record = db.prepare('SELECT id FROM practice_records WHERE id = ?').get(id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '练习记录不存在' })
    return
  }

  const report = db.prepare('SELECT * FROM practice_reports WHERE practice_id = ?').get(id) as any
  if (!report) {
    res.status(404).json({ success: false, error: '报告尚未生成' })
    return
  }

  report.evidence_correspondence = jsonParse(report.evidence_correspondence)

  res.json({ success: true, data: report })
})

router.post('/:id/report', (req: Request, res: Response): void => {
  const { id } = req.params
  const { methodologyNote, evidenceCorrespondence, format } = req.body

  const record = db.prepare('SELECT id FROM practice_records WHERE id = ?').get(id) as any
  if (!record) {
    res.status(404).json({ success: false, error: '练习记录不存在' })
    return
  }

  const existing = db.prepare('SELECT * FROM practice_reports WHERE practice_id = ?').get(id) as any

  if (existing) {
    db.prepare(`UPDATE practice_reports SET methodology_note = ?, evidence_correspondence = ?, format = ?, generated_at = datetime('now') WHERE practice_id = ?`)
      .run(methodologyNote || existing.methodology_note, JSON.stringify(evidenceCorrespondence || jsonParse(existing.evidence_correspondence)), format || existing.format, id)

    res.json({ success: true, data: { practice_id: id, updated: true } })
  } else {
    const reportId = crypto.randomUUID()

    db.prepare(`INSERT INTO practice_reports (id, practice_id, methodology_note, evidence_correspondence, format) VALUES (?, ?, ?, ?, ?)`)
      .run(reportId, id, methodologyNote || '', JSON.stringify(evidenceCorrespondence || []), format || 'pdf')

    res.json({ success: true, data: { id: reportId, practice_id: id } })
  }
})

export default router
