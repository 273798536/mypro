import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbDir = path.resolve(__dirname, '..', 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.join(dbDir, 'animal_analysis.db')

export const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reagent_registry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_number TEXT NOT NULL UNIQUE,
      reagent_name TEXT NOT NULL,
      supplier TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS sampling_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_code TEXT NOT NULL UNIQUE,
      location_name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS culture_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      animal_id TEXT NOT NULL,
      experiment_group TEXT NOT NULL,
      sampling_location TEXT,
      reagent_batch TEXT NOT NULL,
      expected_batch TEXT NOT NULL,
      culture_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'normal',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sampling_location) REFERENCES sampling_locations(location_code)
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      suggestion TEXT NOT NULL,
      suggestion_detail TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (record_id) REFERENCES culture_records(id)
    );

    CREATE TABLE IF NOT EXISTS trajectory_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      animal_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      experiment_group TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trajectory_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,
      timestamp REAL NOT NULL,
      speed REAL NOT NULL,
      region TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES trajectory_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS trajectory_annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      point_index INTEGER NOT NULL,
      label TEXT NOT NULL,
      detail TEXT NOT NULL,
      type TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES trajectory_sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_culture_records_status ON culture_records(status);
    CREATE INDEX IF NOT EXISTS idx_culture_records_group ON culture_records(experiment_group);
    CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies(type);
    CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
    CREATE INDEX IF NOT EXISTS idx_anomalies_record_id ON anomalies(record_id);
    CREATE INDEX IF NOT EXISTS idx_trajectory_points_session ON trajectory_points(session_id);
    CREATE INDEX IF NOT EXISTS idx_trajectory_annotations_session ON trajectory_annotations(session_id);
  `)
}

function seedReagentRegistry() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM reagent_registry').get() as { cnt: number }
  if (count.cnt > 0) return

  const insert = db.prepare(
    `INSERT INTO reagent_registry (batch_number, reagent_name, supplier, expiry_date, status) VALUES (?, ?, ?, ?, ?)`
  )

  const reagents = [
    ['RB-2024-001', 'DMEM培养基', 'Gibco', '2025-06-30', 'active'],
    ['RB-2024-002', 'FBS胎牛血清', 'Sigma-Aldrich', '2025-03-15', 'active'],
    ['RB-2024-003', '胰蛋白酶-EDTA', 'Thermo Fisher', '2025-09-20', 'active'],
    ['RB-2024-004', 'PBS缓冲液', 'HyClone', '2025-12-01', 'active'],
    ['RB-2024-005', '青霉素-链霉素', 'Biosharp', '2025-08-10', 'expired'],
  ]

  const tx = db.transaction(() => {
    for (const r of reagents) insert.run(...r)
  })
  tx()
}

function seedSamplingLocations() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM sampling_locations').get() as { cnt: number }
  if (count.cnt > 0) return

  const insert = db.prepare(
    `INSERT INTO sampling_locations (location_code, location_name, description) VALUES (?, ?, ?)`
  )

  const locations = [
    ['LOC-A', 'A区实验室', '主实验楼3层A区，恒温恒湿'],
    ['LOC-B', 'B区实验室', '主实验楼3层B区，标准环境'],
    ['LOC-C', 'C区观察室', '辅楼2层，行为学观察专用'],
    ['LOC-D', 'D区采样站', '辅楼1层，采样与处理专用'],
  ]

  const tx = db.transaction(() => {
    for (const l of locations) insert.run(...l)
  })
  tx()
}

function seedCultureRecords() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM culture_records').get() as { cnt: number }
  if (count.cnt > 0) return

  const groups = ['对照组', '低剂量组', '中剂量组', '高剂量组']
  const locations = ['LOC-A', 'LOC-B', 'LOC-C', 'LOC-D', null]
  const batches = ['RB-2024-001', 'RB-2024-002', 'RB-2024-003', 'RB-2024-004', 'RB-2024-005']

  const insertRecord = db.prepare(
    `INSERT INTO culture_records (animal_id, experiment_group, sampling_location, reagent_batch, expected_batch, culture_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  const insertAnomaly = db.prepare(
    `INSERT INTO anomalies (record_id, type, description, suggestion, suggestion_detail, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  const tx = db.transaction(() => {
    for (let i = 0; i < 20; i++) {
      const groupIdx = i % 4
      const group = groups[groupIdx]
      const animalId = `ANM-${String(i + 1).padStart(3, '0')}`
      const locIdx = i % 5
      const samplingLocation = locations[locIdx]
      const reagentBatch = batches[i % 5]
      const expectedBatch = batches[groupIdx]
      const date = new Date(2024, 0, i + 1)
      const cultureDate = date.toISOString().slice(0, 10)

      let status: string = 'normal'

      if (reagentBatch !== expectedBatch) {
        status = 'anomaly'
      } else if (!samplingLocation) {
        status = 'pending_review'
      }

      const result = insertRecord.run(
        animalId, group, samplingLocation, reagentBatch, expectedBatch, cultureDate, status
      )

      const recordId = result.lastInsertRowid as number

      if (reagentBatch !== expectedBatch) {
        let anomalyType: string
        let description: string
        let suggestion: string
        let suggestionDetail: string

        if (!samplingLocation) {
          anomalyType = 'boundary_unclear'
          description = `标注边界不清: 采样地点缺失，无法确认实验边界`
          suggestion = '补充材料'
          suggestionDetail = `记录${animalId}的采样地点为空且试剂批次不匹配，请补充采样地点信息并确认实验边界`
        } else {
          anomalyType = 'batch_mismatch'
          description = `试剂批次不匹配: 实际${reagentBatch}, 预期${expectedBatch}`
          suggestion = '修改口径'
          suggestionDetail = `记录${animalId}实际使用试剂批次${reagentBatch}与预期批次${expectedBatch}不一致，请确认试剂使用是否正确并调整实验口径`
        }

        insertAnomaly.run(
          recordId, anomalyType, description,
          suggestion, suggestionDetail, 'pending',
          new Date().toISOString().slice(0, 19).replace('T', ' ')
        )
      }

      if (!samplingLocation && reagentBatch === expectedBatch) {
        insertAnomaly.run(
          recordId, 'data_missing', '采样地点信息缺失', '重新采样',
          `记录${animalId}缺少采样地点信息，请补充或重新采样`,
          'pending',
          new Date().toISOString().slice(0, 19).replace('T', ' ')
        )
      }
    }
  })
  tx()
}

function seedTrajectoryData() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM trajectory_sessions').get() as { cnt: number }
  if (count.cnt > 0) return

  const insertSession = db.prepare(
    `INSERT INTO trajectory_sessions (animal_id, session_id, experiment_group, start_time, end_time)
     VALUES (?, ?, ?, ?, ?)`
  )

  const insertPoint = db.prepare(
    `INSERT INTO trajectory_points (session_id, x, y, z, timestamp, speed, region)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  const insertAnnotation = db.prepare(
    `INSERT INTO trajectory_annotations (session_id, point_index, label, detail, type)
     VALUES (?, ?, ?, ?, ?)`
  )

  function getRegion(x: number, y: number): string {
    const inCorner = (cx: number, cy: number) => Math.abs(x - cx) < 0.5 && Math.abs(y - cy) < 0.5

    if (inCorner(0.0, 2.0)) return 'corner-NW'
    if (inCorner(2.0, 2.0)) return 'corner-NE'
    if (inCorner(0.0, 0.0)) return 'corner-SW'
    if (inCorner(2.0, 0.0)) return 'corner-SE'
    if (y > 1.7 && x > 0.5 && x < 1.5) return 'edge-N'
    if (y < 0.3 && x > 0.5 && x < 1.5) return 'edge-S'
    if (x > 1.7 && y > 0.5 && y < 1.5) return 'edge-E'
    if (x < 0.3 && y > 0.5 && y < 1.5) return 'edge-W'
    return 'center'
  }

  const sessions = [
    { animalId: 'ANM-001', sessionId: 'SES-001', group: '对照组' },
    { animalId: 'ANM-005', sessionId: 'SES-005', group: '低剂量组' },
    { animalId: 'ANM-009', sessionId: 'SES-009', group: '中剂量组' },
  ]

  const tx = db.transaction(() => {
    for (const s of sessions) {
      const startTime = new Date(2024, 2, 15, 9, 0, 0)
      const endTime = new Date(2024, 2, 15, 9, 20, 0)

      const result = insertSession.run(
        s.animalId, s.sessionId, s.group,
        startTime.toISOString().slice(0, 19).replace('T', ' '),
        endTime.toISOString().slice(0, 19).replace('T', ' ')
      )

      const sessionId = result.lastInsertRowid as number

      let prevX = 1.0
      let prevY = 1.0
      const points: { x: number; y: number; z: number; timestamp: number; speed: number; region: string }[] = []

      for (let i = 0; i < 50; i++) {
        const dx = (Math.random() - 0.5) * 0.3
        const dy = (Math.random() - 0.5) * 0.3
        let x = Math.max(0, Math.min(2, prevX + dx))
        let y = Math.max(0, Math.min(2, prevY + dy))

        const z = 0.01 + Math.random() * 0.05
        const timestamp = i * 24
        const dist = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2)
        const speed = dist / 0.4
        const region = getRegion(x, y)

        insertPoint.run(sessionId, x, y, z, timestamp, speed, region)
        points.push({ x, y, z, timestamp, speed, region })

        prevX = x
        prevY = y
      }

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        const speedChange = Math.abs(curr.speed - prev.speed)

        if (speedChange > 0.3) {
          insertAnnotation.run(
            sessionId, i,
            curr.speed > prev.speed ? '速度加快' : '速度减慢',
            `速度从${prev.speed.toFixed(2)}变为${curr.speed.toFixed(2)}`,
            'speed_change'
          )
        }

        if (curr.region !== prev.region) {
          insertAnnotation.run(
            sessionId, i,
            `进入${curr.region}`,
            `从${prev.region}移动到${curr.region}`,
            'region_entry'
          )
        }
      }
    }
  })
  tx()
}

export function seedData() {
  seedReagentRegistry()
  seedSamplingLocations()
  seedCultureRecords()
  seedTrajectoryData()
}

export function checkAndCreateAnomaly(recordId: number, reagentBatch: string, expectedBatch: string, samplingLocation: string | null, animalId: string) {
  const existing = db.prepare('SELECT id FROM anomalies WHERE record_id = ? AND status = ?').all(recordId, 'pending') as { id: number }[]

  if (reagentBatch !== expectedBatch) {
    let anomalyType: string
    let description: string
    let suggestion: string
    let suggestionDetail: string

    if (!samplingLocation) {
      anomalyType = 'boundary_unclear'
      description = `标注边界不清: 采样地点缺失，无法确认实验边界`
      suggestion = '补充材料'
      suggestionDetail = `记录${animalId}的采样地点为空且试剂批次不匹配，请补充采样地点信息并确认实验边界`
    } else {
      anomalyType = 'batch_mismatch'
      description = `试剂批次不匹配: 实际${reagentBatch}, 预期${expectedBatch}`
      suggestion = '修改口径'
      suggestionDetail = `记录${animalId}实际使用试剂批次${reagentBatch}与预期批次${expectedBatch}不一致，请确认试剂使用是否正确并调整实验口径`
    }

    const alreadyExists = existing.some(a => {
      const detail = db.prepare('SELECT type FROM anomalies WHERE id = ?').get(a.id) as { type: string } | undefined
      return detail?.type === anomalyType
    })

    if (!alreadyExists) {
      db.prepare(
        `INSERT INTO anomalies (record_id, type, description, suggestion, suggestion_detail, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        recordId, anomalyType, description,
        suggestion, suggestionDetail, 'pending',
        new Date().toISOString().slice(0, 19).replace('T', ' ')
      )
    }
    return true
  }

  if (!samplingLocation) {
    const alreadyExists = existing.some(a => {
      const detail = db.prepare('SELECT type FROM anomalies WHERE id = ?').get(a.id) as { type: string } | undefined
      return detail?.type === 'data_missing'
    })

    if (!alreadyExists) {
      db.prepare(
        `INSERT INTO anomalies (record_id, type, description, suggestion, suggestion_detail, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        recordId, 'data_missing', '采样地点信息缺失', '重新采样',
        `记录${animalId}缺少采样地点信息，请补充或重新采样`,
        'pending',
        new Date().toISOString().slice(0, 19).replace('T', ' ')
      )
    }
    return true
  }

  return false
}
