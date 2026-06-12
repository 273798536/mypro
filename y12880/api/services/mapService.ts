import { getDatabase } from '../database/index.js'
import type { RiskLevel } from './riskService.js'

export interface PlatformPoint {
  id: string
  name: string
  lng: number
  lat: number
  riskLevel: RiskLevel
  equipmentCount: number
  description?: string
}

export interface SeaLayerData {
  type: string
  timestamp: string
  dataPoints: Array<{ lng: number; lat: number; value: number }>
}

export function getPlatforms(): { items: PlatformPoint[] } {
  const db = getDatabase()

  const sql = `
    SELECT 
      p.id,
      p.name,
      p.lng,
      p.lat,
      p.description,
      COUNT(e.id) as equipmentCount,
      COALESCE(
        (SELECT r.risk_level FROM risk_records r 
         INNER JOIN equipment e2 ON r.equipment_id = e2.id 
         WHERE e2.platform_id = p.id 
         ORDER BY CASE r.risk_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
         LIMIT 1), 
        'low'
      ) as riskLevel
    FROM platforms p
    LEFT JOIN equipment e ON p.id = e.platform_id
    GROUP BY p.id
    ORDER BY p.name
  `

  const rows = db.prepare(sql).all() as any[]

  const items: PlatformPoint[] = rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    lng: row.lng,
    lat: row.lat,
    riskLevel: row.riskLevel as RiskLevel,
    equipmentCount: row.equipmentCount,
    description: row.description || undefined,
  }))

  return { items }
}

export function getPlatformDetail(platformId: string): {
  platform: PlatformPoint
  equipment: Array<{
    id: string
    name: string
    type: string
    riskLevel: RiskLevel
    riskScore: number
    dataStatus: string
  }>
} {
  const db = getDatabase()

  const platformSql = `
    SELECT 
      p.id,
      p.name,
      p.lng,
      p.lat,
      p.description,
      COUNT(e.id) as equipmentCount,
      'low' as riskLevel
    FROM platforms p
    LEFT JOIN equipment e ON p.id = e.platform_id
    WHERE p.id = ?
    GROUP BY p.id
  `
  const platform = db.prepare(platformSql).get(platformId) as any

  if (!platform) {
    throw new Error('Platform not found')
  }

  const equipmentSql = `
    SELECT 
      e.id,
      e.name,
      e.type,
      COALESCE(r.risk_level, 'low') as riskLevel,
      COALESCE(r.risk_score, 0) as riskScore,
      COALESCE(r.data_status, 'available') as dataStatus
    FROM equipment e
    LEFT JOIN risk_records r ON e.id = r.equipment_id
    WHERE e.platform_id = ?
    ORDER BY 
      CASE COALESCE(r.risk_level, 'low') WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      e.name
  `
  const equipmentRows = db.prepare(equipmentSql).all(platformId) as any[]

  let overallRisk: RiskLevel = 'low'
  for (const eq of equipmentRows) {
    if (eq.riskLevel === 'high') {
      overallRisk = 'high'
      break
    }
    if (eq.riskLevel === 'medium') {
      overallRisk = 'medium'
    }
  }

  return {
    platform: {
      id: platform.id,
      name: platform.name,
      lng: platform.lng,
      lat: platform.lat,
      riskLevel: overallRisk,
      equipmentCount: platform.equipmentCount,
      description: platform.description || undefined,
    },
    equipment: equipmentRows.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      riskLevel: row.riskLevel as RiskLevel,
      riskScore: row.riskScore,
      dataStatus: row.dataStatus,
    })),
  }
}

export function getSeaLayer(type: 'tide' | 'wave' | 'wind', time?: string): SeaLayerData {
  const db = getDatabase()

  const timestamp = time || new Date().toISOString().slice(0, 10) + ' 12:00:00'

  const platformsSql = 'SELECT id, lng, lat FROM platforms'
  const platforms = db.prepare(platformsSql).all() as { id: string; lng: number; lat: number }[]

  const dataPoints: Array<{ lng: number; lat: number; value: number }> = []

  const valueSqlByType: Record<string, string> = {
    tide: 'SELECT AVG(tide_level) as val FROM tide_data WHERE equipment_id IN (SELECT id FROM equipment WHERE platform_id = ?)',
    wave: 'SELECT AVG(wave_height) as val FROM buoy_data WHERE equipment_id IN (SELECT id FROM equipment WHERE platform_id = ?)',
    wind: 'SELECT AVG(wind_speed) as val FROM buoy_data WHERE equipment_id IN (SELECT id FROM equipment WHERE platform_id = ?)',
  }

  for (const plat of platforms) {
    const result = db.prepare(valueSqlByType[type]).get(plat.id) as { val?: number }
    const value = result.val || 0

    dataPoints.push({ lng: plat.lng, lat: plat.lat, value: Math.round(value * 100) / 100 })

    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 + plat.lng) * Math.PI / 3
      const dist = 0.05 + Math.random() * 0.1
      dataPoints.push({
        lng: plat.lng + Math.cos(angle) * dist,
        lat: plat.lat + Math.sin(angle) * dist,
        value: Math.round((value * (0.8 + Math.random() * 0.4)) * 100) / 100,
      })
    }
  }

  return {
    type,
    timestamp,
    dataPoints,
  }
}

export default {
  getPlatforms,
  getPlatformDetail,
  getSeaLayer,
}
