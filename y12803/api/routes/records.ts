import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

interface RecordQuery {
  groupId?: string
  batchNo?: string
  date?: string
  isSupplementary?: string
}

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { groupId, batchNo, date, isSupplementary } = req.query as RecordQuery

  let sql = `
    SELECT cr.*, p.plant_code, p.species, eg.name as group_name
    FROM cultivation_records cr
    JOIN plants p ON p.id = cr.plant_id
    JOIN experiment_groups eg ON eg.id = cr.group_id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (groupId) {
    sql += ' AND cr.group_id = ?'
    params.push(groupId)
  }
  if (batchNo) {
    sql += ' AND cr.batch_no = ?'
    params.push(batchNo)
  }
  if (date) {
    sql += ' AND DATE(cr.measured_at) = ?'
    params.push(date)
  }
  if (isSupplementary !== undefined) {
    sql += ' AND cr.is_supplementary = ?'
    params.push(isSupplementary === 'true' || isSupplementary === '1' ? 1 : 0)
  }

  sql += ' ORDER BY cr.measured_at DESC'

  const records = db.prepare(sql).all(...params)
  res.json({ success: true, data: records })
})

router.post('/', (req: Request, res: Response): void => {
  const db = getDb()
  const {
    group_id, plant_id, batch_no, recorded_at, measured_at,
    temperature, humidity, light_intensity, nutrient_solution,
    is_supplementary, supplementary_to, note,
  } = req.body

  if (!group_id || !plant_id || !batch_no || !recorded_at || !measured_at) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  const existing = db.prepare(
    'SELECT id FROM cultivation_records WHERE plant_id = ? AND measured_at = ? AND batch_no = ?'
  ).get(plant_id, measured_at, batch_no)

  if (existing) {
    res.status(409).json({ success: false, error: '该记录已存在（重复：plant_id + measured_at + batch_no）', existingId: (existing as { id: string }).id })
    return
  }

  const id = uuidv4()
  db.prepare(`
    INSERT INTO cultivation_records (id, group_id, plant_id, batch_no, recorded_at, measured_at, temperature, humidity, light_intensity, nutrient_solution, is_supplementary, supplementary_to, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, group_id, plant_id, batch_no, recorded_at, measured_at,
    temperature ?? null, humidity ?? null, light_intensity ?? null,
    nutrient_solution ?? null, is_supplementary ? 1 : 0,
    supplementary_to ?? null, note ?? null,
  )

  const record = db.prepare('SELECT * FROM cultivation_records WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: record })
})

router.get('/batch/:batchNo', (req: Request, res: Response): void => {
  const db = getDb()
  const { batchNo } = req.params

  const records = db.prepare(`
    SELECT cr.*, p.plant_code, p.species
    FROM cultivation_records cr
    JOIN plants p ON p.id = cr.plant_id
    WHERE cr.batch_no = ?
    ORDER BY cr.measured_at
  `).all(batchNo)

  const measurements = db.prepare(`
    SELECT gm.*, p.plant_code
    FROM growth_measurements gm
    JOIN plants p ON p.id = gm.plant_id
    WHERE gm.batch_no = ?
    ORDER BY gm.plant_id, gm.day_index
  `).all(batchNo)

  const groupIds = [...new Set(records.map((r: { group_id: string }) => r.group_id))]
  const conclusions = db.prepare(`
    SELECT id, name, conclusion_status, conclusion FROM experiment_groups WHERE id IN (${groupIds.map(() => '?').join(',')})
  `).all(...groupIds)

  res.json({
    success: true,
    data: { batchNo, records, measurements, conclusions },
  })
})

export default router
