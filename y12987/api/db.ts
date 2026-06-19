import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DB_PATH = join(__dirname, '..', 'data', 'etl-topology.db')

mkdirSync(dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    last_run_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_dependencies (
    id TEXT PRIMARY KEY,
    upstream_id TEXT NOT NULL REFERENCES tasks(id),
    downstream_id TEXT NOT NULL REFERENCES tasks(id),
    UNIQUE(upstream_id, downstream_id)
  );

  CREATE TABLE IF NOT EXISTS workorders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    task_id TEXT REFERENCES tasks(id),
    conclusion TEXT DEFAULT '',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    change_count INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS workorder_versions (
    id TEXT PRIMARY KEY,
    workorder_id TEXT NOT NULL REFERENCES workorders(id),
    conclusion TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    change_reason TEXT NOT NULL,
    version INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operator TEXT NOT NULL,
    operated_at TEXT NOT NULL DEFAULT (datetime('now')),
    reason TEXT NOT NULL DEFAULT '',
    snapshot TEXT DEFAULT '{}'
  );

  CREATE INDEX IF NOT EXISTS idx_workorders_created_at ON workorders(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_workorder_versions_workorder_id ON workorder_versions(workorder_id, version DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_operated_at ON audit_logs(operated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
`)

function seed() {
  const taskCount = db.prepare('SELECT COUNT(*) as cnt FROM tasks').get() as { cnt: number }
  if (taskCount.cnt > 0) return

  const now = new Date().toISOString()

  const tasks = [
    { id: uuidv4(), name: 'ods_财务明细抽取', status: 'success', last_run_at: now },
    { id: uuidv4(), name: 'ods_科目映射抽取', status: 'success', last_run_at: now },
    { id: uuidv4(), name: 'ods_组织架构同步', status: 'success', last_run_at: now },
    { id: uuidv4(), name: 'dwd_财务明细清洗', status: 'success', last_run_at: now },
    { id: uuidv4(), name: 'dwd_科目映射清洗', status: 'failed', last_run_at: now },
    { id: uuidv4(), name: 'dwd_组织架构清洗', status: 'success', last_run_at: now },
    { id: uuidv4(), name: 'dws_财务汇总', status: 'failed', last_run_at: now },
    { id: uuidv4(), name: 'dws_科目汇总', status: 'pending', last_run_at: null },
    { id: uuidv4(), name: 'dws_组织汇总', status: 'success', last_run_at: now },
    { id: uuidv4(), name: 'ads_财务报表', status: 'pending', last_run_at: null },
    { id: uuidv4(), name: 'ads_科目报表', status: 'pending', last_run_at: null },
    { id: uuidv4(), name: 'ads_组织报表', status: 'running', last_run_at: now },
    { id: uuidv4(), name: 'dim_日期维度', status: 'success', last_run_at: now },
    { id: uuidv4(), name: 'dim_币种维度', status: 'success', last_run_at: now },
  ]

  const insertTask = db.prepare(
    'INSERT INTO tasks (id, name, status, last_run_at, created_at) VALUES (?, ?, ?, ?, ?)'
  )

  const insertDep = db.prepare(
    'INSERT INTO task_dependencies (id, upstream_id, downstream_id) VALUES (?, ?, ?)'
  )

  const insertWorkorder = db.prepare(
    'INSERT INTO workorders (id, title, status, task_id, conclusion, created_by, created_at, change_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )

  const insertVersion = db.prepare(
    'INSERT INTO workorder_versions (id, workorder_id, conclusion, changed_by, changed_at, change_reason, version) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )

  const insertAudit = db.prepare(
    'INSERT INTO audit_logs (id, action_type, entity_type, entity_id, operator, operated_at, reason, snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )

  const transaction = db.transaction(() => {
    for (const t of tasks) {
      insertTask.run(t.id, t.name, t.status, t.last_run_at, now)
    }

    const deps: [number, number][] = [
      [0, 3], [1, 4], [2, 5],
      [3, 6], [4, 7], [5, 8],
      [6, 9], [7, 10], [8, 11],
      [12, 6], [13, 9],
    ]

    for (const [upIdx, downIdx] of deps) {
      insertDep.run(uuidv4(), tasks[upIdx].id, tasks[downIdx].id)
    }

    const wo1Id = uuidv4()
    const wo2Id = uuidv4()
    const wo3Id = uuidv4()
    const wo4Id = uuidv4()

    insertWorkorder.run(
      wo1Id,
      'dwd_科目映射清洗异常修复',
      'in_progress',
      tasks[4].id,
      '字段映射规则变更，需重新配置源科目到标准科目的对应关系',
      '张工',
      now,
      1
    )
    insertVersion.run(
      uuidv4(), wo1Id,
      '字段映射规则变更，需重新配置源科目到标准科目的对应关系',
      '张工', now, '初始创建', 1
    )
    insertVersion.run(
      uuidv4(), wo1Id,
      '已更新映射规则，等待验证结果',
      '李经理', now, '映射规则已修改完成，需验证', 2
    )
    insertAudit.run(
      uuidv4(), 'create', 'workorder', wo1Id, '张工', now, '创建工单',
      JSON.stringify({ title: 'dwd_科目映射清洗异常修复', conclusion: '字段映射规则变更' })
    )
    insertAudit.run(
      uuidv4(), 'update', 'workorder', wo1Id, '李经理', now, '映射规则已修改完成，需验证',
      JSON.stringify({ conclusion: '已更新映射规则，等待验证结果', changeCount: 1 })
    )

    insertWorkorder.run(
      wo2Id,
      'dws_财务汇总计算失败排查',
      'open',
      tasks[6].id,
      '汇总任务依赖上游数据异常，需等上游修复后重跑',
      '王工',
      now,
      0
    )
    insertVersion.run(
      uuidv4(), wo2Id,
      '汇总任务依赖上游数据异常，需等上游修复后重跑',
      '王工', now, '初始创建', 1
    )
    insertAudit.run(
      uuidv4(), 'create', 'workorder', wo2Id, '王工', now, '创建工单',
      JSON.stringify({ title: 'dws_财务汇总计算失败排查' })
    )

    insertWorkorder.run(
      wo3Id,
      'ads_组织报表运行监控',
      'resolved',
      tasks[11].id,
      '报表生成正常，性能优化已完成',
      '赵工',
      now,
      2
    )
    insertVersion.run(
      uuidv4(), wo3Id,
      '报表生成正常，性能优化已完成',
      '赵工', now, '初始创建', 1
    )
    insertVersion.run(
      uuidv4(), wo3Id,
      '优化SQL查询，减少全表扫描',
      '赵工', now, '查询耗时过长，需优化', 2
    )
    insertVersion.run(
      uuidv4(), wo3Id,
      '报表生成正常，性能优化已完成',
      '钱经理', now, '优化验证通过', 3
    )
    insertAudit.run(
      uuidv4(), 'create', 'workorder', wo3Id, '赵工', now, '创建工单',
      JSON.stringify({ title: 'ads_组织报表运行监控' })
    )
    insertAudit.run(
      uuidv4(), 'update', 'workorder', wo3Id, '赵工', now, '查询耗时过长，需优化',
      JSON.stringify({ changeCount: 1 })
    )
    insertAudit.run(
      uuidv4(), 'update', 'workorder', wo3Id, '钱经理', now, '优化验证通过',
      JSON.stringify({ changeCount: 2 })
    )

    insertWorkorder.run(
      wo4Id,
      'dws_科目汇总待确认',
      'open',
      tasks[7].id,
      '上游科目映射未完成，暂无法汇总',
      '孙工',
      now,
      0
    )
    insertVersion.run(
      uuidv4(), wo4Id,
      '上游科目映射未完成，暂无法汇总',
      '孙工', now, '初始创建', 1
    )
    insertAudit.run(
      uuidv4(), 'create', 'workorder', wo4Id, '孙工', now, '创建工单',
      JSON.stringify({ title: 'dws_科目汇总待确认' })
    )

    insertAudit.run(
      uuidv4(), 'update', 'task', tasks[4].id, '系统', now, '任务状态变更为failed',
      JSON.stringify({ status: 'failed' })
    )
    insertAudit.run(
      uuidv4(), 'update', 'task', tasks[6].id, '系统', now, '任务状态变更为failed',
      JSON.stringify({ status: 'failed' })
    )
    insertAudit.run(
      uuidv4(), 'update', 'task', tasks[11].id, '系统', now, '任务状态变更为running',
      JSON.stringify({ status: 'running' })
    )
  })

  transaction()
}

seed()

export default db
