import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const tasks = db.prepare('SELECT * FROM tasks').all() as Array<{
    id: string
    name: string
    status: string
    last_run_at: string | null
    created_at: string
  }>

  const upstreamMap = new Map<string, string[]>()
  const downstreamMap = new Map<string, string[]>()

  const deps = db.prepare('SELECT upstream_id, downstream_id FROM task_dependencies').all() as Array<{
    upstream_id: string
    downstream_id: string
  }>

  for (const dep of deps) {
    if (!upstreamMap.has(dep.downstream_id)) upstreamMap.set(dep.downstream_id, [])
    upstreamMap.get(dep.downstream_id)!.push(dep.upstream_id)

    if (!downstreamMap.has(dep.upstream_id)) downstreamMap.set(dep.upstream_id, [])
    downstreamMap.get(dep.upstream_id)!.push(dep.downstream_id)
  }

  const workorders = db.prepare('SELECT id, task_id FROM workorders').all() as Array<{
    id: string
    task_id: string | null
  }>

  const taskWorkorderMap = new Map<string, string>()
  for (const wo of workorders) {
    if (wo.task_id) taskWorkorderMap.set(wo.task_id, wo.id)
  }

  const result = tasks.map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    upstream: upstreamMap.get(t.id) || [],
    downstream: downstreamMap.get(t.id) || [],
    workorderId: taskWorkorderMap.get(t.id) || null,
    lastRunAt: t.last_run_at,
    createdAt: t.created_at,
  }))

  res.json({ success: true, data: result })
})

router.get('/:id', (req: Request, res: Response): void => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as {
    id: string
    name: string
    status: string
    last_run_at: string | null
    created_at: string
  } | undefined

  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found' })
    return
  }

  const upstream = db.prepare(
    'SELECT upstream_id FROM task_dependencies WHERE downstream_id = ?'
  ).all(req.params.id) as Array<{ upstream_id: string }>

  const downstream = db.prepare(
    'SELECT downstream_id FROM task_dependencies WHERE upstream_id = ?'
  ).all(req.params.id) as Array<{ downstream_id: string }>

  const workorder = db.prepare('SELECT * FROM workorders WHERE task_id = ?').get(task.id) as {
    id: string
    title: string
    status: string
    conclusion: string
    created_by: string
    created_at: string
    change_count: number
  } | undefined

  res.json({
    success: true,
    data: {
      id: task.id,
      name: task.name,
      status: task.status,
      upstream: upstream.map((u) => u.upstream_id),
      downstream: downstream.map((d) => d.downstream_id),
      workorder: workorder || null,
      lastRunAt: task.last_run_at,
      createdAt: task.created_at,
    },
  })
})

export default router
