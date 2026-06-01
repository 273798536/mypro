import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'windtunnel.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS batch (
    id TEXT PRIMARY KEY,
    batch_no TEXT NOT NULL UNIQUE,
    model_no TEXT NOT NULL,
    wind_tunnel_no TEXT NOT NULL,
    test_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS material (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    anomaly_flag INTEGER NOT NULL DEFAULT 0,
    anomaly_type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (batch_id) REFERENCES batch(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS anomaly (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    material_id TEXT NOT NULL,
    type TEXT NOT NULL,
    trigger_source TEXT NOT NULL,
    stuck_step TEXT NOT NULL,
    next_action TEXT NOT NULL,
    resolution TEXT,
    zero_correction_spec TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (batch_id) REFERENCES batch(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES material(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS lift_drag_result (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL UNIQUE,
    points TEXT NOT NULL,
    zero_correction_applied INTEGER NOT NULL DEFAULT 0,
    zero_correction_value REAL NOT NULL DEFAULT 0,
    calculation_note TEXT,
    calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (batch_id) REFERENCES batch(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS report (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    include_zero_correction INTEGER NOT NULL DEFAULT 1,
    include_anomaly_record INTEGER NOT NULL DEFAULT 1,
    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
    pdf_url TEXT,
    FOREIGN KEY (batch_id) REFERENCES batch(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS status_log (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    operator TEXT NOT NULL DEFAULT 'system',
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (batch_id) REFERENCES batch(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_material_batch ON material(batch_id);
  CREATE INDEX IF NOT EXISTS idx_anomaly_batch ON anomaly(batch_id);
  CREATE INDEX IF NOT EXISTS idx_anomaly_status ON anomaly(status);
  CREATE INDEX IF NOT EXISTS idx_anomaly_type ON anomaly(type);
  CREATE INDEX IF NOT EXISTS idx_batch_status ON batch(status);
  CREATE INDEX IF NOT EXISTS idx_batch_model ON batch(model_no);
`)

function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as count FROM batch').get() as { count: number }
  if (count.count > 0) return

  const insertBatch = db.prepare(`INSERT INTO batch (id, batch_no, model_no, wind_tunnel_no, test_date, status) VALUES (?, ?, ?, ?, ?, ?)`)
  const insertMaterial = db.prepare(`INSERT INTO material (id, batch_id, type, name, data, anomaly_flag, anomaly_type) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  const insertAnomaly = db.prepare(`INSERT INTO anomaly (id, batch_id, material_id, type, trigger_source, stuck_step, next_action, resolution, zero_correction_spec, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const insertResult = db.prepare(`INSERT INTO lift_drag_result (id, batch_id, points, zero_correction_applied, zero_correction_value, calculation_note, calculated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  const insertStatusLog = db.prepare(`INSERT INTO status_log (id, batch_id, from_status, to_status, operator, note) VALUES (?, ?, ?, ?, ?, ?)`)
  const insertReport = db.prepare(`INSERT INTO report (id, batch_id, include_zero_correction, include_anomaly_record, generated_at) VALUES (?, ?, ?, ?, ?)`)

  const rho = 1.225
  const V = 60
  const S = 1.0
  const q = 0.5 * rho * V * V * S

  const transaction = db.transaction(() => {
    const batch1Id = uuidv4()
    insertBatch.run(batch1Id, 'WT-20260515-001', 'M-720A', 'WT-03', '2026-05-15', 'completed')

    const mat1Id = uuidv4()
    const angles1 = [-5, -3, -1, 0, 2, 4, 6, 8, 10, 12, 15, 18, 20]
    insertMaterial.run(mat1Id, batch1Id, 'angle_of_attack', '攻角数据-001', JSON.stringify({ angles: angles1 }), 0, null)

    const mat2Id = uuidv4()
    const liftForce1 = [-200, -100, 5, 55, 185, 355, 525, 685, 825, 935, 1055, 1105, 1085]
    const dragForce1 = [82, 62, 52, 47, 52, 62, 78, 105, 145, 205, 325, 485, 655]
    insertMaterial.run(mat2Id, batch1Id, 'force_sensor', '力传感器数据-001', JSON.stringify({ zeroOffset: 0.05, sampleRate: 200, liftForce: liftForce1, dragForce: dragForce1 }), 0, null)

    const mat3Id = uuidv4()
    insertMaterial.run(mat3Id, batch1Id, 'curve_report', '曲线报告-001', JSON.stringify({ source: 'imported', originalFormat: 'csv' }), 0, null)

    const zeroCorrection1 = 0.05
    const points1 = angles1.map((alpha, i) => ({
      alpha,
      Cl: parseFloat(((liftForce1[i] - zeroCorrection1) / q).toFixed(4)),
      Cd: parseFloat(((dragForce1[i] - zeroCorrection1) / q).toFixed(4))
    }))
    insertResult.run(uuidv4(), batch1Id, JSON.stringify(points1), 1, zeroCorrection1, 'Applied zeroOffset correction: 0.05N', '2026-05-15T14:30:00')

    insertStatusLog.run(uuidv4(), batch1Id, 'pending_review', 'completed', 'system', 'No anomalies detected, auto-completed')

    insertReport.run(uuidv4(), batch1Id, 1, 1, '2026-05-15T15:00:00')

    const batch2Id = uuidv4()
    insertBatch.run(batch2Id, 'WT-20260520-002', 'M-930B', 'WT-03', '2026-05-20', 'anomaly')

    const mat4Id = uuidv4()
    const angles2 = [-5, -3, -1, 0, 2, 4, 6, 8, 10, 12, 15, 18, 20]
    insertMaterial.run(mat4Id, batch2Id, 'angle_of_attack', '攻角数据-002', JSON.stringify({ angles: angles2 }), 0, null)

    const mat5Id = uuidv4()
    const liftForce2 = [-165, -60, 50, 105, 240, 410, 580, 740, 880, 990, 1110, 1160, 1140]
    const dragForce2 = [110, 90, 80, 75, 80, 90, 105, 132, 172, 232, 352, 512, 682]
    insertMaterial.run(mat5Id, batch2Id, 'force_sensor', '力传感器数据-002', JSON.stringify({ zeroOffset: 0.82, sampleRate: 200, liftForce: liftForce2, dragForce: dragForce2 }), 1, 'zero_drift')

    insertAnomaly.run(uuidv4(), batch2Id, mat5Id, 'zero_drift', 'auto_detection', 'material_upload', 'Apply zero correction or recalibrate sensor', null, null, 'open')

    insertStatusLog.run(uuidv4(), batch2Id, 'pending_review', 'anomaly', 'system', 'Zero drift anomaly detected')

    const batch3Id = uuidv4()
    insertBatch.run(batch3Id, 'WT-20260528-003', 'M-450C', 'WT-01', '2026-05-28', 'pending_review')

    const mat6Id = uuidv4()
    const angles3 = [-12, -5, 0, 5, 10, 15, 20, 25, 28, 30]
    insertMaterial.run(mat6Id, batch3Id, 'angle_of_attack', '攻角数据-003', JSON.stringify({ angles: angles3 }), 1, 'angle_exceed')

    const mat7Id = uuidv4()
    const liftForce3 = [-450, -180, 60, 350, 650, 920, 1100, 1200, 1180, 1150]
    const dragForce3 = [150, 80, 48, 70, 145, 300, 500, 750, 900, 1000]
    insertMaterial.run(mat7Id, batch3Id, 'force_sensor', '力传感器数据-003', JSON.stringify({ zeroOffset: 0.15, sampleRate: 80, liftForce: liftForce3, dragForce: dragForce3 }), 1, 'speed_missing')

    insertAnomaly.run(uuidv4(), batch3Id, mat6Id, 'angle_exceed', 'auto_detection', 'material_upload', 'Review angle of attack data, remove out-of-range points', null, null, 'open')

    insertAnomaly.run(uuidv4(), batch3Id, mat7Id, 'speed_missing', 'auto_detection', 'material_upload', 'Increase sample rate or use alternative sensor data', null, null, 'open')
  })

  transaction()
}

seedDatabase()

export default db
