import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const db = getDb()
  const groups = db.prepare(`
    SELECT
      eg.*,
      COUNT(DISTINCT p.id) as plant_count,
      MAX(gm.measured_at) as last_measured_at
    FROM experiment_groups eg
    LEFT JOIN plants p ON p.group_id = eg.id
    LEFT JOIN growth_measurements gm ON gm.group_id = eg.id
    GROUP BY eg.id
    ORDER BY eg.created_at DESC
  `).all() as Array<{
    id: string
    name: string
    description: string | null
    conclusion_status: string
    conclusion: string | null
    created_at: string
    plant_count: number
    last_measured_at: string | null
  }>

  res.json({ success: true, data: groups })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const { id } = req.params

  const group = db.prepare('SELECT * FROM experiment_groups WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!group) {
    res.status(404).json({ success: false, error: '实验组不存在' })
    return
  }

  const plants = db.prepare(`
    SELECT p.*, COUNT(gm.id) as measurement_count
    FROM plants p
    LEFT JOIN growth_measurements gm ON gm.plant_id = p.id
    WHERE p.group_id = ?
    GROUP BY p.id
    ORDER BY p.plant_code
  `).all(id)

  res.json({ success: true, data: { ...group, plants } })
})

export default router
