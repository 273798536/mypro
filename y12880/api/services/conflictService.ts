import { getDatabase } from '../database/index.js'

export type Severity = 'high' | 'medium' | 'low'
export type ConflictStatus = 'pending' | 'resolved'
export type ResolutionType = 'supplement' | 'adjust' | 'accept'

export interface ConflictRecord {
  id: string
  equipmentId: string
  equipmentName: string
  platformId: string
  platformName: string
  timestamp: string
  tideValue: number
  buoyValue: number
  diffValue: number
  diffRate: number
  severity: Severity
  explanation: string
  sourceTide: { file: string; line: number; remark?: string }
  sourceBuoy: { file: string; line: number; image?: string; remark?: string }
  status: ConflictStatus
  resolution?: string
  resolutionRemark?: string
  resolvedAt?: string
  createdAt: string
}

export interface ConflictListResponse {
  total: number
  items: ConflictRecord[]
}

function generateExplanation(diffRate: number, tideRemark?: string, buoyRemark?: string): string {
  if (buoyRemark?.includes('晚到') || buoyRemark?.includes('预报')) {
    return '风浪预报晚到：该时段浮标数据为预报补全值，与实测存在偏差，待实测数据到港后重算'
  }
  if (diffRate > 0.2) {
    return '设备异常：浮标传感器数据偏差较大，建议安排现场校核或检查设备校准状态'
  }
  if (diffRate > 0.1) {
    return '时段差：潮汐表整点数据与浮标采样数据存在时间偏差，建议核对时间戳后取插值计算'
  }
  return '正常波动：数据偏差在可接受范围内，建议持续观测'
}

export function getConflicts(params: {
  page?: number
  pageSize?: number
  severity?: Severity
  status?: ConflictStatus
  batchId?: string
}): ConflictListResponse {
  const db = getDatabase()
  const page = params.page || 1
  const pageSize = params.pageSize || 20
  const offset = (page - 1) * pageSize

  const whereClauses: string[] = []
  const queryParams: any[] = []

  if (params.severity) {
    whereClauses.push('c.severity = ?')
    queryParams.push(params.severity)
  }
  if (params.status) {
    whereClauses.push('c.status = ?')
    queryParams.push(params.status)
  }
  if (params.batchId) {
    whereClauses.push('c.batch_id = ?')
    queryParams.push(params.batchId)
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''

  const countSql = `
    SELECT COUNT(*) as count FROM conflict_records c
    ${whereSql}
  `
  const total = (db.prepare(countSql).get(...queryParams) as { count: number }).count

  const listSql = `
    SELECT 
      c.id,
      c.equipment_id as equipmentId,
      e.name as equipmentName,
      e.platform_id as platformId,
      p.name as platformName,
      c.timestamp,
      c.tide_value as tideValue,
      c.buoy_value as buoyValue,
      c.diff_value as diffValue,
      c.diff_rate as diffRate,
      c.severity,
      c.explanation,
      c.status,
      c.resolution,
      c.resolution_remark as resolutionRemark,
      c.resolved_at as resolvedAt,
      c.created_at as createdAt,
      t.source_file as tideSourceFile,
      t.source_line as tideSourceLine,
      t.source_remark as tideSourceRemark,
      b.source_file as buoySourceFile,
      b.source_line as buoySourceLine,
      b.source_image as buoySourceImage,
      b.source_remark as buoySourceRemark
    FROM conflict_records c
    INNER JOIN equipment e ON c.equipment_id = e.id
    INNER JOIN platforms p ON e.platform_id = p.id
    INNER JOIN tide_data t ON c.tide_data_id = t.id
    INNER JOIN buoy_data b ON c.buoy_data_id = b.id
    ${whereSql}
    ORDER BY 
      CASE c.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      c.created_at DESC
    LIMIT ? OFFSET ?
  `
  const rows = db.prepare(listSql).all(...queryParams, pageSize, offset) as any[]

  const items: ConflictRecord[] = rows.map((row: any) => ({
    id: row.id,
    equipmentId: row.equipmentId,
    equipmentName: row.equipmentName,
    platformId: row.platformId,
    platformName: row.platformName,
    timestamp: row.timestamp,
    tideValue: row.tideValue,
    buoyValue: row.buoyValue,
    diffValue: row.diffValue,
    diffRate: row.diffRate,
    severity: row.severity as Severity,
    explanation: row.explanation,
    sourceTide: {
      file: row.tideSourceFile,
      line: row.tideSourceLine,
      remark: row.tideSourceRemark || undefined,
    },
    sourceBuoy: {
      file: row.buoySourceFile,
      line: row.buoySourceLine,
      image: row.buoySourceImage || undefined,
      remark: row.buoySourceRemark || undefined,
    },
    status: row.status as ConflictStatus,
    resolution: row.resolution || undefined,
    resolutionRemark: row.resolutionRemark || undefined,
    resolvedAt: row.resolvedAt || undefined,
    createdAt: row.createdAt,
  }))

  return { total, items }
}

export function resolveConflict(
  id: string,
  resolution: ResolutionType,
  remark: string
): { success: boolean } {
  const db = getDatabase()

  const sql = `
    UPDATE conflict_records
    SET status = 'resolved', resolution = ?, resolution_remark = ?, resolved_at = datetime('now')
    WHERE id = ?
  `
  const result = db.prepare(sql).run(resolution, remark, id)

  return { success: result.changes > 0 }
}

export function detectConflicts(batchId: string): { count: number } {
  const db = getDatabase()

  const checkBatch = db.prepare('SELECT id FROM check_batches WHERE id = ?').get(batchId)
  if (!checkBatch) {
    throw new Error('Batch not found')
  }

  const deleteOld = db.prepare('DELETE FROM conflict_records WHERE batch_id = ?')
  deleteOld.run(batchId)

  const matchSql = `
    SELECT 
      t.id as tide_id,
      t.equipment_id,
      t.timestamp,
      t.tide_level as tide_value,
      t.source_file as tide_file,
      t.source_line as tide_line,
      t.source_remark as tide_remark,
      b.id as buoy_id,
      b.tide_level as buoy_value,
      b.source_file as buoy_file,
      b.source_line as buoy_line,
      b.source_image as buoy_image,
      b.source_remark as buoy_remark
    FROM tide_data t
    INNER JOIN buoy_data b 
      ON t.equipment_id = b.equipment_id 
      AND t.timestamp = b.timestamp
    WHERE t.batch_id = ? AND b.batch_id = ?
  `
  const matches = db.prepare(matchSql).all(batchId, batchId) as any[]

  const insertConflict = db.prepare(`
    INSERT INTO conflict_records 
      (id, equipment_id, tide_data_id, buoy_data_id, batch_id, timestamp, 
       tide_value, buoy_value, diff_value, diff_rate, severity, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let count = 0
  const tx = db.transaction(() => {
    for (const match of matches) {
      const diffValue = Math.abs(match.tide_value - match.buoy_value)
      const diffRate = match.tide_value !== 0 ? diffValue / Math.abs(match.tide_value) : 0

      if (diffRate > 0.05) {
        const severity: Severity = diffRate > 0.2 ? 'high' : diffRate > 0.1 ? 'medium' : 'low'
        const explanation = generateExplanation(diffRate, match.tide_remark, match.buoy_remark)

        insertConflict.run(
          `conflict_${Date.now()}_${count}`,
          match.equipment_id,
          match.tide_id,
          match.buoy_id,
          batchId,
          match.timestamp,
          match.tide_value,
          match.buoy_value,
          Math.round(diffValue * 100) / 100,
          Math.round(diffRate * 10000) / 100,
          severity,
          explanation
        )
        count++
      }
    }
  })

  tx()

  return { count }
}

export default {
  getConflicts,
  resolveConflict,
  detectConflicts,
}
