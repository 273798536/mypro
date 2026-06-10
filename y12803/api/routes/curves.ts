import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/:groupId/curves', (req: Request, res: Response): void => {
  const db = getDb()
  const { groupId } = req.params

  const group = db.prepare('SELECT * FROM experiment_groups WHERE id = ?').get(groupId)
  if (!group) {
    res.status(404).json({ success: false, error: '实验组不存在' })
    return
  }

  const plants = db.prepare(`
    SELECT id, plant_code, species FROM plants WHERE group_id = ? ORDER BY plant_code
  `).all(groupId) as Array<{ id: string; plant_code: string; species: string | null }>

  const measurements = db.prepare(`
    SELECT gm.*, p.plant_code
    FROM growth_measurements gm
    JOIN plants p ON p.id = gm.plant_id
    WHERE gm.group_id = ?
    ORDER BY gm.plant_id, gm.day_index
  `).all(groupId) as Array<Record<string, unknown> & { plant_id: string }>

  const curvesByPlant = new Map<string, typeof measurements>()
  for (const m of measurements) {
    const list = curvesByPlant.get(m.plant_id) ?? []
    list.push(m)
    curvesByPlant.set(m.plant_id, list)
  }

  const curves = plants.map(p => ({
    plant_id: p.id,
    plant_code: p.plant_code,
    species: p.species,
    measurements: curvesByPlant.get(p.id) ?? [],
  }))

  res.json({ success: true, data: { group, curves } })
})

router.get('/:groupId/conclusion', (req: Request, res: Response): void => {
  const db = getDb()
  const { groupId } = req.params

  const group = db.prepare(
    'SELECT id, name, conclusion_status, conclusion FROM experiment_groups WHERE id = ?'
  ).get(groupId) as { id: string; name: string; conclusion_status: string; conclusion: string | null } | undefined

  if (!group) {
    res.status(404).json({ success: false, error: '实验组不存在' })
    return
  }

  const abnormalCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM growth_measurements WHERE group_id = ? AND annotation = 'abnormal'
  `).get(groupId) as { cnt: number }

  const totalCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM growth_measurements WHERE group_id = ?
  `).get(groupId) as { cnt: number }

  const lastMeasurement = db.prepare(`
    SELECT measured_at FROM growth_measurements WHERE group_id = ? ORDER BY measured_at DESC LIMIT 1
  `).get(groupId) as { measured_at: string } | undefined

  res.json({
    success: true,
    data: {
      ...group,
      abnormal_count: abnormalCount.cnt,
      total_measurements: totalCount.cnt,
      last_measured_at: lastMeasurement?.measured_at ?? null,
    },
  })
})

export default router
