import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'
import { computeSegmentedRegression, computeSensitivity, type DataPoint, type RegressionParams } from '../regression.js'

interface SessionRow {
  id: string
  name: string
  status: string
  params: string
  result: string
  created_at: string
  updated_at: string
}

interface MaterialRow {
  id: string
  session_id: string
  type: string
  content: string
  version: number
  is_active: number
  created_at: string
}

interface HistoryRow {
  id: string
  session_id: string
  action: string
  details: string
  created_at: string
}

interface DataPointRow {
  id: string
  session_id: string
  x: number
  y: number
  unit: string | null
  sort_order: number
  created_at: string
}

const router = Router()

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

router.get('/sessions', (_req: Request, res: Response): void => {
  const db = getDb()
  const sessions = db.prepare(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM materials WHERE session_id = s.id AND is_active = 1) as active_materials
    FROM sessions s ORDER BY updated_at DESC
  `).all() as (SessionRow & { active_materials: number })[]
  res.json({ success: true, data: sessions })
})

router.get('/sessions/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id) as SessionRow | undefined
  if (!session) {
    res.status(404).json({ success: false, error: '会话不存在' })
    return
  }
  const materials = db.prepare('SELECT * FROM materials WHERE session_id = ? ORDER BY created_at').all(req.params.id) as MaterialRow[]
  const history = db.prepare('SELECT * FROM history WHERE session_id = ? ORDER BY created_at DESC').all(req.params.id) as HistoryRow[]
  res.json({ success: true, data: { ...session, materials, history } })
})

router.post('/sessions', (req: Request, res: Response): void => {
  const db = getDb()
  const id = generateId()
  const { name = '新建分段回归会话', params = {} } = req.body
  db.prepare('INSERT INTO sessions (id, name, params) VALUES (?, ?, ?)').run(id, name, JSON.stringify(params))

  db.prepare('INSERT INTO history (id, session_id, action, details) VALUES (?, ?, ?, ?)').run(
    generateId(), id, 'create_session', JSON.stringify({ name })
  )

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow
  res.json({ success: true, data: session })
})

router.put('/sessions/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const { name, params } = req.body
  const existing = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id) as SessionRow | undefined
  if (!existing) {
    res.status(404).json({ success: false, error: '会话不存在' })
    return
  }

  if (name !== undefined) {
    db.prepare('UPDATE sessions SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, req.params.id)
  }
  if (params !== undefined) {
    db.prepare('UPDATE sessions SET params = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
      JSON.stringify(params), req.params.id
    )
    db.prepare('INSERT INTO history (id, session_id, action, details) VALUES (?, ?, ?, ?)').run(
      generateId(), req.params.id, 'update_params', JSON.stringify({ params })
    )
  }

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id) as SessionRow
  res.json({ success: true, data: session })
})

router.delete('/sessions/:id', (req: Request, res: Response): void => {
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.post('/sessions/:id/materials', (req: Request, res: Response): void => {
  const db = getDb()
  const sessionId = req.params.id
  const existing = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as SessionRow | undefined
  if (!existing) {
    res.status(404).json({ success: false, error: '会话不存在' })
    return
  }

  const { type, content } = req.body as { type: string; content?: Record<string, unknown> }
  if (!['error_record', 'withdrawal', 'verbal_note'].includes(type)) {
    res.status(400).json({ success: false, error: '材料类型必须是 error_record, withdrawal 或 verbal_note' })
    return
  }

  const id = generateId()
  const version = 1
  db.prepare('INSERT INTO materials (id, session_id, type, content, version) VALUES (?, ?, ?, ?, ?)').run(
    id, sessionId, type, JSON.stringify(content || {}), version
  )

  const typeLabel = type === 'error_record' ? '错题记录' : type === 'withdrawal' ? '撤回记录' : '口头备注'
  db.prepare('INSERT INTO history (id, session_id, action, details) VALUES (?, ?, ?, ?)').run(
    generateId(), sessionId, 'add_material', JSON.stringify({ materialId: id, type, typeLabel })
  )

  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as MaterialRow
  res.json({ success: true, data: material })
})

router.put('/sessions/:id/materials/:materialId', (req: Request, res: Response): void => {
  const db = getDb()
  const { content, isActive } = req.body as { content?: Record<string, unknown>; isActive?: boolean }
  const material = db.prepare('SELECT * FROM materials WHERE id = ? AND session_id = ?').get(
    req.params.materialId, req.params.id
  ) as MaterialRow | undefined
  if (!material) {
    res.status(404).json({ success: false, error: '材料不存在' })
    return
  }

  if (content !== undefined) {
    const newVersion = (material.version || 0) + 1
    db.prepare('UPDATE materials SET content = ?, version = ?, is_active = 1 WHERE id = ?').run(
      JSON.stringify(content), newVersion, req.params.materialId
    )
  }
  if (isActive !== undefined) {
    db.prepare('UPDATE materials SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, req.params.materialId)
    db.prepare('INSERT INTO history (id, session_id, action, details) VALUES (?, ?, ?, ?)').run(
      generateId(), req.params.id, isActive ? 'restore_material' : 'deactivate_material',
      JSON.stringify({ materialId: req.params.materialId })
    )
  }

  const updated = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.materialId) as MaterialRow
  res.json({ success: true, data: updated })
})

router.delete('/sessions/:id/materials/:materialId', (req: Request, res: Response): void => {
  const db = getDb()
  db.prepare('DELETE FROM materials WHERE id = ? AND session_id = ?').run(req.params.materialId, req.params.id)
  db.prepare('INSERT INTO history (id, session_id, action, details) VALUES (?, ?, ?, ?)').run(
    generateId(), req.params.id, 'delete_material', JSON.stringify({ materialId: req.params.materialId })
  )
  res.json({ success: true })
})

router.get('/sessions/:id/data-points', (req: Request, res: Response): void => {
  const db = getDb()
  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(req.params.id) as SessionRow | undefined
  if (!session) {
    res.status(404).json({ success: false, error: '会话不存在' })
    return
  }
  const points = db.prepare(
    'SELECT id, x, y, unit, sort_order, created_at FROM data_points WHERE session_id = ? ORDER BY sort_order, created_at'
  ).all(req.params.id) as DataPointRow[]
  res.json({ success: true, data: points })
})

router.post('/sessions/:id/data-points', (req: Request, res: Response): void => {
  const db = getDb()
  const sessionId = req.params.id
  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId) as SessionRow | undefined
  if (!session) {
    res.status(404).json({ success: false, error: '会话不存在' })
    return
  }

  const { x, y, unit } = req.body as { x: number; y: number; unit?: string | null }
  if (x === undefined || y === undefined) {
    res.status(400).json({ success: false, error: 'x 和 y 为必填' })
    return
  }

  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as mo FROM data_points WHERE session_id = ?').get(sessionId) as { mo: number }
  const id = generateId()
  db.prepare('INSERT INTO data_points (id, session_id, x, y, unit, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, sessionId, Number(x), Number(y), unit || null, maxOrder.mo + 1
  )

  db.prepare('UPDATE sessions SET updated_at = datetime(\'now\') WHERE id = ?').run(sessionId)
  db.prepare('INSERT INTO history (id, session_id, action, details) VALUES (?, ?, ?, ?)').run(
    generateId(), sessionId, 'add_data_point', JSON.stringify({ pointId: id, x, y, unit })
  )

  const point = db.prepare('SELECT * FROM data_points WHERE id = ?').get(id) as DataPointRow
  res.json({ success: true, data: point })
})

router.put('/sessions/:id/data-points/batch', (req: Request, res: Response): void => {
  const db = getDb()
  const sessionId = req.params.id
  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId) as SessionRow | undefined
  if (!session) {
    res.status(404).json({ success: false, error: '会话不存在' })
    return
  }

  const { points } = req.body as { points: { x: number; y: number; unit?: string | null }[] }
  if (!points || !Array.isArray(points) || points.length < 2) {
    res.status(400).json({ success: false, error: '至少需要2个数据点' })
    return
  }

  const trx = db.transaction(() => {
    db.prepare('DELETE FROM data_points WHERE session_id = ?').run(sessionId)
    const insertStmt = db.prepare('INSERT INTO data_points (id, session_id, x, y, unit, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    points.forEach((p, i) => {
      insertStmt.run(generateId(), sessionId, Number(p.x), Number(p.y), p.unit || null, i)
    })
    db.prepare('UPDATE sessions SET updated_at = datetime(\'now\') WHERE id = ?').run(sessionId)
  })
  trx()

  db.prepare('INSERT INTO history (id, session_id, action, details) VALUES (?, ?, ?, ?)').run(
    generateId(), sessionId, 'set_data_points', JSON.stringify({ count: points.length })
  )

  const allPoints = db.prepare(
    'SELECT id, x, y, unit, sort_order FROM data_points WHERE session_id = ? ORDER BY sort_order'
  ).all(sessionId) as DataPointRow[]
  res.json({ success: true, data: allPoints })
})

router.put('/sessions/:id/data-points/:pointId', (req: Request, res: Response): void => {
  const db = getDb()
  const { x, y, unit } = req.body as { x?: number; y?: number; unit?: string | null }
  const point = db.prepare('SELECT * FROM data_points WHERE id = ? AND session_id = ?').get(
    req.params.pointId, req.params.id
  ) as DataPointRow | undefined
  if (!point) {
    res.status(404).json({ success: false, error: '数据点不存在' })
    return
  }

  const sets: string[] = []
  const values: (string | number | null)[] = []
  if (x !== undefined) { sets.push('x = ?'); values.push(Number(x)) }
  if (y !== undefined) { sets.push('y = ?'); values.push(Number(y)) }
  if (unit !== undefined) { sets.push('unit = ?'); values.push(unit || null) }

  if (sets.length > 0) {
    values.push(req.params.pointId)
    db.prepare(`UPDATE data_points SET ${sets.join(', ')} WHERE id = ?`).run(...values)
    db.prepare('UPDATE sessions SET updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id)
    db.prepare('INSERT INTO history (id, session_id, action, details) VALUES (?, ?, ?, ?)').run(
      generateId(), req.params.id, 'update_data_point', JSON.stringify({ pointId: req.params.pointId })
    )
  }

  const updated = db.prepare('SELECT * FROM data_points WHERE id = ?').get(req.params.pointId) as DataPointRow
  res.json({ success: true, data: updated })
})

router.delete('/sessions/:id/data-points/:pointId', (req: Request, res: Response): void => {
  const db = getDb()
  const point = db.prepare('SELECT id FROM data_points WHERE id = ? AND session_id = ?').get(
    req.params.pointId, req.params.id
  ) as DataPointRow | undefined
  if (!point) {
    res.status(404).json({ success: false, error: '数据点不存在' })
    return
  }
  db.prepare('DELETE FROM data_points WHERE id = ?').run(req.params.pointId)
  db.prepare('UPDATE sessions SET updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id)
  db.prepare('INSERT INTO history (id, session_id, action, details) VALUES (?, ?, ?, ?)').run(
    generateId(), req.params.id, 'delete_data_point', JSON.stringify({ pointId: req.params.pointId })
  )
  res.json({ success: true })
})

router.post('/sessions/:id/compute', (req: Request, res: Response): void => {
  const db = getDb()
  const sessionId = req.params.id
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as SessionRow | undefined
  if (!session) {
    res.status(404).json({ success: false, error: '会话不存在' })
    return
  }

  const { data: reqData, params, sensitivityCompare } = req.body as {
    data?: DataPoint[]
    params?: RegressionParams
    sensitivityCompare?: { params: RegressionParams; label: string }
  }

  let data: DataPoint[]
  if (reqData && Array.isArray(reqData) && reqData.length > 0) {
    data = reqData
  } else {
    const storedPoints = db.prepare(
      'SELECT x, y, unit FROM data_points WHERE session_id = ? ORDER BY sort_order, created_at'
    ).all(sessionId) as { x: number; y: number; unit: string | null }[]
    data = storedPoints.map(p => ({ x: Number(p.x), y: Number(p.y), unit: p.unit || undefined }))
  }

  if (!data || data.length < 2) {
    res.status(400).json({ success: false, error: '至少需要2个数据点，请先添加数据点' })
    return
  }

  const mergedParams: RegressionParams = {
    ...(JSON.parse(session.params || '{}') as RegressionParams),
    ...(params || {}),
  }

  const result = computeSegmentedRegression(data, mergedParams)

  if (sensitivityCompare) {
    result.parameterSensitivity = computeSensitivity(data, mergedParams, sensitivityCompare.params)
  }

  const materials = db.prepare('SELECT * FROM materials WHERE session_id = ? AND is_active = 1').all(sessionId) as MaterialRow[]

  const materialImpact: { materialId: string; type: string; affectedSegments: number[]; description: string }[] = []
  for (const mat of materials) {
    const matContent = JSON.parse(mat.content || '{}') as Record<string, unknown>
    if (mat.type === 'error_record') {
      const oldVersion = mat.version > 1
      materialImpact.push({
        materialId: mat.id,
        type: '错题记录' + (oldVersion ? '(旧版)' : ''),
        affectedSegments: oldVersion ? result.segments.map((_, i) => i) : [],
        description: oldVersion
          ? `旧版错题记录(v${mat.version})可能包含已修正的数据，影响所有分段回归结论`
          : `当前错题记录已纳入计算`,
      })
    } else if (mat.type === 'withdrawal') {
      materialImpact.push({
        materialId: mat.id,
        type: '撤回记录',
        affectedSegments: matContent.segmentIndex !== undefined ? [matContent.segmentIndex as number] : result.segments.map((_, i) => i),
        description: `撤回操作可能影响了部分数据点，需确认结论是否因此偏移`,
      })
    } else if (mat.type === 'verbal_note') {
      materialImpact.push({
        materialId: mat.id,
        type: '口头备注',
        affectedSegments: [],
        description: `口头备注: "${(matContent.text as string) || ''}" — 仅供参考，不直接影响计算`,
      })
    }
  }

  db.prepare('UPDATE sessions SET result = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
    JSON.stringify(result), 'completed', sessionId
  )

  db.prepare('INSERT INTO history (id, session_id, action, details) VALUES (?, ?, ?, ?)').run(
    generateId(), sessionId, 'compute', JSON.stringify({
      segmentCount: result.segments.length,
      totalR2: result.totalR2,
      unitWarnings: result.unitWarnings,
      materialImpact,
    })
  )

  res.json({
    success: true,
    data: {
      result,
      materialImpact,
      sessionId,
    },
  })
})

router.get('/sessions/:id/history', (req: Request, res: Response): void => {
  const db = getDb()
  const history = db.prepare('SELECT * FROM history WHERE session_id = ? ORDER BY created_at DESC').all(req.params.id) as HistoryRow[]
  res.json({ success: true, data: history })
})

router.get('/sessions/:id/state', (req: Request, res: Response): void => {
  const db = getDb()
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id) as SessionRow | undefined
  if (!session) {
    res.status(404).json({ success: false, error: '会话不存在' })
    return
  }
  const materials = db.prepare('SELECT * FROM materials WHERE session_id = ? ORDER BY created_at').all(req.params.id) as MaterialRow[]
  const history = db.prepare('SELECT * FROM history WHERE session_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id) as HistoryRow[]
  const dataPoints = db.prepare(
    'SELECT id, x, y, unit, sort_order FROM data_points WHERE session_id = ? ORDER BY sort_order, created_at'
  ).all(req.params.id) as DataPointRow[]
  const result = session.result ? JSON.parse(session.result) : null

  res.json({
    success: true,
    data: {
      session: {
        id: session.id,
        name: session.name,
        status: session.status,
        params: JSON.parse(session.params || '{}'),
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
      materials,
      dataPoints,
      result,
      recentHistory: history,
    },
  })
})

export default router
