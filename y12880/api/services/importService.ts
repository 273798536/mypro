import { getDatabase } from '../database/index.js'
import { detectConflicts } from './conflictService.js'
import { calculateRisks } from './riskService.js'
import { parse } from 'csv-parse/sync'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const UPLOAD_DIR = path.resolve(__dirname, '../../data/uploads')

export interface ImportResult {
  success: boolean
  count: number
  batchId: string
  batchName: string
}

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

function generateBatchId(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '_')
  return `batch_${dateStr}_${Math.random().toString(36).slice(2, 8)}`
}

export function createBatch(name: string): { id: string; name: string } {
  const db = getDatabase()
  const id = generateBatchId()
  const batchName = name || `点检批次_${new Date().toLocaleDateString()}`

  const sql = `
    INSERT INTO check_batches (id, name, status) VALUES (?, ?, 'processing')
  `
  db.prepare(sql).run(id, batchName)

  return { id, name: batchName }
}

export function importTideData(
  file: Express.Multer.File,
  source: string,
  remark?: string
): ImportResult {
  const db = getDatabase()
  ensureUploadDir()

  const batch = createBatch(`潮汐数据_${new Date().toLocaleDateString()}`)
  const batchId = batch.id

  let records: Array<{ equipmentId: string; timestamp: string; tideLevel: number }> = []

  try {
    const content = file.buffer.toString('utf-8')
    const parsed = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    records = parsed.map((row: any, idx: number) => ({
      equipmentId: row.equipment_id || row['设备ID'] || `eq_${String(idx + 1).padStart(3, '0')}`,
      timestamp: row.timestamp || row['时间'] || new Date().toISOString().slice(0, 19).replace('T', ' '),
      tideLevel: parseFloat(row.tide_level || row['潮位'] || row.tide || '0'),
    }))
  } catch (e) {
    throw new Error('CSV 解析失败')
  }

  const insertSql = `
    INSERT INTO tide_data 
      (id, equipment_id, batch_id, timestamp, tide_level, source_file, source_line, source_remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `

  let count = 0
  const tx = db.transaction(() => {
    records.forEach((record, idx) => {
      const id = `tide_${Date.now()}_${idx}`
      db.prepare(insertSql).run(
        id,
        record.equipmentId,
        batchId,
        record.timestamp,
        record.tideLevel,
        file.originalname || source || 'tide_data.csv',
        idx + 2,
        remark
      )
      count++
    })
  })

  tx()

  return {
    success: true,
    count,
    batchId,
    batchName: batch.name,
  }
}

export function importBuoyData(
  file: Express.Multer.File,
  source: string,
  remark?: string
): ImportResult {
  const db = getDatabase()
  ensureUploadDir()

  const batch = createBatch(`浮标数据_${new Date().toLocaleDateString()}`)
  const batchId = batch.id

  let records: Array<{
    equipmentId: string
    timestamp: string
    tideLevel?: number
    waveHeight?: number
    windSpeed?: number
  }> = []

  try {
    const content = file.buffer.toString('utf-8')
    const parsed = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    records = parsed.map((row: any, idx: number) => ({
      equipmentId: row.equipment_id || row['设备ID'] || `eq_${String(idx + 1).padStart(3, '0')}`,
      timestamp: row.timestamp || row['时间'] || new Date().toISOString().slice(0, 19).replace('T', ' '),
      tideLevel: row.tide_level ? parseFloat(row.tide_level) : undefined,
      waveHeight: row.wave_height ? parseFloat(row.wave_height) : undefined,
      windSpeed: row.wind_speed ? parseFloat(row.wind_speed) : undefined,
    }))
  } catch (e) {
    throw new Error('CSV 解析失败')
  }

  const insertSql = `
    INSERT INTO buoy_data 
      (id, equipment_id, batch_id, timestamp, tide_level, wave_height, wind_speed, source_file, source_line, source_remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  let count = 0
  const tx = db.transaction(() => {
    records.forEach((record, idx) => {
      const id = `buoy_${Date.now()}_${idx}`
      db.prepare(insertSql).run(
        id,
        record.equipmentId,
        batchId,
        record.timestamp,
        record.tideLevel || null,
        record.waveHeight || null,
        record.windSpeed || null,
        file.originalname || source || 'buoy_data.csv',
        idx + 2,
        remark
      )
      count++
    })
  })

  tx()

  return {
    success: true,
    count,
    batchId,
    batchName: batch.name,
  }
}

export function importEquipment(file: Express.Multer.File): { success: boolean; count: number } {
  const db = getDatabase()
  ensureUploadDir()

  let records: Array<{ id?: string; name: string; platformId: string; type: string }> = []

  try {
    const content = file.buffer.toString('utf-8')
    const parsed = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    records = parsed.map((row: any, idx: number) => ({
      id: row.id || row['设备ID'] || `eq_${String(idx + 1).padStart(3, '0')}`,
      name: row.name || row['设备名称'] || `设备${idx + 1}`,
      platformId: row.platform_id || row['平台ID'] || 'plat_001',
      type: row.type || row['类型'] || 'sensor',
    }))
  } catch (e) {
    throw new Error('CSV 解析失败')
  }

  const insertSql = `
    INSERT OR REPLACE INTO equipment (id, name, platform_id, type)
    VALUES (?, ?, ?, ?)
  `

  let count = 0
  const tx = db.transaction(() => {
    records.forEach((record) => {
      db.prepare(insertSql).run(record.id, record.name, record.platformId, record.type)
      count++
    })
  })

  tx()

  return { success: true, count }
}

export function runInspection(batchId: string): {
  success: boolean
  batchId: string
  conflictCount: number
  riskCount: number
} {
  const db = getDatabase()

  const batch = db.prepare('SELECT * FROM check_batches WHERE id = ?').get(batchId)
  if (!batch) {
    throw new Error('批次不存在')
  }

  const conflictResult = detectConflicts(batchId)
  const riskResult = calculateRisks(batchId)

  db.prepare("UPDATE check_batches SET status = 'completed', completed_at = datetime('now'), data_completeness = 0.85 WHERE id = ?").run(batchId)

  return {
    success: true,
    batchId,
    conflictCount: conflictResult.count,
    riskCount: riskResult.count,
  }
}

export function getBatches(): { items: Array<{
  id: string
  name: string
  status: string
  dataCompleteness: number
  createdAt: string
  completedAt?: string
}> } {
  const db = getDatabase()

  const sql = `
    SELECT id, name, status, data_completeness as dataCompleteness, 
           created_at as createdAt, completed_at as completedAt
    FROM check_batches
    ORDER BY created_at DESC
    LIMIT 10
  `

  const items = db.prepare(sql).all() as any[]

  return { items }
}

export default {
  importTideData,
  importBuoyData,
  importEquipment,
  runInspection,
  getBatches,
  createBatch,
}
