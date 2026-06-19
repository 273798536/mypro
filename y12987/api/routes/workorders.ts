import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const pageSize = Math.max(1, parseInt(req.query.pageSize as string) || 20)
  const status = req.query.status as string | undefined

  let countSql = 'SELECT COUNT(*) as total FROM workorders'
  let listSql = 'SELECT * FROM workorders'
  const params: unknown[] = []

  if (status) {
    countSql += ' WHERE status = ?'
    listSql += ' WHERE status = ?'
    params.push(status)
  }

  listSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'

  const { total } = db.prepare(countSql).get(params) as { total: number }
  const list = db.prepare(listSql).all([...params, pageSize, (page - 1) * pageSize]) as Array<{
    id: string
    title: string
    status: string
    task_id: string | null
    conclusion: string
    created_by: string
    created_at: string
    change_count: number
  }>

  res.json({
    success: true,
    data: {
      list: list.map((wo) => ({
        id: wo.id,
        title: wo.title,
        status: wo.status,
        taskId: wo.task_id,
        conclusion: wo.conclusion,
        createdBy: wo.created_by,
        createdAt: wo.created_at,
        changeCount: wo.change_count,
      })),
      total,
      page,
      pageSize,
    },
  })
})

router.get('/:id', (req: Request, res: Response): void => {
  const wo = db.prepare('SELECT * FROM workorders WHERE id = ?').get(req.params.id) as {
    id: string
    title: string
    status: string
    task_id: string | null
    conclusion: string
    created_by: string
    created_at: string
    change_count: number
  } | undefined

  if (!wo) {
    res.status(404).json({ success: false, error: 'Workorder not found' })
    return
  }

  res.json({
    success: true,
    data: {
      id: wo.id,
      title: wo.title,
      status: wo.status,
      taskId: wo.task_id,
      conclusion: wo.conclusion,
      createdBy: wo.created_by,
      createdAt: wo.created_at,
      changeCount: wo.change_count,
    },
  })
})

router.get('/:id/versions', (req: Request, res: Response): void => {
  const versions = db.prepare(
    'SELECT * FROM workorder_versions WHERE workorder_id = ? ORDER BY version DESC'
  ).all(req.params.id) as Array<{
    id: string
    workorder_id: string
    conclusion: string
    changed_by: string
    changed_at: string
    change_reason: string
    version: number
  }>

  res.json({
    success: true,
    data: versions.map((v) => ({
      id: v.id,
      workorderId: v.workorder_id,
      conclusion: v.conclusion,
      changedBy: v.changed_by,
      changedAt: v.changed_at,
      changeReason: v.change_reason,
      version: v.version,
    })),
  })
})

router.post('/', (req: Request, res: Response): void => {
  const { title, taskId, createdBy, conclusion } = req.body

  if (!title || !taskId || !createdBy || conclusion === undefined) {
    res.status(400).json({ success: false, error: 'Missing required fields: title, taskId, createdBy, conclusion' })
    return
  }

  const id = uuidv4()
  const now = new Date().toISOString()

  const insertWorkorder = db.prepare(
    'INSERT INTO workorders (id, title, status, task_id, conclusion, created_by, created_at, change_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const insertVersion = db.prepare(
    'INSERT INTO workorder_versions (id, workorder_id, conclusion, changed_by, changed_at, change_reason, version) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const insertAudit = db.prepare(
    'INSERT INTO audit_logs (id, action_type, entity_type, entity_id, operator, operated_at, reason, snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )

  const transaction = db.transaction(() => {
    insertWorkorder.run(id, title, 'open', taskId, conclusion, createdBy, now, 0)
    insertVersion.run(uuidv4(), id, conclusion, createdBy, now, '初始创建', 1)
    insertAudit.run(
      uuidv4(), 'create', 'workorder', id, createdBy, now, '创建工单',
      JSON.stringify({ title, conclusion })
    )
  })

  transaction()

  res.status(201).json({
    success: true,
    data: { id, title, status: 'open', taskId, conclusion, createdBy, createdAt: now, changeCount: 0 },
  })
})

router.put('/:id', (req: Request, res: Response): void => {
  const { changeReason, conclusion, status } = req.body

  if (!changeReason) {
    res.status(400).json({ success: false, error: 'changeReason is required' })
    return
  }

  const wo = db.prepare('SELECT * FROM workorders WHERE id = ?').get(req.params.id) as {
    id: string
    title: string
    status: string
    task_id: string | null
    conclusion: string
    created_by: string
    created_at: string
    change_count: number
  } | undefined

  if (!wo) {
    res.status(404).json({ success: false, error: 'Workorder not found' })
    return
  }

  const now = new Date().toISOString()
  const newConclusion = conclusion !== undefined ? conclusion : wo.conclusion
  const newStatus = status !== undefined ? status : wo.status
  const newChangeCount = wo.change_count + 1
  const operator = (req.body.changedBy as string) || wo.created_by

  const updateWorkorder = db.prepare(
    'UPDATE workorders SET conclusion = ?, status = ?, change_count = ? WHERE id = ?'
  )
  const insertVersion = db.prepare(
    'INSERT INTO workorder_versions (id, workorder_id, conclusion, changed_by, changed_at, change_reason, version) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const insertAudit = db.prepare(
    'INSERT INTO audit_logs (id, action_type, entity_type, entity_id, operator, operated_at, reason, snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )

  const transaction = db.transaction(() => {
    updateWorkorder.run(newConclusion, newStatus, newChangeCount, wo.id)
    insertVersion.run(uuidv4(), wo.id, newConclusion, operator, now, changeReason, newChangeCount)
    insertAudit.run(
      uuidv4(), 'update', 'workorder', wo.id, operator, now, changeReason,
      JSON.stringify({
        before: { conclusion: wo.conclusion, status: wo.status, changeCount: wo.change_count },
        after: { conclusion: newConclusion, status: newStatus, changeCount: newChangeCount },
      })
    )
  })

  transaction()

  res.json({
    success: true,
    data: {
      id: wo.id,
      title: wo.title,
      status: newStatus,
      taskId: wo.task_id,
      conclusion: newConclusion,
      createdBy: wo.created_by,
      createdAt: wo.created_at,
      changeCount: newChangeCount,
    },
  })
})

export default router
