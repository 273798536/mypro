import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = path.resolve(__dirname, '../../data')
const DB_PATH = path.join(DB_DIR, 'inspection.db')

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  return db
}

export function initDatabase(): void {
  const database = getDatabase()

  database.exec(`
    CREATE TABLE IF NOT EXISTS platforms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lng REAL NOT NULL,
      lat REAL NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      platform_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (platform_id) REFERENCES platforms(id)
    );

    CREATE TABLE IF NOT EXISTS check_batches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'processing',
      data_completeness REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tide_data (
      id TEXT PRIMARY KEY,
      equipment_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      tide_level REAL NOT NULL,
      source_file TEXT NOT NULL,
      source_line INTEGER NOT NULL,
      source_remark TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id),
      FOREIGN KEY (batch_id) REFERENCES check_batches(id)
    );

    CREATE TABLE IF NOT EXISTS buoy_data (
      id TEXT PRIMARY KEY,
      equipment_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      tide_level REAL,
      wave_height REAL,
      wind_speed REAL,
      source_file TEXT NOT NULL,
      source_line INTEGER NOT NULL,
      source_image TEXT,
      source_remark TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id),
      FOREIGN KEY (batch_id) REFERENCES check_batches(id)
    );

    CREATE TABLE IF NOT EXISTS conflict_records (
      id TEXT PRIMARY KEY,
      equipment_id TEXT NOT NULL,
      tide_data_id TEXT NOT NULL,
      buoy_data_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      tide_value REAL NOT NULL,
      buoy_value REAL NOT NULL,
      diff_value REAL NOT NULL,
      diff_rate REAL NOT NULL,
      severity TEXT NOT NULL,
      explanation TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      resolution TEXT,
      resolution_remark TEXT,
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id),
      FOREIGN KEY (tide_data_id) REFERENCES tide_data(id),
      FOREIGN KEY (buoy_data_id) REFERENCES buoy_data(id),
      FOREIGN KEY (batch_id) REFERENCES check_batches(id)
    );

    CREATE TABLE IF NOT EXISTS risk_records (
      id TEXT PRIMARY KEY,
      equipment_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      risk_score REAL NOT NULL,
      factors_json TEXT NOT NULL,
      action TEXT NOT NULL,
      data_status TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id),
      FOREIGN KEY (batch_id) REFERENCES check_batches(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      title TEXT NOT NULL,
      format TEXT NOT NULL,
      file_path TEXT,
      generated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (batch_id) REFERENCES check_batches(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tide_equipment ON tide_data(equipment_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_buoy_equipment ON buoy_data(equipment_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_conflict_severity ON conflict_records(severity);
    CREATE INDEX IF NOT EXISTS idx_risk_level ON risk_records(risk_level);
  `)

  seedInitialData(database)
}

function seedInitialData(database: Database.Database): void {
  const platformCount = database.prepare('SELECT COUNT(*) as count FROM platforms').get() as { count: number }
  if (platformCount.count > 0) return

  const insertPlatform = database.prepare(`
    INSERT INTO platforms (id, name, lng, lat, description) VALUES (?, ?, ?, ?, ?)
  `)
  const insertEquipment = database.prepare(`
    INSERT INTO equipment (id, name, platform_id, type) VALUES (?, ?, ?, ?)
  `)
  const insertBatch = database.prepare(`
    INSERT INTO check_batches (id, name, status, data_completeness, completed_at) VALUES (?, ?, ?, ?, ?)
  `)
  const insertTide = database.prepare(`
    INSERT INTO tide_data (id, equipment_id, batch_id, timestamp, tide_level, source_file, source_line, source_remark) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertBuoy = database.prepare(`
    INSERT INTO buoy_data (id, equipment_id, batch_id, timestamp, tide_level, wave_height, wind_speed, source_file, source_line, source_image, source_remark) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertConflict = database.prepare(`
    INSERT INTO conflict_records (id, equipment_id, tide_data_id, buoy_data_id, batch_id, timestamp, tide_value, buoy_value, diff_value, diff_rate, severity, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertRisk = database.prepare(`
    INSERT INTO risk_records (id, equipment_id, batch_id, risk_level, risk_score, factors_json, action, data_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const tx = database.transaction(() => {
    insertPlatform.run('plat_001', '东海一号平台', 123.456, 30.123, '离岸风电平台A区')
    insertPlatform.run('plat_002', '东海二号平台', 123.789, 30.456, '离岸风电平台B区')
    insertPlatform.run('plat_003', '南海一号平台', 114.567, 22.345, '油气作业平台')
    insertPlatform.run('plat_004', '渤海测站C', 120.123, 38.456, '海洋环境监测站')

    insertEquipment.run('eq_001', '风机A1', 'plat_001', 'wind_turbine')
    insertEquipment.run('eq_002', '风机A2', 'plat_001', 'wind_turbine')
    insertEquipment.run('eq_003', '升压站B', 'plat_001', 'substation')
    insertEquipment.run('eq_004', '风机B1', 'plat_002', 'wind_turbine')
    insertEquipment.run('eq_005', '风机B2', 'plat_002', 'wind_turbine')
    insertEquipment.run('eq_006', '钻机C1', 'plat_003', 'drilling_rig')
    insertEquipment.run('eq_007', '储油罐C2', 'plat_003', 'storage_tank')
    insertEquipment.run('eq_008', '测波仪D1', 'plat_004', 'sensor')

    insertBatch.run('batch_2026_06_01', '2026年6月第1次点检', 'completed', 0.92, '2026-06-01 18:00:00')
    insertBatch.run('batch_2026_06_12', '2026年6月第2次点检', 'processing', 0.78, null)

    const baseTime = '2026-06-12'
    const equipmentList = ['eq_001', 'eq_002', 'eq_003', 'eq_004', 'eq_005', 'eq_006', 'eq_007', 'eq_008']
    const equipmentNames = ['风机A1', '风机A2', '升压站B', '风机B1', '风机B2', '钻机C1', '储油罐C2', '测波仪D1']
    const baseLevels = [2.5, 2.6, 2.4, 2.7, 2.55, 2.3, 2.45, 2.65]

    let tideIdx = 1
    let buoyIdx = 1
    let conflictIdx = 1
    let riskIdx = 1

    for (let i = 0; i < equipmentList.length; i++) {
      const eqId = equipmentList[i]
      const baseLevel = baseLevels[i]
      
      for (let h = 0; h < 6; h++) {
        const hour = (h * 4) % 24
        const timestamp = `${baseTime} ${String(hour).padStart(2, '0')}:00:00`
        const tideLevel = baseLevel + Math.sin(h * 0.8) * 0.8 + (Math.random() - 0.5) * 0.2
        const hasConflict = (i === 2 && h === 2) || (i === 5 && h === 3) || (i === 7 && h === 1)
        let buoyLevel = tideLevel + (Math.random() - 0.5) * 0.15
        
        if (hasConflict) {
          buoyLevel = tideLevel * (1 + (0.15 + Math.random() * 0.2))
        }

        const tideId = `tide_${String(tideIdx).padStart(4, '0')}`
        const buoyId = `buoy_${String(buoyIdx).padStart(4, '0')}`
        
        insertTide.run(
          tideId, eqId, 'batch_2026_06_12', timestamp,
          Math.round(tideLevel * 100) / 100,
          'tide_table_2026_06.csv',
          tideIdx + 1,
          h === 0 ? '预报数据' : '实测数据'
        )

        const waveHeight = 1.2 + Math.sin(h * 0.6) * 0.8 + Math.random() * 0.3
        const windSpeed = 8 + Math.sin(h * 0.5) * 6 + Math.random() * 4
        
        insertBuoy.run(
          buoyId, eqId, 'batch_2026_06_12', timestamp,
          Math.round(buoyLevel * 100) / 100,
          Math.round(waveHeight * 100) / 100,
          Math.round(windSpeed * 10) / 10,
          'buoy_station_report.xlsx',
          buoyIdx + 3,
          hasConflict ? `buoy_photo_${buoyIdx}.jpg` : null,
          hasConflict ? '风浪预报晚到，数据可能存在偏差' : null
        )

        if (hasConflict) {
          const diffValue = Math.abs(tideLevel - buoyLevel)
          const diffRate = diffValue / Math.abs(tideLevel)
          const severity = diffRate > 0.2 ? 'high' : diffRate > 0.1 ? 'medium' : 'low'
          let explanation = ''
          if (i === 2) {
            explanation = '时段差：潮汐表整点数据与浮标每15分钟数据存在采样时间偏差，建议核对时间戳后取插值'
          } else if (i === 5) {
            explanation = '设备异常：浮标传感器近期校准过期，数据可能偏高，建议安排现场校核'
          } else {
            explanation = '风浪预报晚到：该时段浮标数据为预报补全值，与实测存在偏差，待实测数据到港后重算'
          }

          insertConflict.run(
            `conflict_${String(conflictIdx).padStart(4, '0')}`,
            eqId, tideId, buoyId, 'batch_2026_06_12', timestamp,
            Math.round(tideLevel * 100) / 100,
            Math.round(buoyLevel * 100) / 100,
            Math.round(diffValue * 100) / 100,
            Math.round(diffRate * 10000) / 100,
            severity,
            explanation
          )
          conflictIdx++
        }

        tideIdx++
        buoyIdx++
      }

      const riskScore = 40 + Math.random() * 55
      let riskLevel = 'low'
      let action = 'normal'
      let dataStatus = 'available'

      if (riskScore > 75) {
        riskLevel = 'high'
        action = i % 2 === 0 ? 'supplement' : 'adjust'
        dataStatus = action === 'supplement' ? 'recollect' : 'pending'
      } else if (riskScore > 55) {
        riskLevel = 'medium'
        action = 'normal'
        dataStatus = i % 3 === 0 ? 'pending' : 'available'
      }

      const factors = JSON.stringify([
        { name: '潮汐偏差', weight: 30, value: Math.round(20 + Math.random() * 60) },
        { name: '浪高风险', weight: 25, value: Math.round(15 + Math.random() * 70) },
        { name: '风速影响', weight: 20, value: Math.round(10 + Math.random() * 65) },
        { name: '设备健康度', weight: 15, value: Math.round(30 + Math.random() * 50) },
        { name: '数据完整度', weight: 10, value: Math.round(60 + Math.random() * 35) },
      ])

      insertRisk.run(
        `risk_${String(riskIdx).padStart(4, '0')}`,
        eqId, 'batch_2026_06_12',
        riskLevel,
        Math.round(riskScore * 10) / 10,
        factors,
        action,
        dataStatus
      )
      riskIdx++
    }
  })

  tx()
}

export default getDatabase
