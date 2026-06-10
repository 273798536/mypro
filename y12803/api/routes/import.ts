import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import Papa from 'papaparse'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

interface ImportRecord {
  group_id: string
  plant_id: string
  batch_no: string
  recorded_at: string
  measured_at: string
  temperature?: number | null
  humidity?: number | null
  light_intensity?: number | null
  nutrient_solution?: string | null
  is_supplementary?: boolean | number | null
  supplementary_to?: string | null
  note?: string | null
  day_index?: number
  height?: number | null
  leaf_area?: number | null
  stem_diameter?: number | null
  annotation?: string
}

function findDuplicates(db: ReturnType<typeof getDb>, records: ImportRecord[]): Array<{ record: ImportRecord; existingId: string }> {
  const conflicts: Array<{ record: ImportRecord; existingId: string }> = []
  const checkStmt = db.prepare(
    'SELECT id FROM cultivation_records WHERE plant_id = ? AND measured_at = ? AND batch_no = ?'
  )

  for (const record of records) {
    const existing = checkStmt.get(record.plant_id, record.measured_at, record.batch_no) as { id: string } | undefined
    if (existing) {
      conflicts.push({ record, existingId: existing.id })
    }
  }

  return conflicts
}

router.post('/json', (req: Request, res: Response): void => {
  const db = getDb()
  const records: ImportRecord[] = req.body

  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({ success: false, error: '请提供有效的记录数组' })
    return
  }

  const conflicts = findDuplicates(db, records)
  const cleanRecords = conflicts.length > 0
    ? records.filter(r => !conflicts.some(c => c.record === r))
    : records

  const insertRecord = db.prepare(`
    INSERT INTO cultivation_records (id, group_id, plant_id, batch_no, recorded_at, measured_at, temperature, humidity, light_intensity, nutrient_solution, is_supplementary, supplementary_to, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertMeasurement = db.prepare(`
    INSERT INTO growth_measurements (id, plant_id, group_id, record_id, batch_no, day_index, height, leaf_area, stem_diameter, annotation, measured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let insertedRows = 0
  const transaction = db.transaction(() => {
    for (const r of cleanRecords) {
      const recordId = uuidv4()
      insertRecord.run(
        recordId, r.group_id, r.plant_id, r.batch_no,
        r.recorded_at, r.measured_at,
        r.temperature ?? null, r.humidity ?? null, r.light_intensity ?? null,
        r.nutrient_solution ?? null,
        r.is_supplementary ? 1 : 0,
        r.supplementary_to ?? null, r.note ?? null,
      )

      if (r.day_index !== undefined) {
        insertMeasurement.run(
          uuidv4(), r.plant_id, r.group_id, recordId, r.batch_no,
          r.day_index, r.height ?? null, r.leaf_area ?? null,
          r.stem_diameter ?? null, r.annotation ?? 'normal', r.measured_at,
        )
      }

      insertedRows++
    }
  })
  transaction()

  const logId = uuidv4()
  db.prepare(`
    INSERT INTO import_log (id, source_file, import_type, total_rows, inserted_rows, skipped_rows)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(logId, 'json-upload', 'json', records.length, insertedRows, conflicts.length)

  res.status(201).json({
    success: true,
    data: {
      totalRows: records.length,
      insertedRows,
      skippedRows: conflicts.length,
      conflicts: conflicts.map(c => ({ existingId: c.existingId, plant_id: c.record.plant_id, measured_at: c.record.measured_at, batch_no: c.record.batch_no })),
    },
  })
})

router.post('/csv', upload.single('file'), (req: Request, res: Response): void => {
  const db = getDb()

  if (!req.file) {
    res.status(400).json({ success: false, error: '请上传CSV文件' })
    return
  }

  const csvContent = req.file.buffer.toString('utf-8')
  const parsed = Papa.parse<Record<string, string>>(csvContent, { header: true, skipEmptyLines: true })

  if (parsed.errors.length > 0) {
    res.status(400).json({ success: false, error: 'CSV解析错误', details: parsed.errors })
    return
  }

  const records: ImportRecord[] = parsed.data.map(row => ({
    group_id: row.group_id,
    plant_id: row.plant_id,
    batch_no: row.batch_no,
    recorded_at: row.recorded_at,
    measured_at: row.measured_at,
    temperature: row.temperature ? parseFloat(row.temperature) : null,
    humidity: row.humidity ? parseFloat(row.humidity) : null,
    light_intensity: row.light_intensity ? parseFloat(row.light_intensity) : null,
    nutrient_solution: row.nutrient_solution ?? null,
    is_supplementary: row.is_supplementary === '1' || row.is_supplementary === 'true' ? 1 : 0,
    supplementary_to: row.supplementary_to ?? null,
    note: row.note ?? null,
    day_index: row.day_index ? parseInt(row.day_index, 10) : undefined,
    height: row.height ? parseFloat(row.height) : null,
    leaf_area: row.leaf_area ? parseFloat(row.leaf_area) : null,
    stem_diameter: row.stem_diameter ? parseFloat(row.stem_diameter) : null,
    annotation: row.annotation ?? 'normal',
  }))

  const conflicts = findDuplicates(db, records)
  const cleanRecords = conflicts.length > 0
    ? records.filter(r => !conflicts.some(c => c.record === r))
    : records

  const insertRecord = db.prepare(`
    INSERT INTO cultivation_records (id, group_id, plant_id, batch_no, recorded_at, measured_at, temperature, humidity, light_intensity, nutrient_solution, is_supplementary, supplementary_to, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertMeasurement = db.prepare(`
    INSERT INTO growth_measurements (id, plant_id, group_id, record_id, batch_no, day_index, height, leaf_area, stem_diameter, annotation, measured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let insertedRows = 0
  const transaction = db.transaction(() => {
    for (const r of cleanRecords) {
      const recordId = uuidv4()
      insertRecord.run(
        recordId, r.group_id, r.plant_id, r.batch_no,
        r.recorded_at, r.measured_at,
        r.temperature ?? null, r.humidity ?? null, r.light_intensity ?? null,
        r.nutrient_solution ?? null,
        r.is_supplementary ? 1 : 0,
        r.supplementary_to ?? null, r.note ?? null,
      )

      if (r.day_index !== undefined) {
        insertMeasurement.run(
          uuidv4(), r.plant_id, r.group_id, recordId, r.batch_no,
          r.day_index, r.height ?? null, r.leaf_area ?? null,
          r.stem_diameter ?? null, r.annotation ?? 'normal', r.measured_at,
        )
      }

      insertedRows++
    }
  })
  transaction()

  const logId = uuidv4()
  db.prepare(`
    INSERT INTO import_log (id, source_file, import_type, total_rows, inserted_rows, skipped_rows)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(logId, req.file!.originalname, 'csv', records.length, insertedRows, conflicts.length)

  res.status(201).json({
    success: true,
    data: {
      totalRows: records.length,
      insertedRows,
      skippedRows: conflicts.length,
      conflicts: conflicts.map(c => ({ existingId: c.existingId, plant_id: c.record.plant_id, measured_at: c.record.measured_at, batch_no: c.record.batch_no })),
    },
  })
})

router.post('/check-duplicates', (req: Request, res: Response): void => {
  const db = getDb()
  const records: ImportRecord[] = req.body

  if (!Array.isArray(records)) {
    res.status(400).json({ success: false, error: '请提供有效的记录数组' })
    return
  }

  const conflicts = findDuplicates(db, records)
  res.json({ success: true, data: { conflictCount: conflicts.length, conflicts: conflicts.map(c => ({ existingId: c.existingId, plant_id: c.record.plant_id, measured_at: c.record.measured_at, batch_no: c.record.batch_no })) } })
})

router.post('/resolve-conflict', (req: Request, res: Response): void => {
  const db = getDb()
  const { strategy, record } = req.body as { strategy: 'overwrite' | 'skip' | 'merge'; record: ImportRecord & { id?: string } }

  if (!strategy || !record) {
    res.status(400).json({ success: false, error: '缺少策略或记录数据' })
    return
  }

  const existing = db.prepare(
    'SELECT * FROM cultivation_records WHERE plant_id = ? AND measured_at = ? AND batch_no = ?'
  ).get(record.plant_id, record.measured_at, record.batch_no) as Record<string, unknown> | undefined

  if (!existing) {
    res.status(404).json({ success: false, error: '未找到冲突记录' })
    return
  }

  const existingId = existing.id as string

  if (strategy === 'skip') {
    res.json({ success: true, data: { strategy: 'skip', keptId: existingId } })
    return
  }

  if (strategy === 'overwrite') {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM growth_measurements WHERE record_id = ?').run(existingId)
      db.prepare('DELETE FROM cultivation_records WHERE id = ?').run(existingId)

      const newRecordId = uuidv4()
      db.prepare(`
        INSERT INTO cultivation_records (id, group_id, plant_id, batch_no, recorded_at, measured_at, temperature, humidity, light_intensity, nutrient_solution, is_supplementary, supplementary_to, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newRecordId, record.group_id, record.plant_id, record.batch_no,
        record.recorded_at, record.measured_at,
        record.temperature ?? null, record.humidity ?? null, record.light_intensity ?? null,
        record.nutrient_solution ?? null,
        record.is_supplementary ? 1 : 0,
        record.supplementary_to ?? null, record.note ?? null,
      )

      if (record.day_index !== undefined) {
        db.prepare(`
          INSERT INTO growth_measurements (id, plant_id, group_id, record_id, batch_no, day_index, height, leaf_area, stem_diameter, annotation, measured_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), record.plant_id, record.group_id, newRecordId, record.batch_no,
          record.day_index, record.height ?? null, record.leaf_area ?? null,
          record.stem_diameter ?? null, record.annotation ?? 'normal', record.measured_at,
        )
      }

      return newRecordId
    })

    const newId = transaction()
    res.json({ success: true, data: { strategy: 'overwrite', oldId: existingId, newId } })
    return
  }

  if (strategy === 'merge') {
    const transaction = db.transaction(() => {
      const mergedTemp = averageOrNull(existing.temperature as number | null, record.temperature ?? null)
      const mergedHumidity = averageOrNull(existing.humidity as number | null, record.humidity ?? null)
      const mergedLight = averageOrNull(existing.light_intensity as number | null, record.light_intensity ?? null)

      db.prepare(`
        UPDATE cultivation_records
        SET temperature = ?, humidity = ?, light_intensity = ?,
            nutrient_solution = COALESCE(?, nutrient_solution),
            note = COALESCE(?, note)
        WHERE id = ?
      `).run(mergedTemp, mergedHumidity, mergedLight, record.nutrient_solution ?? null, record.note ?? null, existingId)

      const measurement = db.prepare('SELECT * FROM growth_measurements WHERE record_id = ?').get(existingId) as Record<string, unknown> | undefined
      if (measurement && record.day_index !== undefined) {
        const mergedHeight = averageOrNull(measurement.height as number | null, record.height ?? null)
        const mergedLeafArea = averageOrNull(measurement.leaf_area as number | null, record.leaf_area ?? null)
        const mergedStemDiameter = averageOrNull(measurement.stem_diameter as number | null, record.stem_diameter ?? null)

        db.prepare(`
          UPDATE growth_measurements
          SET height = ?, leaf_area = ?, stem_diameter = ?
          WHERE record_id = ?
        `).run(mergedHeight, mergedLeafArea, mergedStemDiameter, existingId)
      }

      return existingId
    })

    const mergedId = transaction()
    res.json({ success: true, data: { strategy: 'merge', mergedId } })
    return
  }

  res.status(400).json({ success: false, error: '无效的冲突解决策略' })
})

function averageOrNull(a: number | null, b: number | null): number | null {
  if (a !== null && b !== null) return Math.round(((a + b) / 2) * 100) / 100
  if (a !== null) return a
  return b
}

export default router
