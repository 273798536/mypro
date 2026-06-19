import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, '..', 'data')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'drift.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS source_materials (
  id TEXT PRIMARY KEY,
  material_type TEXT NOT NULL,
  material_ref TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  raw_payload TEXT,
  fetched_at TEXT NOT NULL,
  complete INTEGER NOT NULL DEFAULT 1,
  dedup_key TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_material_dedup ON source_materials(dedup_key);

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  snapshot_at TEXT NOT NULL,
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  raw_value TEXT,
  null_flag INTEGER NOT NULL DEFAULT 0,
  duplicate_flag INTEGER NOT NULL DEFAULT 0,
  mixed_note_flag INTEGER NOT NULL DEFAULT 0,
  parsed_enum TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS drift_records (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  current_enum TEXT NOT NULL,
  expected_enum TEXT NOT NULL,
  drift_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  confidence TEXT NOT NULL DEFAULT 'needs_review',
  severity TEXT NOT NULL DEFAULT 'medium',
  snapshot_id TEXT,
  conclusion TEXT,
  operator TEXT,
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
);

CREATE TABLE IF NOT EXISTS conclusion_refs (
  id TEXT PRIMARY KEY,
  drift_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  ref_role TEXT NOT NULL,
  FOREIGN KEY (drift_id) REFERENCES drift_records(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES source_materials(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS permission_audit (
  id TEXT PRIMARY KEY,
  audit_at TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  holder TEXT,
  material_id TEXT,
  drift_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  FOREIGN KEY (material_id) REFERENCES source_materials(id),
  FOREIGN KEY (drift_id) REFERENCES drift_records(id)
);

CREATE TABLE IF NOT EXISTS slow_query_attribution (
  id TEXT PRIMARY KEY,
  query_id TEXT NOT NULL,
  query_text TEXT,
  query_time_ms INTEGER,
  attributed_table TEXT,
  attributed_field TEXT,
  material_id TEXT,
  drift_id TEXT,
  FOREIGN KEY (material_id) REFERENCES source_materials(id),
  FOREIGN KEY (drift_id) REFERENCES drift_records(id)
);

CREATE TABLE IF NOT EXISTS rollback_records (
  id TEXT PRIMARY KEY,
  rollback_at TEXT NOT NULL,
  drift_id TEXT NOT NULL,
  conclusion TEXT,
  operator TEXT,
  source_material_ids TEXT,
  FOREIGN KEY (drift_id) REFERENCES drift_records(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS migration_executions (
  id TEXT PRIMARY KEY,
  migration_id TEXT NOT NULL,
  executed_at TEXT NOT NULL,
  duplicate_flag INTEGER NOT NULL DEFAULT 0,
  affected_table TEXT,
  affected_field TEXT,
  drift_id TEXT,
  FOREIGN KEY (drift_id) REFERENCES drift_records(id)
);

CREATE TABLE IF NOT EXISTS correction_history (
  id TEXT PRIMARY KEY,
  drift_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_state TEXT,
  after_state TEXT,
  operator TEXT,
  action_at TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (drift_id) REFERENCES drift_records(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS test_runs (
  id TEXT PRIMARY KEY,
  scenario TEXT NOT NULL,
  run_at TEXT NOT NULL,
  passed INTEGER NOT NULL,
  before_count INTEGER,
  after_count INTEGER,
  detail TEXT
);
`)

export function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM drift_records').get() as { cnt: number }
  if (count.cnt > 0) return

  const now = new Date().toISOString()
  const insertMaterial = db.prepare(`
    INSERT INTO source_materials (id, material_type, material_ref, title, summary, raw_payload, fetched_at, complete, dedup_key)
    VALUES (@id, @material_type, @material_ref, @title, @summary, @raw_payload, @fetched_at, @complete, @dedup_key)
  `)
  const insertSnapshot = db.prepare(`
    INSERT INTO snapshots (id, snapshot_at, table_name, field_name, raw_value, null_flag, duplicate_flag, mixed_note_flag, parsed_enum, notes)
    VALUES (@id, @snapshot_at, @table_name, @field_name, @raw_value, @null_flag, @duplicate_flag, @mixed_note_flag, @parsed_enum, @notes)
  `)
  const insertDrift = db.prepare(`
    INSERT INTO drift_records (id, created_at, updated_at, source_type, source_ref, table_name, field_name, current_enum, expected_enum, drift_type, status, confidence, severity, snapshot_id, conclusion, operator)
    VALUES (@id, @created_at, @updated_at, @source_type, @source_ref, @table_name, @field_name, @current_enum, @expected_enum, @drift_type, @status, @confidence, @severity, @snapshot_id, @conclusion, @operator)
  `)
  const insertConclusionRef = db.prepare(`
    INSERT INTO conclusion_refs (id, drift_id, material_id, ref_role)
    VALUES (@id, @drift_id, @material_id, @ref_role)
  `)
  const insertAudit = db.prepare(`
    INSERT INTO permission_audit (id, audit_at, permission_key, holder, material_id, drift_id, status)
    VALUES (@id, @audit_at, @permission_key, @holder, @material_id, @drift_id, @status)
  `)
  const insertSlowQuery = db.prepare(`
    INSERT INTO slow_query_attribution (id, query_id, query_text, query_time_ms, attributed_table, attributed_field, material_id, drift_id)
    VALUES (@id, @query_id, @query_text, @query_time_ms, @attributed_table, @attributed_field, @material_id, @drift_id)
  `)
  const insertRollback = db.prepare(`
    INSERT INTO rollback_records (id, rollback_at, drift_id, conclusion, operator, source_material_ids)
    VALUES (@id, @rollback_at, @drift_id, @conclusion, @operator, @source_material_ids)
  `)
  const insertMigrationExec = db.prepare(`
    INSERT INTO migration_executions (id, migration_id, executed_at, duplicate_flag, affected_table, affected_field, drift_id)
    VALUES (@id, @migration_id, @executed_at, @duplicate_flag, @affected_table, @affected_field, @drift_id)
  `)
  const insertCorrection = db.prepare(`
    INSERT INTO correction_history (id, drift_id, action, before_state, after_state, operator, action_at, note)
    VALUES (@id, @drift_id, @action, @before_state, @after_state, @operator, @action_at, @note)
  `)

  const transaction = db.transaction(() => {
    const materials = [
      { id: uuidv4(), material_type: 'migration_file', material_ref: 'migrations/001_add_user_status.sql', title: 'Add user status enum', summary: 'ALTER TABLE users ADD COLUMN status TEXT CHECK(status IN (\'active\',\'inactive\',\'suspended\'))', raw_payload: 'ALTER TABLE users ADD COLUMN status TEXT CHECK(status IN (\'active\',\'inactive\',\'suspended\'))', fetched_at: now, complete: 1, dedup_key: 'migration:001_add_user_status' },
      { id: uuidv4(), material_type: 'schema_diff', material_ref: 'schema_diff/users_2025_01.diff', title: 'Users table schema diff', summary: 'Detected enum change in users.role field', raw_payload: '- CHECK(role IN (\'admin\',\'user\'))\n+ CHECK(role IN (\'admin\',\'user\',\'moderator\'))', fetched_at: now, complete: 1, dedup_key: 'schema_diff:users_role_2025_01' },
      { id: uuidv4(), material_type: 'permission_doc', material_ref: 'docs/permissions_v2.md', title: 'Permissions v2 documentation', summary: 'Incomplete - missing moderator role definition', raw_payload: null, fetched_at: now, complete: 0, dedup_key: 'permission:docs_v2' },
      { id: uuidv4(), material_type: 'query_log', material_ref: 'logs/slow_queries_2025_01.log', title: 'Slow query log January 2025', summary: 'Contains queries referencing enum columns with unexpected values', raw_payload: 'SELECT * FROM orders WHERE status = \'cancelled\'', fetched_at: now, complete: 1, dedup_key: 'query_log:slow_2025_01' },
      { id: uuidv4(), material_type: 'migration_file', material_ref: 'migrations/002_add_order_type.sql', title: 'Add order type enum', summary: 'Incomplete migration - missing rollback script', raw_payload: null, fetched_at: now, complete: 0, dedup_key: 'migration:002_add_order_type' },
    ]
    for (const m of materials) insertMaterial.run(m)

    const snapshots = [
      { id: uuidv4(), snapshot_at: now, table_name: 'users', field_name: 'status', raw_value: 'active,inactive,suspended,pending', null_flag: 0, duplicate_flag: 0, mixed_note_flag: 0, parsed_enum: 'active,inactive,suspended,pending', notes: 'pending is unexpected' },
      { id: uuidv4(), snapshot_at: now, table_name: 'users', field_name: 'role', raw_value: '', null_flag: 1, duplicate_flag: 0, mixed_note_flag: 0, parsed_enum: null, notes: 'raw_value is empty, null detected' },
      { id: uuidv4(), snapshot_at: now, table_name: 'orders', field_name: 'type', raw_value: 'standard,express,# TODO: add rush type', null_flag: 0, duplicate_flag: 0, mixed_note_flag: 1, parsed_enum: 'standard,express', notes: 'contains comment pattern "# "' },
    ]
    for (const s of snapshots) insertSnapshot.run(s)

    const driftRecords = [
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'migration', source_ref: 'migrations/001_add_user_status.sql', table_name: 'users', field_name: 'status', current_enum: 'active,inactive,suspended,pending', expected_enum: 'active,inactive,suspended', drift_type: 'value_added', status: 'pending', confidence: 'needs_review', severity: 'medium', snapshot_id: snapshots[0].id, conclusion: null, operator: null },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'schema_diff', source_ref: 'schema_diff/users_2025_01.diff', table_name: 'users', field_name: 'role', current_enum: 'admin,user', expected_enum: 'admin,user,moderator', drift_type: 'value_added', status: 'pending', confidence: 'high', severity: 'high', snapshot_id: snapshots[1].id, conclusion: null, operator: null },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'migration', source_ref: 'migrations/001_add_user_status.sql', table_name: 'users', field_name: 'role', current_enum: 'admin,user', expected_enum: 'admin', drift_type: 'value_added', status: 'confirmed', confidence: 'high', severity: 'high', snapshot_id: null, conclusion: 'moderator role added by migration', operator: 'alice' },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'permission', source_ref: 'docs/permissions_v2.md', table_name: 'users', field_name: 'status', current_enum: 'active,inactive,suspended', expected_enum: 'active,inactive', drift_type: 'value_changed', status: 'confirmed', confidence: 'medium', severity: 'medium', snapshot_id: null, conclusion: 'suspended status was added without approval', operator: 'bob' },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'query_analysis', source_ref: 'logs/slow_queries_2025_01.log', table_name: 'orders', field_name: 'status', current_enum: 'pending,processing,shipped,delivered', expected_enum: 'pending,processing,shipped', drift_type: 'value_added', status: 'corrected', confidence: 'low', severity: 'low', snapshot_id: null, conclusion: 'delivered was a valid addition', operator: 'carol' },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'migration', source_ref: 'migrations/002_add_order_type.sql', table_name: 'orders', field_name: 'type', current_enum: 'standard,express', expected_enum: 'standard,express,rush', drift_type: 'value_removed', status: 'corrected', confidence: 'high', severity: 'medium', snapshot_id: snapshots[2].id, conclusion: 'rush type removed due to incomplete migration', operator: 'alice' },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'schema_diff', source_ref: 'schema_diff/users_2025_01.diff', table_name: 'users', field_name: 'status', current_enum: 'active,inactive', expected_enum: 'active,inactive,suspended', drift_type: 'value_changed', status: 'rolled_back', confidence: 'medium', severity: 'medium', snapshot_id: null, conclusion: null, operator: 'bob' },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'permission', source_ref: 'docs/permissions_v2.md', table_name: 'users', field_name: 'role', current_enum: 'admin,user,moderator', expected_enum: 'admin,user', drift_type: 'mixed_note', status: 'rolled_back', confidence: 'low', severity: 'low', snapshot_id: null, conclusion: null, operator: 'carol' },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'query_analysis', source_ref: 'logs/slow_queries_2025_01.log', table_name: 'orders', field_name: 'priority', current_enum: 'low,medium,high', expected_enum: 'low,medium,high,critical', drift_type: 'null_drift', status: 'dismissed', confidence: 'high', severity: 'low', snapshot_id: null, conclusion: 'null values found in priority column', operator: null },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'schema_diff', source_ref: 'schema_diff/orders_2025_02.diff', table_name: 'orders', field_name: 'status', current_enum: 'pending,processing', expected_enum: 'pending,processing,shipped,delivered', drift_type: 'value_added', status: 'dismissed', confidence: 'needs_review', severity: 'low', snapshot_id: null, conclusion: 'dismissed as expected expansion', operator: 'alice' },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'permission', source_ref: 'docs/permissions_v2.md', table_name: 'orders', field_name: 'type', current_enum: 'standard,express,rush', expected_enum: 'standard,express', drift_type: 'value_removed', status: 'pending', confidence: 'medium', severity: 'high', snapshot_id: null, conclusion: null, operator: null },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'migration', source_ref: 'migrations/003_fix_enum.sql', table_name: 'products', field_name: 'category', current_enum: 'electronics,clothing,food', expected_enum: 'electronics,clothing', drift_type: 'mixed_note', status: 'confirmed', confidence: 'low', severity: 'medium', snapshot_id: null, conclusion: 'food category contains mixed notes', operator: 'bob' },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'query_analysis', source_ref: 'logs/slow_queries_2025_02.log', table_name: 'products', field_name: 'status', current_enum: 'active,discontinued', expected_enum: 'active', drift_type: 'null_drift', status: 'pending', confidence: 'low', severity: 'medium', snapshot_id: null, conclusion: null, operator: null },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'permission', source_ref: 'docs/permissions_v3.md', table_name: 'users', field_name: 'role', current_enum: 'admin,user', expected_enum: 'admin,user,auditor', drift_type: 'value_changed', status: 'corrected', confidence: 'needs_review', severity: 'high', snapshot_id: null, conclusion: 'auditor role verified and accepted', operator: 'dave' },
      { id: uuidv4(), created_at: now, updated_at: now, source_type: 'query_analysis', source_ref: 'logs/slow_queries_2025_03.log', table_name: 'orders', field_name: 'status', current_enum: 'pending,processing,shipped', expected_enum: 'pending,processing,shipped,cancelled', drift_type: 'value_added', status: 'confirmed', confidence: 'high', severity: 'medium', snapshot_id: null, conclusion: 'cancelled status confirmed by product team', operator: 'eve' },
    ]
    for (const d of driftRecords) insertDrift.run(d)

    for (let i = 0; i < 5; i++) {
      const drift = driftRecords[i]
      const mat = materials[i % materials.length]
      insertConclusionRef.run({ id: uuidv4(), drift_id: drift.id, material_id: mat.id, ref_role: i < 3 ? 'primary' : 'supporting' })
    }

    const auditStatuses = ['open', 'resolved', 'open', 'escalated', 'resolved']
    for (let i = 0; i < 5; i++) {
      insertAudit.run({
        id: uuidv4(),
        audit_at: now,
        permission_key: `perm:${driftRecords[i].table_name}:${driftRecords[i].field_name}`,
        holder: ['alice', 'bob', 'carol', 'dave', 'eve'][i],
        material_id: materials[i % materials.length].id,
        drift_id: driftRecords[i].id,
        status: auditStatuses[i],
      })
    }

    for (let i = 0; i < 5; i++) {
      insertSlowQuery.run({
        id: uuidv4(),
        query_id: `SQ-${String(i + 1).padStart(4, '0')}`,
        query_text: `SELECT * FROM ${driftRecords[i].table_name} WHERE ${driftRecords[i].field_name} = ?`,
        query_time_ms: [1200, 850, 2100, 450, 3200][i],
        attributed_table: driftRecords[i].table_name,
        attributed_field: driftRecords[i].field_name,
        material_id: materials[i % materials.length].id,
        drift_id: driftRecords[i].id,
      })
    }

    insertRollback.run({ id: uuidv4(), rollback_at: now, drift_id: driftRecords[6].id, conclusion: 'Rolled back due to incorrect schema diff', operator: 'bob', source_material_ids: materials[1].id })
    insertRollback.run({ id: uuidv4(), rollback_at: now, drift_id: driftRecords[7].id, conclusion: 'Rolled back mixed note drift', operator: 'carol', source_material_ids: materials[2].id })
    insertRollback.run({ id: uuidv4(), rollback_at: now, drift_id: driftRecords[2].id, conclusion: 'Rolled back confirmed drift after review', operator: 'alice', source_material_ids: `${materials[0].id},${materials[1].id}` })

    insertMigrationExec.run({ id: uuidv4(), migration_id: '001_add_user_status', executed_at: now, duplicate_flag: 0, affected_table: 'users', affected_field: 'status', drift_id: driftRecords[0].id })
    insertMigrationExec.run({ id: uuidv4(), migration_id: '001_add_user_status', executed_at: now, duplicate_flag: 1, affected_table: 'users', affected_field: 'status', drift_id: driftRecords[0].id })
    insertMigrationExec.run({ id: uuidv4(), migration_id: '002_add_order_type', executed_at: now, duplicate_flag: 0, affected_table: 'orders', affected_field: 'type', drift_id: driftRecords[5].id })

    const actions = ['correct', 'review', 'correct', 'rollback', 'correct']
    for (let i = 0; i < 5; i++) {
      const drift = driftRecords[i]
      insertCorrection.run({
        id: uuidv4(),
        drift_id: drift.id,
        action: actions[i],
        before_state: JSON.stringify({ expected_enum: drift.expected_enum, status: 'pending' }),
        after_state: JSON.stringify({ expected_enum: drift.current_enum, status: drift.status }),
        operator: ['alice', 'bob', 'carol', 'dave', 'eve'][i],
        action_at: now,
        note: `${actions[i]} action on ${drift.table_name}.${drift.field_name}`,
      })
    }
  })

  transaction()
}

export default db
