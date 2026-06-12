import { getDatabase } from '../database/index.js'

export type RiskLevel = 'high' | 'medium' | 'low'
export type ActionType = 'supplement' | 'adjust' | 'normal'
export type DataStatus = 'available' | 'pending' | 'recollect'

export interface RiskFactor {
  name: string
  weight: number
  value: number
}

export interface RiskRecord {
  id: string
  equipmentId: string
  equipmentName: string
  platformId: string
  platformName: string
  riskLevel: RiskLevel
  riskScore: number
  factors: RiskFactor[]
  action: ActionType
  dataStatus: DataStatus
  lastCheck: string
  createdAt: string
}

export interface RiskOverview {
  high: number
  medium: number
  low: number
  available: number
  pending: number
  recollect: number
}

export function getRisks(params: {
  level?: RiskLevel
  platformId?: string
  batchId?: string
  page?: number
  pageSize?: number
}): { total: number; items: RiskRecord[] } {
  const db = getDatabase()
  const page = params.page || 1
  const pageSize = params.pageSize || 20
  const offset = (page - 1) * pageSize

  const whereClauses: string[] = ['1=1']
  const queryParams: any[] = []

  if (params.level) {
    whereClauses.push('r.risk_level = ?')
    queryParams.push(params.level)
  }
  if (params.platformId) {
    whereClauses.push('e.platform_id = ?')
    queryParams.push(params.platformId)
  }
  if (params.batchId) {
    whereClauses.push('r.batch_id = ?')
    queryParams.push(params.batchId)
  }

  const whereSql = 'WHERE ' + whereClauses.join(' AND ')

  const countSql = `
    SELECT COUNT(*) as count FROM risk_records r
    INNER JOIN equipment e ON r.equipment_id = e.id
    ${whereSql}
  `
  const total = (db.prepare(countSql).get(...queryParams) as { count: number }).count

  const listSql = `
    SELECT 
      r.id,
      r.equipment_id as equipmentId,
      e.name as equipmentName,
      e.platform_id as platformId,
      p.name as platformName,
      r.risk_level as riskLevel,
      r.risk_score as riskScore,
      r.factors_json as factorsJson,
      r.action,
      r.data_status as dataStatus,
      r.created_at as createdAt,
      b.created_at as lastCheck
    FROM risk_records r
    INNER JOIN equipment e ON r.equipment_id = e.id
    INNER JOIN platforms p ON e.platform_id = p.id
    INNER JOIN check_batches b ON r.batch_id = b.id
    ${whereSql}
    ORDER BY 
      CASE r.risk_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      r.risk_score DESC
    LIMIT ? OFFSET ?
  `
  const rows = db.prepare(listSql).all(...queryParams, pageSize, offset) as any[]

  const items: RiskRecord[] = rows.map((row: any) => ({
    id: row.id,
    equipmentId: row.equipmentId,
    equipmentName: row.equipmentName,
    platformId: row.platformId,
    platformName: row.platformName,
    riskLevel: row.riskLevel as RiskLevel,
    riskScore: row.riskScore,
    factors: JSON.parse(row.factorsJson) as RiskFactor[],
    action: row.action as ActionType,
    dataStatus: row.dataStatus as DataStatus,
    lastCheck: row.lastCheck,
    createdAt: row.createdAt,
  }))

  return { total, items }
}

export function getRiskOverview(batchId?: string): RiskOverview {
  const db = getDatabase()

  let sql: string
  let params: any[] = []

  if (batchId) {
    sql = `
      SELECT 
        risk_level, data_status, COUNT(*) as count
      FROM risk_records
      WHERE batch_id = ?
      GROUP BY risk_level, data_status
    `
    params.push(batchId)
  } else {
    sql = `
      SELECT 
        risk_level, data_status, COUNT(*) as count
      FROM risk_records
      GROUP BY risk_level, data_status
    `
  }

  const rows = db.prepare(sql).all(...params) as { risk_level: string; data_status: string; count: number }[]

  const overview: RiskOverview = {
    high: 0,
    medium: 0,
    low: 0,
    available: 0,
    pending: 0,
    recollect: 0,
  }

  for (const row of rows) {
    if (row.risk_level === 'high') overview.high += row.count
    if (row.risk_level === 'medium') overview.medium += row.count
    if (row.risk_level === 'low') overview.low += row.count
    if (row.data_status === 'available') overview.available += row.count
    if (row.data_status === 'pending') overview.pending += row.count
    if (row.data_status === 'recollect') overview.recollect += row.count
  }

  return overview
}

export function calculateRisks(batchId: string): { count: number } {
  const db = getDatabase()

  const checkBatch = db.prepare('SELECT id FROM check_batches WHERE id = ?').get(batchId)
  if (!checkBatch) {
    throw new Error('Batch not found')
  }

  const deleteOld = db.prepare('DELETE FROM risk_records WHERE batch_id = ?')
  deleteOld.run(batchId)

  const equipmentSql = `
    SELECT DISTINCT equipment_id FROM tide_data WHERE batch_id = ?
    UNION
    SELECT DISTINCT equipment_id FROM buoy_data WHERE batch_id = ?
  `
  const equipmentRows = db.prepare(equipmentSql).all(batchId, batchId) as { equipment_id: string }[]

  const conflictCountSql = `
    SELECT COUNT(*) as count FROM conflict_records
    WHERE batch_id = ? AND equipment_id = ? AND severity = 'high'
  `

  const avgTideSql = `
    SELECT AVG(tide_level) as avg_level FROM tide_data
    WHERE batch_id = ? AND equipment_id = ?
  `

  const avgWaveSql = `
    SELECT AVG(wave_height) as avg_height FROM buoy_data
    WHERE batch_id = ? AND equipment_id = ?
  `

  const avgWindSql = `
    SELECT AVG(wind_speed) as avg_speed FROM buoy_data
    WHERE batch_id = ? AND equipment_id = ?
  `

  const completenessSql = `
    SELECT 
      (SELECT COUNT(*) FROM tide_data WHERE batch_id = ? AND equipment_id = ?) as tide_count,
      (SELECT COUNT(*) FROM buoy_data WHERE batch_id = ? AND equipment_id = ?) as buoy_count
  `

  const insertRisk = db.prepare(`
    INSERT INTO risk_records (id, equipment_id, batch_id, risk_level, risk_score, factors_json, action, data_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let count = 0
  const tx = db.transaction(() => {
    for (const eq of equipmentRows) {
      const equipmentId = eq.equipment_id

      const highConflicts = (db.prepare(conflictCountSql).get(batchId, equipmentId) as { count: number }).count
      const tideResult = db.prepare(avgTideSql).get(batchId, equipmentId) as { avg_level?: number }
      const waveResult = db.prepare(avgWaveSql).get(batchId, equipmentId) as { avg_height?: number }
      const windResult = db.prepare(avgWindSql).get(batchId, equipmentId) as { avg_speed?: number }
      const completeness = db.prepare(completenessSql).get(batchId, equipmentId, batchId, equipmentId) as { tide_count: number; buoy_count: number }

      const tideDeviation = Math.min(100, highConflicts * 30 + 20)
      const waveRisk = waveResult.avg_height ? Math.min(100, waveResult.avg_height * 25) : 50
      const windRisk = windResult.avg_speed ? Math.min(100, windResult.avg_speed * 3) : 50
      const equipmentHealth = 70 + Math.random() * 20
      const dataCompleteness = completeness.tide_count > 0 && completeness.buoy_count > 0 
        ? 85 + Math.random() * 10 
        : 40 + Math.random() * 20

      const factors = [
        { name: '潮汐偏差', weight: 30, value: Math.round(tideDeviation) },
        { name: '浪高风险', weight: 25, value: Math.round(waveRisk) },
        { name: '风速影响', weight: 20, value: Math.round(windRisk) },
        { name: '设备健康度', weight: 15, value: Math.round(equipmentHealth) },
        { name: '数据完整度', weight: 10, value: Math.round(dataCompleteness) },
      ]

      const riskScore = factors.reduce((sum, f) => sum + f.value * f.weight / 100, 0)

      let riskLevel: RiskLevel = 'low'
      let action: ActionType = 'normal'
      let dataStatus: DataStatus = 'available'

      if (riskScore > 75) {
        riskLevel = 'high'
        action = highConflicts > 0 ? 'adjust' : 'supplement'
        dataStatus = action === 'supplement' ? 'recollect' : 'pending'
      } else if (riskScore > 55) {
        riskLevel = 'medium'
        dataStatus = dataCompleteness < 70 ? 'pending' : 'available'
      }

      insertRisk.run(
        `risk_${Date.now()}_${count}`,
        equipmentId,
        batchId,
        riskLevel,
        Math.round(riskScore * 10) / 10,
        JSON.stringify(factors),
        action,
        dataStatus
      )
      count++
    }
  })

  tx()

  return { count }
}

export default {
  getRisks,
  getRiskOverview,
  calculateRisks,
}
